-- Migration: 20261119000000_users_update_lockdown (Track H5)
-- users_update_own (from 20260417000000_beta_v4) let a signed-in user UPDATE
-- every column of their own row, including tier, license_key and the billing
-- columns, so a user could grant themselves Pro. Only the service role writes
-- users; it bypasses RLS and needs no policy.
-- Idempotent; skipped when public.users does not exist.
-- Down: supabase/down/20261119000000_users_update_lockdown.down.sql (kept
-- outside supabase/migrations so the Supabase CLI never applies it).

do $do$
begin
  if to_regclass('public.users') is null then
    raise notice 'public.users not found; nothing to lock down';
    return;
  end if;
  execute 'drop policy if exists "users_update_own" on public.users';
end
$do$;
