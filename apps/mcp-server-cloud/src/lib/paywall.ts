// Dark paywall — tier gating for the hosted MCP (revenue-opp-2026-07-10 §3+§6).
//
// DESIGN: this module is INERT until env CCC_PAYWALL_ARMED=1. When unarmed
// (the default), applyPaywallCap() is a pure pass-through and server behavior
// is byte-identical to the pre-paywall baseline. Arming is a config change,
// not a deploy: `fly secrets set CCC_PAYWALL_ARMED=1` (see PAYWALL.md).
//
// CCC_PAYWALL_ARMED is intentionally read from process.env at CALL time (not
// frozen into lib/env.ts at import) so tests can exercise both states and so
// the armed/dark state is always the live environment's truth.

export type AccountTier = "free" | "pro" | "founders";

/** Hard monthly call cap for free-tier keys when the paywall is armed. */
export const FREE_TIER_ARMED_CAP = 100;

export function isPaywallArmed(): boolean {
  return process.env.CCC_PAYWALL_ARMED === "1";
}

export function isPaidTier(tier: AccountTier): boolean {
  return tier === "pro" || tier === "founders";
}

/**
 * Layer the armed free-tier cap on top of the existing survey-adjusted cap
 * (get_effective_cap RPC: 1000 baseline, +1000 for 2+ surveys, -500 for a
 * 3+ skip streak). The two mechanisms coexist:
 *
 *   - dark (default):    cap = survey cap — unchanged from today.
 *   - armed, free tier:  cap = min(100, survey cap) — the paywall NEVER
 *                        raises a free key's cap above the survey system's
 *                        value; it only lowers it to the documented 100/mo.
 *   - armed, pro/founders: cap = survey cap (pro maps to 100000 in the RPC —
 *                        effectively unlimited fair use; founders gets pro
 *                        parity via migration 002).
 */
export function applyPaywallCap(tier: AccountTier, baseCap: number): number {
  if (!isPaywallArmed()) return baseCap;
  if (isPaidTier(tier)) return baseCap;
  return Math.min(FREE_TIER_ARMED_CAP, baseCap);
}
