/**
 * Stripe webhook tests — signature validation, entitlement reconciliation,
 * delivery ordering, failure handling and founders preservation.
 *
 * Run:  node --import tsx --test tests/stripe-webhook.test.ts
 *
 * Signatures are generated with the real `stripe` package
 * (generateTestHeaderString), so the valid-signature path exercises the
 * SDK's actual constructEvent verification — no mocked crypto.
 * DB access is an in-memory fake behind the injectable deps on
 * createStripeWebhookApp, so tests assert resulting entitlement state.
 */

import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

// ─── Fake env BEFORE importing app modules ─────────────────────────────────
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long";
process.env.NODE_ENV = "test";

const WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests_only";
const PRICE_PRO_MONTHLY = "price_test_pro_monthly";
const PRICE_PRO_YEARLY = "price_test_pro_yearly";
const PRICE_FOUNDERS = "price_test_founders_onetime";

process.env.CCC_STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.CCC_STRIPE_PRICE_PRO_MONTHLY = PRICE_PRO_MONTHLY;
process.env.CCC_STRIPE_PRICE_PRO_YEARLY = PRICE_PRO_YEARLY;
process.env.CCC_STRIPE_PRICE_FOUNDERS = PRICE_FOUNDERS;

const { createStripeWebhookApp, tierAfterSubscription, subscriptionEventApplies } = await import(
  "../src/routes/stripe-webhook.js"
);
import type { AccountTier } from "../src/lib/paywall.js";
import type { BillingUser, StripeWebhookDeps } from "../src/routes/stripe-webhook.js";

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

// ─── In-memory fake DB ─────────────────────────────────────────────────────
type Call = { fn: string; args: unknown[] };
type FakeUser = {
  userId: string;
  email: string | null;
  tier: AccountTier;
  customerId: string | null;
  foundersGrantedAt: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionEventAt: string | null;
};

const USER_ID = "8a68e2f2-0000-4000-8000-000000000001";

function makeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    userId: USER_ID,
    email: "buyer@example.com",
    tier: "free",
    customerId: null,
    foundersGrantedAt: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionEventAt: null,
    ...overrides,
  };
}

type FakeOpts = { failWrites?: boolean; readDelaysMs?: number[] };

function makeFakes(users: FakeUser[] = [], opts: FakeOpts = {}) {
  const calls: Call[] = [];
  const processed = new Set<string>();
  const claims = new Set<string>();
  const readDelays = [...(opts.readDelaysMs ?? [])];
  // Lets concurrent deliveries interleave between their read and their write.
  const pause = async () => {
    const ms = readDelays.shift();
    if (ms !== undefined) await new Promise((resolve) => setTimeout(resolve, ms));
  };
  const view = (u: FakeUser): BillingUser => ({
    userId: u.userId,
    tier: u.tier,
    foundersGrantedAt: u.foundersGrantedAt,
    stripeSubscriptionId: u.stripeSubscriptionId,
    subscriptionEventAt: u.subscriptionEventAt,
  });
  const byId = (id: string) => {
    const u = users.find((x) => x.userId === id);
    if (!u) throw new Error(`fake: no user ${id}`);
    return u;
  };
  const write = (fn: string) => {
    if (opts.failWrites) throw new Error(`fake: ${fn} backend down`);
  };
  // claimEvent and applySubscription are synchronous inside, like the row-locked
  // SQL functions they stand in for: no other delivery can run in between.
  const deps: Partial<StripeWebhookDeps> = {
    claimEvent: async (id) => {
      if (processed.has(id)) return "processed";
      if (claims.has(id)) return "in_flight";
      claims.add(id);
      return "claimed";
    },
    recordEventProcessed: async (id, type) => {
      calls.push({ fn: "recordEventProcessed", args: [id, type] });
      processed.add(id);
      claims.delete(id);
    },
    releaseEvent: async (id) => {
      claims.delete(id);
    },
    findUserByCustomerId: async (customerId) => {
      const u = users.find((x) => x.customerId === customerId);
      const snapshot = u ? view(u) : null;
      await pause();
      return snapshot;
    },
    findUserByRef: async (ref) => {
      const u =
        (ref.userId && users.find((x) => x.userId === ref.userId)) ||
        (ref.email && users.find((x) => x.email === ref.email)) ||
        undefined;
      return u ? view(u) : null;
    },
    linkCustomer: async (userId, customerId) => {
      calls.push({ fn: "linkCustomer", args: [userId, customerId] });
      write("linkCustomer");
      byId(userId).customerId = customerId;
    },
    applySubscription: async (userId, patch) => {
      calls.push({ fn: "applySubscription", args: [userId, patch] });
      write("applySubscription");
      const u = byId(userId);
      const result = subscriptionEventApplies(
        { subscriptionId: u.stripeSubscriptionId, status: u.subscriptionStatus, eventAt: u.subscriptionEventAt },
        patch
      );
      if (result !== "applied") return { result, tier: u.tier };
      const tier = tierAfterSubscription(u, patch.entitled);
      if (tier) u.tier = tier;
      u.stripeSubscriptionId = patch.subscriptionId;
      u.subscriptionStatus = patch.status;
      u.subscriptionEventAt = patch.eventAt;
      return { result, tier: u.tier };
    },
    grantFounders: async (userId, grantedAt) => {
      calls.push({ fn: "grantFounders", args: [userId, grantedAt] });
      write("grantFounders");
      const u = byId(userId);
      u.tier = "founders";
      u.foundersGrantedAt = grantedAt;
    },
  };
  return { calls, users, processed, claims, deps };
}

