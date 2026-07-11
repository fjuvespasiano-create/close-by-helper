/**
 * Camada de dados do módulo Representantes.
 * Todas as leituras são públicas (RLS permite anon SELECT).
 */
import { supabase } from "@/integrations/supabase/client";
import type { CitySlug } from "@/hooks/useSelectedCity";
import { CITY_IDS } from "./constants";
import type {
  FeedFilters,
  RankingRow,
  Representative,
  RepresentativeActivity,
  RepresentativeAttendance,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Query keys centralizadas para invalidation consistente. */
export const representativesKeys = {
  all: ["representatives"] as const,
  list: (city?: CitySlug) => ["representatives", city ?? null] as const,
  detail: (idOrSlug: string) => ["representative", idOrSlug] as const,
  activities: (repId: string) => ["rep-activities", repId] as const,
  attendance: (repId: string) => ["rep-attendance", repId] as const,
  feed: (filters: FeedFilters) => ["rep-feed", filters] as const,
  widget: (city?: CitySlug) => ["rep-widget", city ?? null] as const,
  ranking: (city: CitySlug) => ["rep-ranking", city] as const,
};

export async function fetchRepresentatives(citySlug?: CitySlug): Promise<Representative[]> {
  let q = db
    .from("representatives")
    .select("*")
    .eq("is_active", true)
    .order("role")
    .order("name");
  if (citySlug) q = q.eq("city_id", CITY_IDS[citySlug]);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Representative[];
}

export async function fetchRepresentative(idOrSlug: string): Promise<Representative | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const { data, error } = await db
    .from("representatives")
    .select("*")
    .eq(isUuid ? "id" : "slug", idOrSlug)
    .maybeSingle();
  if (error) throw error;
  return (data as Representative) ?? null;
}

export async function fetchActivitiesByRepresentative(
  representativeId: string,
  limit = 100,
): Promise<RepresentativeActivity[]> {
  const { data, error } = await db
    .from("representative_activities")
    .select("*")
    .eq("representative_id", representativeId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RepresentativeActivity[];
}

export async function fetchAttendance(representativeId: string): Promise<RepresentativeAttendance[]> {
  const { data, error } = await db
    .from("representative_attendance")
    .select("*")
    .eq("representative_id", representativeId)
    .order("session_date", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as RepresentativeAttendance[];
}

export async function fetchActivityFeed(filters: FeedFilters = {}): Promise<RepresentativeActivity[]> {
  const { citySlug, kind, status, sinceDays = 60, limit = 60 } = filters;
  let q = db
    .from("representative_activities")
    .select("*, representative:representative_id (id, name, slug, role)")
    .gte("occurred_at", new Date(Date.now() - sinceDays * 864e5).toISOString())
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (citySlug) q = q.eq("city_id", CITY_IDS[citySlug]);
  if (kind) q = q.eq("kind", kind);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RepresentativeActivity[];
}

export async function fetchMonthlyRanking(citySlug: CitySlug): Promise<RankingRow[]> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startIso = startOfMonth.toISOString();

  const [reps, acts, atts] = await Promise.all([
    fetchRepresentatives(citySlug),
    db
      .from("representative_activities")
      .select("representative_id")
      .eq("city_id", CITY_IDS[citySlug])
      .gte("occurred_at", startIso)
      .not("representative_id", "is", null),
    db
      .from("representative_attendance")
      .select("representative_id, present")
      .gte("session_date", startIso.slice(0, 10)),
  ]);

  const actCount = new Map<string, number>();
  for (const a of (acts.data ?? []) as Array<{ representative_id: string }>) {
    actCount.set(a.representative_id, (actCount.get(a.representative_id) ?? 0) + 1);
  }
  const attTotal = new Map<string, { p: number; t: number }>();
  for (const a of (atts.data ?? []) as Array<{ representative_id: string; present: boolean }>) {
    const cur = attTotal.get(a.representative_id) ?? { p: 0, t: 0 };
    cur.t++;
    if (a.present) cur.p++;
    attTotal.set(a.representative_id, cur);
  }

  return reps
    .map<RankingRow>((r) => {
      const stats = attTotal.get(r.id) ?? { p: 0, t: 0 };
      return {
        representative: r,
        activities_count: actCount.get(r.id) ?? 0,
        sessions_count: stats.t,
        absences_count: stats.t - stats.p,
        attendance_rate: stats.t ? Math.round((stats.p / stats.t) * 100) : 0,
      };
    })
    .sort((a, b) => b.activities_count - a.activities_count);
}
