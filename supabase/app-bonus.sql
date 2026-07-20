-- ═══════════════════════════════════════════════════════════
-- CreatorForge — "Install the app, get +10 bonus credits"
-- Paste in the Supabase SQL Editor. Safe to re-run.
-- Grants +10 bonus_credits ONCE per account, the first time the user
-- opens the native app while signed in.
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists app_bonus_claimed boolean not null default false;

create or replace function public.claim_app_bonus()
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  already boolean;
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;
  select app_bonus_claimed into already from public.profiles where id = uid;
  if already then
    return json_build_object('granted', false);
  end if;
  -- app.internal lets the plan/bonus protection trigger allow this
  -- server-side grant (same pattern as apply_referral).
  perform set_config('app.internal', 'app_bonus', true);
  update public.profiles
    set app_bonus_claimed = true,
        bonus_credits = coalesce(bonus_credits, 0) + 10
    where id = uid;
  perform set_config('app.internal', '', true);
  return json_build_object('granted', true, 'credits', 10);
end;
$$;
