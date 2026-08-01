/**
 * Dark paywall unit tests — tier cap enforcement (armed vs dark) and monthly
 * counter reset-key logic.
 *
 * Run:  node --import tsx --test tests/paywall.test.ts
 *
 * The paywall MUST be a pure pass-through when CCC_PAYWALL_ARMED is unset —
 * the "dark" assertions here are the proof of no behavior change.
 */

import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Fake env BEFORE importing modules that pull in lib/env.ts ────────────
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long";
process.env.NODE_ENV = "test";
delete process.env.CCC_PAYWALL_ARMED;

const { applyPaywallCap, isPaywallArmed, isPaidTier, FREE_TIER_ARMED_CAP } = await import(
  "../src/lib/paywall.js"
);
const { monthKey } = await import("../src/db/usage.js");

afterEach(() => {
  delete process.env.CCC_PAYWALL_ARMED;
});

// ─── Dark (default): pure pass-through, no behavior change ────────────────
describe("paywall dark (CCC_PAYWALL_ARMED unset)", () => {
  it("is not armed by default", () => {
    assert.equal(isPaywallArmed(), false);
  });

  it("free tier keeps the survey baseline cap (1000)", () => {
    assert.equal(applyPaywallCap("free", 1000), 1000);
  });

  it("free tier keeps the survey-boosted cap (2000)", () => {
    assert.equal(applyPaywallCap("free", 2000), 2000);
  });

  it("free tier keeps the skip-streak-reduced cap (500)", () => {
    assert.equal(applyPaywallCap("free", 500), 500);
  });

  it("pro tier is untouched", () => {
    assert.equal(applyPaywallCap("pro", 100000), 100000);
  });

  it("founders tier is untouched", () => {
    assert.equal(applyPaywallCap("founders", 100000), 100000);
  });

  it("'0', 'true', and 'yes' do NOT arm — only the exact string '1'", () => {
    for (const v of ["0", "true", "yes", ""]) {
      process.env.CCC_PAYWALL_ARMED = v;
      assert.equal(isPaywallArmed(), false, `value ${JSON.stringify(v)} must not arm`);
      assert.equal(applyPaywallCap("free", 1000), 1000);
    }
  });
});

// ─── Armed: free tier hard-capped at 100/mo, paid tiers exempt ────────────
describe("paywall armed (CCC_PAYWALL_ARMED=1)", () => {
  it("arms with the exact value '1'", () => {
    process.env.CCC_PAYWALL_ARMED = "1";
    assert.equal(isPaywallArmed(), true);
  });

  it("free tier is capped at 100 regardless of survey boost", () => {
    process.env.CCC_PAYWALL_ARMED = "1";
    assert.equal(applyPaywallCap("free", 1000), FREE_TIER_ARMED_CAP);
    assert.equal(applyPaywallCap("free", 2000), FREE_TIER_ARMED_CAP);
    assert.equal(FREE_TIER_ARMED_CAP, 100);
  });

  it("never RAISES a free cap — min(100, survey cap)", () => {
    process.env.CCC_PAYWALL_ARMED = "1";
    assert.equal(applyPaywallCap("free", 50), 50);
    assert.equal(applyPaywallCap("free", 0), 0);
  });

  it("pro tier is exempt from the 100-call cap", () => {
    process.env.CCC_PAYWALL_ARMED = "1";
    assert.equal(applyPaywallCap("pro", 100000), 100000);
  });

  it("founders tier is exempt from the 100-call cap", () => {
    process.env.CCC_PAYWALL_ARMED = "1";
    assert.equal(applyPaywallCap("founders", 100000), 100000);
  });
});

// ─── Tier helpers ──────────────────────────────────────────────────────────
describe("isPaidTier", () => {
  it("classifies tiers correctly", () => {
    assert.equal(isPaidTier("free"), false);
    assert.equal(isPaidTier("pro"), true);
    assert.equal(isPaidTier("founders"), true);
  });
});

// ─── Monthly counter reset logic ───────────────────────────────────────────
// usage_counters rows are keyed by (user_id, month). A new month key means a
// fresh row starting at calls_used=0 — that IS the reset mechanism.
describe("monthKey (monthly counter reset)", () => {
  it("derives YYYY-MM from a date", () => {
    assert.equal(monthKey(new Date("2026-07-15T12:00:00Z")), "2026-07");
  });

  it("changes at the month boundary (fresh counter row)", () => {
    const endOfJuly = monthKey(new Date("2026-07-31T23:59:59Z"));
    const startOfAugust = monthKey(new Date("2026-08-01T00:00:00Z"));
    assert.equal(endOfJuly, "2026-07");
    assert.equal(startOfAugust, "2026-08");
    assert.notEqual(endOfJuly, startOfAugust);
  });

  it("rolls the year over December → January", () => {
    assert.equal(monthKey(new Date("2026-12-31T23:59:59Z")), "2026-12");
    assert.equal(monthKey(new Date("2027-01-01T00:00:00Z")), "2027-01");
  });

  it("defaults to the current month", () => {
    assert.equal(monthKey(), new Date().toISOString().slice(0, 7));
  });
});
