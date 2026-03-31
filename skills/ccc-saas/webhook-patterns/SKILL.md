---
name: KZ Mega-SaaS
description: "Webhook implementation patterns -- receiving with signature verification, sending with retries, idempotency, event storage, dead letter queues, local testing"
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
---

# Webhook Patterns

Production-grade webhook implementation for both receiving (from Stripe, GitHub, etc.) and sending (to your customers).

## Receiving Webhooks

### Signature Verification

CRITICAL: Always verify webhook signatures. Never trust unverified payloads.

#### Stripe
```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  // CRITICAL: Use raw text body, NOT parsed JSON
  const body = await req.text()
  const sig = (await headers()).get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Process verified event
  await processStripeEvent(event)
  return Response.json({ received: true })
}
```

#### GitHub
```typescript
import { createHmac, timingSafeEqual } from "crypto"

function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = `sha256=${createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get("x-hub-signature-256")!

  if (!verifyGitHubSignature(body, sig, process.env.GITHUB_WEBHOOK_SECRET!)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = JSON.parse(body)
  // Process verified event...
}
```

#### Generic HMAC Verification
```typescript
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha512" = "sha256"
): boolean {
  const expected = createHmac(algorithm, secret)
    .update(payload, "utf8")
    .digest("hex")

  // ALWAYS use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}
```

---

### Idempotency

Webhooks can be delivered more than once. Your handler MUST be idempotent.

#### Event Storage Table
```typescript
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),          // "stripe", "github", "clerk"
  externalId: text("external_id").notNull(), // provider's event ID
  eventType: text("event_type").notNull(),   // "checkout.session.completed"
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  processedAt: timestamp("processed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("webhook_events_external_idx").on(table.source, table.externalId).unique(),
])
```

#### Idempotent Processing
```typescript
export async function processWebhookIdempotently(
  source: string,
  externalId: string,
  eventType: string,
  payload: unknown,
  handler: () => Promise<void>
) {
  // 1. Check if already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: and(
      eq(schema.webhookEvents.source, source),
      eq(schema.webhookEvents.externalId, externalId),
    ),
  })

  if (existing?.status === "completed") {
    return { status: "already_processed" as const }
  }

  // 2. Insert or update to "processing"
  const [event] = await db
    .insert(schema.webhookEvents)
    .values({ source, externalId, eventType, payload, status: "processing" })
    .onConflictDoUpdate({
      target: [schema.webhookEvents.source, schema.webhookEvents.externalId],
      set: { status: "processing" },
    })
    .returning()

  // 3. Process
  try {
    await handler()
    await db
      .update(schema.webhookEvents)
      .set({ status: "completed", processedAt: new Date() })
      .where(eq(schema.webhookEvents.id, event.id))
    return { status: "processed" as const }
  } catch (error) {
    await db
      .update(schema.webhookEvents)
      .set({ status: "failed", error: String(error) })
      .where(eq(schema.webhookEvents.id, event.id))
    throw error
  }
}

// Usage with Stripe
async function processStripeEvent(event: Stripe.Event) {
  await processWebhookIdempotently(
    "stripe",
    event.id,
    event.type,
    event.data,
    async () => {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutComplete(event.data.object)
          break
        // ... other handlers
      }
    }
  )
}
```

---

## Sending Webhooks

When YOUR app sends webhooks to customers (e.g., SaaS platform notifications).

### Webhook Delivery Table
```typescript
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  url: text("url").notNull(),
  secret: text("secret").notNull(), // generated signing secret
  events: text("events").array().notNull(), // subscribed event types
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpointId: uuid("endpoint_id").notNull().references(() => webhookEndpoints.id),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"), // pending, delivered, failed, dead
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
```

### Signing Outgoing Webhooks
```typescript
import { createHmac, randomBytes } from "crypto"

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`
}

export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const toSign = `${timestamp}.${payload}`
  return createHmac("sha256", secret).update(toSign).digest("hex")
}

export async function deliverWebhook(
  endpoint: { url: string; secret: string },
  eventType: string,
  data: unknown
) {
  const timestamp = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({ type: eventType, data, timestamp })
  const signature = signWebhookPayload(payload, endpoint.secret, timestamp)

  const response = await fetch(endpoint.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Timestamp": String(timestamp),
      "X-Webhook-Event": eventType,
    },
    body: payload,
    signal: AbortSignal.timeout(10_000), // 10s timeout
  })

  return {
    status: response.status,
    ok: response.ok,
    body: await response.text(),
  }
}
```

