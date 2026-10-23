-- Migration: 20261023120000_users_user_id_uuid
-- KevinZai/commander#209 (Supabase Preview: `operator does not exist: text = uuid`).
--
-- 20260417000000_beta_v4.sql created users.user_id (and every FK to it) as TEXT,
-- but the hosted MCP treats it as a uuid: apps/mcp-server-cloud/src/db/schema.sql
-- declares `user_id uuid primary key default gen_random_uuid()`, and
-- src/db/migrations/002_paywall_tiers.sql defines get_effective_cap(p_user_id uuid)
-- with `where user_id = p_user_id`, which fails against a TEXT column.
--
-- This is a FORWARD migration; the applied beta_v4 file is left untouched.
-- Down: supabase/rollbacks/20261023120000_users_user_id_uuid.down.sql (kept outside
-- supabase/migrations/ so the CLI never applies it as a forward step).
--
-- Safety: refuses to run (raises, nothing changes) if any existing user_id or
-- FK value is not a valid uuid, e.g. a legacy hashed device fingerprint. Those
-- rows need a decision from Kevin (map them or move them to a separate column)
-- before this can be applied. DO NOT APPLY without Kevin's sign-off.

DO $$
DECLARE
  bad INT;
  uuid_re CONSTANT TEXT := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  SELECT
      (SELECT COUNT(*) FROM users          WHERE user_id !~ uuid_re)
    + (SELECT COUNT(*) FROM surveys        WHERE user_id !~ uuid_re)
    + (SELECT COUNT(*) FROM usage_counters WHERE user_id !~ uuid_re)
    + (SELECT COUNT(*) FROM feedback       WHERE user_id !~ uuid_re)
    INTO bad;
  IF bad > 0 THEN
    RAISE EXCEPTION 'users_user_id_uuid: % row(s) have a user_id that is not a uuid; migrate or remove them first', bad;
  END IF;
END
$$;

-- 1. Policies and the helper reference user_id as TEXT; drop them first
--    (Postgres refuses to change the type of a column used in a policy).
DROP POLICY IF EXISTS "users_select_own"    ON users;
DROP POLICY IF EXISTS "users_update_own"    ON users;
DROP POLICY IF EXISTS "surveys_select_own"  ON surveys;
DROP POLICY IF EXISTS "usage_select_own"    ON usage_counters;
DROP POLICY IF EXISTS "feedback_select_own" ON feedback;
DROP FUNCTION IF EXISTS get_effective_cap(TEXT);

-- 2. FKs must go before the referenced PK changes type.
ALTER TABLE surveys        DROP CONSTRAINT IF EXISTS surveys_user_id_fkey;
ALTER TABLE usage_counters DROP CONSTRAINT IF EXISTS usage_counters_user_id_fkey;
ALTER TABLE feedback       DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;

-- 3. TEXT -> UUID (guarded above, so the casts cannot fail on data).
ALTER TABLE users          ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE users          ALTER COLUMN user_id SET DEFAULT gen_random_uuid();
ALTER TABLE surveys        ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE usage_counters ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE feedback       ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE surveys        ADD CONSTRAINT surveys_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE usage_counters ADD CONSTRAINT usage_counters_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE feedback       ADD CONSTRAINT feedback_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- 4. Same policies as beta_v4, now comparing uuid to uuid (no ::text casts).
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "surveys_select_own" ON surveys
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "usage_select_own" ON usage_counters
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "feedback_select_own" ON feedback
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- 5. Helper: same body as beta_v4, uuid parameter (matches the app's RPC calls).
CREATE OR REPLACE FUNCTION get_effective_cap(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_skip_streak INT;
  v_month_answers INT;
BEGIN
  SELECT survey_skip_streak INTO v_skip_streak FROM users WHERE user_id = p_user_id;

  IF v_skip_streak >= 3 THEN
    RETURN 500;
  END IF;

  SELECT COUNT(*) INTO v_month_answers
  FROM surveys
  WHERE user_id = p_user_id
    AND answered_at >= DATE_TRUNC('month', NOW());

  IF v_month_answers >= 2 THEN
    RETURN 2000;
  END IF;

  RETURN 1000;
END;
$$;
