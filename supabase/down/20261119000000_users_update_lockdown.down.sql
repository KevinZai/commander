-- Down for 20261119000000_users_update_lockdown — RESTORES THE INSECURE
-- policy that lets a signed-in user update their own tier. Roll back only
-- deliberately. Idempotent. Not under supabase/migrations on purpose.
--
-- Type-aware: beta_v4 keys users by TEXT user_id (auth.uid()::text = user_id,
-- the original policy); the hosted schema keys it by uuid, where text = uuid
-- has no operator, so the comparison stays uuid = uuid.

do $do$
declare
  user_id_type text;
  owner_check text;
begin
  if to_regclass('public.users') is null then
    return;
  end if;
  if exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'users' and policyname = 'users_update_own'
  ) then
    return;
  end if;

  select format_type(a.atttypid, a.atttypmod) into user_id_type
    from pg_attribute a
   where a.attrelid = 'public.users'::regclass and a.attname = 'user_id' and not a.attisdropped;

  if user_id_type = 'uuid' then
    owner_check := 'auth.uid() = user_id';
  else
    owner_check := 'auth.uid()::text = user_id';
  end if;

  execute format(
    'create policy "users_update_own" on public.users for update using (%s or auth.role() = %L)',
    owner_check, 'service_role');
end
$do$;
