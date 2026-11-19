-- Down for migration 006. Idempotent. Roll back only together with the server
-- code that reads license_key_version (it answers 503 without the column).
-- Revoked tokens become valid again once the column is gone.

alter table public.users drop constraint if exists users_license_key_version_check;
alter table public.users drop column if exists license_key_version;
