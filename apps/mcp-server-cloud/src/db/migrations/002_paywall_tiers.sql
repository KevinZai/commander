-- Migration 002 — dark paywall tiers (revenue-opp-2026-07-10 §3+§6).
-- Apply to EXISTING Supabase databases via SQL Editor (or `supabase db push`).
-- Fresh installs get the same end-state from schema.sql directly.
--
-- Changes:
--   1. tier domain: 'free' | 'pro'  →  'free' | 'pro' | 'founders'
--   2. users.stripe_customer_id / users.stripe_subscription_id — set by the
--      Stripe webhook (POST /webhooks/stripe) to map Stripe events to keys
--   3. get_effective_cap: 'founders' gets pro parity (100000/mo)
--
-- NOT in this migration (by design): the 100-call/mo free-tier cap. That is
-- enforced app-side (src/lib/paywall.ts) and ONLY when env CCC_PAYWALL_ARMED=1,
-- so arming the paywall is a config change with no schema dependency.
-- Idempotent — safe to re-run.

-- 1. Extend the tier check constraint (inline check from schema.sql is
--    auto-named users_tier_check by Postgres).
alter table public.users drop constraint if exists users_tier_check;
alter table public.users add constraint users_tier_check
  check (tier in ('free', 'pro', 'founders'));

-- 2. Stripe linkage columns.
alter table public.users add column if not exists stripe_customer_id text unique;
alter table public.users add column if not exists stripe_subscription_id text;

create index if not exists users_stripe_customer_idx
  on public.users (stripe_customer_id)
  where stripe_customer_id is not null;

-- 3. Founders = pro parity in the survey-based cap RPC. The body is otherwise
--    identical to schema.sql's original definition.
create or replace function public.get_effective_cap(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  u public.users%rowtype;
  cap integer;
begin
  select * into u from public.users where user_id = p_user_id;

  if not found then
    return 1000;
  end if;

  if u.tier in ('pro', 'founders') then
    return 100000;
  end if;

  cap := 1000;
  if u.surveys_answered >= 2 then
    cap := cap + 1000;
  end if;
  if u.survey_skip_streak >= 3 then
    cap := greatest(cap - 500, 0);
  end if;

  return cap;
end;
$$;
