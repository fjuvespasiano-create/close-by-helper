DO $$ BEGIN CREATE TYPE public.post_type AS ENUM ('article','news','blog','promo','event'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.publish_status AS ENUM ('draft','scheduled','published','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','cancelled','completed','no_show'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.post_type NOT NULL DEFAULT 'blog',
  status public.publish_status NOT NULL DEFAULT 'draft',
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text,
  featured_image text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  meta_title text,
  meta_description text,
  og_image text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  auto_generated boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published posts" ON public.posts FOR SELECT TO anon, authenticated USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY "Authors read own posts" ON public.posts FOR SELECT TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Staff read all posts" ON public.posts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher'));
CREATE POLICY "Authors create drafts" ON public.posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors update own drafts" ON public.posts FOR UPDATE TO authenticated USING (author_id = auth.uid() AND status IN ('draft','scheduled')) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Staff update posts" ON public.posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher'));
CREATE POLICY "Publisher/admin delete posts" ON public.posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'publisher'));
CREATE INDEX IF NOT EXISTS posts_type_status_idx ON public.posts(type,status,published_at DESC);
CREATE INDEX IF NOT EXISTS posts_company_idx ON public.posts(company_id);
CREATE INDEX IF NOT EXISTS posts_tags_gin ON public.posts USING gin (tags);
CREATE INDEX IF NOT EXISTS posts_title_trgm ON public.posts USING gin (title gin_trgm_ops);
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE is_table boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='blog_posts' AND table_type='BASE TABLE') INTO is_table;
  IF is_table THEN
    INSERT INTO public.posts (id, type, status, slug, title, excerpt, content, featured_image, author_name, published_at, created_at, updated_at)
    SELECT bp.id, 'blog'::public.post_type,
      CASE WHEN COALESCE(bp.published, false) THEN 'published'::public.publish_status ELSE 'draft'::public.publish_status END,
      bp.slug, bp.title, NULLIF(bp.excerpt,''), bp.content, NULLIF(bp.cover_url,''),
      bp.author_name, bp.published_at,
      COALESCE(bp.created_at, now()), COALESCE(bp.updated_at, now())
    FROM public.blog_posts bp
    ON CONFLICT (id) DO NOTHING;
    ALTER TABLE public.blog_posts RENAME TO blog_posts_legacy;
    CREATE VIEW public.blog_posts AS
      SELECT id, slug, title, excerpt, content, featured_image AS cover_url, author_name,
        (status = 'published') AS published, published_at, created_at, updated_at
      FROM public.posts WHERE type = 'blog';
    GRANT SELECT ON public.blog_posts TO anon, authenticated;
    GRANT ALL ON public.blog_posts TO service_role;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.post_categories (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);
GRANT SELECT ON public.post_categories TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_categories TO authenticated;
GRANT ALL ON public.post_categories TO service_role;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read post_categories" ON public.post_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage post_categories" ON public.post_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher'));

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  cover_image text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  status public.publish_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published events" ON public.events FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Owner reads own events" ON public.events FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = events.company_id AND c.owner_id = auth.uid()));
CREATE POLICY "Staff reads all events" ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher'));
CREATE POLICY "Owner creates events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())));
CREATE POLICY "Owner updates own events" ON public.events FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor'));
CREATE POLICY "Owner deletes own events" ON public.events FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS events_start_idx ON public.events(start_at);
CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  cover_image text,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  price_from numeric(10,2),
  price_to numeric(10,2),
  valid_from timestamptz,
  valid_to timestamptz,
  status public.publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active promotions" ON public.promotions FOR SELECT TO anon, authenticated
  USING (status = 'published' AND (valid_to IS NULL OR valid_to >= now()));
CREATE POLICY "Owner manages promotions" ON public.promotions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER promotions_set_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  notes text,
  contact_name text,
  contact_phone text,
  contact_email text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT INSERT ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads related appointments" ON public.appointments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone books appointment" ON public.appointments FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.status = 'active'));
