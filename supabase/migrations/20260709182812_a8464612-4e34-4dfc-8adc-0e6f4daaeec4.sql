
-- 1) Add event_type + category to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS ticket_url text,
  ADD COLUMN IF NOT EXISTS price_min numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_max numeric(10,2);

-- 2) Event categories
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

-- 3) Shows table (artistas / atrações vinculadas a um evento)
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

-- Public read: only shows whose parent event is published
CREATE POLICY "shows public read via published events" ON public.shows FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = shows.event_id AND e.status = 'published')
    OR public.has_role(auth.uid(),'admin')
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = shows.event_id AND e.created_by = auth.uid()
    ))
  );

CREATE POLICY "admins manage shows" ON public.shows FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "event owner manages shows" ON public.shows FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = shows.event_id AND e.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = shows.event_id AND e.created_by = auth.uid()));

CREATE INDEX IF NOT EXISTS shows_event_id_idx ON public.shows(event_id);
CREATE INDEX IF NOT EXISTS shows_start_at_idx ON public.shows(start_at);

CREATE TRIGGER shows_set_updated_at BEFORE UPDATE ON public.shows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Seed a few categories
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
