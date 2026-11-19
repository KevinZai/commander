-- Migration 004 — creator data and RPC lockdown (Track H4, M7b, M9).
-- Apply in the Supabase SQL Editor AFTER 003. Idempotent — safe to re-run.
-- Down: migrations/down/004_creators_lockdown.down.sql.
--
-- Changes:
--   1. creators_public_read (USING true) exposed every column of creators —
--      email, ls_affiliate_id, commission totals — to anon. It is dropped and
--      anon/authenticated lose direct table access. Public pages read the
--      creators_public view, which carries only display columns of approved
--      creators.
--   2. increment_usage, get_effective_cap and increment_creator_clicks are
--      SECURITY DEFINER. PUBLIC (the Postgres default), anon and
--      authenticated lose EXECUTE; service_role keeps it. Every overload in
--      schema public is covered, so this works on both users schemas (uuid
--      and TEXT user_id).
--
-- Each step is skipped when its object does not exist (creators-schema.sql
-- may not have been applied).

-- 1. creators -------------------------------------------------------------------
do $do$
begin
  if to_regclass('public.creators') is null then
    raise notice 'public.creators not found; skipping creator lockdown';
    return;
  end if;

  execute 'drop policy if exists creators_public_read on public.creators';
  execute 'revoke all on table public.creators from anon, authenticated';

  if to_regclass('public.creator_clicks') is not null then
    execute 'revoke all on table public.creator_clicks from anon, authenticated';
  end if;

  -- Runs with the view owner's rights (security_invoker is off by default;
  -- the option is not named because PG <= 14 rejects it), so anon can read
  -- these columns without any policy on public.creators. CREATE OR REPLACE
  -- without WITH also resets any options set on an earlier copy.
  execute $view$
    create or replace view public.creators_public as
    select
      slug,
      display_name,
      github_username,
      github_avatar_url,
      tier,
      ls_referral_code,
      custom_pitch_md,
      embedded_tweet_url,
      embedded_youtube_url,
      custom_quote,
      twitter_handle,
      youtube_channel,
      approved_at
    from public.creators
    where approved_at is not null
  $view$;

  -- The view is auto-updatable and runs as its owner, which bypasses RLS on
  -- public.creators. Supabase's default privileges grant anon and
  -- authenticated ALL on new relations in public, so without this revoke an
  -- anon UPDATE or DELETE through the view would write creators rows.
  execute 'revoke all on table public.creators_public from public, anon, authenticated';
  execute 'grant select on table public.creators_public to anon, authenticated, service_role';
end
$do$;

-- 2. SECURITY DEFINER RPCs ---------------------------------------------------
do $do$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('increment_usage', 'get_effective_cap', 'increment_creator_clicks')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end
$do$;
