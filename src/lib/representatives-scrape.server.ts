/**
 * Scraper de atividades legislativas e executivas.
 *
 * Estratégia por fonte:
 *  - Câmaras Municipais (SAPL / portais oficiais): Firecrawl `map` filtrado por termos
 *    (projeto de lei, indicação, requerimento, pauta) → `scrape` json estruturado.
 *  - Prefeituras: `map` por termos (decreto, licitação, obra, ordem de serviço) →
 *    `scrape` json estruturado com autor/status/data.
 *  - Diário Oficial dos Municípios (DOM-MG/AMM): `search` filtrando por
 *    nome do município e palavras-chave (portaria, decreto, contrato).
 *
 * Cada scraper: dedupe por hash SHA-256 (source|title|date), upsert em
 * `representative_activities`, resolve `representative_id` por match de nome
 * quando possível (LIKE lower(name)). Warnings agregados; nunca aborta.
 * Log em `representative_sync_logs`.
 */

import Firecrawl from "@mendable/firecrawl-js";
import { createHash } from "crypto";

type SourceKey =
  | "camara-vespasiano"
  | "camara-sjl"
  | "prefeitura-vespasiano"
  | "prefeitura-sjl"
  | "dom-mg";

type ActivityKind =
  | "projeto_lei"
  | "indicacao"
  | "requerimento"
  | "voto"
  | "decreto"
  | "obra"
  | "contrato"
  | "pauta"
  | "outro";

type ActivityStatus =
  | "em_tramitacao"
  | "aprovado"
  | "rejeitado"
  | "vetado"
  | "arquivado"
  | "publicado";

type CityRow = { id: string; slug: string; name: string };

type ExtractedActivity = {
  title: string;
  description?: string;
  author_name?: string;
  kind_hint?: string;
  status_hint?: string;
  date?: string;
  url?: string;
};

type SourceConfig = {
  key: SourceKey;
  citySlug: "vespasiano" | "sao-jose-da-lapa";
  site: string;
  terms: Array<{ query: string; kind: ActivityKind }>;
};

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    activities: {
      type: "array",
      description:
        "Lista de atos legislativos ou executivos citados nesta página (projetos de lei, indicações, requerimentos, decretos, licitações, ordens de serviço). Ignore itens de navegação, banners e conteúdo institucional genérico.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título ou ementa curta do ato" },
          description: { type: "string", description: "1-3 frases descrevendo o conteúdo" },
          author_name: {
            type: "string",
            description: "Nome do autor/proponente (vereador, prefeito) quando citado",
          },
          kind_hint: {
            type: "string",
            description:
              "Tipo do ato: projeto de lei, indicação, requerimento, voto, decreto, obra, contrato, pauta",
          },
          status_hint: {
            type: "string",
            description: "Status quando disponível: em tramitação, aprovado, rejeitado, vetado, arquivado, publicado",
          },
          date: { type: "string", description: "Data do ato em ISO (YYYY-MM-DD) ou DD/MM/YYYY" },
          url: { type: "string", description: "Link direto para o documento" },
        },
        required: ["title"],
      },
    },
  },
  required: ["activities"],
} as const;

const MAX_URLS_PER_TERM = 3;
const MAX_URLS_PER_SOURCE = 8;
const SCRAPE_TIMEOUT_MS = 45_000;

const SOURCES: SourceConfig[] = [
  {
    key: "camara-vespasiano",
    citySlug: "vespasiano",
    site: "https://www.cmvespasiano.mg.gov.br",
    terms: [
      { query: "projeto de lei", kind: "projeto_lei" },
      { query: "indicação", kind: "indicacao" },
      { query: "requerimento", kind: "requerimento" },
      { query: "pauta sessão", kind: "pauta" },
    ],
  },
  {
    key: "camara-sjl",
    citySlug: "sao-jose-da-lapa",
    site: "https://www.camarasaojosedalapa.mg.gov.br",
    terms: [
      { query: "projeto de lei", kind: "projeto_lei" },
      { query: "indicação", kind: "indicacao" },
      { query: "requerimento", kind: "requerimento" },
      { query: "pauta sessão", kind: "pauta" },
    ],
  },
  {
    key: "prefeitura-vespasiano",
    citySlug: "vespasiano",
    site: "https://www.vespasiano.mg.gov.br",
    terms: [
      { query: "decreto", kind: "decreto" },
      { query: "licitação", kind: "contrato" },
      { query: "ordem de serviço", kind: "obra" },
      { query: "obra", kind: "obra" },
    ],
  },
  {
    key: "prefeitura-sjl",
    citySlug: "sao-jose-da-lapa",
    site: "https://www.saojosedalapa.mg.gov.br",
    terms: [
      { query: "decreto", kind: "decreto" },
      { query: "licitação", kind: "contrato" },
      { query: "ordem de serviço", kind: "obra" },
      { query: "obra", kind: "obra" },
    ],
  },
];

