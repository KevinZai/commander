-- CC Commander hosted MCP — Supabase schema
--
-- Apply via Supabase SQL Editor (or `supabase db push` if using the CLI).
-- Service-role client (src/db/client.ts) bypasses RLS, so RLS is enabled but
-- only the included policies allow access. Never use anon key against this DB.
--
-- Tables: users, usage_counters
-- RPCs:   get_effective_cap(p_user_id), increment_usage(p_user_id, p_month)
-- Tier rules (free):
--   baseline             = 1000 calls/mo
--   surveys_answered >=2 → +1000  (2000 cap)
--   survey_skip_streak >=3 → -500 (500 cap)
-- Tier 'pro': 100000 calls/mo flat.

create extension if not exists "pgcrypto";

-- ─── users ──────────────────────────────────────────────────────────────────
create table if not exists public.users (
  user_id              uuid primary key default gen_random_uuid(),
  email                text unique,
  created_at           timestamptz not null default now(),
  tier                 text not null default 'free' check (tier in ('free','pro')),
  license_key          text unique,
  survey_skip_streak   integer not null default 0 check (survey_skip_streak >= 0),
  surveys_answered     integer not null default 0 check (surveys_answered >= 0),
  last_seen_at         timestamptz
);

create index if not exists users_license_key_idx on public.users (license_key) where license_key is not null;
create index if not exists users_tier_idx on public.users (tier);

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

  if u.tier = 'pro' then
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
grant execute on function public.get_effective_cap(uuid)        to service_role;
grant execute on function public.increment_usage(uuid, text)    to service_role;
