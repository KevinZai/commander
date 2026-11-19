// Stripe webhook — paywall plumbing (revenue-opp-2026-07-10 §3+§6).
//
// POST /webhooks/stripe. Signature-verified via the official `stripe` package
// (constructEvent). Requires migrations 002 + 003 (see PAYWALL.md).
//
// Processing contract:
//   1. Every verified event is recorded in stripe_events BEFORE any user write.
//      A redelivery of an event whose processed_at is set returns 200 and does
//      nothing. A row without processed_at (an earlier attempt failed) is
//      processed again; every write below is safe to repeat.
//   2. Users are resolved by client_reference_id / metadata.ccc_user_id
//      (users.user_id), stripe_subscription_id, or stripe_customer_id — never
//      by email.
//   3. Subscription events older than users.subscription_event_created are
//      ignored, so out-of-order delivery cannot resurrect or cancel a plan.
//   4. tier = 'founders' when lifetime_tier is set, else 'pro' while the
//      subscription is active, else 'free'. Founders is granted only for a
//      payment-mode checkout whose payment_status is 'paid'.
//   5. Any read or write failure answers 500 (Stripe retries). 200 is sent
//      only after processed_at is written.
//
// INERT until CCC_STRIPE_WEBHOOK_SECRET is set (returns 503). Price IDs come
// from env — no Stripe products are created by this code. Config is read from
// process.env at request time (testability + parity with lib/paywall.ts).

import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "../db/client.js";
import { logger } from "../lib/logger.js";
import type { AccountTier } from "../lib/paywall.js";

// ─── Env (read at call time — see PAYWALL.md) ──────────────────────────────
function webhookSecret(): string {
  return process.env.CCC_STRIPE_WEBHOOK_SECRET ?? "";
}
function proPriceIds(): string[] {
  return [
    process.env.CCC_STRIPE_PRICE_PRO_MONTHLY ?? "",
    process.env.CCC_STRIPE_PRICE_PRO_YEARLY ?? "",
  ].filter(Boolean);
}
function foundersPriceId(): string {
  return process.env.CCC_STRIPE_PRICE_FOUNDERS ?? "";
}

// ─── Billing state ──────────────────────────────────────────────────────────
export type BillingUser = {
  user_id: string;
  tier: string | null;
  lifetime_tier: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_event_created: string | null;
  founders_payment_intent: string | null;
};

export type BillingPatch = Partial<Omit<BillingUser, "user_id">>;

export type UserRef = {
  userId?: string;
  subscriptionId?: string;
  customerId?: string;
};

export type ClaimResult = "new" | "pending" | "processed";

/** Persistence used by the webhook. Every method throws on a backend error. */
export type StripeWebhookStore = {
  /** Record the event. "processed" means an earlier delivery finished. */
  claimEvent(event: { id: string; type: string; createdAt: string }): Promise<ClaimResult>;
  /** Write processed_at + outcome. */
  markProcessed(eventId: string, outcome: string): Promise<void>;
  /** Resolve by userId, then subscriptionId, then customerId. Never by email. */
  findUser(ref: UserRef): Promise<BillingUser | null>;
  /**
   * Apply a patch to one user. With `notOlderThan`, the patch applies only
   * when subscription_event_created is null or <= that instant. Returns false
   * when no row changed.
   */
  updateUser(userId: string, patch: BillingPatch, notOlderThan?: string): Promise<boolean>;
};

export type StripeWebhookDeps = {
  /** Verify signature + parse. MUST throw on an invalid signature. */
  constructEvent: (payload: string, signature: string, secret: string) => Stripe.Event;
  store: StripeWebhookStore;
};

/** Thrown when the event cannot be applied yet; Stripe redelivers it. */
class RetryLaterError extends Error {}

/** Subscription statuses that keep Pro access (past_due = Stripe dunning). */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isActiveSubscription(status: string | null | undefined): boolean {
  return Boolean(status && ACTIVE_SUBSCRIPTION_STATUSES.has(status));
}

export function computeTier(lifetimeTier: string | null | undefined, subscriptionStatus: string | null | undefined): AccountTier {
  if (lifetimeTier === "founders") return "founders";
  return isActiveSubscription(subscriptionStatus) ? "pro" : "free";
}

// ─── Supabase-backed store ──────────────────────────────────────────────────
const BILLING_COLUMNS =
  "user_id, tier, lifetime_tier, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_event_created, founders_payment_intent";

type DbError = { code?: string; message?: string } | null;

function dbFailure(what: string, error: DbError): Error {
  return new Error(`${what} failed${error?.code ? ` (${error.code})` : ""}`);
}

