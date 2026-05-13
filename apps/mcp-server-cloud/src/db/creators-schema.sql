-- CC Commander — Creator Partner Program schema
-- Apply to the same Supabase project as users/usage_counters (CC-653).
-- This schema implements CC-665 (creator program: GitHub OAuth + /r/{slug} pages).
--
-- Apply via Supabase SQL Editor or `supabase db push`.
-- Service-role bypasses RLS; anon/authenticated get public-read only on creators.
--
-- Tables: creators, creator_clicks
-- RPCs:   increment_creator_clicks(p_slug text)

create extension if not exists "pgcrypto";

-- ─── creators ────────────────────────────────────────────────────────────────

create table if not exists public.creators (
  id                      uuid primary key default gen_random_uuid(),

  -- GitHub identity (source of truth for auth)
  github_id               text unique not null,
  github_username         text unique not null,
  github_avatar_url       text,
  github_followers        int not null default 0,

  -- Contact
  email                   text not null,
  display_name            text not null,

  -- Lemon Squeezy
  ls_affiliate_id         text not null,
  ls_referral_code        text not null,

  -- Public URL slug: commanderplugin.com/r/{slug}
  slug                    text unique not null,

  -- Tier: affiliate (self-signup) | creator (1K+ followers) | influencer (hand-picked)
  tier                    text not null default 'affiliate'
    check (tier in ('affiliate', 'creator', 'influencer')),

  -- Custom landing page content (nullable — defaults to standard template)
  custom_pitch_md         text,
  embedded_tweet_url      text,
  embedded_youtube_url    text,
  custom_quote            text,

  -- Social handles
  twitter_handle          text,
  youtube_channel         text,

  -- Aggregate stats (denormalized for fast landing page renders)
  total_clicks            int not null default 0,
  total_conversions       int not null default 0,
  total_commission_cents  int not null default 0,

  -- Lifecycle
  approved_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists creators_slug_idx on public.creators (slug);
create index if not exists creators_tier_idx on public.creators (tier);
create index if not exists creators_github_id_idx on public.creators (github_id);

-- ─── creator_clicks ──────────────────────────────────────────────────────────

create table if not exists public.creator_clicks (
  id          bigserial primary key,
  creator_id  uuid not null references public.creators(id) on delete cascade,
  ip_hash     text,   -- SHA-256 of IP, never raw IP stored
  user_agent  text,
  referer     text,
  ts          timestamptz not null default now()
);

create index if not exists creator_clicks_creator_ts on public.creator_clicks (creator_id, ts);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.creators       enable row level security;
alter table public.creator_clicks enable row level security;

-- Public read on creators (slug-based lookup for landing pages, anon traffic).
-- Never expose email or ls_affiliate_id to anon — those are service-role only.
-- NB: Postgres CREATE POLICY has no IF NOT EXISTS — guard with a DO block (same
-- pattern this file uses for the creators_set_updated_at trigger below).
do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'creators' and policyname = 'creators_public_read'
  ) then
    create policy creators_public_read on public.creators
      for select
      using (true);
  end if;
end
$do$;

-- No public write — only service-role inserts/updates.
-- (creator_clicks has no public policies — inserted via service-role only)

-- ─── RPC: increment_creator_clicks ───────────────────────────────────────────
-- Called by the edge function that handles /r/{slug} page visits.
-- Uses security definer so anon callers can increment without write access to the table.

create or replace function public.increment_creator_clicks(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creators
  set
    total_clicks = total_clicks + 1,
    updated_at   = now()
  where slug = p_slug;
end;
$$;

grant execute on function public.increment_creator_clicks(text)
  to service_role, anon, authenticated;

-- ─── updated_at trigger (optional but useful) ────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'creators_set_updated_at'
      and tgrelid = 'public.creators'::regclass
  ) then
    create trigger creators_set_updated_at
      before update on public.creators
      for each row execute function public.set_updated_at();
  end if;
end
$$;
