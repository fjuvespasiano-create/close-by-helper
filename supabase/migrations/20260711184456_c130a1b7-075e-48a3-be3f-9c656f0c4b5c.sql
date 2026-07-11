SELECT cron.unschedule('jobs-sync-every-30min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='jobs-sync-every-30min');

SELECT cron.schedule(
  'jobs-sync-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--1e2cacb3-db65-4c75-8803-dac2834a3207.lovable.app/api/public/hooks/jobs-sync',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_kMRCdr6_sQmhXeF35t9zKA_CJZYqWAq"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);