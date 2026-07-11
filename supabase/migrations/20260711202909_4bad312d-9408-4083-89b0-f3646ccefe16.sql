
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  link_url text NOT NULL,
  city_slug text,
  placement text NOT NULL DEFAULT 'bottom-right' CHECK (placement IN ('bottom-right','bottom-center','center')),
  delay_seconds integer NOT NULL DEFAULT 5 CHECK (delay_seconds BETWEEN 0 AND 60),
  scroll_trigger_percent integer NOT NULL DEFAULT 0 CHECK (scroll_trigger_percent BETWEEN 0 AND 100),
  display_seconds integer NOT NULL DEFAULT 7 CHECK (display_seconds BETWEEN 3 AND 60),
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  weight integer NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads active ads" ON public.ad_campaigns
  FOR SELECT TO anon, authenticated
  USING (active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "admins manage ads" ON public.ad_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ad_campaigns_active ON public.ad_campaigns(active, city_slug) WHERE active = true;

CREATE OR REPLACE FUNCTION public.track_ad_event(_ad_id uuid, _kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _kind = 'impression' THEN
    UPDATE public.ad_campaigns SET impressions = impressions + 1 WHERE id = _ad_id;
  ELSIF _kind = 'click' THEN
    UPDATE public.ad_campaigns SET clicks = clicks + 1 WHERE id = _ad_id;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.track_ad_event(uuid, text) TO anon, authenticated;
