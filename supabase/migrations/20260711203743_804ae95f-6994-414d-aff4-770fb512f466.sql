
CREATE TABLE public.tourist_attractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  image_url TEXT,
  link_url TEXT,
  meta TEXT,
  tag TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tourist_attractions_city ON public.tourist_attractions(city_id);
CREATE INDEX idx_tourist_attractions_active ON public.tourist_attractions(is_active);
CREATE INDEX idx_tourist_attractions_category ON public.tourist_attractions(category);

GRANT SELECT ON public.tourist_attractions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tourist_attractions TO authenticated;
GRANT ALL ON public.tourist_attractions TO service_role;

ALTER TABLE public.tourist_attractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active attractions"
  ON public.tourist_attractions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage attractions"
  ON public.tourist_attractions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tourist_attractions_updated_at
  BEFORE UPDATE ON public.tourist_attractions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