### Retry with Exponential Backoff
```typescript
const RETRY_DELAYS = [
  60,        // 1 minute
  300,       // 5 minutes
  1800,      // 30 minutes
  7200,      // 2 hours
  28800,     // 8 hours
] // After 5 failures -> dead letter

export async function scheduleWebhookRetry(deliveryId: string, attempts: number) {
  if (attempts >= RETRY_DELAYS.length) {
    // Move to dead letter queue
    await db
      .update(schema.webhookDeliveries)
      .set({ status: "dead" })
      .where(eq(schema.webhookDeliveries.id, deliveryId))
    return
  }

  const delaySeconds = RETRY_DELAYS[attempts]
  const nextRetryAt = new Date(Date.now() + delaySeconds * 1000)

  await db
    .update(schema.webhookDeliveries)
    .set({
      attempts: attempts + 1,
      nextRetryAt,
      status: "pending",
    })
    .where(eq(schema.webhookDeliveries.id, deliveryId))
}

// Retry worker (run on a cron or background job)
export async function processWebhookRetries() {
  const pendingDeliveries = await db.query.webhookDeliveries.findMany({
    where: and(
      eq(schema.webhookDeliveries.status, "pending"),
      lte(schema.webhookDeliveries.nextRetryAt, new Date()),
    ),
    with: { endpoint: true },
  })

  for (const delivery of pendingDeliveries) {
    try {
      const result = await deliverWebhook(
        delivery.endpoint,
        delivery.eventType,
        delivery.payload
      )

      if (result.ok) {
        await db
          .update(schema.webhookDeliveries)
          .set({
            status: "delivered",
            responseStatus: result.status,
            lastAttemptAt: new Date(),
          })
          .where(eq(schema.webhookDeliveries.id, delivery.id))
      } else {
        await scheduleWebhookRetry(delivery.id, delivery.attempts)
      }
    } catch {
      await scheduleWebhookRetry(delivery.id, delivery.attempts)
    }
  }
}
```

---

## Dead Letter Queue

Failed webhook deliveries after all retries. Surface these to the user in their dashboard.

```typescript
export async function getDeadLetterWebhooks(tenantId: string) {
  return db
    .select()
    .from(schema.webhookDeliveries)
    .innerJoin(
      schema.webhookEndpoints,
      eq(schema.webhookDeliveries.endpointId, schema.webhookEndpoints.id)
    )
    .where(
      and(
        eq(schema.webhookEndpoints.tenantId, tenantId),
        eq(schema.webhookDeliveries.status, "dead"),
      )
    )
    .orderBy(desc(schema.webhookDeliveries.createdAt))
}

// Allow manual retry from dashboard
export async function retryDeadLetter(deliveryId: string) {
  await db
    .update(schema.webhookDeliveries)
    .set({
      status: "pending",
      attempts: 0,
      nextRetryAt: new Date(), // retry immediately
    })
    .where(eq(schema.webhookDeliveries.id, deliveryId))
}
```

---

## Local Testing

### Using Stripe CLI
```bash
# Listen for Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

### Using ngrok
```bash
# Expose local server
ngrok http 3000

# Use the ngrok URL as webhook endpoint
# https://abc123.ngrok.io/api/webhooks/stripe
```

### Test Webhook Sender
```typescript
// scripts/test-webhook.ts -- for testing your own webhook sending
import { deliverWebhook } from "@/lib/webhooks"

const testEndpoint = {
  url: "https://webhook.site/your-uuid", // or local ngrok URL
  secret: "whsec_test_secret",
}

await deliverWebhook(testEndpoint, "user.created", {
  id: "user_123",
  email: "test@example.com",
  createdAt: new Date().toISOString(),
})
```

---

## Common Gotchas

1. **Raw body for verification:** Always use `req.text()` not `req.json()` before verifying signatures
2. **Timing-safe comparison:** Never use `===` for signature comparison -- use `timingSafeEqual`
3. **Respond quickly:** Return 200 within 5 seconds. Process heavy logic asynchronously (queue)
4. **Handle out-of-order delivery:** Webhooks may arrive out of order. Use event timestamps
5. **Log everything:** Store the full event payload. You will need it for debugging
6. **Timeout outgoing webhooks:** Always set a timeout (10s recommended) when delivering
7. **Rate limit webhook endpoints:** Don't DDoS your customers if a burst of events occurs
