/**
 * Stripe webhook tests — signature validation + tier-flip event handling.
 *
 * Run:  node --import tsx --test tests/stripe-webhook.test.ts
 *
 * Signatures are generated with the real `stripe` package
 * (generateTestHeaderString), so the valid-signature path exercises the
 * SDK's actual constructEvent verification — no mocked crypto.
 * DB writes are faked via the injectable deps on createStripeWebhookApp.
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

const { createStripeWebhookApp } = await import("../src/routes/stripe-webhook.js");
import type { AccountTier } from "../src/lib/paywall.js";

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

// ─── Fake DB deps recorder ─────────────────────────────────────────────────
type Call = { fn: string; args: unknown[] };

function makeFakes(currentTier: AccountTier | null = "free") {
  const calls: Call[] = [];
  return {
    calls,
    deps: {
      setTierByCustomerId: async (customerId: string, tier: AccountTier) => {
        calls.push({ fn: "setTierByCustomerId", args: [customerId, tier] });
        return true;
      },
      getTierByCustomerId: async (customerId: string) => {
        calls.push({ fn: "getTierByCustomerId", args: [customerId] });
        return currentTier;
      },
      setTierByUserRef: async (ref: { userId?: string; email?: string }, tier: AccountTier) => {
        calls.push({ fn: "setTierByUserRef", args: [ref, tier] });
        return true;
      },
      linkCustomer: async (ref: { userId?: string; email?: string }, customerId: string) => {
        calls.push({ fn: "linkCustomer", args: [ref, customerId] });
        return true;
      },
    },
  };
}

function post(app: ReturnType<typeof createStripeWebhookApp>, body: string, headers: Record<string, string>) {
  return app.fetch(new Request("http://test/", { method: "POST", headers, body }));
}

function eventPayload(type: string, object: Record<string, unknown>): string {
  return JSON.stringify({
    id: "evt_test_1",
    object: "event",
    api_version: "2025-01-01",
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  });
}

let fakes: ReturnType<typeof makeFakes>;
let app: ReturnType<typeof createStripeWebhookApp>;

beforeEach(() => {
  process.env.CCC_STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  fakes = makeFakes();
  app = createStripeWebhookApp(fakes.deps);
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
    const payload = eventPayload("customer.subscription.created", {});
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
  it("subscription.created with the pro monthly price flips tier to pro", async () => {
    const payload = eventPayload("customer.subscription.created", {
      id: "sub_1",
      object: "subscription",
      customer: "cus_123",
      items: { data: [{ price: { id: PRICE_PRO_MONTHLY } }] },
    });
    const res = await post(app, payload, signedHeaders(payload));
    assert.equal(res.status, 200);
    assert.deepEqual(fakes.calls, [
      { fn: "setTierByCustomerId", args: ["cus_123", "pro"] },
    ]);
  });

  it("subscription.created with the pro yearly price flips tier to pro", async () => {
    const payload = eventPayload("customer.subscription.created", {
      id: "sub_2",
      object: "subscription",
      customer: "cus_456",
      items: { data: [{ price: { id: PRICE_PRO_YEARLY } }] },
    });
    const res = await post(app, payload, signedHeaders(payload));
    assert.equal(res.status, 200);
    assert.deepEqual(fakes.calls, [
      { fn: "setTierByCustomerId", args: ["cus_456", "pro"] },
    ]);
  });

  it("subscription.created with an UNKNOWN price does NOT flip the tier", async () => {
    const payload = eventPayload("customer.subscription.created", {
      id: "sub_3",
      object: "subscription",
      customer: "cus_789",
      items: { data: [{ price: { id: "price_someone_elses_product" } }] },
    });
    const res = await post(app, payload, signedHeaders(payload));
    assert.equal(res.status, 200);
    assert.equal(fakes.calls.length, 0);
  });

  it("subscription.deleted flips a pro customer back to free", async () => {
    const payload = eventPayload("customer.subscription.deleted", {
      id: "sub_1",
      object: "subscription",
      customer: "cus_123",
      items: { data: [{ price: { id: PRICE_PRO_MONTHLY } }] },
    });
    const res = await post(app, payload, signedHeaders(payload));
    assert.equal(res.status, 200);
    assert.deepEqual(fakes.calls, [
      { fn: "getTierByCustomerId", args: ["cus_123"] },
      { fn: "setTierByCustomerId", args: ["cus_123", "free"] },
    ]);
  });

  it("subscription.deleted NEVER downgrades a founders (lifetime) customer", async () => {
    fakes = makeFakes("founders");
    app = createStripeWebhookApp(fakes.deps);
    const payload = eventPayload("customer.subscription.deleted", {
      id: "sub_9",
      object: "subscription",
      customer: "cus_founder",
    });
    const res = await post(app, payload, signedHeaders(payload));
    assert.equal(res.status, 200);
    assert.deepEqual(fakes.calls, [{ fn: "getTierByCustomerId", args: ["cus_founder"] }]);
  });

  it("checkout.session.completed (payment mode, founders metadata) grants founders + links customer", async () => {
    const payload = eventPayload("checkout.session.completed", {
      id: "cs_1",
      object: "checkout.session",
      mode: "payment",
      customer: "cus_new",
      client_reference_id: "8a68e2f2-0000-4000-8000-000000000001",
      customer_details: { email: "founder@example.com" },
      metadata: { ccc_price_id: PRICE_FOUNDERS },
    });
    const res = await post(app, payload, signedHeaders(payload));
    assert.equal(res.status, 200);
    assert.deepEqual(fakes.calls, [
      {
        fn: "linkCustomer",
        args: [
          { userId: "8a68e2f2-0000-4000-8000-000000000001", email: "founder@example.com" },
          "cus_new",
        ],
      },
      { fn: "setTierByCustomerId", args: ["cus_new", "founders"] },
    ]);
  });

  it("checkout.session.completed in subscription mode links the customer but leaves the flip to subscription.created", async () => {
    const payload = eventPayload("checkout.session.completed", {
      id: "cs_2",
      object: "checkout.session",
      mode: "subscription",
      customer: "cus_sub",
      client_reference_id: "8a68e2f2-0000-4000-8000-000000000002",
      customer_details: { email: "pro@example.com" },
    });
    const res = await post(app, payload, signedHeaders(payload));
    assert.equal(res.status, 200);
    assert.deepEqual(fakes.calls, [
      {
        fn: "linkCustomer",
        args: [
          { userId: "8a68e2f2-0000-4000-8000-000000000002", email: "pro@example.com" },
          "cus_sub",
        ],
      },
    ]);
  });

  it("unhandled event types are acknowledged with 200 and no DB writes", async () => {
    const payload = eventPayload("invoice.paid", { id: "in_1", object: "invoice" });
    const res = await post(app, payload, signedHeaders(payload));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { received: boolean };
    assert.equal(body.received, true);
    assert.equal(fakes.calls.length, 0);
  });
});
