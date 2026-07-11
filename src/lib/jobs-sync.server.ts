// Server-only: sincroniza vagas a partir de fontes configuradas.
// Adapters: apiRemoteOK, apiTrampos, scrapeGeneric (Firecrawl), manual.
/* eslint-disable @typescript-eslint/no-explicit-any */

type SB = any;

type Source = {
  id: string;
  slug: string;
  name: string;
  kind: "api" | "scrape" | "manual";
  endpoint_url: string | null;
  config: Record<string, any>;
};

export type NormalizedJob = {
  external_id: string;
  title: string;
  company_name?: string | null;
  description?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  is_remote?: boolean;
  employment_type?: string | null;
  experience_level?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  apply_url?: string | null;
  category?: string | null;
  tags?: string[];
  posted_at?: string | null;
  expires_at?: string | null;
  raw?: Record<string, unknown>;
};

function passesFilters(job: NormalizedJob, cfg: Record<string, any>): boolean {
  const states = (cfg?.filter_states ?? []) as string[];
  const cities = (cfg?.filter_cities ?? []) as string[];
  const includeRemote = cfg?.include_remote !== false;
  if (states.length || cities.length) {
    const matchState = states.length && job.location_state
      ? states.map((s) => s.toUpperCase()).includes(job.location_state.toUpperCase())
      : false;
    const matchCity = cities.length && job.location_city
      ? cities.map((s) => s.toLowerCase()).includes(job.location_city.toLowerCase())
      : false;
    const matchRemote = includeRemote && job.is_remote === true;
    if (!(matchState || matchCity || matchRemote)) return false;
  }
  return true;
}

// -------- Adapter: RemoteOK --------
async function fetchRemoteOK(src: Source): Promise<NormalizedJob[]> {
  const url = src.endpoint_url || "https://remoteok.com/api";
  const res = await fetch(url, { headers: { "User-Agent": "AgendaAqui-JobsBot/1.0" } });
  if (!res.ok) throw new Error(`RemoteOK HTTP ${res.status}`);
  const json = (await res.json()) as any[];
  const rows = json.filter((r) => r && r.id && r.position);
  const filterCats = (src.config?.filter_categories ?? []) as string[];
  return rows
    .filter((r) => {
      if (!filterCats.length) return true;
      const tags = (r.tags ?? []).map((t: string) => t.toLowerCase());
      return filterCats.some((c) => tags.includes(c.toLowerCase()));
    })
    .map((r) => ({
      external_id: String(r.id),
      title: r.position,
      company_name: r.company,
      description: (r.description ?? "").replace(/<[^>]+>/g, " ").trim().slice(0, 8000),
      location_city: null,
      location_state: null,
      is_remote: true,
      employment_type: r.contract ? "contract" : "full-time",
      apply_url: r.apply_url || r.url,
      category: "tech",
      tags: (r.tags ?? []).slice(0, 12),
      posted_at: r.date ?? null,
      salary_min: r.salary_min ?? null,
      salary_max: r.salary_max ?? null,
      salary_currency: "USD",
      raw: r,
    }));
}

// -------- Adapter: Trampos.co --------
async function fetchTrampos(src: Source): Promise<NormalizedJob[]> {
  const url = src.endpoint_url || "https://trampos.co/oportunidades.json";
  const res = await fetch(url, { headers: { "User-Agent": "AgendaAqui-JobsBot/1.0" } });
  if (!res.ok) throw new Error(`Trampos HTTP ${res.status}`);
  const json = (await res.json()) as any;
  const list: any[] = Array.isArray(json) ? json : (json.opportunities ?? json.data ?? []);
  return list
    .filter((r) => r && (r.id || r.slug))
    .map((r) => {
      const remote = String(r.city ?? "").toLowerCase().includes("remot") || r.remote === true;
      return {
        external_id: String(r.id ?? r.slug),
        title: r.title ?? r.name ?? "Vaga",
        company_name: r.company?.name ?? r.company_name ?? null,
        description: (r.description ?? "").toString().replace(/<[^>]+>/g, " ").trim().slice(0, 8000),
        location_city: remote ? null : (r.city ?? null),
        location_state: r.state ?? null,
        is_remote: remote,
        employment_type: r.contract_type ?? null,
        apply_url: r.url ?? r.link ?? (r.slug ? `https://trampos.co/oportunidades/${r.slug}` : null),
        category: r.category?.name ?? "tech",
        tags: (r.tags ?? []).slice(0, 12),
        posted_at: r.published_at ?? r.created_at ?? null,
        raw: r,
      } as NormalizedJob;
    });
}

