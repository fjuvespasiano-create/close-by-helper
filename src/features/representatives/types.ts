/**
 * Tipos do domínio Representantes.
 */
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
  representative?: {
    id: string;
    name: string;
    slug: string;
    role: RepresentativeRole;
  } | null;
};

export type RepresentativeAttendance = {
  id: string;
  representative_id: string;
  session_date: string;
  session_type: string | null;
  present: boolean;
};

export type FeedFilters = {
  citySlug?: import("@/hooks/useSelectedCity").CitySlug;
  kind?: ActivityKind;
  status?: ActivityStatus;
  sinceDays?: number;
  limit?: number;
};

export type RankingRow = {
  representative: Representative;
  activities_count: number;
  absences_count: number;
  sessions_count: number;
  attendance_rate: number;
};
