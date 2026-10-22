// Stripe webhook — dark paywall plumbing (revenue-opp-2026-07-10 §3+§6).
//
// POST /webhooks/stripe. Signature-verified via the official `stripe` package
// (constructEvent). Flips the key record's tier:
//
//   customer.subscription.created  + pro price id            → tier 'pro'
//   customer.subscription.deleted  (non-founders)            → tier 'free'
//   checkout.session.completed     payment-mode + founders   → tier 'founders'
//                                  metadata (lifetime — never downgraded by
//                                  subscription events)
//
// checkout.session.completed also links stripe_customer_id to the user row
// via client_reference_id (users.user_id) or the checkout email, so later
// subscription events can resolve the customer.
//
// INERT until CCC_STRIPE_WEBHOOK_SECRET is set (returns 503). Price IDs come
// from env — no Stripe products are created by this code. Config is read from
// process.env at request time (testability + parity with lib/paywall.ts).
// Full setup steps for Kevin: PAYWALL.md.

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

// ─── Injectable deps (tests provide fakes; default = Stripe SDK + Supabase) ─
export type StripeWebhookDeps = {
  /** Verify signature + parse. MUST throw on an invalid signature. */
  constructEvent: (payload: string, signature: string, secret: string) => Stripe.Event;
  setTierByCustomerId: (customerId: string, tier: AccountTier) => Promise<boolean>;
  getTierByCustomerId: (customerId: string) => Promise<AccountTier | null>;
  setTierByUserRef: (ref: { userId?: string; email?: string }, tier: AccountTier) => Promise<boolean>;
  linkCustomer: (ref: { userId?: string; email?: string }, customerId: string) => Promise<boolean>;
};

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
    setTierByCustomerId: async (customerId, tier) => {
      const { data, error } = await db
        .from("users")
        .update({ tier })
        .eq("stripe_customer_id", customerId)
        .select("user_id");
      if (error) {
        logger.error({ err: error, customerId, tier }, "setTierByCustomerId failed");
        return false;
      }
      return (data?.length ?? 0) > 0;
    },
    getTierByCustomerId: async (customerId) => {
      const { data, error } = await db
        .from("users")
        .select("tier")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (error) {
        logger.error({ err: error, customerId }, "getTierByCustomerId failed");
        return null;
      }
      return (data?.tier as AccountTier | undefined) ?? null;
    },
    setTierByUserRef: async (ref, tier) => {
      let query = db.from("users").update({ tier });
      if (ref.userId) query = query.eq("user_id", ref.userId);
      else if (ref.email) query = query.eq("email", ref.email);
      else return false;
      const { data, error } = await query.select("user_id");
      if (error) {
        logger.error({ err: error, tier }, "setTierByUserRef failed");
        return false;
      }
      return (data?.length ?? 0) > 0;
    },
    linkCustomer: async (ref, customerId) => {
      let query = db.from("users").update({ stripe_customer_id: customerId });
      if (ref.userId) query = query.eq("user_id", ref.userId);
      else if (ref.email) query = query.eq("email", ref.email);
      else return false;
      const { data, error } = await query.select("user_id");
      if (error) {
        logger.error({ err: error, customerId }, "linkCustomer failed");
        return false;
      }
      return (data?.length ?? 0) > 0;
    },
  };
}

function subscriptionPriceIds(sub: Stripe.Subscription): string[] {
  return (sub.items?.data ?? [])
    .map((item) => item.price?.id)
    .filter((id): id is string => Boolean(id));
}

function customerIdOf(obj: { customer?: string | { id: string } | null }): string | null {
  if (!obj.customer) return null;
  return typeof obj.customer === "string" ? obj.customer : obj.customer.id;
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

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const customerId = customerIdOf(session);
          const ref = {
            userId: session.client_reference_id ?? undefined,
            email: session.customer_details?.email ?? session.customer_email ?? undefined,
          };

          if (customerId && (ref.userId || ref.email)) {
            await deps.linkCustomer(ref, customerId);
          }

          // Founders is a one-time (payment-mode) purchase — the Checkout
          // Session/Payment Link MUST set metadata (see PAYWALL.md) since
          // line items are not embedded in the webhook payload.
          const founders = foundersPriceId();
          const isFounders =
            session.mode === "payment" &&
            founders !== "" &&
            (session.metadata?.ccc_price_id === founders ||
              session.metadata?.ccc_tier === "founders");
          if (isFounders) {
            const flipped = customerId
              ? await deps.setTierByCustomerId(customerId, "founders")
              : false;
            if (!flipped) await deps.setTierByUserRef(ref, "founders");
            logger.info({ customerId }, "Founders tier granted via checkout.session.completed");
          }
          break;
        }

        case "customer.subscription.created": {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = customerIdOf(sub);
          const prices = subscriptionPriceIds(sub);
          const isPro = prices.some((id) => proPriceIds().includes(id));
          if (customerId && isPro) {
            const flipped = await deps.setTierByCustomerId(customerId, "pro");
            logger.info({ customerId, flipped }, "Pro tier flip via subscription.created");
          } else {
            logger.info(
              { customerId, matched: isPro },
              "subscription.created ignored (no matching pro price id)"
            );
          }
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = customerIdOf(sub);
          if (customerId) {
            const current = await deps.getTierByCustomerId(customerId);
            if (current === "founders") {
              // Founders is lifetime — a lapsed subscription never downgrades it.
              logger.info({ customerId }, "subscription.deleted ignored for founders tier");
            } else {
              const flipped = await deps.setTierByCustomerId(customerId, "free");
              logger.info({ customerId, flipped }, "Free tier flip via subscription.deleted");
            }
          }
          break;
        }

        default:
          logger.info({ type: event.type }, "Unhandled Stripe event type");
      }
    } catch (err) {
      // Never leak internals; Stripe retries on non-2xx.
      logger.error({ err: (err as Error).message, type: event.type }, "Stripe webhook handler error");
      return c.json({ error: "Webhook handler error" }, 500);
    }

    return c.json({ received: true });
  });

  return app;
}
