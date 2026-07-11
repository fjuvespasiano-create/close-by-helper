
-- Extend cities with personalization + SEO fields, and add helper function for nearest city.

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

-- Unique slug
CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_key ON public.cities (slug);
CREATE INDEX IF NOT EXISTS cities_is_active_idx ON public.cities (is_active);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS set_cities_updated_at ON public.cities;
CREATE TRIGGER set_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin write policies (reads already public)
DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;
CREATE POLICY "Admins can manage cities"
  ON public.cities FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;

-- Nearest-city helper using simple haversine (no PostGIS dependency).
CREATE OR REPLACE FUNCTION public.nearest_city(_lat double precision, _lng double precision)
RETURNS TABLE (id uuid, slug text, name text, distance_km double precision)
LANGUAGE sql
STABLE
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.nearest_city(double precision, double precision) TO anon, authenticated, service_role;
