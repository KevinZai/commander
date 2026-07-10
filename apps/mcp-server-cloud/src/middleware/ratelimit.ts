import type { Context, Next } from "hono";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "../lib/env.js";
import { getCallsUsed, getEffectiveCap, incrementCallCount, touchLastSeen } from "../db/usage.js";
import { logger } from "../lib/logger.js";
import { captureEvent } from "../lib/posthog.js";
import { applyPaywallCap, isPaidTier, isPaywallArmed } from "../lib/paywall.js";

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

  // 2. Monthly usage cap (fetched up-front so quota headers are accurate on
  //    EVERY response from this middleware — success, burst-429, cap-429, or
  //    feedback-402). Previously these fields were only set on the success
  //    path, leaving clients blind to "how much of my cap is left?" on every
  //    rejection. Worth one extra Supabase round-trip even on burst-fail
  //    because that's the cheap path (auth + 2 reads, no write).
  const [callsUsed, surveyCap] = await Promise.all([
    getCallsUsed(userId),
    getEffectiveCap(userId),
  ]);

  // Dark paywall layer: pass-through unless CCC_PAYWALL_ARMED=1, in which case
  // free-tier keys are capped at min(100, survey cap). See lib/paywall.ts.
  const cap = applyPaywallCap(auth.tier, surveyCap);

  // Expose usage headers up-front so they appear on every response below.
  c.header("X-Commander-Calls-Used", String(Math.min(callsUsed + 1, cap)));
  c.header("X-Commander-Calls-Cap", String(cap));
  c.header("X-Commander-Burst-Remaining", String(burstRemaining));

  if (!burstOk) {
    captureEvent(userId, "mcp_quota_hit", { kind: "burst", callsUsed, cap });
    return c.json(
      {
        error: "Rate limit exceeded — slow down",
        retryAfterSeconds: 60,
        callsUsed,
        cap,
      },
      429,
      { "Retry-After": "60" }
    );
  }

  if (callsUsed >= cap) {
    logger.info({ userId, callsUsed, cap }, "Monthly cap exceeded");
    captureEvent(userId, "mcp_quota_hit", { kind: "monthly_cap", callsUsed, cap });
    return c.json(
      {
        error: "Monthly call limit reached",
        callsUsed,
        cap,
        message:
          isPaywallArmed() && !isPaidTier(auth.tier)
            ? "Free tier includes 100 calls/month. Upgrade to Pro for unlimited fair use."
            : cap < 1000
              ? "Answer a survey to restore your cap to 1,000 calls/month."
              : "Upgrade to Pro for unlimited calls, or answer 2 surveys to unlock 2,000 calls this month.",
        upgradeUrl: "https://commanderplugin.com/pricing",
        surveyUrl: "https://commanderplugin.com/beta/survey/pending",
      },
      429
    );
  }

  // 3. Every 20th call — feedback gate
  const callNumber = callsUsed + 1;
  if (callNumber % 20 === 0) {
    const pendingFeedback = await checkFeedbackPending(userId);
    if (pendingFeedback) {
      captureEvent(userId, "mcp_quota_hit", { kind: "feedback_gate", callNumber });
      return c.json(
        {
          error: "Survey required",
          message: "Complete a quick survey to continue. It takes 30 seconds.",
          surveyUrl: "https://commanderplugin.com/beta/survey/pending",
          callNumber,
        },
        402
      );
    }
  }

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
