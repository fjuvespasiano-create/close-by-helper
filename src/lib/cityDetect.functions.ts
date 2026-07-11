import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serverSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Reverse geocode GPS coords → nearest active city slug (via Google Maps gateway + DB haversine). */
export const detectCityByGPS = createServerFn({ method: "POST" })
  .inputValidator((data: { lat: number; lng: number }) => {
    if (typeof data?.lat !== "number" || typeof data?.lng !== "number") {
      throw new Error("lat/lng required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const { data: rows, error } = await supabase.rpc("nearest_city", {
      _lat: data.lat,
      _lng: data.lng,
    });
    if (error) throw error;
    const nearest = Array.isArray(rows) ? rows[0] : null;
    if (!nearest) return { slug: null as string | null, name: null as string | null };
    return { slug: nearest.slug, name: nearest.name, distance_km: nearest.distance_km };
  });

/** IP-based detection using request headers → nearest active city, or null. */
export const detectCityByIP = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  if (!ip) return { slug: null, name: null };

  try {
    const resp = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { "User-Agent": "AgendaAqui/1.0" },
    });
    if (!resp.ok) return { slug: null, name: null };
    const geo = (await resp.json()) as { latitude?: number; longitude?: number; city?: string };
    if (typeof geo.latitude !== "number" || typeof geo.longitude !== "number") {
      return { slug: null, name: null };
    }
    const supabase = serverSupabase();
    const { data: rows } = await supabase.rpc("nearest_city", {
      _lat: geo.latitude,
      _lng: geo.longitude,
    });
    const nearest = Array.isArray(rows) ? rows[0] : null;
    if (!nearest) return { slug: null, name: null };
    return { slug: nearest.slug, name: nearest.name };
  } catch {
    return { slug: null, name: null };
  }
});