let fakes: ReturnType<typeof makeFakes>;
let app: ReturnType<typeof createStripeWebhookApp>;

function useFakes(users: FakeUser[] = [], opts: FakeOpts = {}) {
  fakes = makeFakes(users, opts);
  app = createStripeWebhookApp(fakes.deps);
  return fakes;
}

function post(target: ReturnType<typeof createStripeWebhookApp>, body: string, headers: Record<string, string>) {
  return target.fetch(new Request("http://test/", { method: "POST", headers, body }));
}

let eventSeq = 0;
function eventPayload(
  type: string,
  object: Record<string, unknown>,
  opts: { id?: string; created?: number } = {}
): string {
  return JSON.stringify({
    id: opts.id ?? `evt_test_${++eventSeq}`,
    object: "event",
    api_version: "2025-01-01",
    created: opts.created ?? Math.floor(Date.now() / 1000),
    type,
    data: { object },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  });
}

function send(type: string, object: Record<string, unknown>, opts: { id?: string; created?: number } = {}) {
  const payload = eventPayload(type, object, opts);
  return post(app, payload, signedHeaders(payload));
}

function proSub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    object: "subscription",
    customer: "cus_123",
    status: "active",
    items: { data: [{ price: { id: PRICE_PRO_MONTHLY } }] },
    ...overrides,
  };
}

function foundersCheckout(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_1",
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    customer: "cus_new",
    client_reference_id: USER_ID,
    customer_details: { email: "buyer@example.com" },
    metadata: { ccc_price_id: PRICE_FOUNDERS },
    ...overrides,
  };
}

beforeEach(() => {
  process.env.CCC_STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  useFakes();
});