CREATE POLICY "Owner updates appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner deletes appointments" ON public.appointments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS appointments_company_start_idx ON public.appointments(company_id, start_at);
CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric(10,2),
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_items TO authenticated;
GRANT ALL ON public.marketplace_items TO service_role;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published items" ON public.marketplace_items FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Owner manages items" ON public.marketplace_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER marketplace_items_set_updated_at BEFORE UPDATE ON public.marketplace_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  alt text,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active banners" ON public.banners FOR SELECT TO anon, authenticated
  USING (active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "Admin manages banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER banners_set_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User updates own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "User deletes own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  entity_type text,
  entity_id uuid,
  user_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone inserts analytics" ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin reads analytics" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS analytics_events_name_created_idx ON public.analytics_events(name, created_at DESC);

CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  url text NOT NULL,
  kind text NOT NULL DEFAULT 'image',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read media" ON public.media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owner manages media" ON public.media FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS ticket_url text,
  ADD COLUMN IF NOT EXISTS price_min numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_max numeric(10,2);

CREATE TABLE IF NOT EXISTS public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_categories TO authenticated;
GRANT ALL ON public.event_categories TO service_role;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_categories are public" ON public.event_categories FOR SELECT USING (true);
CREATE POLICY "admins manage event_categories" ON public.event_categories FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.events
  ADD CONSTRAINT events_category_fkey FOREIGN KEY (category_id) REFERENCES public.event_categories(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  artist_name text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  stage text,
  cover_image text,
  ticket_url text,
  ticket_price numeric(10,2),
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shows TO authenticated;
GRANT ALL ON public.shows TO service_role;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shows public read via published events" ON public.shows FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = shows.event_id AND e.status = 'published')
    OR public.has_role(auth.uid(),'admin')
    OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = shows.event_id AND e.created_by = auth.uid()))
  );
CREATE POLICY "admins manage shows" ON public.shows FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "event owner manages shows" ON public.shows FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = shows.event_id AND e.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = shows.event_id AND e.created_by = auth.uid()));
CREATE INDEX IF NOT EXISTS shows_event_id_idx ON public.shows(event_id);
CREATE INDEX IF NOT EXISTS shows_start_at_idx ON public.shows(start_at);
CREATE TRIGGER shows_set_updated_at BEFORE UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.event_categories (slug, name, icon, sort) VALUES
  ('show','Show','music', 1),
  ('festival','Festival','party-popper', 2),
  ('teatro','Teatro','drama', 3),
  ('esporte','Esporte','trophy', 4),
  ('feira','Feira','store', 5),
  ('workshop','Workshop','graduation-cap', 6),
  ('gastronomia','Gastronomia','utensils', 7),
  ('outros','Outros','calendar', 99)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS response_time_minutes integer,
  ADD COLUMN IF NOT EXISTS response_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS services_completed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clients_served integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS coverage_cities uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tour_360_url text,
  ADD COLUMN IF NOT EXISTS catalog_url text,
  ADD COLUMN IF NOT EXISTS pricebook_url text,
  ADD COLUMN IF NOT EXISTS portfolio_pdf_url text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS youtube text,
  ADD COLUMN IF NOT EXISTS quality_scores jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reputation_score integer,
  ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_range smallint,
  ADD COLUMN IF NOT EXISTS promotions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS financing_info jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS differentials text[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.company_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  description text,
  before_url text,
  after_url text,
  images text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_projects TO authenticated;
GRANT ALL ON public.company_projects TO service_role;
ALTER TABLE public.company_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read company projects" ON public.company_projects FOR SELECT USING (true);
CREATE POLICY "Owners manage their projects" ON public.company_projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));
CREATE POLICY "Admins manage all projects" ON public.company_projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER company_projects_updated_at BEFORE UPDATE ON public.company_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.company_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_faqs TO authenticated;
GRANT ALL ON public.company_faqs TO service_role;
ALTER TABLE public.company_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read company faqs" ON public.company_faqs FOR SELECT USING (true);
CREATE POLICY "Owners manage their faqs" ON public.company_faqs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));
CREATE POLICY "Admins manage all faqs" ON public.company_faqs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER company_faqs_updated_at BEFORE UPDATE ON public.company_faqs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  is_pwa BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs read"   ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  icon_url TEXT,
  default_url TEXT,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_templates TO authenticated, anon;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates public read" ON public.notification_templates FOR SELECT USING (true);