export function supabaseStripeStore(): StripeWebhookStore {
  return {
    async claimEvent(event) {
      const { error } = await db
        .from("stripe_events")
        .insert({ event_id: event.id, type: event.type, event_created: event.createdAt });
      if (!error) return "new";
      if (error.code !== "23505") throw dbFailure("stripe_events insert", error);
      const { data, error: readError } = await db
        .from("stripe_events")
        .select("processed_at")
        .eq("event_id", event.id)
        .maybeSingle();
      if (readError) throw dbFailure("stripe_events read", readError);
      return data?.processed_at ? "processed" : "pending";
    },

    async markProcessed(eventId, outcome) {
      const { data, error } = await db
        .from("stripe_events")
        .update({ processed_at: new Date().toISOString(), outcome })
        .eq("event_id", eventId)
        .select("event_id");
      if (error) throw dbFailure("stripe_events update", error);
      if ((data?.length ?? 0) === 0) throw new Error("stripe_events row missing at markProcessed");
    },

    async findUser(ref) {
      const lookups: Array<[string, string | undefined]> = [
        ["user_id", ref.userId],
        ["stripe_subscription_id", ref.subscriptionId],
        ["stripe_customer_id", ref.customerId],
      ];
      for (const [column, value] of lookups) {
        if (!value) continue;
        const { data, error } = await db
          .from("users")
          .select(BILLING_COLUMNS)
          .eq(column, value)
          .maybeSingle();
        // A client_reference_id that is not a valid user_id for this schema
        // (uuid vs text) is "not found", not a backend failure.
        if (error && column === "user_id" && error.code === "22P02") continue;
        if (error) throw dbFailure(`users lookup by ${column}`, error);
        if (data) return data as unknown as BillingUser;
      }
      return null;
    },

    async updateUser(userId, patch, notOlderThan) {
      let query = db.from("users").update(patch).eq("user_id", userId);
      if (notOlderThan) {
        query = query.or(
          `subscription_event_created.is.null,subscription_event_created.lte."${notOlderThan}"`
        );
      }
      const { data, error } = await query.select("user_id");
      if (error) throw dbFailure("users update", error);
      return (data?.length ?? 0) > 0;
    },
  };
}

// API key is NOT required for webhook signature verification; the placeholder
// satisfies the SDK constructor. Set CCC_STRIPE_API_KEY only if a future
// change needs real Stripe API calls (e.g. expanding line items).
function stripeClient(): Stripe {
  return new Stripe(process.env.CCC_STRIPE_API_KEY || "sk_test_placeholder_webhook_verify_only");
}

function defaultDeps(): StripeWebhookDeps {
  return {
    constructEvent: (payload, signature, secret) =>
      stripeClient().webhooks.constructEvent(payload, signature, secret),
    store: supabaseStripeStore(),
  };
}

// ─── Event helpers ──────────────────────────────────────────────────────────
const USER_REF_RE = /^[A-Za-z0-9_-]{1,128}$/;

function cleanUserRef(value: unknown): string | undefined {
  return typeof value === "string" && USER_REF_RE.test(value.trim()) ? value.trim() : undefined;
}

function idOf(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return undefined;
}

function subscriptionPriceIds(sub: Stripe.Subscription): string[] {
  return (sub.items?.data ?? [])
    .map((item) => item.price?.id)
    .filter((id): id is string => Boolean(id));
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  store: StripeWebhookStore
): Promise<string> {
  const customerId = idOf(session.customer);
  const subscriptionId = session.mode === "subscription" ? idOf(session.subscription) : undefined;
  const userId = cleanUserRef(session.client_reference_id) ?? cleanUserRef(session.metadata?.ccc_user_id);

  const user = await store.findUser({ userId, subscriptionId, customerId });
  if (!user) {
    // Permanent: retrying will not create the account. stripe_events keeps
    // the event id for manual reconciliation (outcome = 'unmatched').
    logger.error({ sessionId: session.id, customerId }, "Stripe checkout not linked to any user");
    return "unmatched";
  }

  const patch: BillingPatch = {};
  if (customerId) {
    if (!user.stripe_customer_id) patch.stripe_customer_id = customerId;
    else if (user.stripe_customer_id !== customerId) {
      logger.warn({ userId: user.user_id, customerId }, "Checkout customer differs from the linked customer; link kept");
    }
  }
  if (subscriptionId && !user.stripe_subscription_id) patch.stripe_subscription_id = subscriptionId;

  let outcome = "linked";
  const founders = foundersPriceId();
  const isFounders =
    session.mode === "payment" &&
    founders !== "" &&
    (session.metadata?.ccc_price_id === founders || session.metadata?.ccc_tier === "founders");

  if (isFounders) {
    const paymentIntent = idOf(session.payment_intent);
    if (session.payment_status !== "paid") {
      // Delayed payment methods settle later via async_payment_succeeded.
      outcome = "founders_unpaid";
    } else if (user.lifetime_tier === "founders") {
      outcome = "founders_already";
    } else if (!paymentIntent) {
      logger.error({ sessionId: session.id }, "Paid Founders checkout without a payment_intent; not granted");
      outcome = "founders_missing_payment_intent";
    } else {
      patch.lifetime_tier = "founders";
      patch.founders_payment_intent = paymentIntent;
      patch.tier = "founders";
      outcome = "founders_granted";
    }
  }

  if (Object.keys(patch).length > 0) {
    const changed = await store.updateUser(user.user_id, patch);
    if (!changed) throw new Error("users row vanished during checkout reconciliation");
  }
  if (outcome === "founders_granted") {
    logger.info({ userId: user.user_id }, "Founders tier granted");
  }
  return outcome;
}

