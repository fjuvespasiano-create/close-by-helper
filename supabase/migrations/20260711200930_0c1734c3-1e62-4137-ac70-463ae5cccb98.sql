
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS dedupe_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS events_dedupe_hash_key
  ON public.events (dedupe_hash)
  WHERE dedupe_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_source_idx ON public.events (source);

CREATE TABLE IF NOT EXISTS public.event_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  status text NOT NULL,
  items_found int NOT NULL DEFAULT 0,
  items_new int NOT NULL DEFAULT 0,
  items_updated int NOT NULL DEFAULT 0,
  error text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_sync_logs TO authenticated;
GRANT ALL ON public.event_sync_logs TO service_role;

ALTER TABLE public.event_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view event sync logs"
  ON public.event_sync_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
