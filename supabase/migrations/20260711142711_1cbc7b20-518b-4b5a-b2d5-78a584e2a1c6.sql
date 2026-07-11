-- Cities extras
ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS hero_title text,
  ADD COLUMN IF NOT EXISTS hero_subtitle text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS featured_category_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS cities_is_active_idx ON public.cities (is_active);

DROP TRIGGER IF EXISTS set_cities_updated_at ON public.cities;
CREATE TRIGGER set_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;
CREATE POLICY "Admins can manage cities"
  ON public.cities FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Reviews extras
ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_date timestamptz;

-- Nearest city helper
CREATE OR REPLACE FUNCTION public.nearest_city(_lat double precision, _lng double precision)
RETURNS TABLE (id uuid, slug text, name text, distance_km double precision)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT c.id, c.slug, c.name,
    (6371 * acos(
      cos(radians(_lat)) * cos(radians(c.lat::float8)) *
      cos(radians(c.lng::float8) - radians(_lng)) +
      sin(radians(_lat)) * sin(radians(c.lat::float8))
    ))::float8 AS distance_km
  FROM public.cities c
  WHERE c.is_active = true AND c.lat IS NOT NULL AND c.lng IS NOT NULL
  ORDER BY distance_km ASC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.nearest_city(double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearest_city(double precision, double precision) TO anon, authenticated, service_role;

-- Premium enforcement trigger for companies
CREATE OR REPLACE FUNCTION public.enforce_premium_verified()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  premium_badges text[] := ARRAY['Top atendimento','Especialista','Entrega garantida'];
  b text;
BEGIN
  IF NEW.plan = 'premium' THEN
    NEW.is_verified := true;
    IF NEW.badges IS NULL THEN
      NEW.badges := premium_badges;
    ELSE
      FOREACH b IN ARRAY premium_badges LOOP
        IF NOT (b = ANY(NEW.badges)) THEN
          NEW.badges := array_append(NEW.badges, b);
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_premium_verified ON public.companies;
CREATE TRIGGER trg_enforce_premium_verified
BEFORE INSERT OR UPDATE OF plan, badges, is_verified ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_verified();

-- Weekly ranking (Premium only)
CREATE OR REPLACE FUNCTION public.get_weekly_ranking()
RETURNS TABLE (
  rank_position bigint, company_id uuid, name text, slug text, logo_url text,
  city_id uuid, visits bigint, activity bigint, reviews bigint,
  avg_rating numeric, score numeric, is_self boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _has_premium boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '42501';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE owner_id = _uid AND plan = 'premium' AND status = 'active'
      AND (plan_expires_at IS NULL OR plan_expires_at > now())
  ) INTO _has_premium;
  IF NOT _has_premium THEN
    RAISE EXCEPTION 'Ranking disponível apenas para empresas Premium' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH agg AS (
    SELECT c.id AS company_id, c.name, c.slug, c.logo_url, c.city_id, c.owner_id,
      COALESCE(v.visits, 0)::bigint AS visits,
      COALESCE(l.leads, 0)::bigint AS activity,
      COALESCE(r.reviews, 0)::bigint AS reviews,
      COALESCE(r.avg_rating, 0)::numeric(3,2) AS avg_rating,
      (COALESCE(v.visits,0)*1 + COALESCE(l.leads,0)*5 + COALESCE(r.reviews,0)*8 + COALESCE(r.avg_rating,0)*4)::numeric AS score
    FROM public.companies c
    LEFT JOIN LATERAL (SELECT COUNT(*) AS visits FROM public.company_views WHERE company_id = c.id AND viewed_at >= now() - interval '7 days') v ON true
    LEFT JOIN LATERAL (SELECT COUNT(*) AS leads FROM public.leads WHERE company_id = c.id AND created_at >= now() - interval '7 days') l ON true
    LEFT JOIN LATERAL (SELECT COUNT(*) AS reviews, AVG(rating) AS avg_rating FROM public.reviews WHERE company_id = c.id AND created_at >= now() - interval '7 days') r ON true
    WHERE c.plan = 'premium' AND c.status = 'active'
      AND (c.plan_expires_at IS NULL OR c.plan_expires_at > now())
  )
  SELECT RANK() OVER (ORDER BY a.score DESC, a.reviews DESC, a.visits DESC) AS rank_position,
    a.company_id, a.name, a.slug, a.logo_url, a.city_id, a.visits, a.activity, a.reviews, a.avg_rating, a.score,
    (a.owner_id = _uid) AS is_self
  FROM agg a
  ORDER BY rank_position ASC
  LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.get_weekly_ranking() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_ranking() TO authenticated;

-- Ensure blog_posts view runs as invoker (fix security_definer view lint)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='blog_posts' AND relkind='v') THEN
    EXECUTE 'ALTER VIEW public.blog_posts SET (security_invoker = true)';
  END IF;
END $$;