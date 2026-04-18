import { db } from "./client.js";
import { logger } from "../lib/logger.js";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

export async function getEffectiveCap(userId: string): Promise<number> {
  const { data, error } = await db.rpc("get_effective_cap", {
    p_user_id: userId,
  });
  if (error) {
    logger.error({ error }, "get_effective_cap RPC failed");
    return 1000; // fail-open with standard cap
  }
  return data as number;
}

export async function getCallsUsed(userId: string): Promise<number> {
  const month = currentMonth();
  const { data, error } = await db
    .from("usage_counters")
    .select("calls_used")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  if (error) {
    logger.error({ error }, "getCallsUsed query failed");
    return 0;
  }
  return data?.calls_used ?? 0;
}

export async function incrementCallCount(userId: string): Promise<void> {
  const month = currentMonth();
  const { error } = await db.rpc("increment_usage", {
    p_user_id: userId,
    p_month: month,
  });
  if (error) {
    // Non-fatal — log and continue
    logger.warn({ error, userId }, "incrementCallCount failed");
  }
}

export async function touchLastSeen(userId: string): Promise<void> {
  await db
    .from("users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", userId);
}
