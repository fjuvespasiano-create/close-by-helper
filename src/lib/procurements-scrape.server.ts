/**
 * Scraper de Editais / Licitações — Vespasiano e São José da Lapa.
 *
 * Estratégia:
 *  1. Para cada cidade, roda `firecrawl.map` no portal oficial usando termos
 *     de busca ("licitacao", "edital", "pregao"...) para descobrir URLs.
 *  2. Filtra as top-N URLs que aparentam ser páginas de edital/lista.
 *  3. Faz `firecrawl.scrape` com formato `json` + schema tipado, deixando o
 *     LLM extrair os campos estruturados.
 *  4. Normaliza e faz upsert em `public.procurements` (idempotente).
 *
 * Robustez: try/catch por URL — falhas viram warnings, não abortam o job.
 * Timeouts curtos, limite de páginas por cidade, dedupe via unique indexes.
 */

import Firecrawl from "@mendable/firecrawl-js";
import { createHash } from "node:crypto";

type CityConfig = {
  slug: string;
  cityId: string;
  name: string;
  site: string;
  host: string;
};

const CITIES: CityConfig[] = [
  {
    slug: "vespasiano",
    cityId: "c4ccc60b-b17c-4e91-968e-4d38ab42e734",
    name: "Vespasiano",
    site: "https://www.vespasiano.mg.gov.br",
    host: "vespasiano.mg.gov.br",
  },
  {
    slug: "sao-jose-da-lapa",
    cityId: "d9203559-409c-4512-ae93-a5d398afe0b0",
    name: "São José da Lapa",
    site: "https://www.saojosedalapa.mg.gov.br",
    host: "saojosedalapa.mg.gov.br",
  },
];

const SEARCH_TERMS = [
  "licitacao",
  "licitação",
  "edital",
  "pregao",
  "pregão",
  "tomada de precos",
  "dispensa",
  "chamada publica",
  "processo licitatorio",
];

const MAX_URLS_PER_CITY = 25;
const MAP_LIMIT = 60;
const SCRAPE_TIMEOUT_MS = 45_000;

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    procurements: {
      type: "array",
      description:
        "Editais de licitação, pregões, dispensas ou chamadas públicas listados nesta página. Ignore avisos genéricos sem número/objeto.",
      items: {
        type: "object",
        properties: {
          external_id: {
            type: "string",
            description: "Número/identificador do edital na origem (ex.: 'PE 012/2025', 'TP 003/2024').",
          },
          process_number: { type: "string", description: "Número do processo administrativo." },
          modality: {
            type: "string",
            description:
              "Modalidade normalizada: pregao_eletronico, pregao_presencial, tomada_precos, concorrencia, dispensa, inexigibilidade, chamada_publica, outros.",
          },
          title: { type: "string", description: "Título curto do edital." },
          object: { type: "string", description: "Descrição do objeto licitado (1-3 frases)." },
          agency: { type: "string", description: "Órgão/secretaria responsável." },
          status: {
            type: "string",
            description: "Status: open, suspended, canceled, finished, unknown.",
          },
          publish_date: { type: "string", description: "Data de publicação (YYYY-MM-DD)." },
          opening_date: { type: "string", description: "Data/hora de abertura das propostas (ISO 8601)." },
          deadline_date: { type: "string", description: "Prazo limite de entrega (ISO 8601)." },
          estimated_value: { type: "number", description: "Valor estimado em BRL." },
          files: {
            type: "array",
            description: "Arquivos anexos (PDFs, planilhas).",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                url: { type: "string" },
              },
              required: ["url"],
            },
          },
        },
        required: ["title"],
      },
    },
  },
  required: ["procurements"],
} as const;

type ExtractedProcurement = {
  external_id?: string;
  process_number?: string;
  modality?: string;
  title: string;
  object?: string;
  agency?: string;
  status?: string;
  publish_date?: string;
  opening_date?: string;
  deadline_date?: string;
  estimated_value?: number;
  files?: Array<{ name?: string; url: string }>;
};

