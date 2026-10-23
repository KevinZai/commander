-- Migration: 20261023180000_beta_v4_missing_tables
-- Creates the beta_v4 tables that never landed on the live commander-mcp project:
-- surveys, feedback and agent_messages, plus their beta_v4 RLS policies.
--
-- Shapes are copied from 20260417000000_beta_v4.sql with one change: user_id is UUID
-- (live users.user_id is uuid), so the policies compare auth.uid() = user_id with no ::text cast.
--
-- Fully idempotent. On a database where beta_v4 already created these tables
-- (fresh replay, preview branch) every statement is a no-op.
-- Down: supabase/rollbacks/20261023180000_beta_v4_missing_tables.down.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Guard: the new FKs need users.user_id to be uuid. Only checked when something is missing.
DO $$
DECLARE
  v_type TEXT;
BEGIN
  IF to_regclass('public.surveys') IS NULL OR to_regclass('public.feedback') IS NULL THEN
    SELECT data_type INTO v_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'user_id';
    IF v_type IS DISTINCT FROM 'uuid' THEN
      RAISE EXCEPTION 'beta_v4_missing_tables: users.user_id is % (need uuid); nothing changed', coalesce(v_type, 'missing');
    END IF;
  END IF;
END
$$;

-- ─────────────────────────────────────────────
-- SURVEYS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surveys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  session_id  TEXT,                                   -- commander session ID
  question_id INT NOT NULL CHECK (question_id BETWEEN 1 AND 20),
  answer      TEXT NOT NULL,                          -- raw answer value
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version     TEXT                                    -- commander version at time of answer
);

CREATE INDEX IF NOT EXISTS surveys_user_id_idx ON surveys(user_id);
CREATE INDEX IF NOT EXISTS surveys_question_id_idx ON surveys(question_id);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- FEEDBACK
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category    TEXT NOT NULL,                          -- 'bug' | 'feature' | 'general'
  content     TEXT NOT NULL,
  sentiment   TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_category_idx ON feedback(category);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS agent_messages_session_idx ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS agent_messages_created_idx ON agent_messages(created_at DESC);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- POLICIES (beta_v4 names; created only if missing)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'surveys' AND policyname = 'surveys_select_own') THEN
    CREATE POLICY "surveys_select_own" ON surveys
      FOR SELECT USING (
        (SELECT user_id FROM users WHERE user_id = surveys.user_id AND auth.uid() = surveys.user_id) IS NOT NULL
        OR auth.role() = 'service_role'
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'surveys' AND policyname = 'surveys_insert_service') THEN
    CREATE POLICY "surveys_insert_service" ON surveys
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'feedback_select_own') THEN
    CREATE POLICY "feedback_select_own" ON feedback
      FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'feedback_insert_service') THEN
    CREATE POLICY "feedback_insert_service" ON feedback
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_messages' AND policyname = 'agent_messages_service_only') THEN
    CREATE POLICY "agent_messages_service_only" ON agent_messages
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END
$$;
