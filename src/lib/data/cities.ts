import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a city slug to its UUID. Returns `null` when the slug is missing
 * or does not match any active city. Central helper — do not duplicate the
 * `cities.select("id").eq("slug", ...)` query across modules.
 */
export async function resolveCityIdBySlug(slug?: string | null): Promise<string | null> {
  if (!slug) return null;
  const { data } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}
