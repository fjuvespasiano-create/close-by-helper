import { supabase } from "@/integrations/supabase/client";

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  location: string | null;
  city_id: string | null;
  start_at: string;
  end_at: string | null;
  status: string;
  event_type: string | null;
  category_id: string | null;
  ticket_url: string | null;
  price_min: number | null;
  price_max: number | null;
  created_by?: string | null;
};

export type ShowRow = {
  id: string;
  event_id: string;
  artist_name: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  stage: string | null;
  cover_image: string | null;
  ticket_url: string | null;
  ticket_price: number | null;
  sort: number;
};

export type EventCategory = { id: string; slug: string; name: string; icon: string | null; sort: number };

export async function fetchPublishedEvents(opts?: { citySlug?: string; categorySlug?: string; q?: string }) {
  let query = (supabase.from("events") as any)
    .select("id, slug, title, description, cover_image, location, start_at, end_at, event_type, price_min, price_max, category_id, city_id, status")
    .eq("status", "published")
    .order("start_at", { ascending: true });
  if (opts?.q) query = query.ilike("title", `%${opts.q}%`);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as EventRow[];
  if (opts?.categorySlug) {
    const { data: cat } = await (supabase.from("event_categories") as any).select("id").eq("slug", opts.categorySlug).maybeSingle();
    if (cat?.id) rows = rows.filter((r) => r.category_id === cat.id);
  }
  return rows;
}

export async function fetchEventBySlug(slug: string) {
  const { data, error } = await (supabase.from("events") as any)
    .select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw error;
  return data as EventRow | null;
}

export async function fetchShowsForEvent(eventId: string) {
  const { data, error } = await (supabase.from("shows") as any)
    .select("*").eq("event_id", eventId).order("start_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ShowRow[];
}

export async function fetchEventCategories() {
  const { data, error } = await (supabase.from("event_categories") as any)
    .select("*").order("sort", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventCategory[];
}
