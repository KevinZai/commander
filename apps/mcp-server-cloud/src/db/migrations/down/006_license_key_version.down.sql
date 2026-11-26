-- Down for migration 006. Idempotent. Without the column the server treats
-- every license key as version 1, so tokens revoked by a version bump become
-- valid again once the column is gone.

alter table public.users drop constraint if exists users_license_key_version_check;
alter table public.users drop column if exists license_key_version;
