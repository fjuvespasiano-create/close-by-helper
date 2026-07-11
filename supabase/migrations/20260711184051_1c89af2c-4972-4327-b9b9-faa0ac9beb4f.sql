
-- =========== job_sources ===========
CREATE TABLE public.job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('api','scrape','manual')),
  endpoint_url text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sync_frequency_minutes integer NOT NULL DEFAULT 60,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_sources TO authenticated;
GRANT ALL ON public.job_sources TO service_role;
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage job_sources" ON public.job_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========== jobs ===========
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.job_sources(id) ON DELETE SET NULL,
  external_id text,
  title text NOT NULL,
  company_name text,
  description text,
  location_city text,
  location_state text,
  is_remote boolean NOT NULL DEFAULT false,
  employment_type text,
  experience_level text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text DEFAULT 'BRL',
  apply_url text,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  posted_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active jobs" ON public.jobs
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "admin manage jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX jobs_active_posted_idx ON public.jobs (is_active, posted_at DESC NULLS LAST);
CREATE INDEX jobs_city_idx ON public.jobs (location_city);
CREATE INDEX jobs_state_idx ON public.jobs (location_state);
CREATE INDEX jobs_remote_idx ON public.jobs (is_remote);
CREATE INDEX jobs_tags_gin ON public.jobs USING gin (tags);
CREATE INDEX jobs_title_trgm ON public.jobs USING gin (title gin_trgm_ops);

-- =========== job_sync_logs ===========
CREATE TABLE public.job_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.job_sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  fetched integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  message text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_sync_logs TO authenticated;
GRANT ALL ON public.job_sync_logs TO service_role;
ALTER TABLE public.job_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read job_sync_logs" ON public.job_sync_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX job_sync_logs_source_idx ON public.job_sync_logs (source_id, started_at DESC);

-- =========== triggers updated_at ===========
CREATE TRIGGER job_sources_set_updated_at BEFORE UPDATE ON public.job_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== seed fontes iniciais ===========
INSERT INTO public.job_sources (slug, name, kind, endpoint_url, config, sync_frequency_minutes) VALUES
  ('remoteok', 'RemoteOK (remoto)', 'api', 'https://remoteok.com/api', '{"filter_categories":["dev","design","marketing","product"]}'::jsonb, 60),
  ('trampos-co', 'Trampos.co (tech BR)', 'api', 'https://trampos.co/oportunidades.json', '{"filter_states":["MG"],"include_remote":true}'::jsonb, 60),
  ('sine-vespasiano', 'SINE — Vespasiano (manual)', 'manual', NULL, '{"note":"Cadastre vagas do SINE local manualmente."}'::jsonb, 1440),
  ('sine-sao-jose-lapa', 'SINE — São José da Lapa (manual)', 'manual', NULL, '{"note":"Cadastre vagas do SINE local manualmente."}'::jsonb, 1440)
ON CONFLICT (slug) DO NOTHING;

-- =========== cron: sync a cada 30 min ===========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'jobs-sync-every-30min') THEN
    PERFORM cron.schedule(
      'jobs-sync-every-30min',
      '*/30 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://project--1e2cacb3-db65-4c75-8803-dac2834a3207.lovable.app/api/public/hooks/jobs-sync',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'apikey','sb_publishable_kMRCdr6_sQmhXeF35t9zKA_CJZYqWAq'
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;
