-- CC Commander hosted MCP — LEGACY Supabase schema snapshot
--
-- SUPERSEDED. The canonical, ordered schema is the migration chain in
-- supabase/migrations/ at the repository root (see README.md "Database").
-- Do not build new databases from this file. A database that was built from
-- it converges on the chain by running
-- supabase/migrations/20261118000000_reconcile_hosted_schema.sql next.
-- The grants and guard below are kept here so re-running this file can never
-- re-open the quota RPCs or entitlement columns (Codex audit #08).
--
-- Service-role client (src/db/client.ts) bypasses RLS, so RLS is enabled but
-- only the included policies allow access. Never use anon key against this DB.
--
-- Tables: users, usage_counters
-- RPCs:   get_effective_cap(p_user_id), increment_usage(p_user_id, p_month)
-- Tier rules (free):
--   baseline             = 1000 calls/mo
--   surveys_answered >=2 → +1000  (2000 cap)
--   survey_skip_streak >=3 → -500 (500 cap)
-- Tiers 'pro' and 'founders': 100000 calls/mo flat.
--
-- This file is the FRESH-INSTALL end-state. Existing databases upgrade via
-- migrations/002_paywall_tiers.sql (tier domain + stripe columns + founders
-- cap parity). The armed 100-call/mo free cap is app-side (lib/paywall.ts),
-- gated by env CCC_PAYWALL_ARMED — no schema dependency.

create extension if not exists "pgcrypto";

-- ─── users ──────────────────────────────────────────────────────────────────
create table if not exists public.users (
  user_id                 uuid primary key default gen_random_uuid(),
  email                   text unique,
  created_at              timestamptz not null default now(),
  tier                    text not null default 'free' check (tier in ('free','pro','founders')),
  license_key             text unique,
  survey_skip_streak      integer not null default 0 check (survey_skip_streak >= 0),
  surveys_answered        integer not null default 0 check (surveys_answered >= 0),
  last_seen_at            timestamptz,
  -- Dark paywall plumbing (migration 002) — set by POST /webhooks/stripe.
  stripe_customer_id      text unique,
  stripe_subscription_id  text
);

create index if not exists users_license_key_idx on public.users (license_key) where license_key is not null;
create index if not exists users_tier_idx on public.users (tier);
create index if not exists users_stripe_customer_idx on public.users (stripe_customer_id) where stripe_customer_id is not null;

-- ─── usage_counters ─────────────────────────────────────────────────────────
create table if not exists public.usage_counters (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(user_id) on delete cascade,
  month         text not null check (month ~ '^\d{4}-\d{2}$'),
  calls_used    integer not null default 0 check (calls_used >= 0),
  last_call_at  timestamptz,
  unique (user_id, month)
);

create index if not exists usage_counters_user_month_idx on public.usage_counters (user_id, month);

-- ─── RPC: get_effective_cap ─────────────────────────────────────────────────
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

-- ─── RPC: increment_usage ───────────────────────────────────────────────────
create or replace function public.increment_usage(p_user_id uuid, p_month text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usage_counters (user_id, month, calls_used, last_call_at)
  values (p_user_id, p_month, 1, now())
  on conflict (user_id, month)
  do update set
    calls_used   = public.usage_counters.calls_used + 1,
    last_call_at = now();
end;
$$;

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Service-role bypasses RLS; we still enable it as defense-in-depth.
alter table public.users          enable row level security;
alter table public.usage_counters enable row level security;

-- No policies for anon/authenticated — only service-role can read/write.
-- (Add user-scoped SELECT policies later if/when an OAuth user-facing UI ships.)

-- ─── grants ─────────────────────────────────────────────────────────────────
-- Security-definer RPCs: PUBLIC holds EXECUTE by default and Supabase's
-- default privileges grant it to anon/authenticated as well. Revoke all three
-- explicitly so only the service can read caps or mutate a user's quota.
revoke all on function public.get_effective_cap(uuid)           from public, anon, authenticated;
revoke all on function public.increment_usage(uuid, text)       from public, anon, authenticated;
grant execute on function public.get_effective_cap(uuid)        to service_role;
grant execute on function public.increment_usage(uuid, text)    to service_role;

-- Client roles get no table privileges: tier, license_key and the Stripe
-- columns are service-managed.
revoke all on table public.users, public.usage_counters from public, anon, authenticated;

-- Defense in depth: even if a grant or policy is added later, anon and
-- authenticated may change nothing on a users row except last_seen_at.
-- (The reconcile migration replaces this with the full guard.)
create or replace function public.users_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT'
       or (to_jsonb(new) - 'last_seen_at') is distinct from (to_jsonb(old) - 'last_seen_at') then
      raise exception 'users columns are service-managed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_guard on public.users;
create trigger users_guard
  before insert or update on public.users
  for each row execute function public.users_guard();
