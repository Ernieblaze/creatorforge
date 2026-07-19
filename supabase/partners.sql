-- ═══════════════════════════════════════════════════════════
-- CreatorForge — Partner (real-money affiliate) program
-- Paste this whole file in the Supabase SQL Editor. Safe to re-run.
--
-- Money model:
--   • A partner is a normal user, approved by an admin, with their own
--     commission % (default 25). Their link is the existing invite link
--     (?ref=<user_id>) — attribution comes from profiles.referred_by.
--   • The paystack-webhook inserts one commission row per successful
--     charge by a referred user (unique on payment reference).
--   • Commissions are withdrawable 14 days after they are earned
--     (refund safety hold). Minimum payout: ₦5,000.
--   • Payouts are MANUAL: partner requests → admin sends the money
--     from their own bank → admin marks paid. No automatic transfers.
-- ═══════════════════════════════════════════════════════════

-- ── Security fix (2026-07-19): ai_usage as the credit ledger ──
-- The generate-content function now counts daily credits from ai_usage
-- (rows it writes itself) instead of client-written generations rows,
-- closing the "generate without saving = free AI" hole.
alter table public.ai_usage add column if not exists credits integer not null default 1;

-- ── Tables ────────────────────────────────────────────────
create table if not exists public.partners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  commission_percent numeric(5,2) not null default 25
    check (commission_percent >= 0 and commission_percent <= 90),
  promo_plan text,          -- how they say they'll promote
  audience text,            -- audience size / where
  bank_name text,
  account_number text,
  account_name text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (user_id) on delete cascade,
  referred_user uuid references auth.users (id) on delete set null,
  payment_reference text unique,   -- one commission per Paystack charge
  payment_kobo integer not null,
  percent numeric(5,2) not null,
  amount_kobo integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'reversed')),
  available_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index if not exists partner_commissions_partner_idx
  on public.partner_commissions (partner_id, created_at desc);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (user_id) on delete cascade,
  amount_kobo integer not null,
  status text not null default 'requested'
    check (status in ('requested', 'paid', 'rejected')),
  note text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists partner_payouts_partner_idx
  on public.partner_payouts (partner_id, requested_at desc);

-- ── Column protection ─────────────────────────────────────
-- Partners may edit their application/bank details, but only an admin
-- (or the service role) may change status or commission %.
create or replace function public.protect_partner_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() <> 'service_role' and not public.is_admin() then
      new.status := 'pending';
      new.commission_percent := 25;
      new.approved_at := null;
    end if;
    return new;
  end if;
  if auth.role() <> 'service_role' and not public.is_admin() then
    new.status := old.status;
    new.commission_percent := old.commission_percent;
    new.approved_at := old.approved_at;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists partners_protect on public.partners;
create trigger partners_protect
  before insert or update on public.partners
  for each row execute function public.protect_partner_columns();

-- ── Row Level Security ────────────────────────────────────
alter table public.partners enable row level security;
alter table public.partner_commissions enable row level security;
alter table public.partner_payouts enable row level security;

drop policy if exists "own partner read" on public.partners;
drop policy if exists "own partner apply" on public.partners;
drop policy if exists "own partner update" on public.partners;
drop policy if exists "admin partner update" on public.partners;
drop policy if exists "own commissions read" on public.partner_commissions;
drop policy if exists "own payouts read" on public.partner_payouts;

create policy "own partner read" on public.partners
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own partner apply" on public.partners
  for insert with check (auth.uid() = user_id);
create policy "own partner update" on public.partners
  for update using (auth.uid() = user_id or public.is_admin());

-- Commissions: read-only for the owning partner and admins.
-- Rows are written by the webhook (service role) only.
create policy "own commissions read" on public.partner_commissions
  for select using (auth.uid() = partner_id or public.is_admin());

-- Payouts: read-only; created/resolved via the RPCs below.
create policy "own payouts read" on public.partner_payouts
  for select using (auth.uid() = partner_id or public.is_admin());

-- ── Partner stats (counts + balances, in kobo) ────────────
create or replace function public.partner_stats()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  signups integer;
  paying integer;
  pending_kobo bigint;
  available_kobo bigint;
  paid_kobo bigint;
begin
  if uid is null then return null; end if;
  select count(*) into signups from public.profiles where referred_by = uid;
  select count(distinct referred_user),
         coalesce(sum(amount_kobo) filter (where status = 'pending' and available_at > now()), 0),
         coalesce(sum(amount_kobo) filter (where status = 'pending' and available_at <= now()), 0),
         coalesce(sum(amount_kobo) filter (where status = 'paid'), 0)
    into paying, pending_kobo, available_kobo, paid_kobo
    from public.partner_commissions where partner_id = uid;
  return json_build_object(
    'signups', signups,
    'paying', paying,
    'pending_kobo', pending_kobo,
    'available_kobo', available_kobo,
    'paid_kobo', paid_kobo
  );
end;
$$;

-- ── Request a payout (partner) ────────────────────────────
-- Withdraws the FULL available balance. Fails loudly with a clear
-- message the app shows directly.
create or replace function public.request_payout()
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p record;
  amount bigint;
  open_count integer;
  min_kobo constant bigint := 500000;  -- ₦5,000
begin
  select * into p from public.partners where user_id = uid;
  if p is null or p.status <> 'approved' then
    raise exception 'You are not an approved partner.';
  end if;
  if coalesce(p.bank_name, '') = '' or coalesce(p.account_number, '') = '' then
    raise exception 'Add your bank details before requesting a payout.';
  end if;
  select count(*) into open_count
    from public.partner_payouts where partner_id = uid and status = 'requested';
  if open_count > 0 then
    raise exception 'You already have a payout request awaiting processing.';
  end if;
  select coalesce(sum(amount_kobo), 0) into amount
    from public.partner_commissions
    where partner_id = uid and status = 'pending' and available_at <= now();
  if amount < min_kobo then
    raise exception 'Minimum payout is ₦5,000. Your available balance is ₦%.',
      to_char(amount / 100.0, 'FM999,999,990');
  end if;
  insert into public.partner_payouts (partner_id, amount_kobo)
  values (uid, amount);
  return json_build_object('ok', true, 'amount_kobo', amount);
end;
$$;

-- ── Resolve a payout (admin) ──────────────────────────────
-- action 'paid': marks the payout paid and flips the commissions it
-- covered to 'paid'. action 'rejected': releases the balance back.
create or replace function public.resolve_payout(p_id uuid, p_action text, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  pay record;
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  if p_action not in ('paid', 'rejected') then
    raise exception 'Invalid action.';
  end if;
  select * into pay from public.partner_payouts where id = p_id and status = 'requested';
  if pay is null then
    raise exception 'Payout not found or already resolved.';
  end if;
  if p_action = 'paid' then
    update public.partner_commissions
      set status = 'paid'
      where partner_id = pay.partner_id
        and status = 'pending'
        and available_at <= pay.requested_at;
  end if;
  update public.partner_payouts
    set status = p_action, note = coalesce(p_note, note), resolved_at = now()
    where id = p_id;
  return json_build_object('ok', true);
end;
$$;
