/**
 * Scraper de Serviços Públicos - Vespasiano e São José da Lapa.
 *
 * Estratégia:
 *  1. Para cada cidade + categoria, usa Firecrawl `map` no site oficial da
 *     prefeitura filtrando por termos-chave para descobrir páginas relevantes.
 *  2. Faz `scrape` das top-N páginas com formato `json` + schema tipado,
 *     deixando o LLM extrair unidades/serviços com endereço/telefone/horário.
 *  3. Normaliza e faz upsert em `public_services` por (city_id, category, lower(name)).
 *
 * Robustez: try/catch por página; erros individuais viram warnings no report,
 * não abortam o job. Timeouts curtos e limite de páginas por categoria.
 */

import Firecrawl from "@mendable/firecrawl-js";

type Category =
  | "saude"
  | "educacao"
  | "seguranca"
  | "prefeitura"
  | "transporte"
  | "assistencia_social"
  | "emergencia"
  | "outros";

type CityConfig = {
  slug: string;
  cityId: string;
  name: string;
  site: string;
};

type CategorySearch = {
  category: Category;
  terms: string[]; // termos usados no map.search
  subtypeHint: string;
};

const CATEGORY_SEARCHES: CategorySearch[] = [
  { category: "saude", terms: ["saude", "ubs", "hospital", "upa", "posto"], subtypeHint: "Unidade de Saúde" },
  { category: "educacao", terms: ["educacao", "escola", "creche", "cmei"], subtypeHint: "Escola" },
  { category: "seguranca", terms: ["seguranca", "policia", "guarda", "delegacia"], subtypeHint: "Segurança Pública" },
  { category: "prefeitura", terms: ["secretaria", "prefeitura", "orgao"], subtypeHint: "Órgão Municipal" },
  { category: "transporte", terms: ["transporte", "rodoviaria", "onibus"], subtypeHint: "Transporte" },
  {
    category: "assistencia_social",
    terms: ["assistencia social", "cras", "creas", "bolsa"],
    subtypeHint: "Assistência Social",
  },
  { category: "emergencia", terms: ["emergencia", "samu", "bombeiros", "defesa civil"], subtypeHint: "Emergência" },
];

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    services: {
      type: "array",
      description:
        "Lista de estabelecimentos ou serviços públicos citados nesta página com dados de contato. Ignore itens sem nome próprio.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome oficial do estabelecimento/serviço" },
          subtype: {
            type: "string",
            description: "Tipo específico (ex: UBS, UPA, Escola Municipal, Secretaria, CRAS)",
          },
          address: { type: "string", description: "Endereço completo (rua, número, bairro)" },
          neighborhood: { type: "string" },
          phone: { type: "string", description: "Telefone principal com DDD" },
          phone_secondary: { type: "string" },
          whatsapp: { type: "string" },
          email: { type: "string" },
          hours: { type: "string", description: "Horário de funcionamento em texto livre" },
          is_24h: { type: "boolean" },
          website: { type: "string" },
          description: { type: "string", description: "1-2 frases sobre o serviço prestado" },
        },
        required: ["name"],
      },
    },
  },
  required: ["services"],
} as const;

type ExtractedService = {
  name: string;
  subtype?: string;
  address?: string;
  neighborhood?: string;
  phone?: string;
  phone_secondary?: string;
  whatsapp?: string;
  email?: string;
  hours?: string;
  is_24h?: boolean;
  website?: string;
  description?: string;
};

const MAX_PAGES_PER_TERM = 2; // páginas top por termo (custo controlado)
const MAX_URLS_PER_CATEGORY = 4;
const SCRAPE_TIMEOUT_MS = 45_000;

function normalizePhone(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const clean = v.replace(/[^\d+]/g, "");
  return clean.length >= 8 ? v.trim() : undefined;
}

function sanitizeService(raw: ExtractedService, hint: string): ExtractedService | null {
  const name = (raw.name || "").trim();
  if (!name || name.length < 3 || name.length > 200) return null;
  // Filtra lixo comum (menus, categorias genéricas)
  const lower = name.toLowerCase();
  const blacklist = ["página", "clique aqui", "leia mais", "notícia", "menu", "voltar", "início"];
  if (blacklist.some((b) => lower.includes(b))) return null;

  return {
    name,
    subtype: raw.subtype?.trim() || hint,
    address: raw.address?.trim(),
    neighborhood: raw.neighborhood?.trim(),
    phone: normalizePhone(raw.phone),
    phone_secondary: normalizePhone(raw.phone_secondary),
    whatsapp: normalizePhone(raw.whatsapp),
    email: raw.email?.trim().toLowerCase(),
    hours: raw.hours?.trim(),
    is_24h: Boolean(raw.is_24h),
    website: raw.website?.trim(),
    description: raw.description?.trim(),
  };
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms)),
  ]);
}