type NormalizedRow = {
  city_id: string;
  source_site: string;
  source_url: string;
  external_id: string | null;
  process_number: string | null;
  modality: string | null;
  title: string;
  object: string | null;
  agency: string | null;
  status: string;
  publish_date: string | null;
  opening_date: string | null;
  deadline_date: string | null;
  estimated_value: number | null;
  files: Array<{ name?: string; url: string }>;
  content_hash: string;
  scraped_at: string;
};

type CityReport = {
  city: string;
  mapped_urls: number;
  scraped_urls: number;
  extracted: number;
  upserted: number;
  warnings: string[];
};

const VALID_MODALITIES = new Set([
  "pregao_eletronico",
  "pregao_presencial",
  "tomada_precos",
  "concorrencia",
  "dispensa",
  "inexigibilidade",
  "chamada_publica",
  "outros",
]);

const VALID_STATUS = new Set(["open", "suspended", "canceled", "finished", "unknown"]);

function normalizeModality(raw?: string): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim().replace(/\s+/g, "_").replace(/[çÇ]/g, "c").replace(/[ãáâà]/g, "a");
  if (VALID_MODALITIES.has(v)) return v;
  if (v.includes("pregao_eletronico") || v.includes("pregao_e")) return "pregao_eletronico";
  if (v.includes("pregao")) return "pregao_presencial";
  if (v.includes("tomada")) return "tomada_precos";
  if (v.includes("concorren")) return "concorrencia";
  if (v.includes("dispensa")) return "dispensa";
  if (v.includes("inexigib")) return "inexigibilidade";
  if (v.includes("chamada")) return "chamada_publica";
  return "outros";
}

function normalizeStatus(raw?: string): string {
  if (!raw) return "unknown";
  const v = raw.toLowerCase().trim();
  if (VALID_STATUS.has(v)) return v;
  if (v.includes("aberto") || v.includes("public")) return "open";
  if (v.includes("suspen")) return "suspended";
  if (v.includes("cancel") || v.includes("revog")) return "canceled";
  if (v.includes("encerr") || v.includes("finaliz") || v.includes("homolog")) return "finished";
  return "unknown";
}

function parseDate(raw?: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // aceita dd/mm/yyyy
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function parseDateTime(raw?: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return null;
}

function urlLooksRelevant(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("licit") ||
    u.includes("edital") ||
    u.includes("pregao") ||
    u.includes("pregão") ||
    u.includes("dispens") ||
    u.includes("chamad") ||
    u.includes("processo")
  );
}

function hashRow(row: Omit<NormalizedRow, "content_hash" | "scraped_at">): string {
  const payload = JSON.stringify({
    t: row.title,
    o: row.object,
    ext: row.external_id,
    proc: row.process_number,
    mod: row.modality,
    st: row.status,
    pd: row.publish_date,
    od: row.opening_date,
    dd: row.deadline_date,
    v: row.estimated_value,
    f: row.files.map((f) => f.url).sort(),
  });
  return createHash("sha256").update(payload).digest("hex");
}

async function firecrawlMap(fc: Firecrawl, site: string): Promise<string[]> {
  const seen = new Set<string>();
  for (const term of SEARCH_TERMS) {
    try {
      const res = await fc.map(site, { search: term, limit: MAP_LIMIT, includeSubdomains: true });
      const links = (res as { links?: Array<string | { url?: string }> }).links ?? [];
      for (const link of links) {
        const url = typeof link === "string" ? link : link?.url;
        if (url && urlLooksRelevant(url)) seen.add(url);
        if (seen.size >= MAX_URLS_PER_CITY) break;
      }
      if (seen.size >= MAX_URLS_PER_CITY) break;
    } catch (err) {
      console.warn("[procurements] map failed", site, term, err);
    }
  }
  return Array.from(seen).slice(0, MAX_URLS_PER_CITY);
}

