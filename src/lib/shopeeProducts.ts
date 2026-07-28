import { supabase } from "@/integrations/supabase/client";

export type ShopeeProduct = {
  id: string;
  itemid: number;
  title: string;
  description: string | null;
  image_link: string | null;
  product_link: string;
  product_short_link: string | null;
  price: number | null;
  sale_price: number | null;
  discount_percentage: number | null;
  item_rating: number | null;
  global_category1: string | null;
  global_category2: string | null;
};

const COLS =
  "id,itemid,title,description,image_link,product_link,product_short_link,price,sale_price,discount_percentage,item_rating,global_category1,global_category2";

export async function fetchFeaturedShopee(limit = 12): Promise<ShopeeProduct[]> {
  const { data, error } = await supabase
    .from("shopee_products")
    .select(COLS)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("discount_percentage", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ShopeeProduct[];
}

export type ShopeeQuery = {
  q?: string;
  category?: string | null;
  minDiscount?: number;
  minRating?: number;
  sort?: "discount" | "rating" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
};

export async function fetchShopeeProducts(params: ShopeeQuery) {
  const { q, category, minDiscount, minRating, sort = "discount", page = 1, pageSize = 24 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("shopee_products")
    .select(COLS, { count: "estimated" })
    .eq("is_active", true);

  if (q && q.trim()) query = query.ilike("title", `%${q.trim()}%`);
  if (category) query = query.eq("global_category1", category);
  if (minDiscount) query = query.gte("discount_percentage", minDiscount);
  if (minRating) query = query.gte("item_rating", minRating);

  if (sort === "discount") query = query.order("discount_percentage", { ascending: false, nullsFirst: false });
  else if (sort === "rating") query = query.order("item_rating", { ascending: false, nullsFirst: false });
  else if (sort === "price_asc") query = query.order("sale_price", { ascending: true, nullsFirst: false });
  else query = query.order("sale_price", { ascending: false, nullsFirst: false });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { items: (data ?? []) as ShopeeProduct[], total: count ?? 0 };
}

export async function fetchShopeeCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("shopee_products")
    .select("global_category1")
    .eq("is_active", true)
    .not("global_category1", "is", null)
    .limit(2000);
  if (error) return [];
  const set = new Set<string>();
  for (const r of data ?? []) {
    const c = (r as { global_category1: string | null }).global_category1;
    if (c) set.add(c);
  }
  return Array.from(set).sort();
}

export function formatBRL(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
