-- CC Commander — reconcile the hosted schema into one ordered migration chain
-- Migration: 20261118000000_reconcile_hosted_schema
--
-- Codex audit #19 (one chain), #06 (billing state), #07 (creators privacy),
-- #08 (quota RPC + entitlement column protection), #09 (OAuth bindings and
-- license-token revocation).
--
-- The ordered chain is supabase/migrations/*, applied by `supabase db push`:
--   20260417000000_beta_v4.sql                 (history; unchanged)
--   20261118000000_reconcile_hosted_schema.sql (this file)
--
-- This file is idempotent and converges BOTH historical starting points on
-- the same end state:
--   A. a database built from the chain (beta_v4: text user ids, surveys,
--      feedback, agent_messages, no increment_usage);
--   B. a database built from apps/mcp-server-cloud/src/db/schema.sql
--      (+ migrations/002_paywall_tiers.sql, + creators-schema.sql): uuid user
--      ids, usage RPCs, no surveys/feedback.
-- For B, run this file once in the SQL Editor, then record the chain as
-- applied: `supabase migration repair --status applied 20260417000000 20261118000000`
-- (beta_v4 itself cannot run on a uuid-keyed database).
--
-- End state:
--   users.user_id is TEXT (uuid values convert losslessly; fingerprint ids stay)
--   tables  users, usage_counters, surveys, feedback, agent_messages,
--           stripe_events, oauth_identities, creators, creator_clicks
--   view    creators_public (approved profiles; no email, affiliate or money columns)
--   RPCs    get_effective_cap(text), increment_usage(text, text),
--           increment_creator_clicks(text)
--   Only service_role reads or writes billing, identity and quota data.

create extension if not exists "pgcrypto";

-- ─── 1. users: one shape, text ids ──────────────────────────────────────────
create table if not exists public.users (
  user_id             text primary key default gen_random_uuid()::text,
  email               text unique,
  created_at          timestamptz not null default now(),
  tier                text not null default 'free',
  license_key         text unique,
  survey_skip_streak  integer not null default 0,
  surveys_answered    integer not null default 0,
  last_seen_at        timestamptz
);

-- Starting point B keys users by uuid. Convert to text (lossless) together
-- with every column that references it; the uuid RPC overloads go first so
-- PostgREST never sees two candidates for one named-argument call.
do $reconcile$
declare
  fk_names text[];
  fk_tables regclass[];
  fk_cols text[];
  fk_defs text[];
  i integer;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users'
      and column_name = 'user_id' and data_type = 'uuid'
  ) then
    drop function if exists public.get_effective_cap(uuid);
    drop function if exists public.increment_usage(uuid, text);

    select array_agg(c.conname), array_agg(c.conrelid::regclass),
           array_agg(a.attname::text), array_agg(pg_get_constraintdef(c.oid))
      into fk_names, fk_tables, fk_cols, fk_defs
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = 'public.users'::regclass;

    for i in 1 .. coalesce(array_length(fk_names, 1), 0) loop
      execute format('alter table %s drop constraint %I', fk_tables[i], fk_names[i]);
    end loop;

    alter table public.users alter column user_id drop default;
    alter table public.users alter column user_id type text using user_id::text;

    for i in 1 .. coalesce(array_length(fk_names, 1), 0) loop
      execute format('alter table %s alter column %I type text using %I::text',
                     fk_tables[i], fk_cols[i], fk_cols[i]);
      execute format('alter table %s add constraint %I %s', fk_tables[i], fk_names[i], fk_defs[i]);
    end loop;
  end if;
end
$reconcile$;

alter table public.users alter column user_id set default gen_random_uuid()::text;

alter table public.users
  add column if not exists stripe_customer_id            text,
  add column if not exists stripe_subscription_id        text,
  add column if not exists stripe_subscription_status    text,
  add column if not exists stripe_subscription_event_at  timestamptz,
  add column if not exists founders_granted_at           timestamptz,
  add column if not exists key_version                   integer not null default 1;

-- B already has this unique index (named after its inline constraint).
create unique index if not exists users_stripe_customer_id_key on public.users (stripe_customer_id);
create index if not exists users_tier_idx on public.users (tier);

alter table public.users drop constraint if exists users_tier_check;
alter table public.users add constraint users_tier_check
  check (tier in ('free', 'pro', 'founders'));
alter table public.users drop constraint if exists users_key_version_check;
alter table public.users add constraint users_key_version_check check (key_version >= 1);

-- Lifetime grants are tracked independently of tier (audit #06).
update public.users
   set founders_granted_at = now()
 where tier = 'founders' and founders_granted_at is null;

-- ─── 2. supporting tables ───────────────────────────────────────────────────
create table if not exists public.usage_counters (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references public.users(user_id) on delete cascade,
  month         text not null,
  calls_used    integer not null default 0,
  last_call_at  timestamptz,
  unique (user_id, month)
);
create index if not exists usage_counters_user_month_idx on public.usage_counters (user_id, month);

-- Read by the survey gate (src/middleware/ratelimit.ts).
create table if not exists public.surveys (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(user_id) on delete cascade,
  session_id  text,
  question_id integer not null check (question_id between 1 and 20),
  answer      text not null,
  answered_at timestamptz not null default now(),
  version     text
);
create index if not exists surveys_user_id_idx on public.surveys (user_id);
create index if not exists surveys_question_id_idx on public.surveys (question_id);

-- Written by commander_pin_note (src/tools/notes-pin.ts).
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(user_id) on delete cascade,
  category    text not null,
  content     text not null,
  sentiment   text check (sentiment in ('positive', 'neutral', 'negative')),
  created_at  timestamptz not null default now()
);
create index if not exists feedback_user_id_idx on public.feedback (user_id);
create index if not exists feedback_category_idx on public.feedback (category);

create table if not exists public.agent_messages (
  id          uuid primary key default gen_random_uuid(),
  from_agent  text not null,
  to_agent    text not null,
  session_id  text,
  message     jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists agent_messages_session_idx on public.agent_messages (session_id);
create index if not exists agent_messages_created_idx on public.agent_messages (created_at desc);

-- Durable Stripe idempotency (audit #06): one row per fully applied event.
create table if not exists public.stripe_events (
  event_id      text primary key,
  type          text not null,
  processed_at  timestamptz not null default now()
);

-- OAuth issuer + subject bindings (audit #09).
create table if not exists public.oauth_identities (
  issuer      text not null,
  subject     text not null,
  user_id     text not null references public.users(user_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (issuer, subject)
);
create index if not exists oauth_identities_user_idx on public.oauth_identities (user_id);

-- ─── 3. quota RPCs (text ids) ───────────────────────────────────────────────
-- Tier rules: pro/founders 100000 calls/mo. Free: 1000; +1000 after two
-- surveys (lifetime counter or two answers this month); -500 when the
-- survey skip streak reaches 3. Unknown users get the 1000 baseline.
create or replace function public.get_effective_cap(p_user_id text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  u public.users%rowtype;
  cap integer;
  month_answers integer;
begin
  select * into u from public.users where user_id = p_user_id;
  if not found then
    return 1000;
  end if;

  if u.tier in ('pro', 'founders') then
    return 100000;
  end if;

  select count(*) into month_answers
    from public.surveys
   where user_id = p_user_id
     and answered_at >= date_trunc('month', now());

  cap := 1000;
  if u.surveys_answered >= 2 or month_answers >= 2 then
    cap := cap + 1000;
  end if;
  if u.survey_skip_streak >= 3 then
    cap := greatest(cap - 500, 0);
  end if;
  return cap;
end;
$$;

create or replace function public.increment_usage(p_user_id text, p_month text)
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

-- Security-definer RPCs: PUBLIC holds EXECUTE by default and Supabase's
-- default privileges grant it to anon/authenticated too. Revoke all three
-- explicitly; only the service may read caps or mutate counters (audit #08).
revoke all on function public.get_effective_cap(text)       from public, anon, authenticated;
revoke all on function public.increment_usage(text, text)   from public, anon, authenticated;
grant execute on function public.get_effective_cap(text)     to service_role;
grant execute on function public.increment_usage(text, text) to service_role;

-- ─── 4. users guard: service-managed columns + founders + key rotation ──────
-- anon/authenticated may never insert users or change any column other than
-- last_seen_at, whatever grants or policies say (audit #08). For every role:
--   - a lifetime grant pins tier = 'founders' (clear founders_granted_at in
--     the same UPDATE to revoke one deliberately, e.g. after a refund);
--   - rotating an issued license_key bumps key_version, which revokes every
--     license JWT minted for the old key (audit #09).
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

  if tg_op = 'UPDATE'
     and old.license_key is not null
     and new.license_key is distinct from old.license_key then
    new.key_version := greatest(new.key_version, old.key_version + 1);
  end if;

  if new.founders_granted_at is not null then
    new.tier := 'founders';
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard on public.users;
create trigger users_guard
  before insert or update on public.users
  for each row execute function public.users_guard();

-- ─── 5. RLS + table privileges ──────────────────────────────────────────────
alter table public.users            enable row level security;
alter table public.usage_counters   enable row level security;
alter table public.surveys          enable row level security;
alter table public.feedback         enable row level security;
alter table public.agent_messages   enable row level security;
alter table public.stripe_events    enable row level security;
alter table public.oauth_identities enable row level security;

-- Every reader and writer is the service-role client, which bypasses RLS.
-- Client roles get no table privileges, so legacy own-row policies cannot
-- be used to edit tier, license or billing columns.
revoke all on table
  public.users, public.usage_counters, public.surveys, public.feedback,
  public.agent_messages, public.stripe_events, public.oauth_identities
  from public, anon, authenticated;
grant all on table
  public.users, public.usage_counters, public.surveys, public.feedback,
  public.agent_messages, public.stripe_events, public.oauth_identities
  to service_role;

-- ─── 6. creators (audit #07) ────────────────────────────────────────────────
create table if not exists public.creators (
  id                      uuid primary key default gen_random_uuid(),
  github_id               text unique not null,
  github_username         text unique not null,
  github_avatar_url       text,
  github_followers        int not null default 0,
  email                   text not null,
  display_name            text not null,
  ls_affiliate_id         text not null,
  ls_referral_code        text not null,
  slug                    text unique not null,
  tier                    text not null default 'affiliate'
    check (tier in ('affiliate', 'creator', 'influencer')),
  custom_pitch_md         text,
  embedded_tweet_url      text,
  embedded_youtube_url    text,
  custom_quote            text,
  twitter_handle          text,
  youtube_channel         text,
  total_clicks            int not null default 0,
  total_conversions       int not null default 0,
  total_commission_cents  int not null default 0,
  approved_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists creators_slug_idx on public.creators (slug);
create index if not exists creators_tier_idx on public.creators (tier);
create index if not exists creators_github_id_idx on public.creators (github_id);

create table if not exists public.creator_clicks (
  id          bigserial primary key,
  creator_id  uuid not null references public.creators(id) on delete cascade,
  ip_hash     text,
  user_agent  text,
  referer     text,
  ts          timestamptz not null default now()
);
create index if not exists creator_clicks_creator_ts on public.creator_clicks (creator_id, ts);

alter table public.creators       enable row level security;
alter table public.creator_clicks enable row level security;

-- The old policy exposed every row and column (email, affiliate ids,
-- commissions, unapproved creators) to anyone holding the anon key.
drop policy if exists creators_public_read on public.creators;

revoke all on table public.creators, public.creator_clicks from public, anon, authenticated;
revoke all on sequence public.creator_clicks_id_seq from public, anon, authenticated;
grant all on table public.creators, public.creator_clicks to service_role;
grant usage, select on sequence public.creator_clicks_id_seq to service_role;

-- Landing pages read this view. It runs with its owner's rights (no
-- security_invoker), so it is the ONLY public path to creator data: approved
-- creators, public profile columns only.
create or replace view public.creators_public as
  select slug,
         display_name,
         github_username,
         github_avatar_url,
         github_followers,
         tier,
         custom_pitch_md,
         embedded_tweet_url,
         embedded_youtube_url,
         custom_quote,
         twitter_handle,
         youtube_channel,
         approved_at
    from public.creators
   where approved_at is not null;

revoke all on table public.creators_public from public, anon, authenticated;
grant select on table public.creators_public to anon, authenticated, service_role;

-- Click counter for /r/{slug}: approved creators only.
create or replace function public.increment_creator_clicks(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creators
     set total_clicks = total_clicks + 1,
         updated_at   = now()
   where slug = p_slug
     and approved_at is not null;
end;
$$;

revoke all on function public.increment_creator_clicks(text) from public;
grant execute on function public.increment_creator_clicks(text) to service_role, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creators_set_updated_at on public.creators;
create trigger creators_set_updated_at
  before update on public.creators
  for each row execute function public.set_updated_at();
