import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CompanyListItem = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  banner_url: string | null;
  logo_url: string | null;
  plan: string | null;
  featured: boolean | null;
  is_verified?: boolean | null;
  city: { name: string; slug: string } | null;
  rating: number;
  review_count: number;
  categories: { name: string; slug: string }[];
};

type CompanyRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  banner_url: string | null;
  logo_url: string | null;
  plan: string | null;
  featured: boolean | null;
  is_verified: boolean | null;
  rating: number | null;
  review_count: number | null;
  cities: { name: string; slug: string } | null;
};

const SELECT = `id, slug, name, tagline, banner_url, logo_url, plan, featured, is_verified, rating, review_count,
  cities ( name, slug )`;

function mapCompany(c: CompanyRow): CompanyListItem {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    banner_url: c.banner_url,
    logo_url: c.logo_url,
    plan: c.plan,
    featured: c.featured,
    is_verified: c.is_verified,
    city: c.cities,
    rating: Number(c.rating ?? 0),
    review_count: c.review_count ?? 0,
    categories: [],
  };
}

// App is scoped to Vespasiano and São José da Lapa only.
export const APP_CITY_SLUGS = ["vespasiano", "sao-jose-da-lapa"] as const;

export async function fetchCities() {
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, slug, state")
    .in("slug", APP_CITY_SLUGS as unknown as string[])
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, icon, description, sort")
    .order("sort");
  if (error) throw error;
  return data ?? [];
}

export async function fetchFeaturedCompanies(limit = 6): Promise<CompanyListItem[]> {
  // Prefer companies that actually have a banner image first, so the home
  // Single-shot query: fetch a wider pool of active companies and sort in
  // memory so companies with a banner win, then premium/featured, then rating.
  // Avoids the previous 1–3 sequential round-trips.
  const pool = await supabase
    .from("companies")
    .select(SELECT)
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("rating", { ascending: false })
    .order("review_count", { ascending: false })
    .limit(Math.max(limit * 4, 24));
  if (pool.error) throw pool.error;
  const rows = (pool.data as CompanyRow[] | null) ?? [];
  const score = (c: CompanyRow) => {
    let s = 0;
    if (c.banner_url) s += 100;
    if (c.plan === "featured") s += 20;
    else if (c.plan === "premium") s += 10;
    if (c.featured) s += 5;
    s += Number(c.rating ?? 0);
    return s;
  };
  return rows
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
    .map(mapCompany);
}


