// Scraper de telefones úteis do site oficial de Vespasiano.
// Usa Firecrawl (map + batch scrape com JSON extraction) para descobrir e extrair contatos.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createFirecrawl } from "@/lib/scraping";

const VESPASIANO_CITY_ID = "c4ccc60b-b17c-4e91-968e-4d38ab42e734";
const BASE_URL = "https://www.vespasiano.mg.gov.br";

const CATEGORIES = [
  "saude",
  "educacao",
  "seguranca",
  "prefeitura",
  "transporte",
  "assistencia_social",
  "emergencia",
  "outros",
] as const;

const ContactSchema = z.object({
  name: z.string(),
  category: z.enum(CATEGORIES).default("outros"),
  subtype: z.string().nullish(),
  description: z.string().nullish(),
  address: z.string().nullish(),
  neighborhood: z.string().nullish(),
  phone: z.string().nullish(),
  phone_secondary: z.string().nullish(),
  whatsapp: z.string().nullish(),
  email: z.string().nullish(),
  website: z.string().nullish(),
  hours: z.string().nullish(),
  is_24h: z.boolean().default(false),
  source_url: z.string().nullish(),
});

export type ScrapedContact = z.infer<typeof ContactSchema>;




const EXTRACT_PROMPT = `Extraia TODOS os serviços públicos, órgãos, secretarias e contatos úteis desta página do site da Prefeitura de Vespasiano/MG.
Para cada item retorne: name (obrigatório), category (uma de: saude, educacao, seguranca, prefeitura, transporte, assistencia_social, emergencia, outros),
subtype (ex: UBS, Hospital, Escola, CRAS), description, address, neighborhood, phone (formato "(31) 0000-0000"), phone_secondary, whatsapp, email, website, hours, is_24h.
Ignore itens sem telefone/endereço/email. Priorize telefones de contato públicos.`;

export const scrapeVespasianoContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      maxPages: z.number().int().min(1).max(40).default(15),
      keyword: z.string().max(80).default("telefone contato secretaria serviço"),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const fc = await createFirecrawl();

    // 1) Descobrir URLs relevantes
    let urls: string[] = [];
    try {
      const mapRes: any = await fc.map(BASE_URL, {
        search: data.keyword,
        limit: 200,
        includeSubdomains: false,
      });
      urls = (mapRes?.links ?? mapRes?.data?.links ?? []).map((l: any) =>
        typeof l === "string" ? l : l?.url,
      ).filter(Boolean);
    } catch (e) {
      console.error("Firecrawl map falhou:", e);
    }

    // Fallback: rota comum
    if (urls.length === 0) urls = [BASE_URL, `${BASE_URL}/servicos`, `${BASE_URL}/contato`];

    // Prioriza páginas com termos úteis
    const KEYWORDS = ["telefone", "contato", "secretaria", "servico", "servi", "saude", "educa", "seguran", "transport", "assisten", "emergen", "unidade"];
    const prioritized = urls
      .filter((u) => u.startsWith(BASE_URL))
      .sort((a, b) => {
        const sa = KEYWORDS.reduce((s, k) => s + (a.toLowerCase().includes(k) ? 1 : 0), 0);
        const sb = KEYWORDS.reduce((s, k) => s + (b.toLowerCase().includes(k) ? 1 : 0), 0);
        return sb - sa;
      })
      .slice(0, data.maxPages);

    if (prioritized.length === 0) {
      return { contacts: [] as ScrapedContact[], visited: [] as string[], errors: ["Nenhuma URL descoberta"] };
    }

    // 2) Batch scrape com extração JSON
    const errors: string[] = [];
    const contacts: ScrapedContact[] = [];

    const jsonFormat = {
      type: "json" as const,
      prompt: EXTRACT_PROMPT,
      schema: {
        type: "object",
        properties: {
          contacts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string", enum: CATEGORIES as unknown as string[] },
                subtype: { type: "string" },
                description: { type: "string" },
                address: { type: "string" },
                neighborhood: { type: "string" },
                phone: { type: "string" },
                phone_secondary: { type: "string" },
                whatsapp: { type: "string" },
                email: { type: "string" },
                website: { type: "string" },
                hours: { type: "string" },
                is_24h: { type: "boolean" },
              },
              required: ["name"],
            },
          },
        },
      },
    };

    // Scrape em paralelo, limitado (para respeitar créditos e evitar bloqueios)
    await Promise.all(
      prioritized.map(async (url) => {
        try {
          const res: any = await fc.scrape(url, {
            formats: [jsonFormat],
            onlyMainContent: true,
            waitFor: 800,
          } as any);
          const payload = res?.json ?? res?.data?.json ?? {};
          const items: any[] = Array.isArray(payload?.contacts) ? payload.contacts : [];
          for (const it of items) {
            const parsed = ContactSchema.safeParse({ ...it, source_url: url });
            if (parsed.success && parsed.data.name?.trim()) {
              contacts.push(parsed.data);
            }
          }
        } catch (e: any) {
          errors.push(`${url}: ${e?.message ?? "erro"}`);
        }
      }),
    );

    // Deduplicar por nome+telefone
    const seen = new Set<string>();
    const unique = contacts.filter((c) => {
      const key = `${(c.name ?? "").toLowerCase().trim()}|${(c.phone ?? "").replace(/\D/g, "")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { contacts: unique, visited: prioritized, errors };
  });

export const importScrapedContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ contacts: z.array(ContactSchema).min(1).max(500) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const rows = data.contacts.map((c) => ({
      name: c.name.trim(),
      category: c.category,
      subtype: c.subtype || null,
      description: c.description || null,
      address: c.address || null,
      neighborhood: c.neighborhood || null,
      phone: c.phone || null,
      phone_secondary: c.phone_secondary || null,
      whatsapp: c.whatsapp || null,
      email: c.email || null,
      website: c.website || c.source_url || null,
      hours: c.hours || null,
      is_24h: !!c.is_24h,
      city_id: VESPASIANO_CITY_ID,
      active: true,
      featured: false,
    }));
    const { error, count } = await context.supabase
      .from("public_services")
      .insert(rows, { count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? rows.length };
  });