CREATE POLICY "templates admin write" ON public.notification_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.notification_templates (slug,name,category,emoji,color,title_template,body_template,sort) VALUES
  ('promocao','Promoção','promocao','🎉','#F97316','Promoção especial pra você!','Confira as melhores ofertas de hoje no AgendaAqui.',1),
  ('novidade','Novidade','novidade','🚀','#3B82F6','Novidade no AgendaAqui','Acabou de chegar uma novidade que você vai gostar.',2),
  ('destaque','Empresa em destaque','empresa','⭐','#FACC15','Empresa em destaque','Conheça a empresa que está bombando na sua cidade.',3),
  ('comunicado','Comunicado','sistema','📢','#0EA5E9','Aviso importante','Uma novidade oficial do AgendaAqui pra você.',4),
  ('noticia','Notícia','noticias','📰','#8B5CF6','Notícia quentinha','Fique por dentro do que está acontecendo na sua região.',5),
  ('oferta','Oferta relâmpago','promocao','🎁','#EC4899','Oferta imperdível','Aproveite antes que acabe.',6),
  ('evento','Evento','evento','📅','#22C55E','Evento chegando','Não perca o próximo evento da sua cidade.',7),
  ('manutencao','Manutenção','sistema','⚠️','#EF4444','Manutenção programada','O AgendaAqui passará por manutenção rápida.',8);

CREATE TABLE public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon_url TEXT,
  image_url TEXT,
  url TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  priority TEXT NOT NULL DEFAULT 'normal',
  color TEXT,
  emoji TEXT,
  buttons JSONB,
  audience JSONB NOT NULL DEFAULT '{"kind":"all"}'::jsonb,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  opened_count INT NOT NULL DEFAULT 0,
  clicked_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  unsubscribed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_notif_status ON public.push_notifications(status, scheduled_at);
CREATE INDEX idx_push_notif_created ON public.push_notifications(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_notifications TO authenticated;
GRANT ALL ON public.push_notifications TO service_role;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push notif admin all" ON public.push_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER push_notif_updated BEFORE UPDATE ON public.push_notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.push_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  device TEXT,
  browser TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id, subscription_id)
);
CREATE INDEX idx_deliv_notif ON public.push_deliveries(notification_id);
CREATE INDEX idx_deliv_user  ON public.push_deliveries(user_id);
GRANT SELECT, INSERT, UPDATE ON public.push_deliveries TO authenticated;
GRANT ALL ON public.push_deliveries TO service_role;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliv own read"  ON public.push_deliveries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "deliv admin all" ON public.push_deliveries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.push_inbox (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  favorite_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  UNIQUE (user_id, notification_id)
);
CREATE INDEX idx_inbox_user_time ON public.push_inbox(user_id, received_at DESC);
CREATE INDEX idx_inbox_unread ON public.push_inbox(user_id) WHERE read_at IS NULL AND archived_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_inbox TO authenticated;
GRANT ALL ON public.push_inbox TO service_role;
ALTER TABLE public.push_inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbox own read"   ON public.push_inbox FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inbox own upd"    ON public.push_inbox FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inbox own del"    ON public.push_inbox FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inbox admin ins"  ON public.push_inbox FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);

CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  promocoes BOOLEAN NOT NULL DEFAULT true,
  novidades BOOLEAN NOT NULL DEFAULT true,
  eventos BOOLEAN NOT NULL DEFAULT true,
  atualizacoes BOOLEAN NOT NULL DEFAULT true,
  empresas BOOLEAN NOT NULL DEFAULT true,
  blog BOOLEAN NOT NULL DEFAULT true,
  marketplace BOOLEAN NOT NULL DEFAULT true,
  som BOOLEAN NOT NULL DEFAULT true,
  vibracao BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_start INT NOT NULL DEFAULT 20,
  quiet_end INT NOT NULL DEFAULT 8,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own" ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER prefs_updated BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$ BEGIN CREATE TYPE public.qa_status AS ENUM ('novo','em_analise','reproduzido','em_desenvolvimento','corrigido','publicado','fechado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.qa_priority AS ENUM ('baixa','media','alta','critica'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.qa_type AS ENUM ('erro','bug','info_incorreta','empresa','evento','noticia','layout','lentidao','funcionalidade','sugestao','outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SEQUENCE IF NOT EXISTS public.qa_ticket_seq START 1;

CREATE TABLE public.qa_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE DEFAULT ('QA-' || lpad(nextval('public.qa_ticket_seq')::text, 6, '0')),
  type public.qa_type NOT NULL DEFAULT 'outro',
  priority public.qa_priority NOT NULL DEFAULT 'media',
  status public.qa_status NOT NULL DEFAULT 'novo',
  description TEXT NOT NULL,
  page_url TEXT,
  page_title TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  device JSONB NOT NULL DEFAULT '{}'::jsonb,
  console_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  network_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  screenshot_url TEXT,
  video_url TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fingerprint TEXT,
  resolved_at TIMESTAMPTZ,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX qa_tickets_status_idx ON public.qa_tickets(status);
CREATE INDEX qa_tickets_created_idx ON public.qa_tickets(created_at DESC);
CREATE INDEX qa_tickets_fingerprint_idx ON public.qa_tickets(fingerprint);
CREATE INDEX qa_tickets_user_idx ON public.qa_tickets(user_id);
GRANT SELECT, INSERT, UPDATE ON public.qa_tickets TO authenticated;
GRANT INSERT ON public.qa_tickets TO anon;
GRANT ALL ON public.qa_tickets TO service_role;
ALTER TABLE public.qa_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_tickets_insert_public ON public.qa_tickets FOR INSERT TO anon, authenticated
  WITH CHECK (length(description) BETWEEN 3 AND 5000 AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY qa_tickets_select_own ON public.qa_tickets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY qa_tickets_admin_all ON public.qa_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.qa_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.qa_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX qa_ticket_comments_ticket_idx ON public.qa_ticket_comments(ticket_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.qa_ticket_comments TO authenticated;
GRANT ALL ON public.qa_ticket_comments TO service_role;
ALTER TABLE public.qa_ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_comments_admin ON public.qa_ticket_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND author_id = auth.uid());

CREATE TABLE public.qa_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.qa_tickets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX qa_ticket_events_ticket_idx ON public.qa_ticket_events(ticket_id, created_at);
GRANT SELECT, INSERT ON public.qa_ticket_events TO authenticated;
GRANT ALL ON public.qa_ticket_events TO service_role;
ALTER TABLE public.qa_ticket_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_events_admin ON public.qa_ticket_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER qa_tickets_updated_at BEFORE UPDATE ON public.qa_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.qa_on_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.qa_ticket_events(ticket_id, actor_id, kind, payload)
    VALUES (NEW.id, auth.uid(), 'status_change', jsonb_build_object('from', OLD.status, 'to', NEW.status));
    IF NEW.status IN ('corrigido','publicado') AND OLD.status NOT IN ('corrigido','publicado') THEN
      NEW.resolved_at := COALESCE(NEW.resolved_at, now());
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, type, title, body, data)
        VALUES (NEW.user_id, 'qa_resolved',
          'Problema resolvido: ' || NEW.ticket_number,
          'O problema que você reportou foi resolvido. Obrigado por ajudar a melhorar o AgendaAqui!',
          jsonb_build_object('ticket_id', NEW.id, 'ticket_number', NEW.ticket_number));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.qa_on_status_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER qa_tickets_status_trg BEFORE UPDATE ON public.qa_tickets FOR EACH ROW EXECUTE FUNCTION public.qa_on_status_change();