// ─── Signature validation ──────────────────────────────────────────────────
describe("stripe webhook signature validation", () => {
  it("rejects a missing stripe-signature header with 400", async () => {
    const res = await post(app, eventPayload("customer.subscription.created", {}), {
      "content-type": "application/json",
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.match(body.error, /signature/i);
    assert.equal(fakes.calls.length, 0);
  });

  it("rejects an invalid signature with 400", async () => {
    const res = await post(app, eventPayload("customer.subscription.created", {}), {
      "stripe-signature": "t=123,v1=deadbeef",
      "content-type": "application/json",
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "Invalid signature");
    assert.equal(fakes.calls.length, 0);
  });

  it("rejects a signature computed with the WRONG secret", async () => {
    const payload = eventPayload("customer.subscription.created", {});
    const wrongSig = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_completely_different_secret",
    });
    const res = await post(app, payload, {
      "stripe-signature": wrongSig,
      "content-type": "application/json",
    });
    assert.equal(res.status, 400);
    assert.equal(fakes.calls.length, 0);
  });

  it("rejects a validly-signed but tampered payload", async () => {
    const payload = eventPayload("customer.subscription.created", {}, { id: "evt_test_1" });
    const headers = signedHeaders(payload);
    const tampered = payload.replace("evt_test_1", "evt_evil_1");
    const res = await post(app, tampered, headers);
    assert.equal(res.status, 400);
    assert.equal(fakes.calls.length, 0);
  });

  it("returns 503 when CCC_STRIPE_WEBHOOK_SECRET is unset (dark/unconfigured)", async () => {
    delete process.env.CCC_STRIPE_WEBHOOK_SECRET;
    const res = await post(app, "{}", { "content-type": "application/json" });
    assert.equal(res.status, 503);
    const body = (await res.json()) as { error: string };
    assert.match(body.error, /not configured/i);
  });
});

// ─── Tier flips ────────────────────────────────────────────────────────────
describe("stripe webhook tier flips", () => {
  it("subscription.created with the pro monthly price flips a linked user to pro", async () => {
    const { users } = useFakes([makeUser({ customerId: "cus_123" })]);
    const res = await send("customer.subscription.created", proSub());
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "pro");
    assert.equal(users[0].stripeSubscriptionId, "sub_1");
    assert.equal(users[0].subscriptionStatus, "active");
  });

  it("subscription.created with the pro yearly price flips tier to pro", async () => {
    const { users } = useFakes([makeUser({ customerId: "cus_456" })]);
    const res = await send(
      "customer.subscription.created",
      proSub({ id: "sub_2", customer: "cus_456", items: { data: [{ price: { id: PRICE_PRO_YEARLY } }] } })
    );
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "pro");
  });

  it("subscription.created with an UNKNOWN price does NOT flip the tier", async () => {
    const { users, calls } = useFakes([makeUser({ customerId: "cus_789" })]);
    const res = await send(
      "customer.subscription.created",
      proSub({ customer: "cus_789", items: { data: [{ price: { id: "price_someone_elses_product" } }] } })
    );
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "free");
    assert.deepEqual(calls.map((c) => c.fn), ["recordEventProcessed"]);
  });

  it("subscription.created with an incomplete status does not grant pro", async () => {
    const { users } = useFakes([makeUser({ customerId: "cus_123" })]);
    const res = await send("customer.subscription.created", proSub({ status: "incomplete" }));
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "free");
  });

  it("subscription.updated to active grants pro; to unpaid revokes it", async () => {
    const { users } = useFakes([makeUser({ customerId: "cus_123" })]);
    const t0 = Math.floor(Date.now() / 1000);
    assert.equal((await send("customer.subscription.updated", proSub(), { created: t0 })).status, 200);
    assert.equal(users[0].tier, "pro");
    const unpaid = await send("customer.subscription.updated", proSub({ status: "unpaid" }), { created: t0 + 60 });
    assert.equal(unpaid.status, 200);
    assert.equal(users[0].tier, "free");
  });

  it("subscription.deleted flips a pro customer back to free", async () => {
    const { users } = useFakes([
      makeUser({ customerId: "cus_123", tier: "pro", stripeSubscriptionId: "sub_1" }),
    ]);
    const res = await send("customer.subscription.deleted", proSub({ status: "canceled" }));
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "free");
  });

  it("subscription.deleted for a superseded subscription keeps the current plan", async () => {
    const { users } = useFakes([
      makeUser({ customerId: "cus_123", tier: "pro", stripeSubscriptionId: "sub_new" }),
    ]);
    const res = await send("customer.subscription.deleted", proSub({ id: "sub_old", status: "canceled" }));
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "pro");
  });

  it("checkout in subscription mode links the customer; subscription.created then grants pro", async () => {
    const { users } = useFakes([makeUser()]);
    const res = await send("checkout.session.completed", {
      id: "cs_2",
      object: "checkout.session",
      mode: "subscription",
      payment_status: "paid",
      customer: "cus_123",
      client_reference_id: USER_ID,
      customer_details: { email: "buyer@example.com" },
    });
    assert.equal(res.status, 200);
    assert.equal(users[0].customerId, "cus_123");
    assert.equal(users[0].tier, "free", "the flip is left to the subscription event");
    assert.equal((await send("customer.subscription.created", proSub())).status, 200);
    assert.equal(users[0].tier, "pro");
  });

  it("checkout links by checkout email when client_reference_id is absent", async () => {
    const { users } = useFakes([makeUser()]);
    const res = await send("checkout.session.completed", {
      id: "cs_3",
      object: "checkout.session",
      mode: "subscription",
      customer: "cus_mail",
      customer_details: { email: "buyer@example.com" },
    });
    assert.equal(res.status, 200);
    assert.equal(users[0].customerId, "cus_mail");
  });

  it("unhandled event types are acknowledged with 200 and no entitlement writes", async () => {
    const res = await send("invoice.paid", { id: "in_1", object: "invoice" });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { received: boolean };
    assert.equal(body.received, true);
    assert.deepEqual(fakes.calls.map((c) => c.fn), ["recordEventProcessed"]);
  });
});

