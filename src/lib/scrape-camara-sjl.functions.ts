// Scraper de vereadores/prefeito da Câmara Municipal de São José da Lapa.
// Usa Firecrawl (map + scrape com JSON extraction) para descobrir páginas de
// parlamentares e extrair dados estruturados. Idempotente via upsert por slug.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SJL_CITY_ID = "d9203559-409c-4512-ae93-a5d398afe0b0";
const BASE_URL = "https://www.camarasaojosedalapa.mg.gov.br";
const CURRENT_MANDATE_START = "2025-01-01";
const CURRENT_MANDATE_END = "2028-12-31";
const SCRAPE_TIMEOUT_MS = 45_000;
const MAX_URLS = 40;

const RoleEnum = z.enum(["prefeito", "vice_prefeito", "vereador"]);

const RepresentativeSchema = z.object({
  name: z.string().min(3).max(160),
  role: RoleEnum.default("vereador"),
  party: z.string().max(40).nullish(),
  photo_url: z.string().url().nullish(),
  email: z.string().email().nullish(),
  phone: z.string().max(40).nullish(),
  bio: z.string().max(4000).nullish(),
  mandate_start: z.string().nullish(),
  mandate_end: z.string().nullish(),
  source_url: z.string().url().nullish(),
  facebook: z.string().url().nullish(),
  instagram: z.string().url().nullish(),
});

export type ScrapedRepresentative = z.infer<typeof RepresentativeSchema>;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

function slugify(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function absolutize(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

function normPhone(v: string | null | undefined): string | null {
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return v.trim();
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms)),
  ]);
}

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    representatives: {
      type: "array",
      description:
        "Lista de vereadores, prefeito ou vice-prefeito citados nesta página. Ignore ex-mandatários, servidores administrativos, funcionários e nomes de comissões.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome completo (não use apelido isolado)" },
          role: {
            type: "string",
            enum: ["prefeito", "vice_prefeito", "vereador"],
            description: "Cargo eletivo",
          },
          party: { type: "string", description: "Sigla do partido, ex: PT, PSD, MDB, PP" },
          photo_url: { type: "string", description: "URL da foto/retrato oficial" },
          email: { type: "string", description: "E-mail institucional público" },
          phone: { type: "string", description: "Telefone público (fixo ou celular)" },
          bio: { type: "string", description: "Mini-biografia ou apresentação em 1-3 parágrafos" },
          mandate_start: { type: "string", description: "Início do mandato ISO YYYY-MM-DD" },
          mandate_end: { type: "string", description: "Fim do mandato ISO YYYY-MM-DD" },
          facebook: { type: "string", description: "URL do Facebook" },
          instagram: { type: "string", description: "URL do Instagram" },
        },
        required: ["name"],
      },
    },
  },
  required: ["representatives"],
} as const;

const KEYWORDS = ["vereador", "vereadores", "parlamentar", "camara", "mesa", "diretor", "presiden", "biografia", "gabinete"];

/**
 * Descobre URLs relevantes no site da Câmara de SJL.
 * Combina Firecrawl map (com filtro semântico) + fallback para páginas comuns.
 */
