/**
 * Scraper de Eventos - TripAdvisor (Vespasiano / São José da Lapa).
 *
 * Estratégia:
 *  1. Firecrawl `search` no TripAdvisor por "eventos <cidade>" para descobrir
 *     páginas de atrações/eventos. TripAdvisor tem cobertura fraca de cidades
 *     pequenas do interior; frequentemente devolve 0 itens — isso é esperado.
 *  2. Para cada URL relevante, `scrape` com extração JSON estruturada (schema
 *     Zod-like) — o LLM do Firecrawl mapeia nome, data, local, descrição, categoria.
 *  3. Normaliza datas, gera hash de deduplicação (source|title|start|location)
 *     e faz upsert em public.events. Preserva eventos criados manualmente.
 *
 * Robustez: try/catch por página, timeouts curtos, warnings agregados no report,
 * log em event_sync_logs. Todo erro individual vira warning — nunca aborta o job.
 */

import Firecrawl from "@mendable/firecrawl-js";
import { createHash } from "crypto";

type CityConfig = {
  slug: string;
  cityId: string;
  name: string;
  searchQueries: string[];
};

type EventCategoryKey =
  | "show"
  | "festival"
  | "teatro"
  | "esporte"
  | "feira"
  | "workshop"
  | "gastronomia"
  | "outros";

type ExtractedEvent = {
  title: string;
  description?: string;
  location?: string;
  start_date?: string; // ISO ou "DD/MM/YYYY" — normalizado depois
  end_date?: string;
  category?: string;
  url?: string;
  cover_image?: string;
};

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      description:
        "Lista de eventos, shows, festivais, feiras ou atrações com data específica citados nesta página. Ignore atrações permanentes sem data (ex: parques, museus) e itens sem título claro.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Nome do evento" },
          description: { type: "string", description: "1-2 frases descrevendo o evento" },
          location: { type: "string", description: "Local, endereço ou espaço" },
          start_date: {
            type: "string",
            description: "Data de início no formato ISO (YYYY-MM-DD) ou DD/MM/YYYY",
          },
          end_date: { type: "string" },
          category: {
            type: "string",
            description: "Categoria: Shows, Festivais, Teatro, Esportes, Feiras, Workshops, Gastronomia ou Outros",
          },
          url: { type: "string", description: "Link direto para o evento" },
          cover_image: { type: "string", description: "URL de imagem do evento" },
        },
        required: ["title"],
      },
    },
  },
  required: ["events"],
} as const;

const MAX_URLS_PER_CITY = 6;
const SCRAPE_TIMEOUT_MS = 45_000;

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function mapCategory(raw: string | undefined): EventCategoryKey {
  const t = (raw ?? "").toLowerCase();
  if (/show|música|musica|concerto|banda/.test(t)) return "show";
  if (/festival/.test(t)) return "festival";
  if (/teatro|peça|peca|espetáculo|espetaculo/.test(t)) return "teatro";
  if (/esport|corrida|maratona|futebol|jogo/.test(t)) return "esporte";
  if (/feira|exposição|exposicao/.test(t)) return "feira";
  if (/workshop|curso|palestra|oficina/.test(t)) return "workshop";
  if (/gastronom|food|comida|cerve|bar/.test(t)) return "gastronomia";
  return "outros";
}