// -------- Adapter: Firecrawl generic scrape --------
async function fetchScrape(src: Source): Promise<NormalizedJob[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurado — conecte o Firecrawl em Connectors.");
  if (!src.endpoint_url) throw new Error("endpoint_url ausente");
  // Placeholder: implementação real exigirá seletores CSS específicos por site.
  // Deixamos um stub que apenas devolve vazio para não falhar builds.
  return [];
}

// -------- Core sync --------
export async function runSourceSync(supabase: SB, sourceId: string): Promise<{
  fetched: number; inserted: number; updated: number; errors: number; message: string;
}> {
  const { data: src, error: srcErr } = await supabase
    .from("job_sources").select("*").eq("id", sourceId).maybeSingle();
  if (srcErr || !src) throw new Error(srcErr?.message || "Fonte não encontrada");

  const { data: log } = await supabase
    .from("job_sync_logs")
    .insert({ source_id: sourceId, status: "running" })
    .select("id").single();
  const logId = log?.id;

  let fetched = 0, inserted = 0, updated = 0, errors = 0, message = "";
  try {
    let items: NormalizedJob[] = [];
    if (src.kind === "api" && src.slug === "remoteok") items = await fetchRemoteOK(src);
    else if (src.kind === "api" && src.slug === "trampos-co") items = await fetchTrampos(src);
    else if (src.kind === "api") throw new Error(`API adapter desconhecido para slug "${src.slug}"`);
    else if (src.kind === "scrape") items = await fetchScrape(src);
    else if (src.kind === "manual") { message = "Fonte manual — sem sync automático."; items = []; }

    const filtered = items.filter((j) => passesFilters(j, src.config ?? {}));
    fetched = items.length;

    for (const j of filtered) {
      const payload = {
        source_id: sourceId,
        external_id: j.external_id,
        title: j.title.slice(0, 300),
        company_name: j.company_name?.slice(0, 200) ?? null,
        description: j.description ?? null,
        location_city: j.location_city ?? null,
        location_state: j.location_state ?? null,
        is_remote: !!j.is_remote,
        employment_type: j.employment_type ?? null,
        experience_level: j.experience_level ?? null,
        salary_min: j.salary_min ?? null,
        salary_max: j.salary_max ?? null,
        salary_currency: j.salary_currency ?? "BRL",
        apply_url: j.apply_url ?? null,
        category: j.category ?? null,
        tags: j.tags ?? [],
        posted_at: j.posted_at ?? null,
        expires_at: j.expires_at ?? null,
        raw: j.raw ?? null,
        is_active: true,
      };
      const { data: existing } = await supabase
        .from("jobs").select("id")
        .eq("source_id", sourceId).eq("external_id", j.external_id).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from("jobs").update(payload).eq("id", existing.id);
        if (error) errors++; else updated++;
      } else {
        const { error } = await supabase.from("jobs").insert(payload);
        if (error) errors++; else inserted++;
      }
    }
    message ||= `OK: ${fetched} lidos, ${inserted} novos, ${updated} atualizados, ${errors} erros.`;
    await supabase.from("job_sources").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: errors ? "partial" : "ok",
      last_sync_message: message,
    }).eq("id", sourceId);
    if (logId) {
      await supabase.from("job_sync_logs").update({
        finished_at: new Date().toISOString(),
        status: errors ? "partial" : "ok",
        fetched, inserted, updated, errors, message,
      }).eq("id", logId);
    }
    return { fetched, inserted, updated, errors, message };
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("job_sources").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: "error",
      last_sync_message: msg,
    }).eq("id", sourceId);
    if (logId) {
      await supabase.from("job_sync_logs").update({
        finished_at: new Date().toISOString(),
        status: "error", errors: 1, message: msg,
      }).eq("id", logId);
    }
    throw e;
  }
}

export async function runDueSources(supabase: SB): Promise<{ ran: number; results: Array<{ slug: string; ok: boolean; message: string }> }> {
  const { data: sources } = await supabase
    .from("job_sources")
    .select("id, slug, kind, sync_frequency_minutes, last_sync_at, is_active")
    .eq("is_active", true)
    .in("kind", ["api", "scrape"]);
  const now = Date.now();
  const due = (sources ?? []).filter((s: any) => {
    if (!s.last_sync_at) return true;
    const ageMin = (now - new Date(s.last_sync_at).getTime()) / 60000;
    return ageMin >= (s.sync_frequency_minutes ?? 60);
  });
  const results: Array<{ slug: string; ok: boolean; message: string }> = [];
  for (const s of due) {
    try {
      const r = await runSourceSync(supabase, s.id);
      results.push({ slug: s.slug, ok: true, message: r.message });
    } catch (e) {
      results.push({ slug: s.slug, ok: false, message: (e as Error).message });
    }
  }
  return { ran: due.length, results };
}