export const scrapeCamaraSjlReps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      maxPages: z.number().int().min(1).max(MAX_URLS).default(20),
      keyword: z.string().max(120).default("vereador parlamentar câmara mesa diretora"),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada.");

    const { default: Firecrawl } = await import("@mendable/firecrawl-js");
    const fc = new Firecrawl({ apiKey });

    // 1) Discovery
    let urls: string[] = [];
    try {
      const mapRes: any = await withTimeout(
        fc.map(BASE_URL, { search: data.keyword, limit: 200, includeSubdomains: false }),
        SCRAPE_TIMEOUT_MS,
        "map",
      );
      urls = (mapRes?.links ?? mapRes?.data?.links ?? [])
        .map((l: any) => (typeof l === "string" ? l : l?.url))
        .filter((u: string | undefined) => !!u && u.startsWith(BASE_URL));
    } catch (e) {
      console.warn("[camara-sjl] map falhou:", e);
    }

    // Fallback: URLs comuns em portais de câmaras (SAPL, Portal Modelo, etc.)
    const fallbacks = [
      `${BASE_URL}/parlamentares`,
      `${BASE_URL}/vereadores`,
      `${BASE_URL}/camara/vereadores`,
      `${BASE_URL}/institucional/parlamentares`,
      `${BASE_URL}/mesa-diretora`,
      `${BASE_URL}/`,
    ];
    fallbacks.forEach((u) => { if (!urls.includes(u)) urls.push(u); });

    // Prioriza páginas com termos indicativos
    const prioritized = urls
      .sort((a, b) => {
        const sa = KEYWORDS.reduce((s, k) => s + (a.toLowerCase().includes(k) ? 1 : 0), 0);
        const sb = KEYWORDS.reduce((s, k) => s + (b.toLowerCase().includes(k) ? 1 : 0), 0);
        return sb - sa;
      })
      .slice(0, data.maxPages);

    // 2) Extração em paralelo com delays entre lotes para não estressar o site
    const errors: string[] = [];
    const collected: ScrapedRepresentative[] = [];

    const jsonFormat = {
      type: "json" as const,
      schema: EXTRACT_SCHEMA,
      prompt:
        "Extraia APENAS pessoas com mandato eletivo atual (vereadores, prefeito, vice-prefeito) da Câmara/Prefeitura de São José da Lapa/MG. Ignore assessores, servidores, ex-parlamentares e nomes de comissões.",
    };

    const BATCH = 4;
    for (let i = 0; i < prioritized.length; i += BATCH) {
      const chunk = prioritized.slice(i, i + BATCH);
      await Promise.all(
        chunk.map(async (url) => {
          try {
            const res: any = await withTimeout(
              fc.scrape(url, {
                formats: [jsonFormat],
                onlyMainContent: true,
                waitFor: 1000,
              } as any),
              SCRAPE_TIMEOUT_MS,
              `scrape(${url})`,
            );
            const payload = res?.json ?? res?.data?.json ?? {};
            const items: any[] = Array.isArray(payload?.representatives) ? payload.representatives : [];
            for (const it of items) {
              const parsed = RepresentativeSchema.safeParse({
                ...it,
                photo_url: absolutize(it.photo_url, url),
                facebook: absolutize(it.facebook, url),
                instagram: absolutize(it.instagram, url),
                phone: normPhone(it.phone),
                source_url: url,
              });
              if (parsed.success) collected.push(parsed.data);
            }
          } catch (e: any) {
            errors.push(`${url}: ${e?.message ?? "erro"}`);
          }
        }),
      );
      // pequeno delay entre lotes (rate limiting cortês)
      if (i + BATCH < prioritized.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // 3) Dedupe por slug do nome, mesclando campos (prioriza o registro mais completo)
    const byKey = new Map<string, ScrapedRepresentative>();
    for (const r of collected) {
      const key = slugify(r.name);
      const prev = byKey.get(key);
      if (!prev) { byKey.set(key, r); continue; }
      byKey.set(key, {
        ...prev,
        party: prev.party ?? r.party,
        photo_url: prev.photo_url ?? r.photo_url,
        email: prev.email ?? r.email,
        phone: prev.phone ?? r.phone,
        bio: (prev.bio && prev.bio.length >= (r.bio?.length ?? 0)) ? prev.bio : r.bio,
        mandate_start: prev.mandate_start ?? r.mandate_start,
        mandate_end: prev.mandate_end ?? r.mandate_end,
        facebook: prev.facebook ?? r.facebook,
        instagram: prev.instagram ?? r.instagram,
        source_url: prev.source_url ?? r.source_url,
      });
    }

    const unique = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
    return { representatives: unique, visited: prioritized, errors };
  });

/**
 * Importa (upsert) os representantes selecionados na tabela `representatives`.
 * Faz update se já existe (por slug + city_id), preservando id e histórico.
 */
export const importScrapedCamaraSjlReps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ representatives: z.array(RepresentativeSchema).min(1).max(60) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    // Busca existentes para decidir insert vs update
    const slugs = data.representatives.map((r) => slugify(r.name));
    const { data: existing, error: existErr } = await context.supabase
      .from("representatives")
      .select("id, slug")
      .eq("city_id", SJL_CITY_ID)
      .in("slug", slugs);
    if (existErr) throw new Error(`lookup: ${existErr.message}`);
    const bySlug = new Map<string, string>((existing ?? []).map((e: any) => [e.slug, e.id]));

    let inserted = 0;
    let updated = 0;
    const warnings: string[] = [];

    for (const r of data.representatives) {
      const slug = slugify(r.name);
      const social_links: Record<string, string> = {};
      if (r.facebook) social_links.facebook = r.facebook;
      if (r.instagram) social_links.instagram = r.instagram;

      const payload: Record<string, unknown> = {
        name: r.name.trim(),
        slug,
        role: r.role,
        city_id: SJL_CITY_ID,
        party: r.party?.trim() || null,
        photo_url: r.photo_url || null,
        email: r.email || null,
        phone: r.phone || null,
        bio: r.bio?.trim() || null,
        mandate_start: r.mandate_start || CURRENT_MANDATE_START,
        mandate_end: r.mandate_end || CURRENT_MANDATE_END,
        social_links: Object.keys(social_links).length ? social_links : null,
        is_active: true,
      };

      const existingId = bySlug.get(slug);
      if (existingId) {
        const { error } = await context.supabase
          .from("representatives").update(payload as never).eq("id", existingId);
        if (error) warnings.push(`update ${slug}: ${error.message}`);
        else updated++;
      } else {
        const { error } = await context.supabase.from("representatives").insert(payload as never);
        if (error) warnings.push(`insert ${slug}: ${error.message}`);
        else inserted++;
      }
    }

    return { inserted, updated, warnings };
  });
