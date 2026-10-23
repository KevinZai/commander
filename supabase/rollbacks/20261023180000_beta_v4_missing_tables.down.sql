-- Down for 20261023180000_beta_v4_missing_tables.
-- DESTRUCTIVE: drops surveys, feedback and agent_messages and every row in them. Snapshot first.
-- Lives outside supabase/migrations/ so the Supabase CLI never runs it as a forward step.
-- Run in one transaction: psql -1 -f supabase/rollbacks/20261023180000_beta_v4_missing_tables.down.sql

DROP POLICY IF EXISTS "agent_messages_service_only" ON agent_messages;
DROP POLICY IF EXISTS "feedback_insert_service" ON feedback;
DROP POLICY IF EXISTS "feedback_select_own" ON feedback;
DROP POLICY IF EXISTS "surveys_insert_service" ON surveys;
DROP POLICY IF EXISTS "surveys_select_own" ON surveys;

DROP TABLE IF EXISTS agent_messages;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS surveys;
