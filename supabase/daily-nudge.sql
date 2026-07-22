-- ═══════════════════════════════════════════════════════════
-- CreatorForge — Daily "credits are fresh" push nudge
-- Paste in the Supabase SQL Editor.
--
-- BEFORE RUNNING: replace  YOUR_INTERNAL_KEY  (appears once below) with
-- the exact same value you set as the Supabase secret INTERNAL_PUSH_KEY.
--
-- Schedules a push to every registered device once a day at 8:00 AM
-- Nigeria time (07:00 UTC). Safe to re-run (it unschedules first).
-- ═══════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous version of this job so re-running is clean.
select cron.unschedule('daily-credits-nudge')
where exists (select 1 from cron.job where jobname = 'daily-credits-nudge');

select cron.schedule(
  'daily-credits-nudge',
  '0 7 * * *',   -- every day at 07:00 UTC = 08:00 WAT
  $job$
  select net.http_post(
    url := 'https://lzqsdqqlpihabwarkqkl.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer sb_publishable_v3BwHoUXgDz3M5ogyZIt0w__9lgGtmF',
      'x-internal-key', 'YOUR_INTERNAL_KEY'
    ),
    body := jsonb_build_object(
      'title', '🔥 Your credits are fresh',
      'body', 'A new day, a new batch of credits. Create something and post it today.'
    )
  );
  $job$
);
