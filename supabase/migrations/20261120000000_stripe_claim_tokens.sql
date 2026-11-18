-- CC Commander — Stripe event claims carry an ownership token
-- Migration: 20261120000000_stripe_claim_tokens
--
-- Follows 20261119000000_quota_reserve_and_stripe_claims.sql, which created
-- stripe_event_claims and tokenless claim/complete/release RPCs. Idempotent;
-- apply with `supabase db push`, or in the SQL Editor after 20261119000000.
-- Apply BEFORE deploying a webhook that sends p_claim_token: against the
-- 20261119000000 RPCs that webhook answers 500, so Stripe keeps retrying.
--
-- Changes (Codex PR #289 P2):
--   stripe_event_claims.claim_token       every claim carries a fresh uuid
--   claim_stripe_event(text, text, integer)
--     returns (status, claim_token) instead of a bare status
--   complete_stripe_event(text, text, uuid) returns boolean
--   release_stripe_event(text, uuid)        returns boolean
-- complete and release match on the event id AND the token, so a worker whose
-- lease expired and was taken over cannot complete or release the new owner's
-- claim (a late release would otherwise admit a third worker while the second
-- is still applying). The tokenless signatures are dropped. Every function
-- stays SECURITY DEFINER and executable by service_role only (audit #08).

-- ─── 1. claim_token on existing and new claims ──────────────────────────────
-- A claim row still in flight when this runs belongs to a worker on the
-- tokenless code. The volatile default gives each such row its own token that
-- no worker holds: nobody can complete or release it by token, and it is taken
-- over by claim_stripe_event once its lease expires, exactly like a crashed
-- worker's claim. The event itself is still recorded by Stripe's redelivery.
alter table public.stripe_event_claims
  add column if not exists claim_token uuid not null default gen_random_uuid();

-- ─── 2. Replace the RPCs ────────────────────────────────────────────────────
-- The return type of claim_stripe_event and the arguments of complete/release
-- change, so `create or replace` cannot be used: drop every known signature.
drop function if exists public.claim_stripe_event(text, text, integer);
drop function if exists public.complete_stripe_event(text, text);
drop function if exists public.release_stripe_event(text);
drop function if exists public.complete_stripe_event(text, text, uuid);
drop function if exists public.release_stripe_event(text, uuid);

-- Returns one row (status, claim_token):
--   'claimed'   this caller applies the event; claim_token identifies its claim
--   'processed' already applied: acknowledge (claim_token is null)
--   'in_flight' another worker holds a live claim (claim_token is null)
create function public.claim_stripe_event(p_event_id text, p_type text, p_lease_seconds integer default 300)
returns table (status text, claim_token uuid)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_token uuid := gen_random_uuid();
begin
  if exists (select 1 from public.stripe_events e where e.event_id = p_event_id) then
    return query select 'processed'::text, null::uuid;
    return;
  end if;

  insert into public.stripe_event_claims as c (event_id, type, claimed_at, claim_token)
  values (p_event_id, p_type, clock_timestamp(), v_token)
  on conflict (event_id) do update
    set claimed_at = clock_timestamp(), claim_token = v_token
  where c.claimed_at < clock_timestamp() - make_interval(secs => greatest(coalesce(p_lease_seconds, 300), 1));
  if not found then
    return query select 'in_flight'::text, null::uuid;
    return;
  end if;

  -- A worker that finished between the first check and the claim has
  -- committed its stripe_events row by now (complete_stripe_event writes it
  -- in the same transaction that drops the claim).
  if exists (select 1 from public.stripe_events e where e.event_id = p_event_id) then
    delete from public.stripe_event_claims c where c.event_id = p_event_id and c.claim_token = v_token;
    return query select 'processed'::text, null::uuid;
    return;
  end if;
  return query select 'claimed'::text, v_token;
end;
$$;

-- Records the event as applied and drops its claim, in one transaction, only
-- while p_claim_token still owns the claim. Returns false (and records
-- nothing) when the claim was taken over or is gone: the caller answers
-- non-2xx and the current owner, or Stripe's redelivery, records it.
create function public.complete_stripe_event(p_event_id text, p_type text, p_claim_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.stripe_event_claims c
   where c.event_id = p_event_id and c.claim_token = p_claim_token;
  if not found then
    return false;
  end if;
  insert into public.stripe_events (event_id, type) values (p_event_id, p_type)
  on conflict (event_id) do nothing;
  return true;
end;
$$;

-- Drops this caller's claim after a failed attempt so Stripe's redelivery can
-- run at once. Returns false when p_claim_token no longer owns the claim; a
-- replacement owner's claim is left alone.
create function public.release_stripe_event(p_event_id text, p_claim_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.stripe_event_claims c
   where c.event_id = p_event_id and c.claim_token = p_claim_token;
  return found;
end;
$$;

-- ─── 3. Grants: service_role only ───────────────────────────────────────────
revoke all on function public.claim_stripe_event(text, text, integer) from public, anon, authenticated;
revoke all on function public.complete_stripe_event(text, text, uuid) from public, anon, authenticated;
revoke all on function public.release_stripe_event(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_stripe_event(text, text, integer) to service_role;
grant execute on function public.complete_stripe_event(text, text, uuid) to service_role;
grant execute on function public.release_stripe_event(text, uuid) to service_role;
