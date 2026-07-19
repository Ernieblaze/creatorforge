-- ═══════════════════════════════════════════════════════════
-- CreatorForge — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)
-- ═══════════════════════════════════════════════════════════

-- ── Profiles (one row per auth user) ─────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  bio text,
  niche text,
  goal text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  premium_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Generations (content history) ────────────────────────
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool text not null,
  title text,
  input text,
  output text,
  created_at timestamptz not null default now()
);

create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);

-- ── Subscriptions (Paystack/Flutterwave webhook target) ───
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'paystack',
  reference text unique,
  amount_kobo integer not null,
  interval text not null default 'monthly' check (interval in ('monthly', 'yearly')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz
);

-- Paystack subscription management (safe to re-run)
alter table public.subscriptions add column if not exists subscription_code text;
alter table public.subscriptions add column if not exists email_token text;
alter table public.subscriptions add column if not exists plan_code text;
create index if not exists subscriptions_user_idx
  on public.subscriptions (user_id, started_at desc);

-- ── Admins ────────────────────────────────────────────────
-- Emails listed here get admin read access via RLS and may manage
-- announcements. Keep in sync with VITE_ADMIN_EMAIL in .env.
create table if not exists public.admins (
  email text primary key
);

insert into public.admins (email)
values ('ernieblazze@gmail.com')
on conflict (email) do nothing;

-- If a wrong email was seeded earlier, remove it:
delete from public.admins where email = 'kingjpempire381@gmail.com';

-- True when the calling JWT belongs to an admin email.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ── Announcements (admin → all users, realtime) ───────────
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index if not exists announcements_active_idx
  on public.announcements (active, created_at desc);

-- ── Strategist chat history ───────────────────────────────
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  thread text not null default 'dock',        -- 'dock' | 'strategist'
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_thread_idx
  on public.chat_messages (user_id, thread, created_at);

-- ── AI usage log (written by the generate-content edge function) ──
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  tool text not null default 'unknown',
  provider text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_created_idx
  on public.ai_usage (created_at desc);
create index if not exists ai_usage_user_idx
  on public.ai_usage (user_id, created_at desc);

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.generations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.announcements enable row level security;
alter table public.chat_messages enable row level security;
alter table public.admins enable row level security;
alter table public.ai_usage enable row level security;

-- Drop-and-recreate so this script is safe to re-run after upgrades
drop policy if exists "ai_usage admin read" on public.ai_usage;
drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile upsert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "own generations read" on public.generations;
drop policy if exists "own generations insert" on public.generations;
drop policy if exists "own generations delete" on public.generations;
drop policy if exists "own subscriptions read" on public.subscriptions;
drop policy if exists "announcements read" on public.announcements;
drop policy if exists "announcements insert" on public.announcements;
drop policy if exists "announcements update" on public.announcements;
drop policy if exists "announcements delete" on public.announcements;
drop policy if exists "own chat read" on public.chat_messages;
drop policy if exists "own chat insert" on public.chat_messages;
drop policy if exists "own chat delete" on public.chat_messages;
drop policy if exists "admins read" on public.admins;

-- Profiles: users read/update their own row; admins read all
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "own profile upsert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

-- Generations: full CRUD on own rows; admins read all
create policy "own generations read" on public.generations
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own generations insert" on public.generations
  for insert with check (auth.uid() = user_id);
create policy "own generations delete" on public.generations
  for delete using (auth.uid() = user_id);

-- Subscriptions: read own (admins read all); writes come from
-- service-role webhooks only
create policy "own subscriptions read" on public.subscriptions
  for select using (auth.uid() = user_id or public.is_admin());

-- Announcements: everyone signed-in can read; only admins manage
create policy "announcements read" on public.announcements
  for select using (auth.role() = 'authenticated');
create policy "announcements insert" on public.announcements
  for insert with check (public.is_admin());
create policy "announcements update" on public.announcements
  for update using (public.is_admin());
