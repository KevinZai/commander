/**
 * Stripe webhook tests — signature validation, idempotency, ordering, tiers.
 *
 * Run:  node --import tsx --test tests/stripe-webhook.test.ts
 *
 * Signatures are generated with the real `stripe` package
 * (generateTestHeaderString), so the valid-signature path exercises the
 * SDK's actual constructEvent verification — no mocked crypto.
 * Persistence is an in-memory StripeWebhookStore with the same semantics as
 * the Supabase store (event ledger, ordering guard). Fully offline.
 */

import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

// ─── Fake env BEFORE importing app modules ─────────────────────────────────
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token"; // cp-secret-ok: test-only fixture
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long"; // cp-secret-ok: test-only fixture
process.env.NODE_ENV = "test";

const WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests_only"; // cp-secret-ok: test-only fixture
const PRICE_PRO_MONTHLY = "price_test_pro_monthly";
const PRICE_PRO_YEARLY = "price_test_pro_yearly";
const PRICE_FOUNDERS = "price_test_founders_onetime";

process.env.CCC_STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.CCC_STRIPE_PRICE_PRO_MONTHLY = PRICE_PRO_MONTHLY;
process.env.CCC_STRIPE_PRICE_PRO_YEARLY = PRICE_PRO_YEARLY;
process.env.CCC_STRIPE_PRICE_FOUNDERS = PRICE_FOUNDERS;

const { createStripeWebhookApp, computeTier } = await import("../src/routes/stripe-webhook.js");
import type {
  BillingPatch,
  BillingUser,
  ClaimResult,
  StripeWebhookStore,
  UserRef,
} from "../src/routes/stripe-webhook.js";

// Signature helper backed by the real SDK (verification also uses the SDK).
const stripe = new Stripe("sk_test_placeholder_signing_only");
function signedHeaders(payload: string): Record<string, string> {
  return {
    "stripe-signature": stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    }),
    "content-type": "application/json",
  };
}

// ─── In-memory store ───────────────────────────────────────────────────────
type EventRow = { type: string; createdAt: string; processedAt: string | null; outcome: string | null };

class MemoryStore implements StripeWebhookStore {
  events = new Map<string, EventRow>();
  users = new Map<string, BillingUser>();
  writes: Array<{ userId: string; patch: BillingPatch }> = [];
  failNext: Partial<Record<"claimEvent" | "markProcessed" | "findUser" | "updateUser", number>> = {};

  addUser(user: Partial<BillingUser> & { user_id: string }): void {
    this.users.set(user.user_id, {
      tier: "free",
      lifetime_tier: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_status: null,
      subscription_event_created: null,
      founders_payment_intent: null,
      ...user,
    });
  }

  user(id: string): BillingUser {
    const row = this.users.get(id);
    assert.ok(row, `user ${id} exists`);
    return row;
  }

  private maybeFail(op: keyof MemoryStore["failNext"]): void {
    const left = this.failNext[op] ?? 0;
    if (left > 0) {
      this.failNext[op] = left - 1;
      throw new Error(`simulated ${op} failure`);
    }
  }

  async claimEvent(event: { id: string; type: string; createdAt: string }): Promise<ClaimResult> {
    this.maybeFail("claimEvent");
    const existing = this.events.get(event.id);
    if (existing) return existing.processedAt ? "processed" : "pending";
    this.events.set(event.id, { type: event.type, createdAt: event.createdAt, processedAt: null, outcome: null });
    return "new";
  }

  async markProcessed(eventId: string, outcome: string): Promise<void> {
    this.maybeFail("markProcessed");
    const row = this.events.get(eventId);
    assert.ok(row, "event claimed before markProcessed");
    row.processedAt = new Date().toISOString();
    row.outcome = outcome;
  }

  async findUser(ref: UserRef): Promise<BillingUser | null> {
    this.maybeFail("findUser");
    const all = [...this.users.values()];
    return (
      (ref.userId && this.users.get(ref.userId)) ||
      (ref.subscriptionId && all.find((u) => u.stripe_subscription_id === ref.subscriptionId)) ||
      (ref.customerId && all.find((u) => u.stripe_customer_id === ref.customerId)) ||
      null
    );
  }