function normalizeText(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mapKind(hint: string | undefined, fallback: ActivityKind): ActivityKind {
  const t = normalizeText(hint ?? "");
  if (/projeto.*lei|^pl\b/.test(t)) return "projeto_lei";
  if (/indicac/.test(t)) return "indicacao";
  if (/requeriment/.test(t)) return "requerimento";
  if (/decret/.test(t)) return "decreto";
  if (/obra|ordem de servic/.test(t)) return "obra";
  if (/licitac|contrat/.test(t)) return "contrato";
  if (/pauta|sessao/.test(t)) return "pauta";
  if (/vot/.test(t)) return "voto";
  return fallback;
}

function mapStatus(hint: string | undefined): ActivityStatus | null {
  const t = normalizeText(hint ?? "");
  if (!t) return null;
  if (/aprovad/.test(t)) return "aprovado";
  if (/rejeitad/.test(t)) return "rejeitado";
  if (/vetad/.test(t)) return "vetado";
  if (/arquivad/.test(t)) return "arquivado";
  if (/publicad|homologad|sancionad/.test(t)) return "publicado";
  if (/tramitac|em analise|em analise|em votacao/.test(t)) return "em_tramitacao";
  return null;
}

function parseDate(input: string | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.length === 10 ? `${s}T12:00:00-03:00` : s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const br = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const [, dd, mm, yy] = br;
    const year = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
    const iso = `${year.toString().padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T12:00:00-03:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function dedupeHash(source: string, title: string, occurred: string): string {
  return createHash("sha256")
    .update([source, title.trim().toLowerCase(), occurred].join("|"))
    .digest("hex")
    .slice(0, 32);
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms)),
  ]);
}

async function discoverUrls(fc: Firecrawl, site: string, term: string): Promise<string[]> {
  try {
    const res = (await withTimeout(
      fc.map(site, { search: term, limit: MAX_URLS_PER_TERM, includeSubdomains: false }),
      SCRAPE_TIMEOUT_MS,
      `map(${term})`,
    )) as { links?: Array<string | { url?: string }> };
    const links = res.links ?? [];
    const urls: string[] = [];
    for (const l of links) {
      const u = typeof l === "string" ? l : l?.url;
      if (u && u.startsWith("http")) urls.push(u);
    }
    return urls.slice(0, MAX_URLS_PER_TERM);
  } catch (err) {
    console.warn(`[rep-scrape] map(${site}/${term}) falhou:`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function extractPage(fc: Firecrawl, url: string): Promise<ExtractedActivity[]> {
  try {
    const res = (await withTimeout(
      fc.scrape(url, {
        formats: [{ type: "json", schema: EXTRACTION_SCHEMA }],
        onlyMainContent: true,
      }),
      SCRAPE_TIMEOUT_MS,
      `scrape(${url})`,
    )) as {
      json?: { activities?: ExtractedActivity[] };
      data?: { json?: { activities?: ExtractedActivity[] } };
    };
    return res.json?.activities ?? res.data?.json?.activities ?? [];
  } catch (err) {
    console.warn(`[rep-scrape] scrape(${url}) falhou:`, err instanceof Error ? err.message : err);
    return [];
  }
}

type ScrapeCityReport = {
  source: SourceKey;
  city: string;
  urls: number;
  extracted: number;
  inserted: number;
  updated: number;
  skipped: number;
  warnings: string[];
};

export type RepsScrapeReport = {
  ok: boolean;
  duration_ms: number;
  sources: ScrapeCityReport[];
};

async function processSource(
  fc: Firecrawl,
  cfg: SourceConfig,
  city: CityRow,
  reps: Array<{ id: string; name_norm: string }>,
): Promise<ScrapeCityReport> {
  const report: ScrapeCityReport = {
    source: cfg.key,
    city: cfg.citySlug,
    urls: 0,
    extracted: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    warnings: [],
  };
  const started = Date.now();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  try {
    const allUrls = new Set<string>();
    for (const t of cfg.terms) {
      const urls = await discoverUrls(fc, cfg.site, t.query);
      urls.forEach((u) => allUrls.add(u));
      if (allUrls.size >= MAX_URLS_PER_SOURCE) break;
    }
    const urlList = [...allUrls].slice(0, MAX_URLS_PER_SOURCE);
    report.urls = urlList.length;

    const collected: Array<ExtractedActivity & { kindFallback: ActivityKind; pageUrl: string }> = [];
    for (const url of urlList) {
      // fallback kind = kind do primeiro termo desta source
      const kindFallback = cfg.terms[0].kind;
      const items = await extractPage(fc, url);
      for (const it of items) collected.push({ ...it, kindFallback, pageUrl: url });
    }
    report.extracted = collected.length;

    const seenHashes = new Set<string>();
    const rows: Array<{
      representative_id: string | null;
      city_id: string;
      kind: ActivityKind;
      title: string;
      description: string | null;
      status: ActivityStatus | null;
      source_url: string | null;
      source_name: string;
      occurred_at: string;
      dedupe_hash: string;
    }> = [];

    for (const raw of collected) {
      const title = (raw.title ?? "").trim();
      if (!title || title.length < 5 || title.length > 400) {
        report.skipped++;
        continue;
      }
      const occurred = parseDate(raw.date) ?? new Date().toISOString();
      const hash = dedupeHash(cfg.key, title, occurred);
      if (seenHashes.has(hash)) {
        report.skipped++;
        continue;
      }
      seenHashes.add(hash);

      // match representative por nome (best-effort)
      let repId: string | null = null;
      if (raw.author_name) {
        const target = normalizeText(raw.author_name);
        const hit = reps.find(
          (r) => target.length >= 4 && (r.name_norm.includes(target) || target.includes(r.name_norm)),
        );
        if (hit) repId = hit.id;
      }

      rows.push({
        representative_id: repId,
        city_id: city.id,
        kind: mapKind(raw.kind_hint, raw.kindFallback),
        title,
        description: raw.description?.trim() || null,
        status: mapStatus(raw.status_hint),
        source_url: raw.url ?? raw.pageUrl,
        source_name: cfg.key,
        occurred_at: occurred,
        dedupe_hash: hash,
      });
    }

    if (rows.length) {
      const hashes = rows.map((r) => r.dedupe_hash);
      const { data: existing } = await (supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (c: string) => { in: (col: string, vals: string[]) => Promise<{ data: Array<{ dedupe_hash: string }> | null }> };
        };
      })
        .from("representative_activities")
        .select("dedupe_hash")
        .in("dedupe_hash", hashes);
      const existingSet = new Set((existing ?? []).map((e) => e.dedupe_hash));

      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await (supabaseAdmin as unknown as {
          from: (t: string) => {
            upsert: (rows: unknown[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) => Promise<{ error: { message: string } | null }>;
          };
        })
          .from("representative_activities")
          .upsert(batch, { onConflict: "dedupe_hash", ignoreDuplicates: false });
        if (error) {
          report.warnings.push(`upsert: ${error.message}`);
        } else {
          for (const r of batch) {
            if (existingSet.has(r.dedupe_hash)) report.updated++;
            else report.inserted++;
          }
        }
      }
    }
  } catch (err) {
    report.warnings.push(err instanceof Error ? err.message : String(err));
  }

  await (supabaseAdmin as unknown as {
    from: (t: string) => { insert: (row: unknown) => Promise<{ error: unknown }> };
  })
    .from("representative_sync_logs")
    .insert({
      source: cfg.key,
      city_id: city.id,
      status: report.warnings.length ? (report.inserted + report.updated ? "partial" : "error") : "success",
      items_found: report.extracted,
      items_new: report.inserted,
      items_updated: report.updated,
      error: report.warnings.length ? report.warnings.join(" | ").slice(0, 500) : null,
      duration_ms: Date.now() - started,
    });

  return report;
}

const { supabaseAdmin: _lazy } = await Promise.resolve({ supabaseAdmin: null as unknown }); // no-op to avoid tree-shake removing header import
void _lazy;

export async function runRepresentativesScrape(): Promise<RepsScrapeReport> {
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
  const cities = (cityRows ?? []) as CityRow[];

  const { data: repsRaw } = await (supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (c: string) => { eq: (col: string, val: boolean) => Promise<{ data: Array<{ id: string; name: string; city_id: string }> | null }> };
    };
  })
    .from("representatives")
    .select("id, name, city_id")
    .eq("is_active", true);

  const repsByCity = new Map<string, Array<{ id: string; name_norm: string }>>();
  for (const r of repsRaw ?? []) {
    const list = repsByCity.get(r.city_id) ?? [];
    list.push({ id: r.id, name_norm: normalizeText(r.name) });
    repsByCity.set(r.city_id, list);
  }

  const results: ScrapeCityReport[] = [];
  for (const cfg of SOURCES) {
    const city = cities.find((c) => c.slug === cfg.citySlug);
    if (!city) continue;
    const reps = repsByCity.get(city.id) ?? [];
    const rep = await processSource(fc, cfg, city, reps);
    results.push(rep);
  }

  return { ok: true, duration_ms: Date.now() - started, sources: results };
}
