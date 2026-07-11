import { supabase } from "@/integrations/supabase/client";

export async function checkIsAdmin(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) {
    console.error("has_role error", error);
    return false;
  }
  return !!data;
}

export async function adminStats() {
  const [allRes, freeRes, premiumRes, featuredRes, recentRes, viewsRes] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("plan", "free"),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("plan", "premium"),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("featured", true),
    supabase.from("companies").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from("company_views").select("id", { count: "exact", head: true }),
  ]);
  return {
    total: allRes.count ?? 0,
    free: freeRes.count ?? 0,
    premium: premiumRes.count ?? 0,
    featured: featuredRes.count ?? 0,
    recent7d: recentRes.count ?? 0,
    views: viewsRes.count ?? 0,
  };
}

export async function adminListCompanies(opts: { q?: string; plan?: string; featured?: "all" | "yes" | "no"; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(200, Math.max(10, opts.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("companies")
    .select("id, name, slug, plan, featured, is_verified, status, city_id, cities(name), created_at, email, phone", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (opts.q) query = query.ilike("name", `%${opts.q}%`);
  if (opts.plan && opts.plan !== "all") query = query.eq("plan", opts.plan);
  if (opts.featured === "yes") query = query.eq("featured", true);
  if (opts.featured === "no") query = query.eq("featured", false);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize };
}

export async function adminUpdateCompany(id: string, patch: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("companies").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function adminDeleteCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPlansConfig() {
  const { data, error } = await supabase.from("plans_config").select("*").order("sort");
  if (error) throw error;
  return data ?? [];
}

export async function updatePlanConfig(slug: string, patch: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("plans_config").update(patch as any).eq("slug", slug);
  if (error) throw error;
}

export async function fetchSystemSettings() {
  const { data, error } = await supabase.from("system_settings").select("*").order("key");
  if (error) throw error;
  return data ?? [];
}

export async function updateSetting(key: string, value: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("system_settings").update({ value: value as any, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) throw error;
}

export async function adminListLeads() {
  const { data, error } = await supabase.from("leads").select("*, companies(name)").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function adminListPlanLeads() {
  const { data, error } = await supabase.from("leads_planos").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}