  async updateUser(userId: string, patch: BillingPatch, notOlderThan?: string): Promise<boolean> {
    this.maybeFail("updateUser");
    const row = this.users.get(userId);
    if (!row) return false;
    if (notOlderThan && row.subscription_event_created && row.subscription_event_created > notOlderThan) {
      return false;
    }
    Object.assign(row, patch);
    // Mirrors the users_enforce_lifetime_tier trigger from migration 003.
    if (row.lifetime_tier === "founders") row.tier = "founders";
    this.writes.push({ userId, patch });
    return true;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
let eventSeq = 0;
const BASE_TIME = 1_800_000_000; // fixed epoch seconds — deterministic ordering

function eventPayload(
  type: string,
  object: Record<string, unknown>,
  opts: { id?: string; created?: number } = {}
): string {
  eventSeq += 1;
  return JSON.stringify({
    id: opts.id ?? `evt_test_${eventSeq}`,
    object: "event",
    api_version: "2025-01-01",
    created: opts.created ?? BASE_TIME + eventSeq,
    type,
    data: { object },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  });
}

function subscription(id: string, customer: string, status: string, price = PRICE_PRO_MONTHLY, metadata: Record<string, string> = {}) {
  return { id, object: "subscription", customer, status, metadata, items: { data: [{ price: { id: price } }] } };
}

function foundersSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_founders",
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    payment_intent: "pi_founders_1",
    customer: "cus_founder",
    client_reference_id: "user-founder",
    customer_details: { email: "founder@example.com" },
    metadata: { ccc_price_id: PRICE_FOUNDERS },
    ...overrides,
  };
}

let store: MemoryStore;
let app: ReturnType<typeof createStripeWebhookApp>;

async function deliver(payload: string): Promise<Response> {
  return app.fetch(new Request("http://test/", { method: "POST", headers: signedHeaders(payload), body: payload }));
}

beforeEach(() => {
  process.env.CCC_STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  store = new MemoryStore();
  app = createStripeWebhookApp({ store });
});

// ─── Signature validation ──────────────────────────────────────────────────
describe("stripe webhook signature validation", () => {
  it("rejects a missing stripe-signature header with 400", async () => {
    const res = await app.fetch(new Request("http://test/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: eventPayload("customer.subscription.created", {}),
    }));
    assert.equal(res.status, 400);
    assert.match(((await res.json()) as { error: string }).error, /signature/i);
    assert.equal(store.events.size, 0);
  });

  it("rejects an invalid signature with 400", async () => {
    const res = await app.fetch(new Request("http://test/", {
      method: "POST",
      headers: { "stripe-signature": "t=123,v1=deadbeef", "content-type": "application/json" },
      body: eventPayload("customer.subscription.created", {}),
    }));
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { error: string }).error, "Invalid signature");
    assert.equal(store.events.size, 0);
  });

  it("rejects a validly-signed but tampered payload", async () => {
    const payload = eventPayload("customer.subscription.created", {}, { id: "evt_test_tamper" });
    const headers = signedHeaders(payload);
    const tampered = payload.replace("evt_test_tamper", "evt_evil_1");
    const res = await app.fetch(new Request("http://test/", { method: "POST", headers, body: tampered }));
    assert.equal(res.status, 400);
    assert.equal(store.events.size, 0);
  });

  it("returns 503 when CCC_STRIPE_WEBHOOK_SECRET is unset (dark/unconfigured)", async () => {
    delete process.env.CCC_STRIPE_WEBHOOK_SECRET;
    const res = await app.fetch(new Request("http://test/", { method: "POST", body: "{}" }));
    assert.equal(res.status, 503);
    assert.match(((await res.json()) as { error: string }).error, /not configured/i);
  });
});

// ─── Tier computation ──────────────────────────────────────────────────────
describe("computeTier", () => {
  it("founders when lifetime, else pro while active, else free", () => {
    assert.equal(computeTier("founders", "canceled"), "founders");
    assert.equal(computeTier(null, "active"), "pro");
    assert.equal(computeTier(null, "trialing"), "pro");
    assert.equal(computeTier(null, "past_due"), "pro");
    assert.equal(computeTier(null, "canceled"), "free");
    assert.equal(computeTier(null, "unpaid"), "free");
    assert.equal(computeTier(null, null), "free");
  });
});

