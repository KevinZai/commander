-- Down for migration 004 — RESTORES THE INSECURE PRE-004 STATE:
-- anon can read every creators column again and can execute the
-- SECURITY DEFINER RPCs. Run only to roll back 004 deliberately.
-- Idempotent.

drop view if exists public.creators_public;

do $do$
begin
  if to_regclass('public.creators') is null then
    return;
  end if;
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'creators' and policyname = 'creators_public_read'
  ) then
    execute 'create policy creators_public_read on public.creators for select using (true)';
  end if;
  execute 'grant select on table public.creators to anon, authenticated';
end
$do$;

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
    execute format('grant execute on function %s to public', fn);
  end loop;
end
$do$;
