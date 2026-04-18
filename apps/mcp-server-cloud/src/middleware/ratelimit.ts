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

export async function rateLimitMiddleware(c: Context, next: Next): Promise<void> {
  const auth = c.get("auth");
  const userId = auth.userId;

  // 1. Burst protection
  const { success: burstOk, remaining: burstRemaining } =
    await burstLimiter.limit(userId);

  if (!burstOk) {
    c.status(429);
    c.json({
      error: "Rate limit exceeded — slow down",
      retryAfterSeconds: 60,
    });
    return;
  }

  // 2. Monthly usage cap (fail-closed)
  const [callsUsed, cap] = await Promise.all([
    getCallsUsed(userId),
    getEffectiveCap(userId),
  ]);

  if (callsUsed >= cap) {
    logger.info({ userId, callsUsed, cap }, "Monthly cap exceeded");
    c.status(429);
    c.json({
      error: "Monthly call limit reached",
      callsUsed,
      cap,
      message:
        cap < 1000
          ? "Answer a survey to restore your cap to 1,000 calls/month."
          : "Upgrade to Pro for unlimited calls, or answer 2 surveys to unlock 2,000 calls this month.",
      upgradeUrl: "https://cc-commander.com/pricing",
      surveyUrl: "https://cc-commander.com/beta/survey/pending",
    });
    return;
  }

  // 3. Every 20th call — feedback gate
  const callNumber = callsUsed + 1;
  if (callNumber % 20 === 0) {
    const pendingFeedback = await checkFeedbackPending(userId, callNumber);
    if (pendingFeedback) {
      c.status(402);
      c.json({
        error: "Survey required",
        message: "Complete a quick survey to continue. It takes 30 seconds.",
        surveyUrl: "https://cc-commander.com/beta/survey/pending",
        callNumber,
      });
      return;
    }
  }

  // Proceed — increment counter and touch last_seen in background
  await next();

  // Post-response side effects
  incrementCallCount(userId).catch((err) =>
    logger.warn({ err, userId }, "incrementCallCount post-response failed")
  );
  touchLastSeen(userId).catch(() => {});

  // Expose usage headers
  c.header("X-Commander-Calls-Used", String(callsUsed + 1));
  c.header("X-Commander-Calls-Cap", String(cap));
  c.header("X-Commander-Burst-Remaining", String(burstRemaining));
}

async function checkFeedbackPending(
  userId: string,
  _callNumber: number
): Promise<boolean> {
  // Check if user has answered any survey this month
  // If yes, feedback gate is satisfied for this call
  const { createClient } = await import("@supabase/supabase-js");
  const { env: e } = await import("../lib/env.js");
  const db = createClient(e.supabaseUrl, e.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("surveys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("answered_at", startOfMonth.toISOString());

  return (count ?? 0) === 0;
}