export async function searchCompanies(params: {
  q?: string;
  city?: string;
  category?: string;
  minRating?: number;
  premiumOnly?: boolean;
  plan?: "free" | "premium" | "featured" | "all";
  sort?: "relevance" | "rating" | "name" | "newest";
  limit?: number;
  page?: number;
}): Promise<{ items: CompanyListItem[]; hasMore: boolean; total: number | null }> {
  const limit = params.limit ?? 24;
  const page = Math.max(0, params.page ?? 0);
  const from = page * limit;
  const to = from + limit - 1;

  const [cityRes, catRes] = await Promise.all([
    params.city
      ? supabase.from("cities").select("id").eq("slug", params.city).maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null }),
    params.category
      ? supabase.from("categories").select("id").eq("slug", params.category).maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null }),
  ]);

  let companyIdsForCategory: string[] | null = null;
  if (params.category && catRes.data) {
    const { data: links } = await supabase
      .from("company_categories")
      .select("company_id")
      .eq("category_id", catRes.data.id)
      .limit(5000);
    companyIdsForCategory = (links ?? []).map((l) => l.company_id);
    if (companyIdsForCategory.length === 0) return { items: [], hasMore: false, total: 0 };
  }

  let query = supabase
    .from("companies")
    .select(SELECT, { count: "exact" })
    .eq("status", "active");

  if (params.premiumOnly) query = query.in("plan", ["premium", "featured"]);
  if (params.plan && params.plan !== "all") query = query.eq("plan", params.plan);
  if (cityRes.data) query = query.eq("city_id", cityRes.data.id);
  if (companyIdsForCategory) query = query.in("id", companyIdsForCategory.slice(0, 1000));
  if (params.minRating && params.minRating > 0) query = query.gte("rating", params.minRating);

  if (params.q) {
    const safe = params.q.replace(/[%,]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,tagline.ilike.%${safe}%`);
  }

  if (params.sort === "name") query = query.order("name");
  else if (params.sort === "newest") query = query.order("created_at", { ascending: false });
  else if (params.sort === "rating") {
    query = query.order("rating", { ascending: false }).order("review_count", { ascending: false });
  } else {
    query = query
      .order("featured", { ascending: false })
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);
  if (error) throw error;
  const items = (data as CompanyRow[] | null ?? []).map(mapCompany);
  const total = typeof count === "number" ? count : null;
  const hasMore = total != null ? to + 1 < total : items.length === limit;
  return { items, hasMore, total };
}

export async function suggestCompanies(q: string, city?: string): Promise<{ id: string; name: string; slug: string; logo_url: string | null; city_name: string | null }[]> {
  const safe = q.replace(/[%,]/g, " ").trim();
  if (safe.length < 2) return [];
  let cityId: string | null = null;
  if (city) {
    const { data } = await supabase.from("cities").select("id").eq("slug", city).maybeSingle();
    cityId = data?.id ?? null;
  }
  let query = supabase
    .from("companies")
    .select("id, name, slug, logo_url, cities ( name )")
    .eq("status", "active")
    .or(`name.ilike.%${safe}%,tagline.ilike.%${safe}%`)
    .order("featured", { ascending: false })
    .order("rating", { ascending: false })
    .limit(6);
  if (cityId) query = query.eq("city_id", cityId);
  const { data } = await query;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    logo_url: r.logo_url,
    city_name: (r.cities as { name: string } | null)?.name ?? null,
  }));
}


export async function fetchCompanyBySlug(slug: string) {
  const { data, error } = await supabase
    .from("companies")
    .select(`*, cities ( name, slug, state ), company_categories ( categories ( id, name, slug, icon ) ), company_media ( id, url, type, caption, sort )`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCompanyReviews(companyId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, user_id, author_name, source, review_date")
    .eq("company_id", companyId)
    .order("review_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCitiesByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [] as { id: string; name: string; state: string; slug: string }[];
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, state, slug")
    .in("id", ids);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSimilarCompanies(opts: {
  excludeId: string;
  categoryIds: string[];
  cityId?: string | null;
  limit?: number;
}): Promise<CompanyListItem[]> {
  const limit = opts.limit ?? 6;
  let companyIds: string[] = [];
  if (opts.categoryIds.length > 0) {
    const { data: links } = await supabase
      .from("company_categories")
      .select("company_id")
      .in("category_id", opts.categoryIds)
      .limit(500);
    companyIds = [...new Set((links ?? []).map((l) => l.company_id))].filter((id) => id !== opts.excludeId);
  }
  if (companyIds.length === 0 && opts.cityId) {
    const { data } = await supabase
      .from("companies")
      .select(SELECT)
      .eq("status", "active")
      .eq("city_id", opts.cityId)
      .neq("id", opts.excludeId)
      .order("rating", { ascending: false })
      .limit(limit);
    return (data as CompanyRow[] | null ?? []).map(mapCompany);
  }
  if (companyIds.length === 0) return [];
  let q = supabase
    .from("companies")
    .select(SELECT)
    .eq("status", "active")
    .in("id", companyIds.slice(0, 60))
    .order("featured", { ascending: false })
    .order("rating", { ascending: false })
    .limit(limit);
  if (opts.cityId) q = q.eq("city_id", opts.cityId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as CompanyRow[] | null ?? []).map(mapCompany);
}

// ---------- Query options (centralised staleTime + keys) ----------
// Static-ish reference data lives for 10 minutes; company details are cached
// for 2 minutes so navigation feels instant on revisit.
export const categoriesQueryOptions = queryOptions({
  queryKey: ["categories"],
  queryFn: fetchCategories,
  staleTime: 10 * 60_000,
  gcTime: 30 * 60_000,
});

export const citiesQueryOptions = queryOptions({
  queryKey: ["cities"],
  queryFn: fetchCities,
  staleTime: 10 * 60_000,
  gcTime: 30 * 60_000,
});

export const featuredCompaniesQueryOptions = (limit = 8) =>
  queryOptions({
    queryKey: ["featured", limit],
    queryFn: () => fetchFeaturedCompanies(limit),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });

export const companyBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["company", slug],
    queryFn: () => fetchCompanyBySlug(slug),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
