import type { Context, Next } from "hono";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "../lib/env.js";
import { getCallsUsed, getEffectiveCapStrict, reserveCall, touchLastSeen } from "../db/usage.js";
import { logger } from "../lib/logger.js";
import { applyPaywallCap, isPaidTier, isPaywallArmed, type AccountTier } from "../lib/paywall.js";
import { billableCalls, readJsonBody, type Transport } from "../lib/request-body.js";

const redis = new Redis({
  url: env.upstashRedisUrl,
  token: env.upstashRedisToken,
});

// Sliding window per-user rate limiter (burst protection — 60 req/min)
const burstLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "commander:burst",
  analytics: true,
});

// ─── Configurable links (Codex audit #18) ───────────────────────────────────
// Defaults point only at routes that exist. Read at call time so a secret
// change (fly secrets set) takes effect without code changes and tests can
// exercise both states.
export const DEFAULT_UPGRADE_URL = "https://commanderplugin.com";
export const DEFAULT_HELP_URL = "https://github.com/KevinZai/commander#readme";

function httpsUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Where quota-exhausted users are sent: CCC_UPGRADE_URL (https) or the main site. */
export function upgradeUrl(): string {
  return httpsUrl(process.env.CCC_UPGRADE_URL) ?? DEFAULT_UPGRADE_URL;
}

/**
 * The every-20th-call survey gate is OFF unless CCC_SURVEY_GATE=1 AND
 * CCC_SURVEY_URL is an https URL for a working survey route. Without both, no
 * response ever asks for or links to a survey.
 */
export function surveyGateConfig(): { enabled: boolean; url: string | null } {
  const url = httpsUrl(process.env.CCC_SURVEY_URL);
  return { enabled: process.env.CCC_SURVEY_GATE === "1" && url !== null, url };
}

// ─── What counts as a billable call (Codex audit #20) ───────────────────────
// The body is read and parsed ONCE (readJsonBody, byte-limited while
// streaming) and cached on the context; the handler dispatches that same
// parsed value. billableCalls counts exactly what the transport dispatches, so
// billing and dispatch cannot disagree. Protocol traffic and malformed,
// oversized or unknown-tool requests are not billed; the handler answers them.

/** Number of billable tool calls in this request (0 for protocol traffic). */
export async function countBillableCalls(c: Context, transport: Transport = "v1"): Promise<number> {
  if (c.req.method !== "POST") return 0;
  const body = await readJsonBody(c);
  return body.ok ? billableCalls(transport, body.value) : 0;
}

function storageUnavailable(c: Context, err: unknown) {
  logger.error({ err: (err as Error).message }, "Quota storage unavailable — failing closed");
  return c.json(
    {
      error: "quota_storage_unavailable",
      message:
        "Usage could not be recorded, so the call was not run and nothing was charged. Retry shortly.",
      retryAfterSeconds: 30,
    },
    503,
    { "Retry-After": "30" }
  );
}

/** Burst limit + monthly cap for a transport. /v1 and /mcp classify bodies the way they dispatch them. */
export function createRateLimitMiddleware(transport: Transport) {
  return (c: Context, next: Next) => rateLimit(c, next, transport);
}

/** The /v1 middleware (REST and legacy JSON-RPC bodies). */
export const rateLimitMiddleware = createRateLimitMiddleware("v1");
/** The /mcp streamable-HTTP middleware (JSON-RPC tools/call, single or batched). */
export const mcpRateLimitMiddleware = createRateLimitMiddleware("mcp");

