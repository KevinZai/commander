// Stripe webhook — paywall fulfillment (revenue-opp-2026-07-10 §3+§6).
//
// POST /webhooks/stripe. Signature-verified via the official `stripe` package
// (constructEvent). Reconciles the user's entitlement from Stripe state:
//
//   checkout.session.completed / checkout.session.async_payment_succeeded
//     - links stripe_customer_id to the user row (client_reference_id, then
//       checkout email)
//     - payment mode + founders metadata + payment_status 'paid' → founders
//       (lifetime: founders_granted_at is recorded independently of the
//       subscription state and is never cleared by subscription events)
//   customer.subscription.created / .updated / .deleted (pro price ids only)
//     - pro while the subscription status is entitled, else free
//     - a Founders user keeps 'founders' whatever the subscription does
//
// Delivery guarantees (Codex audit #06):
//   - Any fulfillment failure (DB error, customer not linked yet, no user for
//     a paid founders checkout) returns a non-2xx status so Stripe retries.
//     Stripe retries for up to three days, which covers the case where
//     customer.subscription.created arrives before checkout.session.completed
//     has linked the customer.
//   - Processed event ids are stored durably (stripe_events). A redelivered
//     event that already succeeded is acknowledged without side effects.
//   - Subscription events older than the last applied one for that user are
//     ignored, so out-of-order retries cannot resurrect a cancelled plan.
//
// INERT until CCC_STRIPE_WEBHOOK_SECRET is set (returns 503). Price IDs come
// from env — no Stripe products are created by this code. Config is read from
// process.env at request time (testability + parity with lib/paywall.ts).
// Schema: supabase/migrations/20261118000000_reconcile_hosted_schema.sql.
// Setup steps: PAYWALL.md.

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

/** Subscription statuses that carry the Pro entitlement. past_due is Stripe's
 *  dunning grace period; access ends when Stripe moves it to unpaid/canceled. */
const ENTITLED_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

// ─── Types ─────────────────────────────────────────────────────────────────
/** The billing-relevant slice of a users row. */
export type BillingUser = {
  userId: string;
  tier: AccountTier;
  foundersGrantedAt: string | null;
  stripeSubscriptionId: string | null;
  /** ISO time of the newest subscription event applied to this row. */
  subscriptionEventAt: string | null;
};

export type UserRef = { userId?: string; email?: string };

export type SubscriptionPatch = {
  /** Omitted when the tier must not change (Founders). */
  tier?: AccountTier;
  subscriptionId: string;
  status: string;
  eventAt: string;
};

// ─── Injectable deps (tests provide fakes; default = Stripe SDK + Supabase) ─
// Every DB dep THROWS on a backend error so the route answers non-2xx and
// Stripe retries. "Not found" is a null return, never an exception.
export type StripeWebhookDeps = {
  /** Verify signature + parse. MUST throw on an invalid signature. */
  constructEvent: (payload: string, signature: string, secret: string) => Stripe.Event;
  isEventProcessed: (eventId: string) => Promise<boolean>;
  recordEventProcessed: (eventId: string, type: string) => Promise<void>;
  findUserByCustomerId: (customerId: string) => Promise<BillingUser | null>;
  findUserByRef: (ref: UserRef) => Promise<BillingUser | null>;
  linkCustomer: (userId: string, customerId: string) => Promise<void>;
  applySubscription: (userId: string, patch: SubscriptionPatch) => Promise<void>;
  grantFounders: (userId: string, grantedAt: string) => Promise<void>;
};

/** A fulfillment step that cannot complete yet; answered non-2xx so Stripe retries. */
export class RetryableFulfillmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableFulfillmentError";
  }
}

// API key is NOT required for webhook signature verification; the placeholder
// satisfies the SDK constructor. Set CCC_STRIPE_API_KEY only if a future
// change needs real Stripe API calls (e.g. expanding line items).
function stripeClient(): Stripe {
  return new Stripe(process.env.CCC_STRIPE_API_KEY || "sk_test_placeholder_webhook_verify_only");
}

const BILLING_COLUMNS =
  "user_id, tier, founders_granted_at, stripe_subscription_id, stripe_subscription_event_at";

type BillingRow = {
  user_id: string;
  tier: string | null;
  founders_granted_at: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_event_at: string | null;
};

function toBillingUser(row: BillingRow): BillingUser {
  const tier: AccountTier =
    row.tier === "founders" ? "founders" : row.tier === "pro" ? "pro" : "free";
  return {
    userId: row.user_id,
    tier,
    foundersGrantedAt: row.founders_granted_at,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionEventAt: row.stripe_subscription_event_at,
  };
}

