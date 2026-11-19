-- Down for 20261119000000_users_update_lockdown — RESTORES THE INSECURE
-- policy that lets a signed-in user update their own tier. Roll back only
-- deliberately. Idempotent. Not under supabase/migrations on purpose.

do $do$
begin
  if to_regclass('public.users') is null then
    return;
  end if;
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'users' and policyname = 'users_update_own'
  ) then
    execute $p$create policy "users_update_own" on public.users
      for update using (auth.uid()::text = user_id or auth.role() = 'service_role')$p$;
  end if;
end
$do$;
