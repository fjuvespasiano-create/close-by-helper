/**
 * Scraper de horários de ônibus metropolitanos (DER-MG)
 * para Vespasiano e São José da Lapa.
 *
 * Fonte: movemetropolitano.com.br
 *
 * Estratégia:
 *  1. Faz `scrape` das páginas-índice de cada cidade em markdown para
 *     descobrir links das linhas.
 *  2. Para cada linha, faz `scrape` em markdown e faz parsing regex-based
 *     resiliente: extrai código, nome, tarifa e agrupa horários por
 *     origem/tipo de dia (`### PARTIDAS <ORIGEM>` + subgrupo).
 *  3. Upsert em `bus_lines` por slug (derivado da URL).
 *
 * Robustez: try/catch por linha; falhas individuais não abortam o job.
 */

import Firecrawl from "@mendable/firecrawl-js";

const CITIES = [
  {
    slug: "vespasiano",
    index: "https://movemetropolitano.com.br/vespasiano/",
  },
  {
    slug: "sao-jose-da-lapa",
    index: "https://movemetropolitano.com.br/saojosedalapa/",
  },
] as const;

export type BusDeparture = {
  origin: string;
  day_type: string;
  times: string[];
};

type BusLineParsed = {
  code: string;
  name: string;
  slug: string;
  city_slug: string;
  source_url: string;
  fare: number | null;
  departures: BusDeparture[];
  raw_updated_at: string | null;
};

const TIME_RE = /^(\d{1,2}):(\d{2})(?:[A-Z]{1,3})?$/;
const FARE_RE = /Valor da passagem[^:]*:\s*R\$\s*([\d,\.]+)/i;
const UPDATED_RE = /Quadro de horários atualizado em ([^\n\.]+)/i;

function slugFromUrl(url: string): string {
  return url.replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "");
}

