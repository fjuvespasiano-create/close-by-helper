
-- Bus lines cached from movemetropolitano.com.br
CREATE TABLE public.bus_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city_slug TEXT NOT NULL,
  operator TEXT DEFAULT 'DER-MG',
  fare NUMERIC(6,2),
  source_url TEXT NOT NULL,
  departures JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_updated_at TEXT,
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bus_lines_city_idx ON public.bus_lines(city_slug);
CREATE INDEX bus_lines_code_idx ON public.bus_lines(code);

GRANT SELECT ON public.bus_lines TO anon, authenticated;
GRANT ALL ON public.bus_lines TO service_role;

ALTER TABLE public.bus_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bus lines are public"
  ON public.bus_lines FOR SELECT
  USING (true);

CREATE POLICY "Admins manage bus lines"
  ON public.bus_lines FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER bus_lines_set_updated_at
  BEFORE UPDATE ON public.bus_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bus_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_slug TEXT NOT NULL,
  lines_found INT NOT NULL DEFAULT 0,
  lines_updated INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ok',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

GRANT SELECT ON public.bus_sync_logs TO authenticated;
GRANT ALL ON public.bus_sync_logs TO service_role;

ALTER TABLE public.bus_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read bus sync logs"
  ON public.bus_sync_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
