-- ═══════════════════════════════════════════════════════════
-- CreatorForge — Push notifications (device token storage)
-- Paste in the Supabase SQL Editor. Safe to re-run.
-- Each phone that opens the app registers its FCM token here so the
-- send-function can target specific users (or everyone).
-- ═══════════════════════════════════════════════════════════

create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_idx
  on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

drop policy if exists "own tokens upsert" on public.device_tokens;
drop policy if exists "own tokens update" on public.device_tokens;
drop policy if exists "own tokens read" on public.device_tokens;
drop policy if exists "own tokens delete" on public.device_tokens;

-- Users manage only their own device tokens; the send-function uses the
-- service role (bypasses RLS) to read every token.
create policy "own tokens upsert" on public.device_tokens
  for insert with check (auth.uid() = user_id);
create policy "own tokens update" on public.device_tokens
  for update using (auth.uid() = user_id);
create policy "own tokens read" on public.device_tokens
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own tokens delete" on public.device_tokens
  for delete using (auth.uid() = user_id);

-- Upsert helper the app calls on every launch (token can move between users
-- if a phone is shared, so we always rebind to the current user).
create or replace function public.save_device_token(p_token text, p_platform text default 'android')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(p_token, '') = '' then return; end if;
  insert into public.device_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), coalesce(p_platform, 'android'), now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;
