---
name: stripe-subscriptions
description: "Stripe subscription lifecycle patterns: checkout sessions, webhook verification (raw body gotcha), customer portal, usage-based billing, proration, and trial management."
category: payments
risk: critical
source: custom
tags: [stripe, billing, subscriptions, webhooks, saas]
---

# Stripe Subscription Lifecycle

## When to Use
- Implementing Stripe Checkout for subscriptions
- Building webhook handlers (CRITICAL: raw body verification)
- Managing subscription lifecycle (create, upgrade, cancel, pause)
- Implementing usage-based billing or metered pricing
- Building customer billing portal
- Handling failed payments and dunning

## Critical: Webhook Raw Body Gotcha
```typescript
// ❌ WRONG — parsed body breaks signature verification
app.use(express.json());
app.post('/webhook', (req, res) => {
  stripe.webhooks.constructEvent(req.body, sig, secret); // FAILS
});

// ✅ CORRECT — use raw body for verification
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const event = stripe.webhooks.constructEvent(
      req.body, // raw Buffer
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }
);
```

## Subscription Flow
```
Checkout Session → customer.subscription.created →
invoice.payment_succeeded → subscription active →
[upgrade/downgrade] → customer.subscription.updated →
[cancel] → customer.subscription.deleted
```

## Key Webhook Events
- `checkout.session.completed` — new subscription
- `invoice.payment_succeeded` — renewal
- `invoice.payment_failed` — payment issue (start dunning)
- `customer.subscription.updated` — plan change
- `customer.subscription.deleted` — cancellation
- `customer.subscription.trial_will_end` — 3 days before trial ends

## Best Practices
- Idempotent webhook handlers (use event.id for dedup)
- Store Stripe customer ID on your user model
- Use Stripe Customer Portal for self-service billing
- Implement proper proration for mid-cycle upgrades
- Handle `past_due` status gracefully (don't hard-lock immediately)
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/webhook`
