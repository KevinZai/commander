-- Assertions on the reconciled end state. Run as postgres with ON_ERROR_STOP.
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

-- schema shape
do $$ begin
  assert (select data_type from information_schema.columns where table_schema='public' and table_name='users' and column_name='user_id') = 'text', 'users.user_id is text';
  assert (select count(*) from pg_proc where proname = 'get_effective_cap') = 1, 'one get_effective_cap overload';
  assert (select count(*) from pg_proc where proname = 'increment_usage') = 1, 'one increment_usage overload';
  assert to_regclass('public.surveys') is not null and to_regclass('public.feedback') is not null, 'tool tables exist';
  assert to_regclass('public.stripe_events') is not null and to_regclass('public.oauth_identities') is not null, 'new tables exist';
  assert not exists (select 1 from pg_policies where policyname = 'creators_public_read'), 'public creators policy dropped';
  assert not exists (select 1 from information_schema.columns where table_name='creators_public' and column_name in ('email','ls_affiliate_id','ls_referral_code','total_commission_cents','total_conversions')), 'view hides private columns';
end $$;

-- seed (service role path)
begin;
set local role service_role;
insert into public.users (user_id, email, tier, license_key) values ('u-free', 'free@example.com', 'free', 'lk-free');
insert into public.users (email, tier) values ('auto@example.com', 'free');
insert into public.users (user_id, email, tier, founders_granted_at) values ('u-founder', 'f@example.com', 'free', now());
select public.increment_usage('u-free', '2026-11');
select public.increment_usage('u-free', '2026-11');
insert into public.surveys (user_id, question_id, answer) values ('u-free', 1, 'a'), ('u-free', 2, 'b');
insert into public.feedback (user_id, category, content, sentiment) values ('u-free', 'note', 'hi', 'neutral');
insert into public.stripe_events (event_id, type) values ('evt_1', 'x') on conflict do nothing;
insert into public.oauth_identities (issuer, subject, user_id) values ('https://iss', 'sub1', 'u-free');
insert into public.creators (github_id, github_username, email, display_name, ls_affiliate_id, ls_referral_code, slug, total_commission_cents, approved_at)
  values ('1', 'alice', 'alice@private', 'Alice', 'aff1', 'ref1', 'alice', 999, now()),
         ('2', 'bob', 'bob@private', 'Bob', 'aff2', 'ref2', 'bob', 5, null);
commit;

do $$ begin
  assert (select calls_used from public.usage_counters where user_id='u-free' and month='2026-11') = 2, 'increment_usage works for service';
  assert public.get_effective_cap('u-free') = 2000, 'two surveys this month unlock 2000';
  assert public.get_effective_cap('nobody') = 1000, 'unknown user baseline';
  assert (select tier from public.users where user_id='u-founder') = 'founders', 'founders_granted_at pins founders on insert';
  assert public.get_effective_cap('u-founder') = 100000, 'founders cap';
  assert (select length(user_id) from public.users where email='auto@example.com') = 36, 'default text uuid id';
end $$;

-- #08 RPCs are service-only
select pg_temp.expect_denied($q$select public.get_effective_cap('u-free')$q$, 'anon');
select pg_temp.expect_denied($q$select public.get_effective_cap('u-free')$q$, 'authenticated');
select pg_temp.expect_denied($q$select public.increment_usage('u-free', '2026-11')$q$, 'anon');
select pg_temp.expect_denied($q$select public.increment_usage('u-free', '2026-11')$q$, 'authenticated');

-- #08 owner rows: no table privileges for client roles
select pg_temp.expect_denied($q$update public.users set tier = 'pro' where user_id = 'u-free'$q$, 'authenticated');
select pg_temp.expect_denied($q$update public.users set license_key = 'mine' where user_id = 'u-free'$q$, 'authenticated');
select pg_temp.expect_denied($q$select * from public.users$q$, 'anon');
select pg_temp.expect_denied($q$select * from public.stripe_events$q$, 'authenticated');
select pg_temp.expect_denied($q$select * from public.oauth_identities$q$, 'anon');

-- #08 trigger still blocks entitlement edits if a grant is ever re-added
grant select, update on public.users to authenticated;
create policy tmp_owner_update on public.users for all to authenticated using (true);
select pg_temp.expect_denied($q$update public.users set tier = 'pro' where user_id = 'u-free'$q$, 'authenticated');
select pg_temp.expect_denied($q$update public.users set license_key = 'x' where user_id = 'u-free'$q$, 'authenticated');
begin;
set local role authenticated;
update public.users set last_seen_at = now() where user_id = 'u-free';
commit;
drop policy tmp_owner_update on public.users;
revoke select, update on public.users from authenticated;

-- #06 founders preserved; deliberate revocation possible
update public.users set tier = 'free' where user_id = 'u-founder';
do $$ begin assert (select tier from public.users where user_id='u-founder') = 'founders', 'founders not downgraded'; end $$;
update public.users set tier = 'free', founders_granted_at = null where user_id = 'u-founder';
do $$ begin assert (select tier from public.users where user_id='u-founder') = 'free', 'explicit revocation works'; end $$;

-- #09 key rotation bumps key_version
do $$ begin assert (select key_version from public.users where user_id='u-free') = 1, 'default key_version'; end $$;
update public.users set license_key = 'lk-rotated' where user_id = 'u-free';
do $$ begin assert (select key_version from public.users where user_id='u-free') = 2, 'rotation bumps key_version'; end $$;
update public.users set license_key = 'lk-first' where user_id = (select user_id from public.users where email='auto@example.com');
do $$ begin assert (select key_version from public.users where email='auto@example.com') = 1, 'first issue does not bump'; end $$;

-- #07 creators: base tables closed, view narrow
select pg_temp.expect_denied($q$select * from public.creators$q$, 'anon');
select pg_temp.expect_denied($q$select email from public.creators$q$, 'authenticated');
select pg_temp.expect_denied($q$select * from public.creator_clicks$q$, 'anon');
begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.creators_public) = 1, 'only approved creators visible';
  assert (select slug from public.creators_public) = 'alice', 'approved slug';
end $$;
select public.increment_creator_clicks('alice');
select public.increment_creator_clicks('bob');
commit;
do $$ begin
  assert (select total_clicks from public.creators where slug='alice') = 1, 'approved click counted';
  assert (select total_clicks from public.creators where slug='bob') = 0, 'unapproved click ignored';
end $$;

select 'ALL ASSERTIONS PASSED' as result;
