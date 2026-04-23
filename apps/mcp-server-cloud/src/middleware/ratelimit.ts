import type { Context, Next } from "hono";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "../lib/env.js";
import { getCallsUsed, getEffectiveCap, incrementCallCount, touchLastSeen } from "../db/usage.js";
import { logger } from "../lib/logger.js";

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

export async function rateLimitMiddleware(c: Context, next: Next): Promise<Response | void> {
  const auth = c.get("auth");
  if (!auth?.userId) {
    logger.error("rateLimitMiddleware invoked without auth context");
    return c.json({ error: "Auth context missing" }, 500);
  }
  const userId = auth.userId;

  // 1. Burst protection
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

  if (!burstOk) {
    return c.json(
      {
        error: "Rate limit exceeded — slow down",
        retryAfterSeconds: 60,
      },
      429,
      { "Retry-After": "60" }
    );
  }

  // 2. Monthly usage cap (fail-closed via DB errors returning 0 means cap never exceeded — see usage.ts)
  const [callsUsed, cap] = await Promise.all([
    getCallsUsed(userId),
    getEffectiveCap(userId),
  ]);

  if (callsUsed >= cap) {
    logger.info({ userId, callsUsed, cap }, "Monthly cap exceeded");
    return c.json(
      {
        error: "Monthly call limit reached",
        callsUsed,
        cap,
        message:
          cap < 1000
            ? "Answer a survey to restore your cap to 1,000 calls/month."
            : "Upgrade to Pro for unlimited calls, or answer 2 surveys to unlock 2,000 calls this month.",
        upgradeUrl: "https://cc-commander.com/pricing",
        surveyUrl: "https://cc-commander.com/beta/survey/pending",
      },
      429
    );
  }

  // 3. Every 20th call — feedback gate
  const callNumber = callsUsed + 1;
  if (callNumber % 20 === 0) {
    const pendingFeedback = await checkFeedbackPending(userId);
    if (pendingFeedback) {
      return c.json(
        {
          error: "Survey required",
          message: "Complete a quick survey to continue. It takes 30 seconds.",
          surveyUrl: "https://cc-commander.com/beta/survey/pending",
          callNumber,
        },
        402
      );
    }
  }

  // Expose usage headers BEFORE handler runs (Hono buffers)
  c.header("X-Commander-Calls-Used", String(callsUsed + 1));
  c.header("X-Commander-Calls-Cap", String(cap));
  c.header("X-Commander-Burst-Remaining", String(burstRemaining));

  await next();

  // Post-response side effects — never block the response
  incrementCallCount(userId).catch((err) =>
    logger.warn({ err: (err as Error).message, userId }, "incrementCallCount post-response failed")
  );
  touchLastSeen(userId).catch((err) =>
    logger.warn({ err: (err as Error).message, userId }, "touchLastSeen post-response failed")
  );
}

async function checkFeedbackPending(userId: string): Promise<boolean> {
  try {
    const { db: supabase } = await import("../db/client.js");
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

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
