import type { AuthContext } from "../middleware/auth.js";
import { getCallsUsed, getEffectiveCap } from "../db/usage.js";

export type GetStatusArgs = Record<string, never>;

export async function getStatus(_args: GetStatusArgs, auth: AuthContext) {
  const [callsUsed, cap] = await Promise.all([
    getCallsUsed(auth.userId),
    getEffectiveCap(auth.userId),
  ]);

  const month = new Date().toISOString().slice(0, 7);
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    version: "4.0.0-beta.1",
    tier: auth.tier,
    userId: auth.userId,
    usage: {
      callsUsed,
      cap,
      remaining: Math.max(0, cap - callsUsed),
      month,
      resetDate: resetDate.toISOString().slice(0, 10),
    },
    betaNote:
      cap < 1000
        ? "Your cap is reduced (survey skip streak). Answer one survey to restore 1,000 calls/month."
        : cap > 1000
          ? "Gamification bonus active — 2,000 calls this month for answering 2+ surveys."
          : undefined,
    links: {
      dashboard: "https://cc-commander.com/dashboard",
      pricing: "https://cc-commander.com/pricing",
      survey: "https://cc-commander.com/beta/survey/pending",
    },
  };
}
