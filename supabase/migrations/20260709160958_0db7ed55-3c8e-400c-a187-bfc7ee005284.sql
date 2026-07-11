-- POSTS
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
CREATE POLICY "Public reads published posts" ON public.posts FOR SELECT TO anon, authenticated
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY "Authors read own posts" ON public.posts FOR SELECT TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Staff read all posts" ON public.posts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher'));
CREATE POLICY "Authors create drafts" ON public.posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors update own drafts" ON public.posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND status IN ('draft','scheduled')) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Staff update posts" ON public.posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor') OR public.has_role(auth.uid(),'publisher'))
  WITH CHECK (true);
CREATE POLICY "Publisher/admin delete posts" ON public.posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'publisher'));
CREATE INDEX IF NOT EXISTS posts_type_status_idx ON public.posts(type,status,published_at DESC);
CREATE INDEX IF NOT EXISTS posts_company_idx ON public.posts(company_id);
CREATE INDEX IF NOT EXISTS posts_tags_gin ON public.posts USING gin (tags);
CREATE INDEX IF NOT EXISTS posts_title_trgm ON public.posts USING gin (title gin_trgm_ops);
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill blog_posts -> posts + view de compatibilidade
DO $$
DECLARE is_table boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='blog_posts' AND table_type='BASE TABLE') INTO is_table;
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
      SELECT id, slug, title, excerpt, content,
        featured_image AS cover_url, author_name,
        (status = 'published') AS published,
        published_at, created_at, updated_at
      FROM public.posts WHERE type = 'blog';
    GRANT SELECT ON public.blog_posts TO anon, authenticated;
    GRANT ALL ON public.blog_posts TO service_role;
  END IF;
END$$;

-- POST_CATEGORIES
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

-- EVENTS
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
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')) WITH CHECK (true);
CREATE POLICY "Owner deletes own events" ON public.events FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS events_start_idx ON public.events(start_at);
CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROMOTIONS
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

-- APPOINTMENTS
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
  WITH CHECK (true);
CREATE POLICY "Owner deletes appointments" ON public.appointments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS appointments_company_start_idx ON public.appointments(company_id, start_at);
CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MARKETPLACE ITEMS
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

-- BANNERS
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

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
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

-- ANALYTICS EVENTS
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

-- MEDIA
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