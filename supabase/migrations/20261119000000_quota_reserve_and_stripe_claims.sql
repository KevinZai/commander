-- CC Commander — atomic quota reservation and Stripe event claims
-- Migration: 20261119000000_quota_reserve_and_stripe_claims
--
-- Follows 20261118000000_reconcile_hosted_schema.sql (users.user_id is TEXT).
-- Idempotent; apply with `supabase db push`, or in the SQL Editor after the
-- reconcile migration. Apply BEFORE deploying a server that calls these RPCs:
-- without reserve_call the quota middleware fails closed (HTTP 503
-- quota_storage_unavailable) and without the Stripe RPCs the webhook answers
-- 500 so Stripe keeps retrying.
--
-- Adds:
--   reserve_call(text, text, integer)       Codex audit #19/#20: atomic monthly
--                                            reservation for one billable call
--   stripe_event_claims + claim_stripe_event / complete_stripe_event /
--   release_stripe_event                    audit #06: one worker per event id
--   apply_stripe_subscription(...)          audit #06: ordering checked and the
--                                            entitlement written under one row lock
-- Every function is SECURITY DEFINER and executable by service_role only
-- (audit #08): PUBLIC, anon and authenticated are revoked explicitly because
-- Supabase's default privileges grant EXECUTE to the client roles.

-- ─── 1. reserve_call (text ids: uuid strings and legacy fingerprint ids) ────
-- A uuid overload from the superseded apps/mcp-server-cloud/src/db/migrations
-- /003_quota-reserve.sql would make PostgREST's named-argument call ambiguous.
drop function if exists public.reserve_call(uuid, text, integer);

-- Counts ONE billable tool call for (user, month):
--   - inserts the month row at 1, or increments it, in a single statement;
--   - the increment only happens while calls_used < p_cap, so concurrent
--     requests can never push the counter past the cap (row lock on conflict);
--   - returns allowed = false and the current count when the cap is reached,
--     without consuming quota.
create or replace function public.reserve_call(p_user_id text, p_month text, p_cap integer)
returns table (allowed boolean, calls_used integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_used integer;
begin
  if p_cap is null or p_cap <= 0 then
    select uc.calls_used into v_used
      from public.usage_counters uc
     where uc.user_id = p_user_id and uc.month = p_month;
    return query select false, coalesce(v_used, 0);
    return;
  end if;

  insert into public.usage_counters as uc (user_id, month, calls_used, last_call_at)
  values (p_user_id, p_month, 1, now())
  on conflict (user_id, month)
  do update set
    calls_used   = uc.calls_used + 1,
    last_call_at = now()
  where uc.calls_used < p_cap
  returning uc.calls_used into v_used;

  if found then
    return query select true, v_used;
    return;
  end if;

  -- The row existed and was at or over the cap: report it, consume nothing.
  select uc.calls_used into v_used
    from public.usage_counters uc
   where uc.user_id = p_user_id and uc.month = p_month;
  return query select false, coalesce(v_used, 0);
end;
$$;

revoke all on function public.reserve_call(text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_call(text, text, integer) to service_role;

-- ─── 2. Stripe event claims ─────────────────────────────────────────────────
-- stripe_events keeps one row per fully applied event (unchanged). A claim row
-- marks an event a worker is applying now; a concurrent delivery of the same
-- event sees 'in_flight' and is answered non-2xx so Stripe retries it later.
-- A claim older than the lease (a crashed worker) can be taken over.
create table if not exists public.stripe_event_claims (
  event_id    text primary key,
  type        text not null,
  claimed_at  timestamptz not null default now()
);
alter table public.stripe_event_claims enable row level security;
revoke all on table public.stripe_event_claims from public, anon, authenticated;
grant all on table public.stripe_event_claims to service_role;

-- Returns 'claimed' (this caller applies the event), 'processed' (already
-- applied: acknowledge) or 'in_flight' (another worker holds a live claim).
create or replace function public.claim_stripe_event(p_event_id text, p_type text, p_lease_seconds integer default 300)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.stripe_events where event_id = p_event_id) then
    return 'processed';
  end if;

  insert into public.stripe_event_claims as c (event_id, type, claimed_at)
  values (p_event_id, p_type, clock_timestamp())
  on conflict (event_id) do update
    set claimed_at = clock_timestamp()
  where c.claimed_at < clock_timestamp() - make_interval(secs => greatest(coalesce(p_lease_seconds, 300), 1));
  if not found then
    return 'in_flight';
  end if;

  -- A worker that finished between the first check and the claim has
  -- committed its stripe_events row by now (complete_stripe_event writes it
  -- in the same transaction that drops the claim).
  if exists (select 1 from public.stripe_events where event_id = p_event_id) then
    delete from public.stripe_event_claims where event_id = p_event_id;
    return 'processed';
  end if;
  return 'claimed';
end;
$$;

-- Records the event as applied and drops its claim, in one transaction.
create or replace function public.complete_stripe_event(p_event_id text, p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.stripe_events (event_id, type) values (p_event_id, p_type)
  on conflict (event_id) do nothing;
  delete from public.stripe_event_claims where event_id = p_event_id;
end;
$$;

-- Drops a claim after a failed attempt so Stripe's redelivery can run at once.
create or replace function public.release_stripe_event(p_event_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.stripe_event_claims where event_id = p_event_id;
end;
$$;

-- ─── 3. Ordered subscription apply ──────────────────────────────────────────
-- Locks the user row, then decides and writes in one statement sequence, so
-- two concurrent events for one customer serialize and the older one can never
-- land last. Rules (mirrored by subscriptionEventApplies in
-- apps/mcp-server-cloud/src/routes/stripe-webhook.ts):
--   - an event older than the last applied one is 'stale';
--   - at the same second for the same subscription, a status of lower rank
--     than the applied one is 'stale' (terminal > past_due/paused > active/
--     trialing > incomplete), so a same-second cancel is never undone;
--   - a delete for a subscription other than the current one is 'superseded';
--   - otherwise 'applied': a lifetime (founders) grant keeps its tier, else the
--     tier follows p_entitled.
-- Returns 'missing' when the user row does not exist.
create or replace function public.stripe_subscription_status_rank(p_status text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when p_status in ('canceled', 'unpaid', 'incomplete_expired') then 3
    when p_status in ('past_due', 'paused') then 2
    when p_status in ('active', 'trialing') then 1
    else 0
  end
$$;

create or replace function public.apply_stripe_subscription(
  p_user_id         text,
  p_subscription_id text,
  p_status          text,
  p_event_at        timestamptz,
  p_entitled        boolean,
  p_is_delete       boolean
)
returns table (result text, tier text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  u public.users%rowtype;
  v_tier text;
begin
  select * into u from public.users where user_id = p_user_id for update;
  if not found then
    return query select 'missing'::text, null::text;
    return;
  end if;

  if u.stripe_subscription_event_at is not null and (
       p_event_at < u.stripe_subscription_event_at
       or (p_event_at = u.stripe_subscription_event_at
           and u.stripe_subscription_id is not distinct from p_subscription_id
           and public.stripe_subscription_status_rank(p_status)
               < public.stripe_subscription_status_rank(u.stripe_subscription_status))
     ) then
    return query select 'stale'::text, u.tier;
    return;
  end if;

  if p_is_delete and u.stripe_subscription_id is not null and u.stripe_subscription_id <> p_subscription_id then
    return query select 'superseded'::text, u.tier;
    return;
  end if;

  if u.founders_granted_at is not null or u.tier = 'founders' then
    v_tier := u.tier;
  elsif p_entitled then
    v_tier := 'pro';
  else
    v_tier := 'free';
  end if;

  update public.users
     set tier                         = v_tier,
         stripe_subscription_id       = p_subscription_id,
         stripe_subscription_status   = p_status,
         stripe_subscription_event_at = p_event_at
   where user_id = p_user_id;

  return query select 'applied'::text, (select x.tier from public.users x where x.user_id = p_user_id);
end;
$$;

revoke all on function public.claim_stripe_event(text, text, integer) from public, anon, authenticated;
revoke all on function public.complete_stripe_event(text, text) from public, anon, authenticated;
revoke all on function public.release_stripe_event(text) from public, anon, authenticated;
revoke all on function public.stripe_subscription_status_rank(text) from public, anon, authenticated;
revoke all on function public.apply_stripe_subscription(text, text, text, timestamptz, boolean, boolean) from public, anon, authenticated;
grant execute on function public.claim_stripe_event(text, text, integer) to service_role;
grant execute on function public.complete_stripe_event(text, text) to service_role;
grant execute on function public.release_stripe_event(text) to service_role;
grant execute on function public.stripe_subscription_status_rank(text) to service_role;
grant execute on function public.apply_stripe_subscription(text, text, text, timestamptz, boolean, boolean) to service_role;