function extractLineLinks(markdown: string): string[] {
  const re = /\[([^\]]+)\]\((https:\/\/movemetropolitano\.com\.br\/[a-z0-9-]+)\)/gi;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of markdown.matchAll(re)) {
    const url = m[2];
    // filtra apenas páginas de linhas (código no começo do slug)
    const slug = slugFromUrl(url);
    if (!/^\d{2,4}[a-z]?-/i.test(slug)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function parseLinePage(
  markdown: string,
  url: string,
  citySlug: string,
): BusLineParsed | null {
  const lines = markdown.split("\n").map((l) => l.trim());

  // Título tipo "# 500C Terminal Morro Alto / Belo Horizonte (Semi-Direta) – Horário..."
  const h1 = lines.find((l) => l.startsWith("# "));
  if (!h1) return null;
  const titleMatch = h1.replace(/^#\s+/, "").match(/^([0-9]{2,4}[A-Z]?)\s+(.+?)(?:\s+[–-]\s+Horário|$)/i);
  if (!titleMatch) return null;
  const code = titleMatch[1].toUpperCase();
  const name = titleMatch[2].replace(/\s+\|\s+.*$/, "").trim();

  const fareMatch = markdown.match(FARE_RE);
  const fare = fareMatch ? parseFloat(fareMatch[1].replace(/\./g, "").replace(",", ".")) : null;

  const updatedMatch = markdown.match(UPDATED_RE);
  const rawUpdatedAt = updatedMatch ? updatedMatch[1].trim() : null;

  // Detecta seções "### PARTIDAS <ORIGEM>" e agrupa subheaders
  // (linhas de texto tipo "Dias Úteis", "Sábados", "Domingos", "Atípico") + horários
  const departures: BusDeparture[] = [];
  let currentOrigin: string | null = null;
  let currentDayType: string | null = null;
  let currentTimes: string[] = [];

  const flush = () => {
    if (currentOrigin && currentDayType && currentTimes.length > 0) {
      departures.push({
        origin: currentOrigin,
        day_type: currentDayType,
        times: currentTimes,
      });
    }
    currentTimes = [];
  };

  for (const raw of lines) {
    if (!raw) continue;
    const partidas = raw.match(/^###\s+PARTIDAS\s+(.+)$/i);
    if (partidas) {
      flush();
      currentOrigin = partidas[1].trim();
      currentDayType = null;
      continue;
    }
    if (!currentOrigin) continue;

    // horário
    const time = raw.match(TIME_RE);
    if (time) {
      const hh = time[1].padStart(2, "0");
      const mm = time[2];
      currentTimes.push(`${hh}:${mm}`);
      continue;
    }

    // possível subheader de dia (texto curto, sem HH:MM, sem markdown especial)
    if (
      raw.length < 60 &&
      !raw.startsWith("#") &&
      !raw.startsWith("!") &&
      !raw.startsWith("[") &&
      !raw.startsWith("**") &&
      !/Visualiza|atualizado|passagem|Bem vindo|senha|password/i.test(raw) &&
      /Dia|Sábado|Sabado|Domingo|Feriado|Atípico|Férias/i.test(raw)
    ) {
      flush();
      currentDayType = raw.replace(/\s+/g, " ").trim();
    }
  }
  flush();

  if (departures.length === 0) return null;

  return {
    code,
    name,
    slug: slugFromUrl(url),
    city_slug: citySlug,
    source_url: url,
    fare,
    departures,
    raw_updated_at: rawUpdatedAt,
  };
}

export async function runBusScrape(): Promise<{
  ok: boolean;
  cities: Array<{
    city: string;
    lines_found: number;
    lines_updated: number;
    errors: string[];
  }>;
}> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada");

  const firecrawl = new Firecrawl({ apiKey });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const report: {
    ok: boolean;
    cities: Array<{
      city: string;
      lines_found: number;
      lines_updated: number;
      errors: string[];
    }>;
  } = { ok: true, cities: [] };

  for (const city of CITIES) {
    const logRow = { city_slug: city.slug, lines_found: 0, lines_updated: 0, errors: [] as unknown[], status: "ok" };
    const cityReport = { city: city.slug, lines_found: 0, lines_updated: 0, errors: [] as string[] };
    const startedAt = new Date().toISOString();

    try {
      const index = await firecrawl.scrape(city.index, {
        formats: ["markdown"],
        onlyMainContent: true,
      });
      const md = (index as { markdown?: string }).markdown ?? "";
      const links = extractLineLinks(md);
      cityReport.lines_found = links.length;
      logRow.lines_found = links.length;

      for (const url of links) {
        try {
          const page = await firecrawl.scrape(url, {
            formats: ["markdown"],
            onlyMainContent: true,
          });
          const pageMd = (page as { markdown?: string }).markdown ?? "";
          const parsed = parseLinePage(pageMd, url, city.slug);
          if (!parsed) {
            cityReport.errors.push(`parse-failed:${url}`);
            continue;
          }

          const { error } = await supabaseAdmin
            .from("bus_lines")
            .upsert(
              {
                code: parsed.code,
                name: parsed.name,
                slug: parsed.slug,
                city_slug: parsed.city_slug,
                operator: "DER-MG",
                fare: parsed.fare,
                source_url: parsed.source_url,
                departures: parsed.departures,
                raw_updated_at: parsed.raw_updated_at,
                last_scraped_at: new Date().toISOString(),
              },
              { onConflict: "slug" },
            );

          if (error) {
            cityReport.errors.push(`upsert:${parsed.slug}:${error.message}`);
          } else {
            cityReport.lines_updated += 1;
            logRow.lines_updated += 1;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          cityReport.errors.push(`${slugFromUrl(url)}:${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      cityReport.errors.push(`index:${msg}`);
      logRow.status = "error";
      report.ok = false;
    }

    logRow.errors = cityReport.errors;
    await supabaseAdmin.from("bus_sync_logs").insert({
      ...logRow,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    report.cities.push(cityReport);
  }

  return report;
}
