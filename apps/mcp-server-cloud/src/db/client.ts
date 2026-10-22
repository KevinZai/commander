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
  // Dark paywall plumbing (migration 002) — set by the Stripe webhook.
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export type UsageCounterRow = {
  id: string;
  user_id: string;
  month: string;
  calls_used: number;
  last_call_at: string | null;
};
