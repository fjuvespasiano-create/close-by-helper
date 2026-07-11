/**
 * Fetchers client-side para o módulo Representantes.
 * Todas as leituras são públicas (RLS permite anon SELECT).
 */
import { supabase } from "@/integrations/supabase/client";
import type { CitySlug } from "@/hooks/useSelectedCity";

export type RepresentativeRole = "prefeito" | "vice_prefeito" | "vereador";
export type ActivityKind =
  | "projeto_lei"
  | "indicacao"
  | "requerimento"
  | "voto"
  | "decreto"
  | "obra"
  | "contrato"
  | "pauta"
  | "outro";
export type ActivityStatus =
  | "em_tramitacao"
  | "aprovado"
  | "rejeitado"
  | "vetado"
  | "arquivado"
  | "publicado";

export type Representative = {
  id: string;
  name: string;
  slug: string;
  role: RepresentativeRole;
  city_id: string;
  party: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  social_links: Record<string, string>;
  mandate_start: string | null;
  mandate_end: string | null;
  is_active: boolean;
  bio: string | null;
};

export type RepresentativeActivity = {
  id: string;
  representative_id: string | null;
  city_id: string;
  kind: ActivityKind;
  title: string;
  description: string | null;
  status: ActivityStatus | null;
  source_url: string | null;
  source_name: string | null;
  occurred_at: string;
  representative?: { id: string; name: string; slug: string; role: RepresentativeRole } | null;
};

export type RepresentativeAttendance = {
  id: string;
  representative_id: string;
  session_date: string;
  session_type: string | null;
  present: boolean;
};

export const CITY_IDS: Record<CitySlug, string> = {
  vespasiano: "c4ccc60b-b17c-4e91-968e-4d38ab42e734",
  "sao-jose-da-lapa": "d9203559-409c-4512-ae93-a5d398afe0b0",
};

export const ROLE_LABEL: Record<RepresentativeRole, string> = {
  prefeito: "Prefeito",
  vice_prefeito: "Vice-Prefeito",
  vereador: "Vereador",
};

export const KIND_META: Record<ActivityKind, { label: string; emoji: string; color: string }> = {
  projeto_lei: { label: "Projeto de Lei", emoji: "📜", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  indicacao: { label: "Indicação", emoji: "📍", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  requerimento: { label: "Requerimento", emoji: "📝", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  voto: { label: "Voto", emoji: "🗳️", color: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  decreto: { label: "Decreto", emoji: "🏛️", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  obra: { label: "Obra", emoji: "🚧", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  contrato: { label: "Contrato", emoji: "📑", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  pauta: { label: "Pauta", emoji: "📅", color: "bg-pink-500/10 text-pink-700 dark:text-pink-300" },
  outro: { label: "Outro", emoji: "•", color: "bg-muted text-muted-foreground" },
};

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  em_tramitacao: "Em tramitação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  vetado: "Vetado",
  arquivado: "Arquivado",
  publicado: "Publicado",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function fetchRepresentatives(citySlug?: CitySlug): Promise<Representative[]> {
  let q = db.from("representatives").select("*").eq("is_active", true).order("role").order("name");
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

export type FeedFilters = {
  citySlug?: CitySlug;
  kind?: ActivityKind;
  status?: ActivityStatus;
  sinceDays?: number;
  limit?: number;
};

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

export type RankingRow = {
  representative: Representative;
  activities_count: number;
  absences_count: number;
  sessions_count: number;
  attendance_rate: number;
};

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