function dbError(what: string, error: { message?: string; code?: string }): Error {
  logger.error({ err: error }, `${what} failed`);
  return new Error(`${what} failed${error.code ? ` (${error.code})` : ""}`);
}

// Postgres 22P02: a non-UUID client_reference_id against a legacy uuid column.
// Treated as "no such user" rather than a retryable backend failure.
const INVALID_TEXT_REPRESENTATION = "22P02";

function defaultDeps(): StripeWebhookDeps {
  async function selectOne(column: "stripe_customer_id" | "user_id" | "email", value: string) {
    const { data, error } = await db
      .from("users")
      .select(BILLING_COLUMNS)
      .eq(column, value)
      .maybeSingle();
    if (error) {
      if (error.code === INVALID_TEXT_REPRESENTATION) return null;
      throw dbError(`users lookup by ${column}`, error);
    }
    return data ? toBillingUser(data as BillingRow) : null;
  }

  return {
    constructEvent: (payload, signature, secret) =>
      stripeClient().webhooks.constructEvent(payload, signature, secret),
    isEventProcessed: async (eventId) => {
      const { data, error } = await db
        .from("stripe_events")
        .select("event_id")
        .eq("event_id", eventId)
        .maybeSingle();
      if (error) throw dbError("stripe_events lookup", error);
      return Boolean(data);
    },
    recordEventProcessed: async (eventId, type) => {
      const { error } = await db
        .from("stripe_events")
        .upsert({ event_id: eventId, type }, { onConflict: "event_id", ignoreDuplicates: true });
      if (error) throw dbError("stripe_events insert", error);
    },
    findUserByCustomerId: (customerId) => selectOne("stripe_customer_id", customerId),
    findUserByRef: async (ref) => {
      if (ref.userId) {
        const byId = await selectOne("user_id", ref.userId);
        if (byId) return byId;
      }
      if (ref.email) return selectOne("email", ref.email);
      return null;
    },
    linkCustomer: async (userId, customerId) => {
      const { error } = await db
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", userId);
      if (error) throw dbError("linkCustomer", error);
    },
    applySubscription: async (userId, patch) => {
      const update: Record<string, string> = {
        stripe_subscription_id: patch.subscriptionId,
        stripe_subscription_status: patch.status,
        stripe_subscription_event_at: patch.eventAt,
      };
      if (patch.tier) update.tier = patch.tier;
      const { error } = await db.from("users").update(update).eq("user_id", userId);
      if (error) throw dbError("applySubscription", error);
    },
    grantFounders: async (userId, grantedAt) => {
      // The caller passes the existing grant time when there is one, so a
      // redelivery rewrites the same values. The users_guard trigger then pins
      // tier = 'founders' on every later write while founders_granted_at is set.
      const { error } = await db
        .from("users")
        .update({ tier: "founders", founders_granted_at: grantedAt })
        .eq("user_id", userId);
      if (error) throw dbError("grantFounders", error);
    },
  };
}

// ─── Pure helpers (exported for tests) ─────────────────────────────────────
function subscriptionPriceIds(sub: Stripe.Subscription): string[] {
  return (sub.items?.data ?? [])
    .map((item) => item.price?.id)
    .filter((id): id is string => Boolean(id));
}

function customerIdOf(obj: { customer?: string | { id: string } | null }): string | null {
  if (!obj.customer) return null;
  return typeof obj.customer === "string" ? obj.customer : obj.customer.id;
}

/** A lifetime grant outranks any subscription state. */
export function hasLifetimeGrant(user: Pick<BillingUser, "tier" | "foundersGrantedAt">): boolean {
  return user.foundersGrantedAt !== null || user.tier === "founders";
}

/** The tier a subscription event leaves the user on; null = leave tier alone. */
export function tierAfterSubscription(
  user: Pick<BillingUser, "tier" | "foundersGrantedAt">,
  entitled: boolean
): AccountTier | null {
  if (hasLifetimeGrant(user)) return null;
  return entitled ? "pro" : "free";
}

/** Founders requires a payment-mode checkout carrying the founders marker
 *  whose payment has actually settled. */
export function isSettledFoundersCheckout(session: Stripe.Checkout.Session): boolean {
  const founders = foundersPriceId();
  if (founders === "" || session.mode !== "payment") return false;
  const marked =
    session.metadata?.ccc_price_id === founders || session.metadata?.ccc_tier === "founders";
  return marked && session.payment_status === "paid";
}

// ─── Event handlers ────────────────────────────────────────────────────────
type Outcome = { action: string };

