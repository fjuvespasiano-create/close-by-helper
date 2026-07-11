import { supabase } from "@/integrations/supabase/client";

export type Promotion = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  image_url: string | null;
  link_url: string | null;
  discount_percent: number | null;
  price_from: number | null;
  price_to: number | null;
  category: string | null;
  city_id: string | null;
  company_id: string;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  companies?: { name: string; slug: string; plan: string | null; logo_url?: string | null } | null;
  cities?: { name: string; slug: string } | null;
};

export type Coupon = {
  id: string;
  title: string;
  description: string | null;
  code: string;
  discount_percent: number | null;
  discount_label: string | null;
  category: string | null;
  image_url: string | null;
  link_url: string | null;
  terms: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_sponsored: boolean;
  status: string;
  city_id: string | null;
  company_id: string | null;
  created_at: string;
  companies?: { name: string; slug: string } | null;
  cities?: { name: string; slug: string } | null;
};

export async function fetchActivePromotions(opts: { citySlug?: string; category?: string } = {}) {
  let q = supabase
    .from("promotions")
    .select(
      "id, slug, title, description, cover_image, image_url, link_url, discount_percent, price_from, price_to, category, city_id, company_id, status, valid_from, valid_to, created_at, companies(name, slug, plan, logo_url), cities(name, slug)"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (opts.category) q = q.eq("category", opts.category);
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as unknown as Promotion[];
  rows = rows.filter((r) => !r.valid_to || new Date(r.valid_to) >= new Date());
  if (opts.citySlug) rows = rows.filter((r) => r.cities?.slug === opts.citySlug || !r.city_id);
  return rows;
}

export async function fetchActiveCoupons(opts: { citySlug?: string; category?: string; sponsoredOnly?: boolean } = {}) {
  let q = supabase
    .from("coupons")
    .select(
      "id, title, description, code, discount_percent, discount_label, category, image_url, link_url, terms, valid_from, valid_to, is_sponsored, status, city_id, company_id, created_at, companies(name, slug), cities(name, slug)"
    )
    .eq("status", "published")
    .order("is_sponsored", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.sponsoredOnly) q = q.eq("is_sponsored", true);
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as unknown as Coupon[];
  rows = rows.filter((r) => !r.valid_to || new Date(r.valid_to) >= new Date());
  if (opts.citySlug) rows = rows.filter((r) => r.cities?.slug === opts.citySlug || !r.city_id);
  return rows;
}

export async function adminListPromotions() {
  const { data, error } = await supabase
    .from("promotions")
    .select("*, companies(name, slug, plan), cities(name, slug)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Promotion[];
}

export async function adminListCoupons() {
  const { data, error } = await supabase
    .from("coupons")
    .select("*, companies(name, slug), cities(name, slug)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Coupon[];
}

export type PromotionInput = {
  title: string;
  slug: string;
  description?: string | null;
  company_id: string;
  city_id?: string | null;
  category?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  discount_percent?: number | null;
  valid_from?: string | null;
  valid_to?: string | null;
  status?: string;
};

export async function upsertPromotion(input: PromotionInput & { id?: string }) {
  if (input.id) {
    const { id, ...patch } = input;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("promotions").update(patch as any).eq("id", id);
    if (error) throw error;
    return id;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.from("promotions").insert(input as any).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deletePromotion(id: string) {
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
}

export type CouponInput = {
  title: string;
  code: string;
  description?: string | null;
  company_id?: string | null;
  city_id?: string | null;
  category?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  discount_percent?: number | null;
  discount_label?: string | null;
  terms?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  is_sponsored?: boolean;
  status?: string;
};

export async function upsertCoupon(input: CouponInput & { id?: string }) {
  if (input.id) {
    const { id, ...patch } = input;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("coupons").update(patch as any).eq("id", id);
    if (error) throw error;
    return id;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.from("coupons").insert(input as any).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw error;
}

export async function listMyEligibleCompanies(userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, plan, city_id")
    .eq("owner_id", userId)
    .in("plan", ["premium", "featured"]);
  if (error) throw error;
  return data ?? [];
}

export async function listMyPromotions(userId: string) {
  const { data, error } = await supabase
    .from("promotions")
    .select("*, companies!inner(id, name, owner_id, plan), cities(name, slug)")
    .eq("companies.owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Promotion[];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}