function parseDate(input: string | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  // ISO já pronto
  const iso = /^\d{4}-\d{2}-\d{2}/;
  if (iso.test(s)) {
    const d = new Date(s.length === 10 ? `${s}T12:00:00-03:00` : s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // DD/MM/YYYY [HH:MM]
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (br) {
    const [, dd, mm, yy, hh, mi] = br;
    const year = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
    const iso = `${year.toString().padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${(hh ?? "12").padStart(2, "0")}:${(mi ?? "00").padStart(2, "0")}:00-03:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function dedupeHash(source: string, title: string, startIso: string | null, location: string | undefined): string {
  const key = [source, title.trim().toLowerCase(), startIso ?? "", (location ?? "").trim().toLowerCase()].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms)),
  ]);
}

type FcSearchResult = {
  web?: Array<{ url?: string; title?: string; description?: string }>;
  data?: { web?: Array<{ url?: string }> };
};

async function discoverUrls(fc: Firecrawl, queries: string[]): Promise<string[]> {
  const urls = new Set<string>();
  for (const q of queries) {
    try {
      const res = (await withTimeout(
        fc.search(q, { limit: 5 }),
        SCRAPE_TIMEOUT_MS,
        `search(${q})`,
      )) as FcSearchResult;
      const items = res.web ?? res.data?.web ?? [];
      for (const it of items) {
        const url = it.url;
        if (!url) continue;
        if (!/tripadvisor\.(com|com\.br)/i.test(url)) continue;
        urls.add(url);
        if (urls.size >= MAX_URLS_PER_CITY) break;
      }
    } catch (err) {
      console.warn(`[events-scrape] search falhou (${q}):`, err instanceof Error ? err.message : err);
    }
    if (urls.size >= MAX_URLS_PER_CITY) break;
  }
  return [...urls].slice(0, MAX_URLS_PER_CITY);
}

async function extractPage(fc: Firecrawl, url: string): Promise<ExtractedEvent[]> {
  try {
    const res = (await withTimeout(
      fc.scrape(url, {
        formats: [{ type: "json", schema: EXTRACTION_SCHEMA }],
        onlyMainContent: true,
      }),
      SCRAPE_TIMEOUT_MS,
      `scrape(${url})`,
    )) as { json?: { events?: ExtractedEvent[] }; data?: { json?: { events?: ExtractedEvent[] } } };
    return res.json?.events ?? res.data?.json?.events ?? [];
  } catch (err) {
    console.warn(`[events-scrape] scrape falhou (${url}):`, err instanceof Error ? err.message : err);
    return [];
  }
}

export type EventsScrapeReport = {
  ok: boolean;
  duration_ms: number;
  cities: Array<{
    city: string;
    urls: number;
    extracted: number;
    inserted: number;
    updated: number;
    skipped: number;
    warnings: string[];
  }>;
};

export async function runEventsScrape(): Promise<EventsScrapeReport> {
  const started = Date.now();
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não está configurada");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const fc = new Firecrawl({ apiKey });

  const { data: cityRows, error: cityErr } = await supabaseAdmin
    .from("cities")
    .select("id, slug, name")
    .in("slug", ["vespasiano", "sao-jose-da-lapa"]);
  if (cityErr) throw new Error(`cities lookup: ${cityErr.message}`);

  const configs: CityConfig[] = (cityRows ?? []).map((c) => ({
    slug: c.slug,
    cityId: c.id,
    name: c.name,
    searchQueries: [
      `site:tripadvisor.com.br eventos ${c.name} MG`,
      `site:tripadvisor.com.br o que fazer ${c.name} Minas Gerais`,
      `site:tripadvisor.com eventos ${c.name} Brazil`,
    ],
  }));

  const report: EventsScrapeReport["cities"] = [];
  const source = "tripadvisor";

  for (const cfg of configs) {
    const cityReport: EventsScrapeReport["cities"][number] = {
      city: cfg.slug,
      urls: 0,
      extracted: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      warnings: [],
    };
    const logStarted = Date.now();

    try {
      const urls = await discoverUrls(fc, cfg.searchQueries);
      cityReport.urls = urls.length;

      const collected: ExtractedEvent[] = [];
      for (const url of urls) {
        const items = await extractPage(fc, url);
        for (const it of items) {
          if (!it.url) it.url = url;
          collected.push(it);
        }
      }
      cityReport.extracted = collected.length;

      // Dedup dentro do lote por hash antes de upsert
      const seenHashes = new Set<string>();
      const rows: Array<{
        slug: string;
        title: string;
        description: string | null;
        location: string | null;
        start_at: string;
        end_at: string | null;
        city_id: string;
        event_type: EventCategoryKey;
        status: "published";
        source: string;
        source_url: string | null;
        cover_image: string | null;
        dedupe_hash: string;
      }> = [];

      for (const raw of collected) {
        const title = (raw.title ?? "").trim();
        if (!title || title.length < 3 || title.length > 200) {
          cityReport.skipped++;
          continue;
        }
        const startIso = parseDate(raw.start_date);
        if (!startIso) {
          // TripAdvisor frequentemente lista atrações sem data — skip
          cityReport.skipped++;
          continue;
        }
        // Ignora eventos passados (>7 dias atrás)
        const startDate = new Date(startIso);
        if (startDate.getTime() < Date.now() - 7 * 24 * 3600 * 1000) {
          cityReport.skipped++;
          continue;
        }
        const hash = dedupeHash(source, title, startIso, raw.location);
        if (seenHashes.has(hash)) {
          cityReport.skipped++;
          continue;
        }
        seenHashes.add(hash);

        rows.push({
          slug: `${slugify(title)}-${hash.slice(0, 8)}`,
          title,
          description: raw.description?.trim() || null,
          location: raw.location?.trim() || null,
          start_at: startIso,
          end_at: parseDate(raw.end_date),
          city_id: cfg.cityId,
          event_type: mapCategory(raw.category),
          status: "published",
          source,
          source_url: raw.url ?? null,
          cover_image: raw.cover_image ?? null,
          dedupe_hash: hash,
        });
      }

      if (rows.length) {
        // Verifica quais já existem (para reportar inserted vs updated)
        const hashes = rows.map((r) => r.dedupe_hash);
        const { data: existing } = await supabaseAdmin
          .from("events")
          .select("dedupe_hash")
          .in("dedupe_hash", hashes);
        const existingSet = new Set((existing ?? []).map((e) => e.dedupe_hash));

        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const { error } = await supabaseAdmin
            .from("events")
            .upsert(batch, { onConflict: "dedupe_hash", ignoreDuplicates: false });
          if (error) {
            cityReport.warnings.push(`upsert: ${error.message}`);
          } else {
            for (const r of batch) {
              if (existingSet.has(r.dedupe_hash)) cityReport.updated++;
              else cityReport.inserted++;
            }
          }
        }
      }

      await supabaseAdmin.from("event_sync_logs").insert({
        source,
        city_id: cfg.cityId,
        status: cityReport.warnings.length ? "partial" : "success",
        items_found: cityReport.extracted,
        items_new: cityReport.inserted,
        items_updated: cityReport.updated,
        error: cityReport.warnings.length ? cityReport.warnings.join(" | ").slice(0, 500) : null,
        duration_ms: Date.now() - logStarted,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      cityReport.warnings.push(message);
      await supabaseAdmin.from("event_sync_logs").insert({
        source,
        city_id: cfg.cityId,
        status: "error",
        items_found: cityReport.extracted,
        items_new: cityReport.inserted,
        items_updated: cityReport.updated,
        error: message.slice(0, 500),
        duration_ms: Date.now() - logStarted,
      });
    }

    report.push(cityReport);
  }

  return { ok: true, duration_ms: Date.now() - started, cities: report };
}