// ─── Subscription lifecycle ────────────────────────────────────────────────
describe("stripe webhook subscriptions", () => {
  it("subscription.created with a pro price on a linked customer sets pro and records processed_at", async () => {
    store.addUser({ user_id: "u1", stripe_customer_id: "cus_1" });
    const payload = eventPayload("customer.subscription.created", subscription("sub_1", "cus_1", "active"), { id: "evt_sub_created" });
    const res = await deliver(payload);
    assert.equal(res.status, 200);
    assert.equal(store.user("u1").tier, "pro");
    assert.equal(store.user("u1").stripe_subscription_id, "sub_1");
    assert.equal(store.user("u1").subscription_status, "active");
    assert.ok(store.events.get("evt_sub_created")?.processedAt);
  });

  it("the yearly price also counts as pro; an unknown price is ignored", async () => {
    store.addUser({ user_id: "u1", stripe_customer_id: "cus_1" });
    store.addUser({ user_id: "u2", stripe_customer_id: "cus_2" });
    assert.equal((await deliver(eventPayload("customer.subscription.created", subscription("sub_1", "cus_1", "active", PRICE_PRO_YEARLY)))).status, 200);
    assert.equal((await deliver(eventPayload("customer.subscription.created", subscription("sub_2", "cus_2", "active", "price_other_product")))).status, 200);
    assert.equal(store.user("u1").tier, "pro");
    assert.equal(store.user("u2").tier, "free");
    assert.equal(store.writes.length, 1);
  });

  it("resolves a not-yet-linked subscription through metadata.ccc_user_id", async () => {
    store.addUser({ user_id: "u1" });
    const res = await deliver(eventPayload("customer.subscription.created",
      subscription("sub_1", "cus_new", "active", PRICE_PRO_MONTHLY, { ccc_user_id: "u1" })));
    assert.equal(res.status, 200);
    assert.equal(store.user("u1").tier, "pro");
    assert.equal(store.user("u1").stripe_customer_id, "cus_new");
  });

  it("defers (500, not processed) a pro subscription whose customer is not linked yet", async () => {
    const payload = eventPayload("customer.subscription.created", subscription("sub_x", "cus_unknown", "active"), { id: "evt_defer" });
    const res = await deliver(payload);
    assert.equal(res.status, 500);
    assert.equal(store.events.get("evt_defer")?.processedAt, null);

    // Stripe redelivers after checkout.session.completed links the customer.
    store.addUser({ user_id: "u9", stripe_customer_id: "cus_unknown" });
    const retry = await deliver(payload);
    assert.equal(retry.status, 200);
    assert.equal(store.user("u9").tier, "pro");
  });

  it("records an unlinked pro subscription as unmatched (200) once it is older than the retry bound", async () => {
    const fourDaysAgo = Math.floor(Date.now() / 1000) - 4 * 24 * 60 * 60;
    const res = await deliver(eventPayload("customer.subscription.created",
      subscription("sub_lost", "cus_lost", "active"), { id: "evt_unmatched_old", created: fourDaysAgo }));
    assert.equal(res.status, 200);
    assert.equal(store.events.get("evt_unmatched_old")?.outcome, "unmatched");
    assert.ok(store.events.get("evt_unmatched_old")?.processedAt);
    assert.equal(store.writes.length, 0);
  });

  it("still defers an unlinked pro subscription inside the retry bound", async () => {
    const oneDayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const res = await deliver(eventPayload("customer.subscription.created",
      subscription("sub_lost", "cus_lost", "active"), { id: "evt_unmatched_recent", created: oneDayAgo }));
    assert.equal(res.status, 500);
    assert.equal(store.events.get("evt_unmatched_recent")?.processedAt, null);
  });

  it("duplicate delivery of a processed event is a no-op 200", async () => {
    store.addUser({ user_id: "u1", stripe_customer_id: "cus_1" });
    const payload = eventPayload("customer.subscription.created", subscription("sub_1", "cus_1", "active"), { id: "evt_dup" });
    assert.equal((await deliver(payload)).status, 200);
    const writesAfterFirst = store.writes.length;

    const second = await deliver(payload);
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), { received: true, duplicate: true });
    assert.equal(store.writes.length, writesAfterFirst);
  });

  it("out-of-order: an older subscription.updated arriving after deleted does not resurrect pro", async () => {
    store.addUser({ user_id: "u1", stripe_customer_id: "cus_1" });
    await deliver(eventPayload("customer.subscription.created", subscription("sub_1", "cus_1", "active"), { created: BASE_TIME + 100 }));
    await deliver(eventPayload("customer.subscription.deleted", subscription("sub_1", "cus_1", "canceled"), { created: BASE_TIME + 300 }));
    assert.equal(store.user("u1").tier, "free");

    const stale = await deliver(eventPayload("customer.subscription.updated", subscription("sub_1", "cus_1", "active"), { id: "evt_stale", created: BASE_TIME + 200 }));
    assert.equal(stale.status, 200);
    assert.equal(store.user("u1").tier, "free");
    assert.equal(store.user("u1").subscription_status, "canceled");
    assert.equal(store.events.get("evt_stale")?.outcome, "stale");
  });

  it("same-second tie: incomplete does not replace active for the same subscription", async () => {
    store.addUser({ user_id: "u1", stripe_customer_id: "cus_1" });
    const t = BASE_TIME + 500;
    assert.equal((await deliver(eventPayload("customer.subscription.updated", subscription("sub_1", "cus_1", "active"), { created: t }))).status, 200);
    const late = await deliver(eventPayload("customer.subscription.created", subscription("sub_1", "cus_1", "incomplete"), { id: "evt_tie_incomplete", created: t }));
    assert.equal(late.status, 200);
    assert.equal(store.user("u1").subscription_status, "active");
    assert.equal(store.user("u1").tier, "pro");
    assert.equal(store.events.get("evt_tie_incomplete")?.outcome, "stale");
  });

  it("same-second tie: active replaces incomplete, and a deletion still ends the subscription", async () => {
    store.addUser({ user_id: "u1", stripe_customer_id: "cus_1" });
    const t = BASE_TIME + 600;
    await deliver(eventPayload("customer.subscription.created", subscription("sub_1", "cus_1", "incomplete"), { created: t }));
    assert.equal(store.user("u1").tier, "free");
    await deliver(eventPayload("customer.subscription.updated", subscription("sub_1", "cus_1", "active"), { created: t }));
    assert.equal(store.user("u1").tier, "pro");
    await deliver(eventPayload("customer.subscription.deleted", subscription("sub_1", "cus_1", "canceled"), { created: t }));
    assert.equal(store.user("u1").subscription_status, "canceled");
    assert.equal(store.user("u1").tier, "free");
    // An ended subscription id cannot become active again in the same second.
    const res = await deliver(eventPayload("customer.subscription.updated", subscription("sub_1", "cus_1", "active"), { id: "evt_tie_after_cancel", created: t }));
    assert.equal(res.status, 200);
    assert.equal(store.user("u1").tier, "free");
    assert.equal(store.events.get("evt_tie_after_cancel")?.outcome, "stale");
  });

  it("an older subscription ending does not cancel the current active one", async () => {
    store.addUser({ user_id: "u1", stripe_customer_id: "cus_1", stripe_subscription_id: "sub_new", subscription_status: "active", tier: "pro" });
    const res = await deliver(eventPayload("customer.subscription.deleted", subscription("sub_old", "cus_1", "canceled")));
    assert.equal(res.status, 200);
    assert.equal(store.user("u1").tier, "pro");
    assert.equal(store.user("u1").stripe_subscription_id, "sub_new");
  });

  it("cancel after Founders keeps founders", async () => {
    store.addUser({ user_id: "user-founder", stripe_customer_id: "cus_founder", stripe_subscription_id: "sub_f", subscription_status: "active", tier: "pro" });
    assert.equal((await deliver(eventPayload("checkout.session.completed", foundersSession()))).status, 200);
    assert.equal(store.user("user-founder").tier, "founders");

    const res = await deliver(eventPayload("customer.subscription.deleted", subscription("sub_f", "cus_founder", "canceled")));
    assert.equal(res.status, 200);
    assert.equal(store.user("user-founder").tier, "founders");
    assert.equal(store.user("user-founder").lifetime_tier, "founders");
    assert.equal(store.user("user-founder").subscription_status, "canceled");
  });
});