create policy "announcements delete" on public.announcements
  for delete using (public.is_admin());

-- Chat messages: own rows only; admins may read for moderation
create policy "own chat read" on public.chat_messages
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own chat insert" on public.chat_messages
  for insert with check (auth.uid() = user_id);
create policy "own chat delete" on public.chat_messages
  for delete using (auth.uid() = user_id);

-- Admins table: readable only by admins (is_admin() itself runs as
-- security definer, so non-admins never see the list)
create policy "admins read" on public.admins
  for select using (public.is_admin());

-- AI usage: only admins read; rows are inserted by the edge function's
-- service role (which bypasses RLS) — clients can never write here
create policy "ai_usage admin read" on public.ai_usage
  for select using (public.is_admin());

-- ── Realtime ──────────────────────────────────────────────
-- Broadcast announcement changes to all connected clients.
do $$
begin
  alter publication supabase_realtime add table public.announcements;
exception when duplicate_object then null;
end $$;

-- ── Freemium enforcement (server-side) ────────────────────
-- The client checks limits for UX, but this trigger is the real gate:
-- free users are hard-capped at 10 generations per UTC day.
create or replace function public.enforce_daily_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_plan text;
  until timestamptz;
  todays_count integer;
begin
  select plan, premium_until into user_plan, until
  from public.profiles where id = new.user_id;
  -- A lapsed premium (premium_until in the past) is treated as free
  if coalesce(user_plan, 'free') = 'premium'
     and until is not null and until < now() then
    user_plan := 'free';
  end if;
  if coalesce(user_plan, 'free') = 'free' then
    select count(*) into todays_count
    from public.generations
    where user_id = new.user_id
      and created_at >= date_trunc('day', now());
    if todays_count >= 10 then
      raise exception 'Daily free limit reached. Upgrade to Premium for unlimited generations.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists generations_daily_limit on public.generations;
create trigger generations_daily_limit
  before insert on public.generations
  for each row execute function public.enforce_daily_limit();

-- ── Plan column protection ────────────────────────────────
-- Users can edit their profile, but only the payment webhook (service
-- role) or an admin may change `plan` — otherwise the free limit could
-- be bypassed from the browser. Client-side plan changes are silently
-- reverted.
create or replace function public.protect_plan_column()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plan is distinct from old.plan
     and auth.role() <> 'service_role'
     and not public.is_admin() then
    new.plan := old.plan;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_plan on public.profiles;
create trigger profiles_protect_plan
  before update on public.profiles
  for each row execute function public.protect_plan_column();

-- ═══════════════════════════════════════════════════════════
-- PRODUCTION UPGRADES (reconstructed 2026-07-19)
-- Everything below was originally applied to the live database via
-- dashboard pastes and is committed here so the schema can be rebuilt
-- from this file alone. The `create or replace` definitions below
-- intentionally OVERRIDE earlier versions in this file — this script
-- runs top-to-bottom and the last definition wins.
-- ═══════════════════════════════════════════════════════════

-- ── Credit economy columns ────────────────────────────────
alter table public.generations add column if not exists credits integer not null default 1;
alter table public.ai_usage add column if not exists credits integer not null default 1;

-- ── Referral system (+5 bonus credits both sides) ─────────
alter table public.profiles add column if not exists bonus_credits integer not null default 0;
alter table public.profiles add column if not exists referred_by uuid references auth.users (id);