async function rateLimit(c: Context, next: Next, transport: Transport): Promise<Response | void> {
  const auth = c.get("auth");
  if (!auth?.userId) {
    logger.error("rateLimitMiddleware invoked without auth context");
    return c.json({ error: "Auth context missing" }, 500);
  }
  const userId = auth.userId;

  // 1. Burst protection — every request, billable or not.
  let burstOk = true;
  let burstRemaining = 0;
  try {
    const result = await burstLimiter.limit(userId);
    burstOk = result.success;
    burstRemaining = result.remaining;
  } catch (err) {
    // Fail-open on Redis unavailability (anti-DoS should not DoS legit users)
    logger.warn({ err: (err as Error).message }, "Burst limiter failed — failing open");
  }
  c.header("X-Commander-Burst-Remaining", String(burstRemaining));

  if (!burstOk) {
    return c.json(
      { error: "Rate limit exceeded — slow down", retryAfterSeconds: 60 },
      429,
      { "Retry-After": "60" }
    );
  }

  // 2. Protocol traffic is never billed and never touches quota storage.
  const billable = await countBillableCalls(c, transport);
  if (billable === 0) {
    await next();
    return;
  }

  // 3. Cap — storage failure fails closed (503), it is never treated as "no usage".
  let cap: number;
  try {
    cap = applyPaywallCap(auth.tier, await getEffectiveCapStrict(userId));
  } catch (err) {
    return storageUnavailable(c, err);
  }
  c.header("X-Commander-Calls-Cap", String(cap));

  // 4. Optional survey gate (off by default). Checked before reserving so a
  //    gated call consumes no quota. The pre-read only picks the 20th call.
  const survey = surveyGateConfig();
  if (survey.enabled) {
    const callNumber = (await getCallsUsed(userId)) + 1;
    if (callNumber % 20 === 0 && callNumber <= cap && (await checkFeedbackPending(userId))) {
      return c.json(
        {
          error: "Survey required",
          message: "Complete a quick survey to continue. It takes 30 seconds.",
          surveyUrl: survey.url,
          callNumber,
        },
        402
      );
    }
  }

  // 5. Atomic reservation before dispatch: the counter only moves while it is
  //    below the cap, so concurrent calls cannot overspend it.
  let callsUsed = 0;
  for (let i = 0; i < billable; i++) {
    let reservation;
    try {
      reservation = await reserveCall(userId, cap);
    } catch (err) {
      return storageUnavailable(c, err);
    }
    callsUsed = reservation.callsUsed;
    if (!reservation.allowed) {
      c.header("X-Commander-Calls-Used", String(Math.min(callsUsed, cap)));
      logger.info({ userId, callsUsed, cap }, "Monthly cap exceeded");
      return c.json(
        {
          error: "Monthly call limit reached",
          callsUsed,
          cap,
          message: capMessage(auth.tier, cap, survey.enabled),
          upgradeUrl: upgradeUrl(),
          helpUrl: DEFAULT_HELP_URL,
          ...(survey.enabled ? { surveyUrl: survey.url } : {}),
          resetsAt: nextMonthStartUtc(),
        },
        429
      );
    }
  }
  c.header("X-Commander-Calls-Used", String(Math.min(callsUsed, cap)));

  await next();

  // Post-response side effect — never blocks the response.
  touchLastSeen(userId).catch((err: unknown) =>
    logger.warn({ err: (err as Error).message, userId }, "touchLastSeen post-response failed")
  );
}

function capMessage(tier: AccountTier, cap: number, surveyEnabled: boolean): string {
  if (isPaywallArmed() && !isPaidTier(tier)) {
    return "Free tier includes 100 calls/month. Upgrade to Pro for unlimited fair use.";
  }
  if (surveyEnabled) {
    return cap < 1000
      ? "Answer a survey to restore your cap to 1,000 calls/month."
      : "Upgrade to Pro for unlimited calls, or answer 2 surveys to unlock 2,000 calls this month.";
  }
  return "Your monthly call allowance is used up. It resets at the start of next month (UTC).";
}

function nextMonthStartUtc(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

async function checkFeedbackPending(userId: string): Promise<boolean> {
  try {
    const { db: supabase } = await import("../db/client.js");
    // UTC, like monthKey(): a local-time month start drifts on non-UTC hosts.
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const { count, error } = await supabase
      .from("surveys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("answered_at", startOfMonth.toISOString());

    if (error) {
      logger.warn({ err: error, userId }, "checkFeedbackPending query failed — skipping gate");
      return false; // fail-open on DB error (don't block a paying user)
    }
    return (count ?? 0) === 0;
  } catch (err) {
    logger.warn({ err: (err as Error).message, userId }, "checkFeedbackPending threw — skipping gate");
    return false;
  }
}
