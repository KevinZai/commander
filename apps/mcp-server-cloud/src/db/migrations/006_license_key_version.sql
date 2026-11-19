-- Migration 006 — license key versioning (Track M7a).
-- Apply in the Supabase SQL Editor AFTER 005, and BEFORE deploying the server
-- release that reads it (the license lookup selects this column).
-- Idempotent — safe to re-run. Down: migrations/down/006_license_key_version.down.sql.
--
-- A license JWT carries `kv` = users.license_key_version. Revoking a key is
-- `update users set license_key_version = license_key_version + 1`, then
-- minting a new token with the new kv. Tokens minted before versioning carry
-- no kv and are accepted only while the version is still 1.

alter table public.users
  add column if not exists license_key_version integer not null default 1;

alter table public.users drop constraint if exists users_license_key_version_check;
alter table public.users add constraint users_license_key_version_check
  check (license_key_version >= 1);
