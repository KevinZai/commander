-- Migration 005 — OAuth identity links for /mcp (Track H6).
-- Apply in the Supabase SQL Editor AFTER 004. Idempotent — safe to re-run.
-- Down: migrations/down/005_oauth_identities.down.sql.
--
-- An access token from the external OAuth issuer maps to a CC Commander user
-- ONLY through (issuer, subject) here. The previous fallbacks (sub equal to
-- users.user_id, or the token's email claim equal to users.email) are gone.
-- Rows are written by the operator or a future linking flow, never by the
-- token holder.
--
-- user_id takes the type of public.users.user_id (uuid in schema.sql, TEXT in
-- supabase/migrations/20260417000000_beta_v4.sql).

do $do$
declare
  user_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into user_id_type
    from pg_attribute a
   where a.attrelid = 'public.users'::regclass
     and a.attname = 'user_id'
     and not a.attisdropped;

  execute format($t$
    create table if not exists public.oauth_identities (
      issuer      text not null check (length(issuer) between 1 and 512),
      subject     text not null check (length(subject) between 1 and 512),
      user_id     %s not null references public.users(user_id) on delete cascade,
      created_at  timestamptz not null default now(),
      primary key (issuer, subject)
    )
  $t$, user_id_type);
end
$do$;

create index if not exists oauth_identities_user_idx
  on public.oauth_identities (user_id);

alter table public.oauth_identities enable row level security;
revoke all on table public.oauth_identities from public, anon, authenticated;
grant select, insert, update, delete on table public.oauth_identities to service_role;
