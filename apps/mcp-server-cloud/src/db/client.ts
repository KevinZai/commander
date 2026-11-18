import { createClient } from "@supabase/supabase-js";
import { env } from "../lib/env.js";

// Service-role client — bypasses RLS. Only used server-side, never exposed to clients.
export const db = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

export type UserRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  tier: "free" | "pro" | "founders";
  license_key: string | null;
  survey_skip_streak: number;
  surveys_answered: number;
  last_seen_at: string | null;
  // Paywall billing state — set only by the Stripe webhook.
  // Schema: supabase/migrations/20261118000000_reconcile_hosted_schema.sql.
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_subscription_event_at: string | null;
  founders_granted_at: string | null;
  // License-JWT revocation: tokens carry kv = key_version (middleware/auth.ts).
  key_version: number;
};

export type UsageCounterRow = {
  id: string;
  user_id: string;
  month: string;
  calls_used: number;
  last_call_at: string | null;
};
