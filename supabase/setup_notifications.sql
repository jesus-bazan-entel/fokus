-- =============================================
-- Setup: Scheduled Notifications via pg_cron
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Enable pg_cron and pg_net extensions
-- (Go to Supabase Dashboard > Database > Extensions and enable:
--  - pg_cron
--  - pg_net
-- Or run these if you have permissions:)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Create the cron job that runs every 30 min to check per-project schedules
-- The Edge Function filters which projects should be notified based on their
-- individual notify_time and notify_days settings
select cron.schedule(
  'fokus-daily-notifications',    -- job name
  '*/30 * * * *',                 -- every 30 minutes
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To verify the cron job was created:
-- select * from cron.job;

-- To remove the cron job:
-- select cron.unschedule('fokus-daily-notifications');

-- To test manually (call the Edge Function right now):
-- select net.http_post(
--   url := 'https://xhpnogywfaufrvoqvnee.supabase.co/functions/v1/notify',
--   headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--   body := '{}'::jsonb
-- );
