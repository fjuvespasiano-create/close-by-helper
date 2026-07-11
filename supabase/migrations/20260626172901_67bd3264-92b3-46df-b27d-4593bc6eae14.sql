
-- 1) companies novas colunas
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS video_url text NULL;

-- 2) system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read public settings" ON public.system_settings
  FOR SELECT USING (is_public = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write settings" ON public.system_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) plans_config
CREATE TABLE IF NOT EXISTS public.plans_config (
  slug text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  max_photos integer NOT NULL DEFAULT 3,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans_config TO anon, authenticated;
GRANT ALL ON public.plans_config TO service_role;
ALTER TABLE public.plans_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read plans" ON public.plans_config FOR SELECT USING (true);
CREATE POLICY "admin write plans" ON public.plans_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.plans_config (slug, name, price_cents, duration_days, max_photos, features, sort) VALUES
  ('free', 'Grátis', 0, 0, 3, '["Presença no catálogo","Contato WhatsApp","Mapa básico"]'::jsonb, 0),
  ('premium', 'Premium', 9900, 30, 999, '["Destaque no topo","Galeria ilimitada","Banner personalizado","Selo Verificado","Botão WhatsApp destacado","CTA fixo mobile"]'::jsonb, 1),
  ('featured', 'Destaque', 19900, 30, 999, '["Tudo do Premium","Aparece na home","Recomendações automáticas","Vídeo institucional"]'::jsonb, 2)
ON CONFLICT (slug) DO NOTHING;

-- 4) company_views
CREATE TABLE IF NOT EXISTS public.company_views (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text NULL
);
CREATE INDEX IF NOT EXISTS idx_company_views_company ON public.company_views(company_id);
CREATE INDEX IF NOT EXISTS idx_company_views_date ON public.company_views(viewed_at);
GRANT INSERT ON public.company_views TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.company_views_id_seq TO anon, authenticated;
GRANT ALL ON public.company_views TO service_role;
ALTER TABLE public.company_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert view" ON public.company_views FOR INSERT WITH CHECK (true);
CREATE POLICY "admin reads views" ON public.company_views FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 5) system_settings seed
INSERT INTO public.system_settings (key, value, is_public) VALUES
  ('search_radius_km', '10'::jsonb, true),
  ('map_enabled', 'true'::jsonb, true),
  ('max_upload_mb', '5'::jsonb, true)
ON CONFLICT (key) DO NOTHING;

-- 6) Admin policies adicionais em companies (gerir tudo)
DO $$ BEGIN
  CREATE POLICY "admin manage companies" ON public.companies
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin manage company_media" ON public.company_media
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin manage company_categories" ON public.company_categories
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin manage cities" ON public.cities
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin manage categories" ON public.categories
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin reads leads" ON public.leads
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin reads lead_planos" ON public.leads_planos
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