// ─── Ordering + failure handling (Codex audit #06) ─────────────────────────
describe("stripe webhook ordering and failures", () => {
  it("subscription.created BEFORE the customer is linked answers non-2xx, then succeeds on retry", async () => {
    const { users, processed } = useFakes([makeUser()]);
    const subPayload = eventPayload("customer.subscription.created", proSub(), { id: "evt_sub_early" });

    const early = await post(app, subPayload, signedHeaders(subPayload));
    assert.equal(early.status, 409, "Stripe must retry an unlinked subscription");
    assert.equal(users[0].tier, "free");
    assert.equal(processed.has("evt_sub_early"), false, "a failed event is not recorded");

    const link = await send("checkout.session.completed", {
      id: "cs_4",
      object: "checkout.session",
      mode: "subscription",
      customer: "cus_123",
      client_reference_id: USER_ID,
    });
    assert.equal(link.status, 200);

    const retry = await post(app, subPayload, signedHeaders(subPayload));
    assert.equal(retry.status, 200);
    assert.equal(users[0].tier, "pro");
    assert.equal(processed.has("evt_sub_early"), true);
  });

  it("a subscription-mode checkout with no matching user answers non-2xx", async () => {
    useFakes([]);
    const res = await send("checkout.session.completed", {
      id: "cs_5",
      object: "checkout.session",
      mode: "subscription",
      customer: "cus_nobody",
      customer_details: { email: "nobody@example.com" },
    });
    assert.equal(res.status, 409);
  });

  it("a database failure answers 500 and leaves the event unrecorded", async () => {
    const { processed } = useFakes([makeUser({ customerId: "cus_123" })], { failWrites: true });
    const res = await send("customer.subscription.created", proSub(), { id: "evt_db_down" });
    assert.equal(res.status, 500);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "Webhook handler error", "internals are not leaked");
    assert.equal(processed.has("evt_db_down"), false);
  });

  it("a founders grant that fails to write answers 500, not 200", async () => {
    useFakes([makeUser()], { failWrites: true });
    const res = await send("checkout.session.completed", foundersCheckout({ customer: null }));
    assert.equal(res.status, 500);
  });

  it("a failing event-store write answers 500 so Stripe redelivers", async () => {
    useFakes([makeUser({ customerId: "cus_123" })]);
    app = createStripeWebhookApp({
      ...fakes.deps,
      recordEventProcessed: async () => {
        throw new Error("fake: stripe_events down");
      },
    });
    const res = await send("customer.subscription.created", proSub());
    assert.equal(res.status, 500);
  });

  it("a redelivered event that already succeeded is acknowledged without side effects", async () => {
    const { calls } = useFakes([makeUser({ customerId: "cus_123" })]);
    const payload = eventPayload("customer.subscription.created", proSub(), { id: "evt_dup" });
    assert.equal((await post(app, payload, signedHeaders(payload))).status, 200);
    const writes = calls.length;
    const again = await post(app, payload, signedHeaders(payload));
    assert.equal(again.status, 200);
    assert.deepEqual(await again.json(), { received: true, duplicate: true });
    assert.equal(calls.length, writes, "no second write");
  });

  it("a stale subscription event cannot resurrect a cancelled plan", async () => {
    const { users } = useFakes([makeUser({ customerId: "cus_123" })]);
    const t0 = Math.floor(Date.now() / 1000);
    const deleted = await send("customer.subscription.deleted", proSub({ status: "canceled" }), { created: t0 });
    assert.equal(deleted.status, 200);
    // The earlier created event is redelivered after the deletion.
    const late = await send("customer.subscription.created", proSub(), { created: t0 - 3600 });
    assert.equal(late.status, 200);
    assert.equal(users[0].tier, "free");
  });

  it("a paid founders checkout with no matching user answers non-2xx", async () => {
    const { processed } = useFakes([]);
    const res = await send("checkout.session.completed", foundersCheckout(), { id: "evt_orphan" });
    assert.equal(res.status, 409);
    assert.equal(processed.has("evt_orphan"), false);
  });
});

