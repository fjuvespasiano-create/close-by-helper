import { supabase } from "@/integrations/supabase/client";

export type PanelCompany = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  plan: string | null;
  status: string | null;
  is_verified: boolean | null;
  featured: boolean | null;
  views_count: number | null;
  rating: number | null;
  review_count: number | null;
  logo_url: string | null;
  city_id: string | null;
  created_at: string;
};

export async function listMyCompanies(userId: string): Promise<PanelCompany[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, slug, name, tagline, plan, status, is_verified, featured, views_count, rating, review_count, logo_url, city_id, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PanelCompany[];
}

export async function panelStats(userId: string) {
  const [companies, leads, favs] = await Promise.all([
    supabase.from("companies").select("id, views_count, review_count", { count: "exact" }).eq("owner_id", userId),
    supabase.from("leads").select("id, created_at, company_id, companies!inner(owner_id)").eq("companies.owner_id", userId).order("created_at", { ascending: false }).limit(500),
    supabase.from("favorites").select("company_id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const cs = companies.data ?? [];
  const ls = leads.data ?? [];
  const cutoff = Date.now() - 7 * 86400000;
  return {
    companyCount: companies.count ?? 0,
    totalViews: cs.reduce((s, c) => s + (c.views_count ?? 0), 0),
    totalReviews: cs.reduce((s, c) => s + (c.review_count ?? 0), 0),
    totalLeads: ls.length,
    leads7d: ls.filter((l) => new Date(l.created_at).getTime() >= cutoff).length,
    favoritesCount: favs.count ?? 0,
  };
}

export async function getMyCompany(userId: string, id: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type CompanyPatch = Partial<{
  name: string;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  zip: string | null;
  city_id: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  logo_url: string | null;
  banner_url: string | null;
  video_url: string | null;
  status: string;
  founded_year: number | null;
  response_time_minutes: number | null;
  response_rate: number | null;
  services_completed: number | null;
  clients_served: number | null;
  price_range: number | null;
  tour_360_url: string | null;
  catalog_url: string | null;
  pricebook_url: string | null;
  portfolio_pdf_url: string | null;
  coverage_cities: string[];
  differentials: string[];
  badges: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  certifications: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quality_scores: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promotions: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  financing_info: any;
  hours: Record<string, string> | null;
}>;


export async function updateMyCompany(id: string, patch: CompanyPatch) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("companies").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteMyCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function createMyCompany(userId: string, input: { name: string; tagline?: string; description?: string; city_id?: string | null; phone?: string; whatsapp?: string; email?: string; address?: string }) {
  const base = slugify(input.name) || `empresa-${Date.now()}`;
  const payload = {
    owner_id: userId,
    name: input.name,
    tagline: input.tagline || null,
    description: input.description || null,
    city_id: input.city_id || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    email: input.email || null,
    address: input.address || null,
    plan: "free",
    status: "pending",
  };
  // Try base slug then retry with random suffixes on unique_violation.
  // RLS hides other users' non-active rows, so a pre-SELECT can miss a clash —
  // rely on the DB unique constraint instead.
  let lastError: unknown = null;
  for (let i = 0; i < 6; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("companies")
      .insert({ ...payload, slug })
      .select("id, slug")
      .single();
    if (!error) return data;
    lastError = error;
    // 23505 = unique_violation. Anything else, bail immediately.
    if ((error as { code?: string }).code !== "23505") throw error;
  }
  throw lastError ?? new Error("Não foi possível criar a empresa");
}

export async function listMyLeads(userId: string) {
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, phone, email, message, created_at, company_id, companies!inner(id, name, slug, owner_id)")
    .eq("companies.owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function listMyReviews(userId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, user_id, company_id, companies!inner(id, name, slug, owner_id)")
    .eq("companies.owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  const rows = data ?? [];
  const uids = Array.from(new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v)));
  let profileMap = new Map<string, { name: string | null; avatar_url: string | null }>();
  if (uids.length) {
    const { data: profs } = await supabase.from("profiles").select("id, name, avatar_url").in("id", uids);
    profileMap = new Map((profs ?? []).map((p) => [p.id, { name: p.name, avatar_url: p.avatar_url }]));
  }
  return rows.map((r) => ({ ...r, profile: r.user_id ? (profileMap.get(r.user_id) ?? null) : null }));
}

export async function listCities() {
  const { data, error } = await supabase.from("cities").select("id, name, state").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMyProfile(userId: string, patch: { name?: string | null; avatar_url?: string | null }) {
  const { error } = await supabase.from("profiles").upsert({ id: userId, ...patch }, { onConflict: "id" });
  if (error) throw error;
}
