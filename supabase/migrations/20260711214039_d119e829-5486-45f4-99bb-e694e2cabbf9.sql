
-- 1) Restrict profiles read to authenticated users only
DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "profiles authenticated read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2) Reschedule all cron jobs to use CRON_HOOK_SECRET instead of the publishable key
DO $$
DECLARE
  base_url text := 'https://project--1e2cacb3-db65-4c75-8803-dac2834a3207.lovable.app';
  cron_secret text := 'wtvd63BX8Ql7a6Io5jURFl1_c-sQwORhkmprR6y3HmBQmiqR';
  headers_json text := format('{"Content-Type":"application/json","x-cron-secret":"%s"}', cron_secret);
BEGIN
  -- Drop existing jobs (idempotent)
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
    'push-scheduler-every-minute',
    'jobs-sync-every-30min',
    'sync-original-daily',
    'scrape-services-weekly',
    'scrape-procurements-daily',
    'scrape-events-tripadvisor-daily',
    'sync-representatives-daily',
    'whatsapp-weekly-digest',
    'sync-bus-weekly'
  );

  PERFORM cron.schedule('push-scheduler-every-minute', '* * * * *', format($f$
    SELECT net.http_post(url := '%s/api/public/hooks/push-scheduler', headers := '%s'::jsonb, body := '{}'::jsonb) AS request_id;
  $f$, base_url, headers_json));

  PERFORM cron.schedule('jobs-sync-every-30min', '*/30 * * * *', format($f$
    SELECT net.http_post(url := '%s/api/public/hooks/jobs-sync', headers := '%s'::jsonb, body := '{}'::jsonb) AS request_id;
  $f$, base_url, headers_json));

  PERFORM cron.schedule('sync-original-daily', '0 3 * * *', format($f$
    SELECT net.http_post(url := '%s/api/public/hooks/sync-original', headers := '%s'::jsonb, body := '{}'::jsonb) AS request_id;
  $f$, base_url, headers_json));

  PERFORM cron.schedule('scrape-services-weekly', '0 4 * * 1', format($f$
    SELECT net.http_post(url := '%s/api/public/hooks/scrape-services', headers := '%s'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 300000);
  $f$, base_url, headers_json));

  PERFORM cron.schedule('scrape-procurements-daily', '0 4 * * *', format($f$
    SELECT net.http_post(url := '%s/api/public/hooks/scrape-procurements', headers := '%s'::jsonb, body := '{}'::jsonb) AS request_id;
  $f$, base_url, headers_json));

  PERFORM cron.schedule('scrape-events-tripadvisor-daily', '15 4 * * *', format($f$
    SELECT net.http_post(url := '%s/api/public/hooks/scrape-events', headers := '%s'::jsonb, body := '{}'::jsonb) AS request_id;
  $f$, base_url, headers_json));

  PERFORM cron.schedule('sync-representatives-daily', '30 4 * * *', format($f$
    SELECT net.http_post(url := '%s/api/public/hooks/sync-representatives', headers := '%s'::jsonb, body := '{}'::jsonb) AS request_id;
  $f$, base_url, headers_json));

  PERFORM cron.schedule('whatsapp-weekly-digest', '0 15 * * 5', format($f$
    SELECT net.http_post(url := '%s/api/public/hooks/whatsapp-weekly-digest', headers := '%s'::jsonb, body := '{}'::jsonb) AS request_id;
  $f$, base_url, headers_json));

  PERFORM cron.schedule('sync-bus-weekly', '0 5 * * 1', format($f$
    SELECT net.http_post(url := '%s/api/public/hooks/sync-bus', headers := '%s'::jsonb, body := '{}'::jsonb) AS request_id;
  $f$, base_url, headers_json));
END $$;
