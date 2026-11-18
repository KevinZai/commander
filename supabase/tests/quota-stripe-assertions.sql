-- Assertions for 20261119000000_quota_reserve_and_stripe_claims.sql followed by
-- 20261120000000_stripe_claim_tokens.sql (the final state of both).
-- Run as postgres with ON_ERROR_STOP after reconcile-assertions.sql (uses its
-- seed rows 'u-free' and the uuid-string user auto@example.com).
\set ON_ERROR_STOP 1

create or replace function pg_temp.expect_denied(sql text, who text) returns void language plpgsql as $$
begin
  execute format('set local role %I', who);
  begin
    execute sql;
  exception when insufficient_privilege then
    reset role;
    return;
  end;
  reset role;
  raise exception 'expected permission denied for % running: %', who, sql;
end $$;

-- shape: exactly one reserve_call, with text ids
do $$ begin
  assert (select count(*) from pg_proc where proname = 'reserve_call') = 1, 'one reserve_call overload';
  assert to_regprocedure('public.reserve_call(text,text,integer)') is not null, 'reserve_call(text,text,integer)';
  assert to_regclass('public.stripe_event_claims') is not null, 'claims table';
  assert exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'stripe_event_claims'
                    and column_name = 'claim_token' and is_nullable = 'NO'), 'claims carry a token';
  assert (select count(*) from pg_proc where proname = 'claim_stripe_event') = 1, 'one claim_stripe_event';
  assert (select count(*) from pg_proc where proname = 'complete_stripe_event') = 1, 'one complete_stripe_event';
  assert (select count(*) from pg_proc where proname = 'release_stripe_event') = 1, 'one release_stripe_event';
  assert to_regprocedure('public.complete_stripe_event(text,text)') is null, 'tokenless complete is gone';
  assert to_regprocedure('public.release_stripe_event(text)') is null, 'tokenless release is gone';
end $$;

