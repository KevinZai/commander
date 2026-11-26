-- Down for migration 005. Idempotent. With the table gone, /mcp denies every
-- external OAuth token (license JWTs keep working).

drop index if exists public.oauth_identities_user_idx;
drop table if exists public.oauth_identities;
