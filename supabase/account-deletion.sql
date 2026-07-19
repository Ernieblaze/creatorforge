-- ═══════════════════════════════════════════════════════════
-- Account self-deletion (Settings → Danger zone) — NDPR compliance.
-- Deleting the auth user cascades to profiles, generations, chat,
-- subscriptions, bio_pages and partner rows via existing foreign keys.
-- Paste in the Supabase SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from anon;
