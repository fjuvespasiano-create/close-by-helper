import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function serverClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

type Source = "blog" | "empresa" | "evento";
type Item = {
  key: string; // source:id
  source: Source;
  sourceLabel: string;
  id: string;
  title: string;
  url: string;
  text: string; // normalized full text
  paragraphs: string[]; // normalized paragraphs (>= 60 chars)
};

const STOP = new Set([
  "a","o","as","os","de","da","do","das","dos","e","é","em","no","na","nos","nas","um","uma","uns","umas",
  "para","por","com","que","se","ao","à","às","aos","ou","the","and","of","to","in","on","for","is","at","as",
]);

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ");
}
function normalize(raw: string | null | undefined): string {
  if (!raw) return "";
  return stripHtml(String(raw))
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokens(s: string): string[] {
  return s.split(" ").filter((t) => t.length > 2 && !STOP.has(t));
}
function shingles(toks: string[], k = 5): Set<string> {
  const out = new Set<string>();
  if (toks.length < k) { if (toks.length) out.add(toks.join(" ")); return out; }
  for (let i = 0; i <= toks.length - k; i++) out.add(toks.slice(i, i + k).join(" "));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const s of small) if (large.has(s)) inter++;
  return inter / (a.size + b.size - inter);
}
function extractParagraphs(raw: string): string[] {
  const clean = stripHtml(raw);
  return clean
    .split(/\n\n+|(?<=[.!?])\s{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 60);
}
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

const InputSchema = z.object({
  threshold: z.number().min(0.3).max(0.99).default(0.6),
  sources: z.array(z.enum(["blog", "empresa", "evento"])).default(["blog", "empresa", "evento"]),
  crossSource: z.boolean().default(false),
});

export type DuplicatePair = {
  a: { key: string; source: Source; sourceLabel: string; title: string; url: string };
  b: { key: string; source: Source; sourceLabel: string; title: string; url: string };
  similarity: number;
  sharedParagraphs: string[];
};
export type ScanResult = {
  scannedAt: string;
  totalItems: number;
  bySource: Record<Source, number>;
  threshold: number;
  pairs: DuplicatePair[];
  paragraphClusters: { snippet: string; occurrences: { key: string; sourceLabel: string; title: string; url: string }[] }[];
};

async function loadItems(supabase: ReturnType<typeof serverClient>, sources: Source[]): Promise<Item[]> {
  const items: Item[] = [];
  if (sources.includes("blog")) {
    const { data } = await supabase.from("posts")
      .select("id, slug, title, excerpt, content, status")
      .eq("type", "blog");
    for (const r of data ?? []) {
      const raw = `${r.title ?? ""}\n\n${r.excerpt ?? ""}\n\n${r.content ?? ""}`;
      items.push({
        key: `blog:${r.id}`, source: "blog", sourceLabel: "Blog", id: r.id,
        title: r.title ?? "(sem título)",
        url: `/blog/${r.slug}`,
        text: normalize(raw),
        paragraphs: extractParagraphs(`${r.excerpt ?? ""}\n\n${r.content ?? ""}`),
      });
    }
  }
  if (sources.includes("empresa")) {
    const { data } = await supabase.from("companies")
      .select("id, slug, name, description")
      .not("description", "is", null);
    for (const r of data ?? []) {
      const raw = `${r.name ?? ""}\n\n${r.description ?? ""}`;
      items.push({
        key: `empresa:${r.id}`, source: "empresa", sourceLabel: "Empresa", id: r.id,
        title: r.name ?? "(sem nome)",
        url: `/empresa/${r.slug}`,
        text: normalize(raw),
        paragraphs: extractParagraphs(r.description ?? ""),
      });
    }
  }
  if (sources.includes("evento")) {
    const { data } = await supabase.from("events")
      .select("id, slug, title, description")
      .not("description", "is", null);
    for (const r of data ?? []) {
      const raw = `${r.title ?? ""}\n\n${r.description ?? ""}`;
      items.push({
        key: `evento:${r.id}`, source: "evento", sourceLabel: "Evento", id: r.id,
        title: r.title ?? "(sem título)",
        url: `/eventos/${r.slug}`,
        text: normalize(raw),
        paragraphs: extractParagraphs(r.description ?? ""),
      });
    }
  }
  return items.filter((i) => tokens(i.text).length >= 20);
}

export const scanDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data, context }): Promise<ScanResult> => {
    const userId = (context as { userId?: string }).userId;
    if (!userId) throw new Response("Unauthorized", { status: 401 });
    const supabase = serverClient();
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const items = await loadItems(supabase, data.sources);
    // Precompute shingles
    const sh = items.map((it) => shingles(tokens(it.text), 5));

    const pairs: DuplicatePair[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (!data.crossSource && items[i].source !== items[j].source) continue;
        const sim = jaccard(sh[i], sh[j]);
        if (sim < data.threshold) continue;
        // Find shared full paragraphs
        const setB = new Set(items[j].paragraphs.map((p) => normalize(p)));
        const shared: string[] = [];
        for (const p of items[i].paragraphs) {
          const np = normalize(p);
          if (np.length >= 60 && setB.has(np)) shared.push(p.slice(0, 240));
        }
        pairs.push({
          a: { key: items[i].key, source: items[i].source, sourceLabel: items[i].sourceLabel, title: items[i].title, url: items[i].url },
          b: { key: items[j].key, source: items[j].source, sourceLabel: items[j].sourceLabel, title: items[j].title, url: items[j].url },
          similarity: Math.round(sim * 1000) / 1000,
          sharedParagraphs: shared.slice(0, 5),
        });
      }
    }
    pairs.sort((a, b) => b.similarity - a.similarity);

    // Cross-item paragraph clusters (exact-duplicate paragraphs across ≥2 items)
    const parMap = new Map<string, { snippet: string; occ: Set<string> }>();
    for (const it of items) {
      for (const p of it.paragraphs) {
        const np = normalize(p);
        if (np.length < 80) continue;
        const key = hashStr(np);
        const entry = parMap.get(key) ?? { snippet: p.slice(0, 240), occ: new Set<string>() };
        entry.occ.add(it.key);
        parMap.set(key, entry);
      }
    }
    const itemByKey = new Map(items.map((i) => [i.key, i]));
    const paragraphClusters = Array.from(parMap.values())
      .filter((e) => e.occ.size >= 2)
      .map((e) => ({
        snippet: e.snippet,
        occurrences: Array.from(e.occ).map((k) => {
          const it = itemByKey.get(k)!;
          return { key: k, sourceLabel: it.sourceLabel, title: it.title, url: it.url };
        }),
      }))
      .sort((a, b) => b.occurrences.length - a.occurrences.length)
      .slice(0, 50);

    const bySource: Record<Source, number> = { blog: 0, empresa: 0, evento: 0 };
    for (const it of items) bySource[it.source]++;

    return {
      scannedAt: new Date().toISOString(),
      totalItems: items.length,
      bySource,
      threshold: data.threshold,
      pairs: pairs.slice(0, 500),
      paragraphClusters,
    };
  });