// ─── Concurrent deliveries (Codex audit #06) ───────────────────────────────
describe("stripe webhook concurrent deliveries", () => {
  it("two concurrent deliveries of the same event apply it once", async () => {
    const { users, calls, processed, claims } = useFakes([makeUser({ customerId: "cus_123" })], {
      readDelaysMs: [20, 20],
    });
    const payload = eventPayload("customer.subscription.created", proSub(), { id: "evt_twice" });
    const [a, b] = await Promise.all([
      post(app, payload, signedHeaders(payload)),
      post(app, payload, signedHeaders(payload)),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409], "one applies, the other is told to retry");
    assert.equal(calls.filter((c) => c.fn === "applySubscription").length, 1, "applied exactly once");
    assert.equal(users[0].tier, "pro");
    assert.ok(processed.has("evt_twice"));
    assert.equal(claims.size, 0, "the claim is dropped once recorded");
    const retry = await post(app, payload, signedHeaders(payload));
    assert.deepEqual(await retry.json(), { received: true, duplicate: true });
  });

  it("a failed attempt releases its claim so the redelivery runs", async () => {
    const { users, claims } = useFakes([makeUser({ customerId: "cus_123" })], { failWrites: true });
    const payload = eventPayload("customer.subscription.created", proSub(), { id: "evt_retry" });
    assert.equal((await post(app, payload, signedHeaders(payload))).status, 500);
    assert.equal(claims.size, 0, "claim released after the failure");
    app = createStripeWebhookApp({ ...makeFakes(users).deps });
    const again = await post(app, payload, signedHeaders(payload));
    assert.equal(again.status, 200);
    assert.equal(users[0].tier, "pro");
  });

  it("an older activation racing a newer cancellation cannot land last", async () => {
    // Both deliveries read the user before either writes; the older one writes last.
    const { users } = useFakes([makeUser({ customerId: "cus_123", tier: "pro", stripeSubscriptionId: "sub_1" })], {
      readDelaysMs: [30, 5],
    });
    const t0 = Math.floor(Date.now() / 1000);
    const [older, newer] = await Promise.all([
      send("customer.subscription.updated", proSub({ status: "active" }), { created: t0 }),
      send("customer.subscription.deleted", proSub({ status: "canceled" }), { created: t0 + 10 }),
    ]);
    assert.equal(newer.status, 200);
    assert.equal(older.status, 200);
    assert.deepEqual(await older.json(), { received: true, action: "ignored_stale" });
    assert.equal(users[0].tier, "free", "the cancellation stands");
    assert.equal(users[0].subscriptionStatus, "canceled");
  });

  it("a same-second activation cannot undo a cancellation of the same subscription", async () => {
    const { users } = useFakes([makeUser({ customerId: "cus_123", tier: "pro", stripeSubscriptionId: "sub_1" })]);
    const t0 = Math.floor(Date.now() / 1000);
    assert.equal((await send("customer.subscription.deleted", proSub({ status: "canceled" }), { created: t0 })).status, 200);
    assert.equal((await send("customer.subscription.updated", proSub({ status: "active" }), { created: t0 })).status, 200);
    assert.equal(users[0].tier, "free");
  });

  it("subscriptionEventApplies orders by time, then by status rank within one second", () => {
    const at = "2026-11-01T00:00:10.000Z";
    const cur = { subscriptionId: "sub_1", status: "canceled", eventAt: at };
    assert.equal(subscriptionEventApplies(cur, { subscriptionId: "sub_1", status: "active", eventAt: "2026-11-01T00:00:05.000Z", isDelete: false }), "stale");
    assert.equal(subscriptionEventApplies(cur, { subscriptionId: "sub_1", status: "active", eventAt: at, isDelete: false }), "stale");
    assert.equal(subscriptionEventApplies(cur, { subscriptionId: "sub_2", status: "active", eventAt: at, isDelete: false }), "applied");
    assert.equal(subscriptionEventApplies(cur, { subscriptionId: "sub_1", status: "active", eventAt: "2026-11-01T00:00:11.000Z", isDelete: false }), "applied");
    assert.equal(subscriptionEventApplies({ ...cur, status: "active", subscriptionId: "sub_2" }, { subscriptionId: "sub_1", status: "canceled", eventAt: "2026-11-01T00:00:20.000Z", isDelete: true }), "superseded");
    assert.equal(subscriptionEventApplies({ subscriptionId: null, status: null, eventAt: null }, { subscriptionId: "sub_1", status: "active", eventAt: at, isDelete: false }), "applied");
  });
});

