-- Migration 003 — Stripe webhook idempotency + billing state (Track H1/H2).
-- Requires migration 002 (stripe_customer_id / stripe_subscription_id).
-- Apply in the Supabase SQL Editor AFTER 002. Idempotent — safe to re-run.
-- Down: migrations/down/003_stripe_events.down.sql.
--
-- Changes:
--   1. stripe_events — one row per Stripe event id. The webhook inserts the
--      row BEFORE it touches users and writes processed_at only after every
--      write succeeded; a redelivery of a processed event short-circuits.
--   2. users billing state:
--        lifetime_tier              'founders' once a paid Founders checkout
--                                   lands; never cleared by subscription events
--        founders_payment_intent    the PaymentIntent that granted Founders
--                                   (unique — one grant per payment)
--        subscription_status        last applied Stripe subscription status
--        subscription_event_created created time of the last applied
--                                   subscription event; older events are ignored
--   3. users_enforce_lifetime_tier trigger — a row with lifetime_tier
--      'founders' always keeps tier 'founders', whatever an UPDATE sets.
--
-- Works on both users schemas in this repo (uuid user_id from schema.sql and
-- TEXT user_id from supabase/migrations/20260417000000_beta_v4.sql): nothing
-- here references the user_id type.

-- 1. Event ledger ------------------------------------------------------------
create table if not exists public.stripe_events (
  event_id       text primary key check (event_id like 'evt_%'),
  type           text not null,
  event_created  timestamptz not null,
  received_at    timestamptz not null default now(),
  processed_at   timestamptz,
  outcome        text
);

create index if not exists stripe_events_unprocessed_idx
  on public.stripe_events (received_at)
  where processed_at is null;

alter table public.stripe_events enable row level security;
revoke all on table public.stripe_events from public, anon, authenticated;
grant select, insert, update on table public.stripe_events to service_role;

-- 2. Billing state on users ---------------------------------------------------
alter table public.users add column if not exists lifetime_tier text;
alter table public.users add column if not exists founders_payment_intent text;
alter table public.users add column if not exists subscription_status text;
alter table public.users add column if not exists subscription_event_created timestamptz;

alter table public.users drop constraint if exists users_lifetime_tier_check;
alter table public.users add constraint users_lifetime_tier_check
  check (lifetime_tier is null or lifetime_tier = 'founders');

create unique index if not exists users_founders_payment_intent_key
  on public.users (founders_payment_intent)
  where founders_payment_intent is not null;

create index if not exists users_stripe_subscription_idx
  on public.users (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Existing Founders rows (granted before this migration) become lifetime.
update public.users
   set lifetime_tier = 'founders'
 where tier = 'founders'
   and lifetime_tier is null;

-- 3. Lifetime guard -----------------------------------------------------------
create or replace function public.users_enforce_lifetime_tier()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.lifetime_tier = 'founders' then
    new.tier := 'founders';
  end if;
  return new;
end;
$$;

revoke all on function public.users_enforce_lifetime_tier() from public, anon, authenticated;

drop trigger if exists users_enforce_lifetime_tier on public.users;
create trigger users_enforce_lifetime_tier
  before insert or update on public.users
  for each row execute function public.users_enforce_lifetime_tier();
