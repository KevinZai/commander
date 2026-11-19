# Verifying hosted migrations

The repo has no SQL test harness; `tests/migrations.test.ts` checks the
migration text only. Verify each migration by hand on a **scratch** Supabase
project or a local Postgres (`supabase start`), never on production first.

For each forward migration `NNN_name.sql`:

1. Apply it, then apply it again. The second run must succeed with no error
   (idempotent).
2. Run the checks below for that migration.
3. Apply `down/NNN_name.down.sql` twice; both runs must succeed and the
   objects must be gone. Re-apply the forward migration to finish.

Apply order: `002` (if not applied), `003`, `004`, `005`, `006`; then
`supabase/migrations/20261119000000_users_update_lockdown.sql` when the live
`users` table came from `supabase/migrations/20260417000000_beta_v4.sql`.

## 003_stripe_events

```sql
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'users'
   and column_name in ('lifetime_tier','founders_payment_intent','subscription_status','subscription_event_created');
-- 4 rows

insert into public.stripe_events (event_id, type, event_created) values ('evt_x', 't', now());
insert into public.stripe_events (event_id, type, event_created) values ('evt_x', 't', now());
-- second insert: duplicate key (23505), which the webhook treats as "already seen"

update public.users set lifetime_tier = 'founders' where user_id = '<scratch user>';
update public.users set tier = 'free' where user_id = '<scratch user>';
select tier from public.users where user_id = '<scratch user>';  -- founders
```

## 004_creators_lockdown

```sql
set role anon;
select * from public.creators;            -- permission denied
select slug, display_name from public.creators_public;  -- works, approved rows only
select public.increment_creator_clicks('x');             -- permission denied
select public.increment_usage(null, '2026-01');          -- permission denied
reset role;
```

## 005_oauth_identities

```sql
select format_type(atttypid, atttypmod) from pg_attribute
 where attrelid = 'public.oauth_identities'::regclass and attname = 'user_id';
-- same type as public.users.user_id
set role anon; select * from public.oauth_identities; reset role;  -- permission denied
```

## 006_license_key_version

```sql
select license_key_version from public.users limit 1;  -- 1 for existing rows
```

## supabase/migrations/20261119000000_users_update_lockdown.sql

```sql
select policyname from pg_policies where tablename = 'users';
-- users_update_own is absent
```
