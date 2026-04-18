-- CC Commander Beta v4 Schema
-- Migration: 20260417000000_beta_v4
-- RLS: users see own rows only. Service role bypasses all.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id             TEXT PRIMARY KEY,               -- hashed device fingerprint (no PII)
  email               TEXT UNIQUE,                    -- nullable; set on magic-link signup
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tier                TEXT NOT NULL DEFAULT 'free'    -- 'free' | 'pro'
                        CHECK (tier IN ('free', 'pro')),
  license_key         TEXT UNIQUE,                    -- generated on signup, used for MCP auth
  survey_skip_streak  INT NOT NULL DEFAULT 0,
  surveys_answered    INT NOT NULL DEFAULT 0,
  last_seen_at        TIMESTAMPTZ
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "users_insert_service" ON users
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- SURVEYS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surveys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  session_id  TEXT,                                   -- commander session ID
  question_id INT NOT NULL CHECK (question_id BETWEEN 1 AND 20),
  answer      TEXT NOT NULL,                          -- raw answer value
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version     TEXT                                    -- commander version at time of answer
);

CREATE INDEX surveys_user_id_idx ON surveys(user_id);
CREATE INDEX surveys_question_id_idx ON surveys(question_id);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "surveys_select_own" ON surveys
  FOR SELECT USING (
    (SELECT user_id FROM users WHERE user_id = surveys.user_id AND auth.uid()::text = surveys.user_id) IS NOT NULL
    OR auth.role() = 'service_role'
  );

CREATE POLICY "surveys_insert_service" ON surveys
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- USAGE COUNTERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_counters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  month         TEXT NOT NULL,                        -- 'YYYY-MM' format
  calls_used    INT NOT NULL DEFAULT 0,
  last_call_at  TIMESTAMPTZ,
  UNIQUE (user_id, month)
);

CREATE INDEX usage_counters_user_month_idx ON usage_counters(user_id, month);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_own" ON usage_counters
  FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "usage_upsert_service" ON usage_counters
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- FEEDBACK
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category    TEXT NOT NULL,                          -- 'bug' | 'feature' | 'general'
  content     TEXT NOT NULL,
  sentiment   TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX feedback_user_id_idx ON feedback(user_id);
CREATE INDEX feedback_category_idx ON feedback(category);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_select_own" ON feedback
  FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "feedback_insert_service" ON feedback
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- AGENT MESSAGES (inter-agent comms log)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent  TEXT NOT NULL,
  to_agent    TEXT NOT NULL,
  session_id  TEXT,
  message     JSONB NOT NULL,                         -- structured message payload
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX agent_messages_session_idx ON agent_messages(session_id);
CREATE INDEX agent_messages_created_idx ON agent_messages(created_at DESC);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_messages_service_only" ON agent_messages
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- HELPER FUNCTION: get effective call cap
-- Returns 500 if throttled, 2000 if gamification unlocked, 1000 otherwise.
-- ─────────────────────────────────────────────
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