-- effective privileges: service_role only, for every new function (audit #08)
do $$
declare
  f text;
  r text;
begin
  foreach f in array array[
    'public.reserve_call(text,text,integer)',
    'public.claim_stripe_event(text,text,integer)',
    'public.complete_stripe_event(text,text,uuid)',
    'public.release_stripe_event(text,uuid)',
    'public.apply_stripe_subscription(text,text,text,timestamptz,boolean,boolean)'
  ] loop
    foreach r in array array['anon', 'authenticated'] loop
      assert not has_function_privilege(r, f, 'execute'), format('%s must not execute %s', r, f);
    end loop;
    assert has_function_privilege('service_role', f, 'execute'), format('service_role executes %s', f);
    assert not exists (
      select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
       where p.oid = f::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE'
    ), format('PUBLIC must not execute %s', f);
  end loop;
  foreach r in array array['anon', 'authenticated'] loop
    assert not has_table_privilege(r, 'public.stripe_event_claims', 'select,insert,update,delete'), r || ' has no claims access';
  end loop;
end $$;

select pg_temp.expect_denied($q$select * from public.reserve_call('u-free', '2026-12', 10)$q$, 'anon');
select pg_temp.expect_denied($q$select * from public.reserve_call('u-free', '2026-12', 10)$q$, 'authenticated');
select pg_temp.expect_denied($q$select * from public.claim_stripe_event('evt_x', 'x')$q$, 'authenticated');
select pg_temp.expect_denied($q$select public.release_stripe_event('evt_x', gen_random_uuid())$q$, 'authenticated');
select pg_temp.expect_denied($q$select * from public.apply_stripe_subscription('u-free', 's', 'active', now(), true, false)$q$, 'authenticated');
select pg_temp.expect_denied($q$select * from public.stripe_event_claims$q$, 'anon');

-- reserve_call for both historical id shapes (text fingerprint and uuid string)
begin;
set local role service_role;
do $$
declare
  uuid_user text := (select user_id from public.users where email = 'auto@example.com');
  r record;
begin
  assert uuid_user ~ '^[0-9a-f-]{36}$', 'uuid-shaped id';
  select * into r from public.reserve_call('u-free', '2026-12', 2);
  assert r.allowed and r.calls_used = 1, 'text id: first call reserved';
  select * into r from public.reserve_call('u-free', '2026-12', 2);
  assert r.allowed and r.calls_used = 2, 'text id: second call reserved';
  select * into r from public.reserve_call('u-free', '2026-12', 2);
  assert not r.allowed and r.calls_used = 2, 'text id: cap reached, nothing consumed';
  select * into r from public.reserve_call(uuid_user, '2026-12', 1);
  assert r.allowed and r.calls_used = 1, 'uuid id: reserved';
  select * into r from public.reserve_call(uuid_user, '2026-12', 1);
  assert not r.allowed and r.calls_used = 1, 'uuid id: cap reached';
  select * into r from public.reserve_call(uuid_user, '2026-12', 0);
  assert not r.allowed and r.calls_used = 1, 'zero cap reserves nothing';
end $$;
commit;

-- Stripe event claims
begin;
set local role service_role;
do $$
declare
  c record;
  t1 uuid;
  t2 uuid;
begin
  select * into c from public.claim_stripe_event('evt_c1', 'customer.subscription.updated');
  assert c.status = 'claimed' and c.claim_token is not null, 'first claim returns a token';
  t1 := c.claim_token;
  select * into c from public.claim_stripe_event('evt_c1', 'customer.subscription.updated');
  assert c.status = 'in_flight' and c.claim_token is null, 'second claim while live';
  assert not public.release_stripe_event('evt_c1', gen_random_uuid()), 'a wrong token cannot release';
  select * into c from public.claim_stripe_event('evt_c1', 'customer.subscription.updated');
  assert c.status = 'in_flight', 'claim survives a wrong-token release';
  assert public.release_stripe_event('evt_c1', t1), 'owner releases';
  select * into c from public.claim_stripe_event('evt_c1', 'customer.subscription.updated');
  assert c.status = 'claimed' and c.claim_token <> t1, 'claim after release gets a new token';
  t2 := c.claim_token;
  assert not public.complete_stripe_event('evt_c1', 'customer.subscription.updated', t1), 'stale token cannot complete';
  assert not exists (select 1 from public.stripe_events where event_id = 'evt_c1'), 'stale complete records nothing';
  assert public.complete_stripe_event('evt_c1', 'customer.subscription.updated', t2), 'owner completes';
  select * into c from public.claim_stripe_event('evt_c1', 'customer.subscription.updated');
  assert c.status = 'processed' and c.claim_token is null, 'processed after complete';
  assert not exists (select 1 from public.stripe_event_claims where event_id = 'evt_c1'), 'claim dropped on complete';
  select * into c from public.claim_stripe_event('evt_1', 'x');
  assert c.status = 'processed', 'pre-existing stripe_events row counts as processed';

  -- a crashed worker's claim is taken over after the lease, and the first
  -- worker can then neither release nor complete the replacement claim
  select * into c from public.claim_stripe_event('evt_c2', 'x');
  assert c.status = 'claimed', 'claim c2';
  t1 := c.claim_token;
  update public.stripe_event_claims set claimed_at = now() - interval '10 minutes' where event_id = 'evt_c2';
  select * into c from public.claim_stripe_event('evt_c2', 'x');
  assert c.status = 'claimed' and c.claim_token <> t1, 'expired claim taken over with a new token';
  t2 := c.claim_token;
  assert not public.release_stripe_event('evt_c2', t1), 'expired owner cannot release the takeover';
  select * into c from public.claim_stripe_event('evt_c2', 'x');
  assert c.status = 'in_flight', 'renewed claim is live after the late release';
  assert not public.complete_stripe_event('evt_c2', 'x', t1), 'expired owner cannot complete the takeover';
  assert (select claim_token from public.stripe_event_claims where event_id = 'evt_c2') = t2, 'takeover claim intact';
  assert not exists (select 1 from public.stripe_events where event_id = 'evt_c2'), 'late complete records nothing';
  assert public.complete_stripe_event('evt_c2', 'x', t2), 'current owner completes';
end $$;
commit;

-- Ordered subscription apply
begin;
set local role service_role;
do $$
declare
  t timestamptz := '2026-11-01T00:00:00Z';
  r record;
begin
  update public.users set tier = 'free', stripe_subscription_id = null, stripe_subscription_status = null,
         stripe_subscription_event_at = null where user_id = 'u-free';
  select * into r from public.apply_stripe_subscription('u-free', 'sub_1', 'active', t, true, false);
  assert r.result = 'applied' and r.tier = 'pro', 'activation applied';
  select * into r from public.apply_stripe_subscription('u-free', 'sub_1', 'canceled', t + interval '10 seconds', false, true);
  assert r.result = 'applied' and r.tier = 'free', 'cancellation applied';
  select * into r from public.apply_stripe_subscription('u-free', 'sub_1', 'active', t, true, false);
  assert r.result = 'stale' and r.tier = 'free', 'older activation is stale';
  select * into r from public.apply_stripe_subscription('u-free', 'sub_1', 'active', t + interval '10 seconds', true, false);
  assert r.result = 'stale' and r.tier = 'free', 'same-second activation cannot undo a cancel';
  select * into r from public.apply_stripe_subscription('u-free', 'sub_2', 'active', t + interval '10 seconds', true, false);
  assert r.result = 'applied' and r.tier = 'pro', 'a new subscription in the same second applies';
  select * into r from public.apply_stripe_subscription('u-free', 'sub_1', 'canceled', t + interval '20 seconds', false, true);
  assert r.result = 'superseded' and r.tier = 'pro', 'delete of the old subscription is superseded';
  select * into r from public.apply_stripe_subscription('nobody', 'sub_1', 'active', t, true, false);
  assert r.result = 'missing', 'unknown user';
  update public.users set founders_granted_at = now() where user_id = 'u-free';
  select * into r from public.apply_stripe_subscription('u-free', 'sub_2', 'canceled', t + interval '30 seconds', false, true);
  assert r.result = 'applied' and r.tier = 'founders', 'founders kept when pro ends';
  update public.users set founders_granted_at = null, tier = 'free' where user_id = 'u-free';
end $$;
commit;

select 'QUOTA AND STRIPE ASSERTIONS PASSED' as result;
