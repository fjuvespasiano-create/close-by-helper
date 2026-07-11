
-- =========================================
-- ENUMS
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.representative_role AS ENUM ('prefeito', 'vice_prefeito', 'vereador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.representative_activity_kind AS ENUM (
    'projeto_lei', 'indicacao', 'requerimento', 'voto', 'decreto',
    'obra', 'contrato', 'pauta', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.representative_activity_status AS ENUM (
    'em_tramitacao', 'aprovado', 'rejeitado', 'vetado', 'arquivado', 'publicado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- REPRESENTATIVES
-- =========================================
CREATE TABLE IF NOT EXISTS public.representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  role public.representative_role NOT NULL,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  party text,
  photo_url text,
  email text,
  phone text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  mandate_start date,
  mandate_end date,
  is_active boolean NOT NULL DEFAULT true,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS representatives_city_role_idx
  ON public.representatives (city_id, role) WHERE is_active = true;

GRANT SELECT ON public.representatives TO anon, authenticated;
GRANT ALL ON public.representatives TO service_role;
ALTER TABLE public.representatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read representatives"
  ON public.representatives FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage representatives"
  ON public.representatives FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_representatives_updated_at
  BEFORE UPDATE ON public.representatives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- REPRESENTATIVE_ACTIVITIES
-- =========================================
CREATE TABLE IF NOT EXISTS public.representative_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_id uuid REFERENCES public.representatives(id) ON DELETE SET NULL,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  kind public.representative_activity_kind NOT NULL,
  title text NOT NULL,
  description text,
  status public.representative_activity_status,
  source_url text,
  source_name text,
  occurred_at timestamptz NOT NULL,
  raw_payload jsonb,
  dedupe_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rep_activities_city_time_idx
  ON public.representative_activities (city_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS rep_activities_rep_time_idx
  ON public.representative_activities (representative_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS rep_activities_kind_idx
  ON public.representative_activities (kind);

GRANT SELECT ON public.representative_activities TO anon, authenticated;
GRANT ALL ON public.representative_activities TO service_role;
ALTER TABLE public.representative_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read activities"
  ON public.representative_activities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage activities"
  ON public.representative_activities FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_rep_activities_updated_at
  BEFORE UPDATE ON public.representative_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- REPRESENTATIVE_ATTENDANCE
-- =========================================
CREATE TABLE IF NOT EXISTS public.representative_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_id uuid NOT NULL REFERENCES public.representatives(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  session_type text,
  present boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (representative_id, session_date, session_type)
);

CREATE INDEX IF NOT EXISTS rep_attendance_rep_date_idx
  ON public.representative_attendance (representative_id, session_date DESC);

GRANT SELECT ON public.representative_attendance TO anon, authenticated;
GRANT ALL ON public.representative_attendance TO service_role;
ALTER TABLE public.representative_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read attendance"
  ON public.representative_attendance FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage attendance"
  ON public.representative_attendance FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- WHATSAPP_SUBSCRIBERS
-- =========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  opted_in_at timestamptz NOT NULL DEFAULT now(),
  opted_out_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wpp_subs_city_active_idx
  ON public.whatsapp_subscribers (city_id) WHERE is_active = true;

GRANT ALL ON public.whatsapp_subscribers TO service_role;
ALTER TABLE public.whatsapp_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view whatsapp subscribers"
  ON public.whatsapp_subscribers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wpp_subs_updated_at
  BEFORE UPDATE ON public.whatsapp_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- REPRESENTATIVE_SYNC_LOGS
-- =========================================
CREATE TABLE IF NOT EXISTS public.representative_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  status text NOT NULL,
  items_found int NOT NULL DEFAULT 0,
  items_new int NOT NULL DEFAULT 0,
  items_updated int NOT NULL DEFAULT 0,
  error text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.representative_sync_logs TO authenticated;
GRANT ALL ON public.representative_sync_logs TO service_role;
ALTER TABLE public.representative_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view rep sync logs"
  ON public.representative_sync_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
