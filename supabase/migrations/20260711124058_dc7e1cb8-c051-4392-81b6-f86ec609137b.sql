
-- App role enum + user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'company_owner', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles user update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles user insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'MG',
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities public read" ON public.cities FOR SELECT USING (true);
CREATE POLICY "cities admin write" ON public.cities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  zip TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  hours JSONB,
  logo_url TEXT,
  banner_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies public read active" ON public.companies FOR SELECT USING (status = 'active' OR (auth.uid() IS NOT NULL AND (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "companies owner update" ON public.companies FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "companies owner insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "companies admin delete" ON public.companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX companies_city_idx ON public.companies(city_id);
CREATE INDEX companies_featured_idx ON public.companies(featured);

CREATE TABLE public.company_categories (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, category_id)
);
GRANT SELECT ON public.company_categories TO anon, authenticated;
GRANT INSERT, DELETE ON public.company_categories TO authenticated;
GRANT ALL ON public.company_categories TO service_role;
ALTER TABLE public.company_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc public read" ON public.company_categories FOR SELECT USING (true);
CREATE POLICY "cc owner write" ON public.company_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.company_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'photo',
  url TEXT NOT NULL,
  caption TEXT,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_media TO authenticated;
GRANT ALL ON public.company_media TO service_role;
ALTER TABLE public.company_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media public read" ON public.company_media FOR SELECT USING (true);
CREATE POLICY "media owner write" ON public.company_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews user insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews user update own" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reviews user delete own" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads anyone insert" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads owner read" ON public.leads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER companies_set_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;

CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fav_select_own" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fav_insert_own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id));
CREATE POLICY "fav_delete_own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  city_slug text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_public_insert" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255);
CREATE POLICY "newsletter_admin_read" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  cover_url text,
  author_name text,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_public_read" ON public.blog_posts FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "blog_admin_all" ON public.blog_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER blog_posts_set_updated BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.leads_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  plan text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads_planos TO anon, authenticated;
GRANT ALL ON public.leads_planos TO service_role;
ALTER TABLE public.leads_planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_planos_public_insert" ON public.leads_planos FOR INSERT TO anon, authenticated WITH CHECK (length(company_name) BETWEEN 1 AND 200 AND length(contact_name) BETWEEN 1 AND 120 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND plan IN ('basico','profissional','premium'));
CREATE POLICY "leads_planos_admin_read" ON public.leads_planos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS video_url text NULL,
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read public settings" ON public.system_settings FOR SELECT USING (is_public = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write settings" ON public.system_settings FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
CREATE POLICY "admin write plans" ON public.plans_config FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.plans_config (slug, name, price_cents, duration_days, max_photos, features, sort) VALUES
  ('free', 'Grátis', 0, 0, 3, '["Presença no catálogo","Contato WhatsApp","Mapa básico"]'::jsonb, 0),
  ('premium', 'Premium', 9900, 30, 999, '["Destaque no topo","Galeria ilimitada","Banner personalizado","Selo Verificado","Botão WhatsApp destacado","CTA fixo mobile"]'::jsonb, 1),
  ('featured', 'Destaque', 19900, 30, 999, '["Tudo do Premium","Aparece na home","Recomendações automáticas","Vídeo institucional"]'::jsonb, 2)
ON CONFLICT (slug) DO NOTHING;

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
CREATE POLICY "anyone can insert view" ON public.company_views FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_views.company_id AND c.status = 'active'));
CREATE POLICY "admin reads views" ON public.company_views FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.system_settings (key, value, is_public) VALUES
  ('search_radius_km', '10'::jsonb, true),
  ('map_enabled', 'true'::jsonb, true),
  ('max_upload_mb', '5'::jsonb, true)
ON CONFLICT (key) DO NOTHING;

CREATE POLICY "admin manage companies" ON public.companies FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage company_media" ON public.company_media FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage company_categories" ON public.company_categories FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage cities" ON public.cities FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin reads lead_planos" ON public.leads_planos FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON public.companies USING gin (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.refresh_company_rating(_company_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.companies c SET rating = COALESCE(s.avg_rating, 0), review_count = COALESCE(s.cnt, 0)
  FROM (SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS cnt FROM public.reviews WHERE company_id = _company_id) s
  WHERE c.id = _company_id;
$$;
REVOKE ALL ON FUNCTION public.refresh_company_rating(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_reviews_refresh_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM public.refresh_company_rating(OLD.company_id); RETURN OLD;
  ELSE PERFORM public.refresh_company_rating(NEW.company_id);
    IF TG_OP = 'UPDATE' AND OLD.company_id <> NEW.company_id THEN PERFORM public.refresh_company_rating(OLD.company_id); END IF;
    RETURN NEW;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.trg_reviews_refresh_company() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER reviews_refresh_company AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.trg_reviews_refresh_company();

CREATE INDEX IF NOT EXISTS idx_companies_status_plan_rating ON public.companies (status, plan, rating DESC, review_count DESC);
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies (city_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies (slug);
CREATE INDEX IF NOT EXISTS idx_company_categories_category ON public.company_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_company_categories_company ON public.company_categories (company_id);
CREATE INDEX IF NOT EXISTS idx_reviews_company ON public.reviews (company_id);

CREATE TYPE public.public_service_category AS ENUM ('saude', 'educacao', 'seguranca', 'prefeitura','transporte', 'assistencia_social', 'emergencia', 'outros');

CREATE TABLE public.public_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  category public.public_service_category NOT NULL,
  name TEXT NOT NULL,
  subtype TEXT, description TEXT, address TEXT, neighborhood TEXT,
  phone TEXT, phone_secondary TEXT, whatsapp TEXT, email TEXT, website TEXT, hours TEXT,
  is_24h BOOLEAN NOT NULL DEFAULT false,
  lat NUMERIC(9,6), lng NUMERIC(9,6),
  active BOOLEAN NOT NULL DEFAULT true, featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_public_services_city ON public.public_services(city_id);
CREATE INDEX idx_public_services_category ON public.public_services(category);
CREATE INDEX idx_public_services_active ON public.public_services(active);
GRANT SELECT ON public.public_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_services TO authenticated;
GRANT ALL ON public.public_services TO service_role;
ALTER TABLE public.public_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_services public read" ON public.public_services FOR SELECT USING (active = true);
CREATE POLICY "public_services admin all" ON public.public_services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_public_services_updated_at BEFORE UPDATE ON public.public_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL, phone TEXT NOT NULL,
  description TEXT, icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_emergency_contacts_city ON public.emergency_contacts(city_id);
GRANT SELECT ON public.emergency_contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency_contacts public read" ON public.emergency_contacts FOR SELECT USING (active = true);
CREATE POLICY "emergency_contacts admin all" ON public.emergency_contacts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_emergency_contacts_updated_at BEFORE UPDATE ON public.emergency_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.emergency_contacts (city_id, name, phone, description, icon, sort_order) VALUES
  (NULL, 'SAMU', '192', 'Emergência médica', 'Ambulance', 1),
  (NULL, 'Bombeiros', '193', 'Incêndios, resgates e emergências', 'Flame', 2),
  (NULL, 'Polícia Militar', '190', 'Emergência policial', 'Shield', 3),
  (NULL, 'Polícia Civil', '197', 'Registro de ocorrências', 'Badge', 4),
  (NULL, 'Defesa Civil', '199', 'Enchentes, deslizamentos, riscos', 'CloudRain', 5),
  (NULL, 'Disque Denúncia', '181', 'Denúncia anônima', 'PhoneCall', 6);