create or replace function public.apply_referral(referrer uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or referrer is null or referrer = uid then return false; end if;
  if not exists (select 1 from public.profiles where id = referrer) then return false; end if;
  -- one referral per account
  update public.profiles set referred_by = referrer where id = uid and referred_by is null;
  if not found then return false; end if;
  -- both sides get +5 bonus credits; app.internal lets the protect
  -- trigger distinguish this server-side grant from a browser write
  perform set_config('app.internal', 'referral', true);
  update public.profiles set bonus_credits = coalesce(bonus_credits, 0) + 5 where id = uid;
  update public.profiles set bonus_credits = coalesce(bonus_credits, 0) + 5 where id = referrer;
  perform set_config('app.internal', '', true);
  return true;
end;
$$;

-- ── Plan + bonus column protection (upgraded) ─────────────
-- Browsers may never change plan or bonus_credits; only the service
-- role, an admin, or internal server-side functions (app.internal).
create or replace function public.protect_plan_column()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  internal boolean := coalesce(current_setting('app.internal', true), '') <> '';
begin
  if auth.role() <> 'service_role' and not public.is_admin() and not internal then
    if new.plan is distinct from old.plan then new.plan := old.plan; end if;
    if new.bonus_credits is distinct from old.bonus_credits then
      new.bonus_credits := old.bonus_credits;
    end if;
    if new.referred_by is distinct from old.referred_by and old.referred_by is not null then
      new.referred_by := old.referred_by;
    end if;
  end if;
  return new;
end;
$$;

-- ── Daily limit trigger (upgraded: credit-sum + bonus) ────
-- Free = 5 credits/day, premium = 50/day fair use; when the daily
-- budget is exhausted, referral bonus credits are consumed 1:1.
create or replace function public.enforce_daily_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_plan text;
  until timestamptz;
  bonus integer;
  cap integer;
  used integer;
  cost integer := coalesce(new.credits, 1);
  overflow integer;
begin
  select plan, premium_until, coalesce(bonus_credits, 0)
    into user_plan, until, bonus
    from public.profiles where id = new.user_id;
  if coalesce(user_plan, 'free') = 'premium'
     and until is not null and until < now() then
    user_plan := 'free'; -- lapsed premium
  end if;
  cap := case when coalesce(user_plan, 'free') = 'premium' then 50 else 5 end;
  select coalesce(sum(coalesce(credits, 1)), 0) into used
    from public.generations
    where user_id = new.user_id and created_at >= date_trunc('day', now());
  if used + cost > cap then
    overflow := (used + cost) - cap;
    if bonus >= overflow then
      perform set_config('app.internal', 'limit', true);
      update public.profiles set bonus_credits = bonus_credits - overflow
        where id = new.user_id;
      perform set_config('app.internal', '', true);
    else
      raise exception 'Daily credit limit reached. Upgrade to Premium for unlimited generations.';
    end if;
  end if;
  return new;
end;
$$;

-- ── Link-in-Bio pages (public /u/:slug) ───────────────────
create table if not exists public.bio_pages (
  user_id uuid primary key references auth.users (id) on delete cascade,
  slug text unique not null,
  name text default '',
  bio text default '',
  avatar_url text default '',
  links jsonb not null default '[]',
  socials jsonb not null default '{}',
  theme text not null default 'dark',
  updated_at timestamptz not null default now()
);

alter table public.bio_pages enable row level security;
drop policy if exists "bio public read" on public.bio_pages;
drop policy if exists "bio own write" on public.bio_pages;
drop policy if exists "bio own update" on public.bio_pages;
drop policy if exists "bio own delete" on public.bio_pages;
create policy "bio public read" on public.bio_pages for select using (true);
create policy "bio own write" on public.bio_pages for insert with check (auth.uid() = user_id);
create policy "bio own update" on public.bio_pages for update using (auth.uid() = user_id);
create policy "bio own delete" on public.bio_pages for delete using (auth.uid() = user_id);

-- NOTE: the partner program schema lives in supabase/partners.sql —
-- run that file after this one when rebuilding from scratch.

-- ── Admin helper view ─────────────────────────────────────
-- security_invoker makes the view respect RLS: admins (via is_admin()
-- policies) see everyone; regular users would only see themselves.
create or replace view public.admin_user_stats
with (security_invoker = true) as
select
  p.id, p.email, p.username, p.niche, p.plan, p.created_at,
  count(g.id) as generation_count,
  max(g.created_at) as last_active
from public.profiles p
left join public.generations g on g.user_id = p.id
group by p.id;