// ─── Checkout ───────────────────────────────────────────────────────────────
describe("stripe webhook checkout", () => {
  it("paid Founders checkout grants founders, links the customer and stores the payment intent", async () => {
    store.addUser({ user_id: "user-founder" });
    const res = await deliver(eventPayload("checkout.session.completed", foundersSession()));
    assert.equal(res.status, 200);
    const user = store.user("user-founder");
    assert.equal(user.tier, "founders");
    assert.equal(user.lifetime_tier, "founders");
    assert.equal(user.founders_payment_intent, "pi_founders_1");
    assert.equal(user.stripe_customer_id, "cus_founder");
  });

  it("unpaid Founders checkout grants nothing; async_payment_succeeded grants later", async () => {
    store.addUser({ user_id: "user-founder" });
    const res = await deliver(eventPayload("checkout.session.completed", foundersSession({ payment_status: "unpaid" }), { id: "evt_unpaid" }));
    assert.equal(res.status, 200);
    assert.equal(store.user("user-founder").tier, "free");
    assert.equal(store.user("user-founder").lifetime_tier, null);
    assert.equal(store.events.get("evt_unpaid")?.outcome, "founders_unpaid");

    const settled = await deliver(eventPayload("checkout.session.async_payment_succeeded", foundersSession()));
    assert.equal(settled.status, 200);
    assert.equal(store.user("user-founder").tier, "founders");
  });

  it("never resolves a user by email", async () => {
    store.addUser({ user_id: "u-email-only" });
    const res = await deliver(eventPayload("checkout.session.completed",
      foundersSession({ client_reference_id: null, customer: "cus_unlinked", customer_details: { email: "u-email-only@example.com" } }),
      { id: "evt_email" }));
    assert.equal(res.status, 200);
    assert.equal(store.user("u-email-only").tier, "free");
    assert.equal(store.events.get("evt_email")?.outcome, "unmatched");
    assert.equal(store.writes.length, 0);
  });

  it("subscription-mode checkout links customer + subscription but leaves the tier to subscription events", async () => {
    store.addUser({ user_id: "u1" });
    const res = await deliver(eventPayload("checkout.session.completed", {
      id: "cs_sub", object: "checkout.session", mode: "subscription", payment_status: "paid",
      customer: "cus_sub", subscription: "sub_9", client_reference_id: "u1",
    }));
    assert.equal(res.status, 200);
    assert.equal(store.user("u1").stripe_customer_id, "cus_sub");
    assert.equal(store.user("u1").stripe_subscription_id, "sub_9");
    assert.equal(store.user("u1").tier, "free");
  });

  it("unhandled event types are acknowledged with 200 and no user writes", async () => {
    const res = await deliver(eventPayload("invoice.paid", { id: "in_1", object: "invoice" }, { id: "evt_inv" }));
    assert.equal(res.status, 200);
    assert.equal(store.writes.length, 0);
    assert.equal(store.events.get("evt_inv")?.outcome, "unhandled_type");
  });
});

