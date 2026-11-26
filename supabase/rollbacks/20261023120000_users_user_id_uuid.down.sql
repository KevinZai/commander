-- DOWN for supabase/migrations/20261023120000_users_user_id_uuid.sql
-- (KevinZai/commander#209). Restores the beta_v4 shape: user_id TEXT everywhere,
-- ::text-cast policies, get_effective_cap(TEXT). Lossless: every uuid casts to text.
-- Kept outside supabase/migrations/ on purpose. Run by hand only, with Kevin's
-- sign-off, e.g.: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f <this file>
-- then delete the forward row from supabase_migrations.schema_migrations
-- (version = '20261023120000') so the CLI history matches.

DROP POLICY IF EXISTS "users_select_own"    ON users;
DROP POLICY IF EXISTS "users_update_own"    ON users;
DROP POLICY IF EXISTS "surveys_select_own"  ON surveys;
DROP POLICY IF EXISTS "usage_select_own"    ON usage_counters;
DROP POLICY IF EXISTS "feedback_select_own" ON feedback;
DROP FUNCTION IF EXISTS get_effective_cap(UUID);

ALTER TABLE surveys        DROP CONSTRAINT IF EXISTS surveys_user_id_fkey;
ALTER TABLE usage_counters DROP CONSTRAINT IF EXISTS usage_counters_user_id_fkey;
ALTER TABLE feedback       DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;

ALTER TABLE users          ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE users          ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE surveys        ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE usage_counters ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE feedback       ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE surveys        ADD CONSTRAINT surveys_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE usage_counters ADD CONSTRAINT usage_counters_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE feedback       ADD CONSTRAINT feedback_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Original beta_v4 policies, verbatim.
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "surveys_select_own" ON surveys
  FOR SELECT USING (
    (SELECT user_id FROM users WHERE user_id = surveys.user_id AND auth.uid()::text = surveys.user_id) IS NOT NULL
    OR auth.role() = 'service_role'
  );

CREATE POLICY "usage_select_own" ON usage_counters
  FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "feedback_select_own" ON feedback
  FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION get_effective_cap(p_user_id TEXT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
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