async function scrapeOne(
  fc: Firecrawl,
  url: string,
): Promise<{ items: ExtractedProcurement[]; error?: string }> {
  try {
    const res = await fc.scrape(url, {
      formats: [
        {
          type: "json",
          schema: EXTRACTION_SCHEMA,
          prompt:
            "Extraia todos os editais de licitação (pregões, tomadas de preço, dispensas, chamadas públicas) listados. Sempre que possível, capture número/identificador, objeto, órgão, datas e links dos arquivos.",
        },
      ],
      onlyMainContent: true,
      timeout: SCRAPE_TIMEOUT_MS,
    });
    const json =
      (res as { json?: { procurements?: ExtractedProcurement[] } }).json ??
      (res as { data?: { json?: { procurements?: ExtractedProcurement[] } } }).data?.json;
    return { items: json?.procurements ?? [] };
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : String(err) };
  }
}

function normalize(
  city: CityConfig,
  sourceUrl: string,
  raw: ExtractedProcurement,
): NormalizedRow | null {
  const title = raw.title?.trim();
  if (!title || title.length < 5) return null;
  const partial = {
    city_id: city.cityId,
    source_site: city.host,
    source_url: sourceUrl,
    external_id: raw.external_id?.trim() || null,
    process_number: raw.process_number?.trim() || null,
    modality: normalizeModality(raw.modality),
    title,
    object: raw.object?.trim() || null,
    agency: raw.agency?.trim() || null,
    status: normalizeStatus(raw.status),
    publish_date: parseDate(raw.publish_date),
    opening_date: parseDateTime(raw.opening_date),
    deadline_date: parseDateTime(raw.deadline_date),
    estimated_value: typeof raw.estimated_value === "number" ? raw.estimated_value : null,
    files: (raw.files ?? []).filter((f) => f?.url).slice(0, 20),
  };
  return {
    ...partial,
    content_hash: hashRow(partial),
    scraped_at: new Date().toISOString(),
  };
}

export async function scrapeAllProcurements(): Promise<CityReport[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");
  const fc = new Firecrawl({ apiKey });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const reports: CityReport[] = [];

  for (const city of CITIES) {
    const report: CityReport = {
      city: city.name,
      mapped_urls: 0,
      scraped_urls: 0,
      extracted: 0,
      upserted: 0,
      warnings: [],
    };

    const urls = await firecrawlMap(fc, city.site);
    report.mapped_urls = urls.length;
    if (urls.length === 0) {
      report.warnings.push("Nenhuma URL relevante retornada pelo map.");
    }

    for (const url of urls) {
      const { items, error } = await scrapeOne(fc, url);
      report.scraped_urls += 1;
      if (error) {
        report.warnings.push(`scrape ${url}: ${error}`);
        continue;
      }
      const rows = items
        .map((it) => normalize(city, url, it))
        .filter((r): r is NormalizedRow => r !== null);
      report.extracted += rows.length;
      if (rows.length === 0) continue;

      // Split por ter/não ter external_id (índices únicos diferentes)
      const withExt = rows.filter((r) => r.external_id !== null);
      const withoutExt = rows.filter((r) => r.external_id === null);

      if (withExt.length > 0) {
        const { error: upErr, count } = await supabaseAdmin
          .from("procurements")
          .upsert(withExt, {
            onConflict: "city_id,source_site,external_id",
            ignoreDuplicates: false,
            count: "exact",
          });
        if (upErr) report.warnings.push(`upsert ext (${url}): ${upErr.message}`);
        else report.upserted += count ?? withExt.length;
      }
      if (withoutExt.length > 0) {
        const { error: upErr, count } = await supabaseAdmin
          .from("procurements")
          .upsert(withoutExt, {
            onConflict: "city_id,source_url,title",
            ignoreDuplicates: false,
            count: "exact",
          });
        if (upErr) report.warnings.push(`upsert notitle (${url}): ${upErr.message}`);
        else report.upserted += count ?? withoutExt.length;
      }
    }

    reports.push(report);
  }

  return reports;
}
