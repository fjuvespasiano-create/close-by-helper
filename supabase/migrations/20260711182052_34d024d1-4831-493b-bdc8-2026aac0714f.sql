
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS state text;

CREATE INDEX IF NOT EXISTS profiles_city_id_idx ON public.profiles(city_id);
CREATE INDEX IF NOT EXISTS profiles_state_idx ON public.profiles(state);

ALTER TABLE public.push_deliveries
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

CREATE INDEX IF NOT EXISTS push_deliveries_retry_idx
  ON public.push_deliveries(status, next_retry_at)
  WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS push_notifications_scheduled_idx
  ON public.push_notifications(status, scheduled_at)
  WHERE status = 'scheduled';