async function handleCheckout(
  deps: StripeWebhookDeps,
  session: Stripe.Checkout.Session,
  eventAt: string
): Promise<Outcome> {
  const customerId = customerIdOf(session);
  const ref: UserRef = {
    userId: session.client_reference_id ?? undefined,
    email: session.customer_details?.email ?? session.customer_email ?? undefined,
  };
  const founders = isSettledFoundersCheckout(session);
  const fulfills = session.mode === "subscription" || founders;

  let user = customerId ? await deps.findUserByCustomerId(customerId) : null;
  if (!user && (ref.userId || ref.email)) {
    user = await deps.findUserByRef(ref);
    if (user && customerId) await deps.linkCustomer(user.userId, customerId);
  }

  if (!user) {
    if (fulfills) {
      throw new RetryableFulfillmentError("no user matches this checkout");
    }
    return { action: "ignored_unmatched_checkout" };
  }

  if (founders) {
    await deps.grantFounders(user.userId, user.foundersGrantedAt ?? eventAt);
    logger.info({ userId: user.userId, customerId }, "Founders tier granted");
    return { action: "founders_granted" };
  }

  if (session.mode === "payment" && session.payment_status !== "paid") {
    logger.info({ userId: user.userId }, "Checkout payment not settled yet — awaiting async_payment_succeeded");
  }
  return { action: customerId ? "customer_linked" : "checkout_seen" };
}

async function handleSubscription(
  deps: StripeWebhookDeps,
  type: string,
  sub: Stripe.Subscription,
  eventAt: string
): Promise<Outcome> {
  const customerId = customerIdOf(sub);
  const isPro = subscriptionPriceIds(sub).some((id) => proPriceIds().includes(id));
  if (!customerId || !isPro) {
    logger.info({ customerId, type }, "subscription event ignored (no matching pro price id)");
    return { action: "ignored_not_pro" };
  }

  const user = await deps.findUserByCustomerId(customerId);
  if (!user) {
    // checkout.session.completed has not linked this customer yet. Fail so
    // Stripe redelivers once the link exists (ordering is not guaranteed).
    throw new RetryableFulfillmentError("customer not linked to a user yet");
  }

  if (user.subscriptionEventAt && Date.parse(eventAt) < Date.parse(user.subscriptionEventAt)) {
    logger.info({ userId: user.userId, type }, "stale subscription event ignored");
    return { action: "ignored_stale" };
  }

  if (
    type === "customer.subscription.deleted" &&
    user.stripeSubscriptionId &&
    user.stripeSubscriptionId !== sub.id
  ) {
    // An older subscription ended while a newer one is current.
    logger.info({ userId: user.userId }, "deleted event for a superseded subscription ignored");
    return { action: "ignored_superseded" };
  }

  const status = type === "customer.subscription.deleted" ? "canceled" : sub.status;
  const entitled = ENTITLED_SUBSCRIPTION_STATUSES.has(status);
  const tier = tierAfterSubscription(user, entitled);
  await deps.applySubscription(user.userId, {
    ...(tier ? { tier } : {}),
    subscriptionId: sub.id,
    status,
    eventAt,
  });
  logger.info({ userId: user.userId, type, status, tier: tier ?? user.tier }, "subscription applied");
  return { action: tier ? `tier_${tier}` : "founders_preserved" };
}

// ─── Route ─────────────────────────────────────────────────────────────────
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

    const eventAt = new Date(event.created * 1000).toISOString();

    try {
      if (await deps.isEventProcessed(event.id)) {
        return c.json({ received: true, duplicate: true });
      }

      let outcome: Outcome;
      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded":
          outcome = await handleCheckout(deps, event.data.object as Stripe.Checkout.Session, eventAt);
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          outcome = await handleSubscription(
            deps,
            event.type,
            event.data.object as Stripe.Subscription,
            eventAt
          );
          break;

        default:
          logger.info({ type: event.type }, "Unhandled Stripe event type");
          outcome = { action: "unhandled" };
      }

      // Only a fully applied event is recorded; a failure above leaves it
      // unrecorded so the redelivery runs the (idempotent) handler again.
      await deps.recordEventProcessed(event.id, event.type);
      return c.json({ received: true, action: outcome.action });
    } catch (err) {
      // Never leak internals; Stripe retries on non-2xx.
      if (err instanceof RetryableFulfillmentError) {
        logger.warn({ err: err.message, type: event.type, id: event.id }, "Stripe fulfillment deferred");
        return c.json({ error: "Fulfillment pending; retry" }, 409);
      }
      logger.error({ err: (err as Error).message, type: event.type, id: event.id }, "Stripe webhook handler error");
      return c.json({ error: "Webhook handler error" }, 500);
    }
  });

  return app;
}
