
CREATE TABLE IF NOT EXISTS public.live_feed_hidden (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  source_id UUID NOT NULL,
  reason TEXT,
  hidden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

GRANT SELECT ON public.live_feed_hidden TO anon, authenticated;
GRANT ALL ON public.live_feed_hidden TO service_role;
GRANT INSERT, DELETE ON public.live_feed_hidden TO authenticated;

ALTER TABLE public.live_feed_hidden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any client can read hidden ids"
  ON public.live_feed_hidden FOR SELECT
  USING (true);

CREATE POLICY "Admins manage hidden"
  ON public.live_feed_hidden FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.system_settings (key, value)
VALUES ('live_feed_blacklist', '["spam","teste","test123","xxx"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.procurements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.representative_activities;
