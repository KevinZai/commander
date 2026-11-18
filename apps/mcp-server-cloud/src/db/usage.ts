import { db } from "./client.js";
import { logger } from "../lib/logger.js";

// Pure month-key derivation — exported for tests (monthly counter "reset" is
// implicit: usage_counters rows are keyed by (user_id, month), so a new month
// key starts a fresh counter at 0).
export function monthKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7); // 'YYYY-MM'
}

function currentMonth(): string {
  return monthKey();
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

/** Quota storage could not answer; callers must fail closed, not assume zero usage. */
export class QuotaStorageError extends Error {
  constructor(operation: string, detail?: string) {
    super(`quota storage ${operation} failed${detail ? `: ${detail}` : ""}`);
    this.name = "QuotaStorageError";
  }
}

/** Survey/tier cap for billing decisions. Throws QuotaStorageError instead of guessing. */
export async function getEffectiveCapStrict(userId: string): Promise<number> {
  const { data, error } = await db.rpc("get_effective_cap", { p_user_id: userId });
  if (error) throw new QuotaStorageError("get_effective_cap", error.message);
  const cap = typeof data === "number" ? data : Number(data);
  if (!Number.isFinite(cap)) throw new QuotaStorageError("get_effective_cap", "non-numeric result");
  return cap;
}

export type Reservation = { allowed: boolean; callsUsed: number };

/**
 * Atomically reserves one billable call for this UTC month (RPC
 * reserve_call(text, text, integer), supabase/migrations/
 * 20261119000000_quota_reserve_and_stripe_claims.sql). The counter only moves while it is below `cap`, so
 * concurrent requests cannot overspend the allowance. Throws QuotaStorageError
 * when storage fails or the RPC is missing.
 */
export async function reserveCall(userId: string, cap: number): Promise<Reservation> {
  const { data, error } = await db.rpc("reserve_call", {
    p_user_id: userId,
    p_month: currentMonth(),
    p_cap: cap,
  });
  if (error) throw new QuotaStorageError("reserve_call", error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { allowed?: unknown; calls_used?: unknown } | null;
  if (!row || typeof row.allowed !== "boolean" || !Number.isFinite(Number(row.calls_used))) {
    throw new QuotaStorageError("reserve_call", "unexpected result shape");
  }
  return { allowed: row.allowed, callsUsed: Number(row.calls_used) };
}

export async function touchLastSeen(userId: string): Promise<void> {
  await db
    .from("users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", userId);
}