async function handleSubscriptionEvent(
  event: Stripe.Event,
  sub: Stripe.Subscription,
  eventCreatedAt: string,
  store: StripeWebhookStore
): Promise<string> {
  const isPro = subscriptionPriceIds(sub).some((id) => proPriceIds().includes(id));
  if (!isPro) return "ignored_price";

  const customerId = idOf(sub.customer);
  const user = await store.findUser({
    userId: cleanUserRef(sub.metadata?.ccc_user_id),
    subscriptionId: sub.id,
    customerId,
  });
  if (!user) {
    // Usually checkout.session.completed has not linked the customer yet.
    throw new RetryLaterError("subscription customer not linked yet");
  }

  const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;

  if (
    user.stripe_subscription_id &&
    user.stripe_subscription_id !== sub.id &&
    isActiveSubscription(user.subscription_status) &&
    !isActiveSubscription(status)
  ) {
    // An older subscription ending must not cancel the current one.
    return "ignored_other_subscription";
  }

  const patch: BillingPatch = {
    stripe_subscription_id: sub.id,
    subscription_status: status,
    subscription_event_created: eventCreatedAt,
    tier: computeTier(user.lifetime_tier, status),
  };
  if (customerId && !user.stripe_customer_id) patch.stripe_customer_id = customerId;

  const applied = await store.updateUser(user.user_id, patch, eventCreatedAt);
  if (!applied) return "stale";
  logger.info({ userId: user.user_id, status, tier: patch.tier }, "Subscription state applied");
  return `subscription_${status}`;
}

async function processEvent(event: Stripe.Event, store: StripeWebhookStore, createdAt: string): Promise<string> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, store);
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return handleSubscriptionEvent(event, event.data.object as Stripe.Subscription, createdAt, store);
    default:
      return "unhandled_type";
  }
}

export function createStripeWebhookApp(overrides?: Partial<StripeWebhookDeps>): Hono {
  const deps: StripeWebhookDeps = { ...defaultDeps(), ...overrides };
  const app = new Hono();

  app.post("/", async (c) => {
    const secret = webhookSecret();
    if (!secret) {
      // Dark: plumbing exists but is unconfigured — refuse loudly, never 200.
      return c.json({ error: "Stripe webhook not configured" }, 503);
    }

    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "Missing stripe-signature header" }, 400);
    }

    const payload = await c.req.text();

    let event: Stripe.Event;
    try {
      event = deps.constructEvent(payload, signature, secret);
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "Stripe webhook signature verification failed");
      return c.json({ error: "Invalid signature" }, 400);
    }

    const createdAt = new Date(event.created * 1000).toISOString();

    let claim: ClaimResult;
    try {
      claim = await deps.store.claimEvent({ id: event.id, type: event.type, createdAt });
    } catch (err) {
      logger.error({ err: (err as Error).message, eventId: event.id }, "Stripe event ledger write failed");
      return c.json({ error: "Webhook handler error" }, 500);
    }
    if (claim === "processed") {
      return c.json({ received: true, duplicate: true });
    }

    let outcome: string;
    try {
      outcome = await processEvent(event, deps.store, createdAt);
    } catch (err) {
      if (err instanceof RetryLaterError) {
        logger.info({ eventId: event.id, type: event.type, reason: err.message }, "Stripe event deferred");
        return c.json({ error: "Event deferred" }, 500);
      }
      // Never leak internals; Stripe retries on non-2xx.
      logger.error({ err: (err as Error).message, eventId: event.id, type: event.type }, "Stripe webhook handler error");
      return c.json({ error: "Webhook handler error" }, 500);
    }

    try {
      await deps.store.markProcessed(event.id, outcome);
    } catch (err) {
      logger.error({ err: (err as Error).message, eventId: event.id }, "Stripe event processed_at write failed");
      return c.json({ error: "Webhook handler error" }, 500);
    }

    return c.json({ received: true });
  });

  return app;
}