// ─── Founders (lifetime) preservation ──────────────────────────────────────
describe("stripe webhook founders", () => {
  it("a settled founders checkout grants founders and links the customer", async () => {
    const { users } = useFakes([makeUser()]);
    const res = await send("checkout.session.completed", foundersCheckout());
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "founders");
    assert.equal(users[0].customerId, "cus_new");
    assert.ok(users[0].foundersGrantedAt, "the lifetime grant is recorded independently");
  });

  it("an UNPAID founders checkout grants nothing until async_payment_succeeded", async () => {
    const { users } = useFakes([makeUser()]);
    const pending = await send("checkout.session.completed", foundersCheckout({ payment_status: "unpaid" }));
    assert.equal(pending.status, 200);
    assert.equal(users[0].tier, "free");
    const settled = await send("checkout.session.async_payment_succeeded", foundersCheckout());
    assert.equal(settled.status, 200);
    assert.equal(users[0].tier, "founders");
  });

  it("founders metadata on a subscription-mode checkout does not grant founders", async () => {
    const { users } = useFakes([makeUser()]);
    const res = await send("checkout.session.completed", foundersCheckout({ mode: "subscription" }));
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "free");
  });

  it("subscription.created NEVER overwrites a founders tier", async () => {
    const { users } = useFakes([
      makeUser({ customerId: "cus_123", tier: "founders", foundersGrantedAt: "2026-01-01T00:00:00.000Z" }),
    ]);
    const res = await send("customer.subscription.created", proSub());
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "founders");
    assert.equal(users[0].stripeSubscriptionId, "sub_1", "subscription state is still tracked");
  });

  it("subscription.deleted NEVER downgrades a founders (lifetime) customer", async () => {
    const { users } = useFakes([
      makeUser({ customerId: "cus_founder", tier: "founders", stripeSubscriptionId: "sub_9" }),
    ]);
    const res = await send(
      "customer.subscription.deleted",
      proSub({ id: "sub_9", customer: "cus_founder", status: "canceled" })
    );
    assert.equal(res.status, 200);
    assert.equal(users[0].tier, "founders");
  });

  it("a pro subscriber who buys founders stays founders after cancelling pro", async () => {
    const { users } = useFakes([makeUser({ customerId: "cus_123" })]);
    const t0 = Math.floor(Date.now() / 1000);
    await send("customer.subscription.created", proSub(), { created: t0 });
    assert.equal(users[0].tier, "pro");
    await send("checkout.session.completed", foundersCheckout({ customer: "cus_123" }), { created: t0 + 10 });
    assert.equal(users[0].tier, "founders");
    await send("customer.subscription.deleted", proSub({ status: "canceled" }), { created: t0 + 20 });
    assert.equal(users[0].tier, "founders");
  });

  it("a redelivered founders checkout keeps the original grant time", async () => {
    const { users } = useFakes([
      makeUser({ customerId: "cus_new", tier: "founders", foundersGrantedAt: "2026-01-01T00:00:00.000Z" }),
    ]);
    const res = await send("checkout.session.completed", foundersCheckout());
    assert.equal(res.status, 200);
    assert.equal(users[0].foundersGrantedAt, "2026-01-01T00:00:00.000Z");
  });

  it("tierAfterSubscription leaves a lifetime grant alone", () => {
    assert.equal(tierAfterSubscription({ tier: "pro", foundersGrantedAt: "2026-01-01T00:00:00Z" }, false), null);
    assert.equal(tierAfterSubscription({ tier: "founders", foundersGrantedAt: null }, true), null);
    assert.equal(tierAfterSubscription({ tier: "free", foundersGrantedAt: null }, true), "pro");
    assert.equal(tierAfterSubscription({ tier: "pro", foundersGrantedAt: null }, false), "free");
  });
});