// ─── Persistence failures ──────────────────────────────────────────────────
describe("stripe webhook persistence failures", () => {
  it("a user write failure answers 500, leaves processed_at unset, and a retry succeeds", async () => {
    store.addUser({ user_id: "u1", stripe_customer_id: "cus_1" });
    const payload = eventPayload("customer.subscription.created", subscription("sub_1", "cus_1", "active"), { id: "evt_dbfail" });
    store.failNext.updateUser = 1;
    const res = await deliver(payload);
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "Webhook handler error" });
    assert.equal(store.events.get("evt_dbfail")?.processedAt, null);
    assert.equal(store.user("u1").tier, "free");

    const retry = await deliver(payload);
    assert.equal(retry.status, 200);
    assert.equal(store.user("u1").tier, "pro");
  });

  it("an event-ledger insert failure answers 500 before any user write", async () => {
    store.addUser({ user_id: "u1", stripe_customer_id: "cus_1" });
    store.failNext.claimEvent = 1;
    const res = await deliver(eventPayload("customer.subscription.created", subscription("sub_1", "cus_1", "active")));
    assert.equal(res.status, 500);
    assert.equal(store.writes.length, 0);
  });

  it("a processed_at write failure answers 500 (Stripe retries; the retry is idempotent)", async () => {
    store.addUser({ user_id: "user-founder" });
    const payload = eventPayload("checkout.session.completed", foundersSession(), { id: "evt_mark_fail" });
    store.failNext.markProcessed = 1;
    assert.equal((await deliver(payload)).status, 500);
    assert.equal(store.user("user-founder").tier, "founders");

    const retry = await deliver(payload);
    assert.equal(retry.status, 200);
    assert.equal(store.events.get("evt_mark_fail")?.outcome, "founders_already");
  });

  it("a user lookup failure answers 500", async () => {
    store.failNext.findUser = 1;
    const res = await deliver(eventPayload("checkout.session.completed", foundersSession()));
    assert.equal(res.status, 500);
  });
});