async function discoverUrls(fc: Firecrawl, site: string, terms: string[]): Promise<string[]> {
  const urls = new Set<string>();
  for (const term of terms) {
    try {
      const res = await withTimeout(
        fc.map(site, { search: term, limit: MAX_PAGES_PER_TERM, includeSubdomains: false }),
        SCRAPE_TIMEOUT_MS,
        `map(${term})`,
      );
      const links = (res as { links?: Array<string | { url?: string }> }).links ?? [];
      for (const l of links) {
        const u = typeof l === "string" ? l : l?.url;
        if (u && u.startsWith("http")) urls.add(u);
        if (urls.size >= MAX_URLS_PER_CATEGORY) break;
      }
    } catch (err) {
      console.warn(`[scraper] map falhou (${site} / ${term}):`, err instanceof Error ? err.message : err);
    }
    if (urls.size >= MAX_URLS_PER_CATEGORY) break;
  }
  return [...urls].slice(0, MAX_URLS_PER_CATEGORY);
}

async function extractPage(fc: Firecrawl, url: string): Promise<ExtractedService[]> {
  try {
    const res = await withTimeout(
      fc.scrape(url, {
        formats: [{ type: "json", schema: EXTRACTION_SCHEMA }],
        onlyMainContent: true,
      }),
      SCRAPE_TIMEOUT_MS,
      `scrape(${url})`,
    );
    const json = (res as { json?: { services?: ExtractedService[] }; data?: { json?: { services?: ExtractedService[] } } })
      .json ??
      (res as { data?: { json?: { services?: ExtractedService[] } } }).data?.json;
    return json?.services ?? [];
  } catch (err) {
    console.warn(`[scraper] scrape falhou (${url}):`, err instanceof Error ? err.message : err);
    return [];
  }
}

export async function runServicesScrape(): Promise<{
  ok: boolean;
  duration_ms: number;
  cities: Array<{
    city: string;
    total_extracted: number;
    total_upserted: number;
    per_category: Record<string, { urls: number; extracted: number; upserted: number }>;
    warnings: string[];
  }>;
}> {
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
    site: c.slug === "vespasiano" ? "https://www.vespasiano.mg.gov.br" : "https://www.saojosedalapa.mg.gov.br",
  }));

  const report: Awaited<ReturnType<typeof runServicesScrape>>["cities"] = [];

  for (const cfg of configs) {
    const cityReport: (typeof report)[number] = {
      city: cfg.slug,
      total_extracted: 0,
      total_upserted: 0,
      per_category: {},
      warnings: [],
    };

    for (const catSearch of CATEGORY_SEARCHES) {
      const perCat = { urls: 0, extracted: 0, upserted: 0 };
      const urls = await discoverUrls(fc, cfg.site, catSearch.terms);
      perCat.urls = urls.length;

      const collected: ExtractedService[] = [];
      for (const url of urls) {
        const items = await extractPage(fc, url);
        for (const raw of items) {
          const clean = sanitizeService(raw, catSearch.subtypeHint);
          if (clean) collected.push(clean);
        }
      }
      perCat.extracted = collected.length;
      cityReport.total_extracted += collected.length;

      if (collected.length) {
        // dedup por lower(name) dentro do lote
        const seen = new Set<string>();
        const rows = collected
          .filter((s) => {
            const k = s.name.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .map((s) => ({
            city_id: cfg.cityId,
            category: catSearch.category,
            name: s.name,
            subtype: s.subtype ?? null,
            description: s.description ?? null,
            address: s.address ?? null,
            neighborhood: s.neighborhood ?? null,
            phone: s.phone ?? null,
            phone_secondary: s.phone_secondary ?? null,
            whatsapp: s.whatsapp ?? null,
            email: s.email ?? null,
            website: s.website ?? null,
            hours: s.hours ?? null,
            is_24h: s.is_24h ?? false,
            active: true,
          }));

        // upsert em batches
        for (let i = 0; i < rows.length; i += 200) {
          const batch = rows.slice(i, i + 200);
          const { error } = await supabaseAdmin
            .from("public_services")
            .upsert(batch, { onConflict: "city_id,category,name", ignoreDuplicates: false });
          if (error) {
            cityReport.warnings.push(`upsert ${catSearch.category}: ${error.message}`);
          } else {
            perCat.upserted += batch.length;
          }
        }
        cityReport.total_upserted += perCat.upserted;
      }

      cityReport.per_category[catSearch.category] = perCat;
    }

    report.push(cityReport);
  }

  return { ok: true, duration_ms: Date.now() - started, cities: report };
}