DO $$ BEGIN CREATE TYPE public.listing_status AS ENUM ('ativo','vendido','pausado','removido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.listing_condition AS ENUM ('novo','seminovo','usado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.listing_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_categories TO anon, authenticated;
GRANT ALL ON public.listing_categories TO service_role;
ALTER TABLE public.listing_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias visíveis a todos" ON public.listing_categories FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin gerencia categorias" ON public.listing_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.listing_categories (slug, name, icon, sort_order) VALUES
  ('eletronicos','Eletrônicos','Smartphone',1),
  ('moveis','Móveis','Sofa',2),
  ('veiculos','Veículos','Car',3),
  ('imoveis','Imóveis','Home',4),
  ('moda','Moda e Beleza','Shirt',5),
  ('servicos','Serviços','Wrench',6),
  ('bebe-infantil','Bebê e Infantil','Baby',7),
  ('casa-jardim','Casa e Jardim','Flower',8),
  ('esportes','Esportes e Lazer','Dumbbell',9),
  ('outros','Outros','Package',99);

CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  category_slug text NOT NULL REFERENCES public.listing_categories(slug) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  price numeric(12,2),
  condition public.listing_condition NOT NULL DEFAULT 'usado',
  neighborhood text,
  contact_phone text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.listing_status NOT NULL DEFAULT 'ativo',
  views_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listings_title_len CHECK (char_length(title) BETWEEN 3 AND 120),
  CONSTRAINT listings_desc_len CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT listings_price_nonneg CHECK (price IS NULL OR price >= 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anúncios ativos são públicos" ON public.listings FOR SELECT TO anon, authenticated USING (status = 'ativo');
CREATE POLICY "dono vê os próprios" ON public.listings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "autenticado cria o próprio" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dono edita o próprio" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dono exclui o próprio" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin gerencia listings" ON public.listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX listings_city_status_idx ON public.listings (city_id, status, created_at DESC);
CREATE INDEX listings_category_status_idx ON public.listings (category_slug, status, created_at DESC);
CREATE INDEX listings_user_idx ON public.listings (user_id, created_at DESC);
CREATE INDEX listings_title_trgm ON public.listings USING gin (title gin_trgm_ops);
CREATE TRIGGER listings_set_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.listing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT msg_body_len CHECK (char_length(body) BETWEEN 1 AND 2000),
  CONSTRAINT msg_sender_valid CHECK (sender_id = buyer_id OR sender_id = seller_id)
);
GRANT SELECT, INSERT, UPDATE ON public.listing_messages TO authenticated;
GRANT ALL ON public.listing_messages TO service_role;
ALTER TABLE public.listing_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participantes leem mensagens" ON public.listing_messages FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "participante envia mensagem" ON public.listing_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND (auth.uid() = buyer_id OR auth.uid() = seller_id));
CREATE POLICY "destinatário marca lida" ON public.listing_messages FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE INDEX listing_msg_thread_idx ON public.listing_messages (listing_id, buyer_id, created_at);
CREATE INDEX listing_msg_seller_idx ON public.listing_messages (seller_id, created_at DESC);
CREATE INDEX listing_msg_buyer_idx ON public.listing_messages (buyer_id, created_at DESC);

CREATE TABLE public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_reason_len CHECK (char_length(reason) BETWEEN 2 AND 80),
  CONSTRAINT report_notes_len CHECK (notes IS NULL OR char_length(notes) <= 1000)
);
GRANT SELECT, INSERT ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticado cria denúncia" ON public.listing_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reporter vê a própria" ON public.listing_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "admin lê/gerencia denúncias" ON public.listing_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX listing_reports_listing_idx ON public.listing_reports (listing_id, created_at DESC);