-- Down for migration 003 — removes the Stripe event ledger and billing state.
-- Idempotent. Roll back only together with the webhook code from the same
-- release: that code requires these objects and answers 500 without them.
-- users.tier keeps its current value (Founders rows stay 'founders').

drop trigger if exists users_enforce_lifetime_tier on public.users;
drop function if exists public.users_enforce_lifetime_tier();

drop index if exists public.users_stripe_subscription_idx;
drop index if exists public.users_founders_payment_intent_key;
alter table public.users drop constraint if exists users_lifetime_tier_check;

alter table public.users drop column if exists subscription_event_created;
alter table public.users drop column if exists subscription_status;
alter table public.users drop column if exists founders_payment_intent;
alter table public.users drop column if exists lifetime_tier;

drop table if exists public.stripe_events;
