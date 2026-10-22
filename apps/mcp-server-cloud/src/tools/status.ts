import type { AuthContext } from "../middleware/auth.js";
import { getCallsUsed, getEffectiveCap } from "../db/usage.js";
import { SERVER_VERSION } from "../lib/version.js";
import { applyPaywallCap, isPaidTier, isPaywallArmed } from "../lib/paywall.js";

export type GetStatusArgs = Record<string, never>;

export async function getStatus(_args: GetStatusArgs, auth: AuthContext) {
  const [callsUsed, surveyCap] = await Promise.all([
    getCallsUsed(auth.userId),
    getEffectiveCap(auth.userId),
  ]);
  // Report the paywall-adjusted cap so clients see the enforced value.
  const cap = applyPaywallCap(auth.tier, surveyCap);

  const month = new Date().toISOString().slice(0, 7);
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    version: SERVER_VERSION,
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
      isPaywallArmed() && !isPaidTier(auth.tier)
        ? "Free tier includes 100 calls/month. Upgrade to Pro for unlimited fair use."
        : cap < 1000
          ? "Your cap is reduced (survey skip streak). Answer one survey to restore 1,000 calls/month."
          : cap > 1000
            ? "Gamification bonus active — 2,000 calls this month for answering 2+ surveys."
            : undefined,
    links: {
      dashboard: "https://commanderplugin.com/dashboard",
      pricing: "https://commanderplugin.com/pricing",
      survey: "https://commanderplugin.com/beta/survey/pending",
    },
  };
}
