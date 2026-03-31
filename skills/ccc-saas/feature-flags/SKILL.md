---
name: KZ Mega-SaaS
description: "Feature flag implementation -- PostHog, LaunchDarkly, custom database/Redis flags, gradual rollouts, A/B testing integration, flag lifecycle management"
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
---

# Feature Flags

Implement feature flags for gradual rollouts, plan-gated features, A/B testing, and safe deployments.

## When to Use Feature Flags

- **Plan gating:** Free users see X, Pro users see X + Y
- **Gradual rollout:** Release to 5% of users, then 25%, then 100%
- **A/B testing:** Test two versions of a feature against metrics
- **Kill switches:** Instantly disable a feature without deploying
- **Beta access:** Let specific users opt into early features
- **Operational flags:** Toggle maintenance mode, rate limits, feature deprecation

---

## Option 1: PostHog Feature Flags (Recommended)

PostHog provides feature flags with built-in analytics. Best for most SaaS apps.

### Setup
```bash
pnpm add posthog-js posthog-node
```

### Server-Side Evaluation
```typescript
// src/lib/posthog.ts
import { PostHog } from "posthog-node"

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
})

export async function isFeatureEnabled(
  flagKey: string,
  userId: string,
  properties?: Record<string, unknown>
): Promise<boolean> {
  return await posthog.isFeatureEnabled(flagKey, userId, {
    personProperties: properties,
  }) ?? false
}

export async function getFeatureFlag(
  flagKey: string,
  userId: string,
  properties?: Record<string, unknown>
): Promise<string | boolean | undefined> {
  return await posthog.getFeatureFlag(flagKey, userId, {
    personProperties: properties,
  })
}

// Batch evaluation for multiple flags
export async function getAllFlags(
  userId: string,
  properties?: Record<string, unknown>
): Promise<Record<string, boolean | string>> {
  return await posthog.getAllFlags(userId, {
    personProperties: properties,
  })
}
```

### Client-Side Provider
```typescript
// src/components/posthog-provider.tsx
"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { useEffect } from "react"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: false, // manual pageview tracking
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

### React Hook Usage
```typescript
"use client"

import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from "posthog-js/react"

export function PricingPage() {
  const showNewPricing = useFeatureFlagEnabled("new-pricing-page")
  const pricingVariant = useFeatureFlagVariantKey("pricing-experiment")

  if (showNewPricing) {
    return <NewPricingPage variant={pricingVariant} />
  }

  return <CurrentPricingPage />
}
```

### Server Component Usage
```typescript
// src/app/(app)/dashboard/page.tsx
import { isFeatureEnabled } from "@/lib/posthog"
import { getCurrentUser } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const showAnalytics = await isFeatureEnabled("dashboard-analytics", user.id, {
    plan: user.plan,
  })

  return (
    <div>
      <DashboardOverview />
      {showAnalytics && <AnalyticsPanel />}
    </div>
  )
}
```

---

## Option 2: Custom Feature Flags (Database-Backed)

For full control without third-party dependencies. Good for plan-gating and simple rollouts.

### Schema
```typescript
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  rolloutPercentage: integer("rollout_percentage").notNull().default(100), // 0-100
  allowedPlans: text("allowed_plans").array(), // null = all plans
  allowedUserIds: text("allowed_user_ids").array(), // explicit allowlist
  metadata: jsonb("metadata"), // arbitrary config
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
```

### Flag Evaluation Engine
```typescript
import { createHash } from "crypto"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schema"

// In-memory cache with TTL
const flagCache = new Map<string, { flag: typeof schema.featureFlags.$inferSelect; expiresAt: number }>()
const CACHE_TTL = 30_000 // 30 seconds

async function getFlag(key: string) {
  const cached = flagCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.flag
  }

  const flag = await db.query.featureFlags.findFirst({
    where: eq(schema.featureFlags.key, key),
  })

  if (flag) {
    flagCache.set(key, { flag, expiresAt: Date.now() + CACHE_TTL })
  }

  return flag ?? null
}

export async function isEnabled(
  flagKey: string,
  context: { userId: string; plan?: string }
): Promise<boolean> {
  const flag = await getFlag(flagKey)

  if (!flag || !flag.enabled) return false

  // Check explicit allowlist
  if (flag.allowedUserIds?.includes(context.userId)) return true

  // Check plan restriction
  if (flag.allowedPlans && context.plan) {
    if (!flag.allowedPlans.includes(context.plan)) return false
  }

  // Check percentage rollout (deterministic based on userId + flagKey)
  if (flag.rolloutPercentage < 100) {
    const hash = createHash("md5")
      .update(`${flagKey}:${context.userId}`)
      .digest("hex")
    const bucket = parseInt(hash.substring(0, 8), 16) % 100
    if (bucket >= flag.rolloutPercentage) return false
  }

  return true
}

// Invalidate cache when flags are updated
export function invalidateFlagCache(key?: string) {
  if (key) {
    flagCache.delete(key)
  } else {
    flagCache.clear()
  }
}
```

### Plan-Gated Feature Helper
```typescript
// Convenience wrapper for the most common pattern: plan gating
const PLAN_FEATURES: Record<string, string[]> = {
  free: ["basic-dashboard", "single-project"],
  pro: ["basic-dashboard", "single-project", "analytics", "api-access", "custom-domain"],
  enterprise: ["basic-dashboard", "single-project", "analytics", "api-access", "custom-domain", "sso", "audit-log", "priority-support"],
}

export function hasFeatureForPlan(featureKey: string, plan: string): boolean {
  return PLAN_FEATURES[plan]?.includes(featureKey) ?? false
}

// React component
export function FeatureGate({
  feature,
  plan,
  children,
  fallback,
}: {
  feature: string
  plan: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  if (!hasFeatureForPlan(feature, plan)) {
    return fallback ?? null
  }
  return <>{children}</>
}

// Usage
<FeatureGate feature="analytics" plan={user.plan} fallback={<UpgradePrompt feature="analytics" />}>
  <AnalyticsDashboard />
</FeatureGate>
```

---

## Option 3: LaunchDarkly

Enterprise-grade feature management. Best for large teams with complex targeting rules.

### Setup
```bash
pnpm add @launchdarkly/node-server-sdk @launchdarkly/react-client-sdk
```

### Server-Side
```typescript
import * as LaunchDarkly from "@launchdarkly/node-server-sdk"

const ldClient = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY!)
await ldClient.waitForInitialization()

export async function isFeatureEnabled(
  flagKey: string,
  user: { id: string; email: string; plan: string }
): Promise<boolean> {
  const context: LaunchDarkly.LDContext = {
    kind: "user",
    key: user.id,
    email: user.email,
    custom: { plan: user.plan },
  }

  return await ldClient.variation(flagKey, context, false)
}
```

---

## Gradual Rollout Strategy

### Phase 1: Internal (0-1%)
```
Target: Team members only (allowlist)
Duration: 1-3 days
Metrics: Error rates, performance
Decision: Fix bugs, proceed or kill
```

### Phase 2: Canary (1-5%)
```
Target: Random 5% of users
Duration: 3-7 days
Metrics: Error rates, user engagement, support tickets
Decision: Increase or rollback
```

### Phase 3: Expansion (5-50%)
```
Target: Gradual increase by segment
Duration: 1-2 weeks
Metrics: Business metrics (conversion, retention)
Decision: Full rollout or iterate
```

### Phase 4: General Availability (100%)
```
Target: All users
Duration: Permanent (then clean up the flag)
Metrics: Confirm no regression
Action: Remove flag from code, delete from system
```

---

## A/B Testing Integration

Use feature flag variants to run A/B tests.

### PostHog A/B Test
```typescript
// Define experiment with variants in PostHog dashboard
// Then evaluate in code:

const variant = await getFeatureFlag("signup-experiment", userId)

switch (variant) {
  case "control":
    return <SignupFormCurrent />
  case "social-first":
    return <SignupFormSocialFirst />
  case "minimal":
    return <SignupFormMinimal />
  default:
    return <SignupFormCurrent />
}

// Track conversion events
posthog.capture("signup_completed", {
  experiment: "signup-experiment",
  variant,
})
```

### Custom A/B Framework
```typescript
export function assignVariant(
  experimentKey: string,
  userId: string,
  variants: string[]
): string {
  // Deterministic assignment -- same user always gets same variant
  const hash = createHash("md5")
    .update(`${experimentKey}:${userId}`)
    .digest("hex")
  const bucket = parseInt(hash.substring(0, 8), 16) % variants.length
  return variants[bucket]
}

// Track experiment exposure
export async function trackExposure(
  experimentKey: string,
  userId: string,
  variant: string
) {
  await db.insert(schema.experimentExposures).values({
    experimentKey,
    userId,
    variant,
    exposedAt: new Date(),
  })
}
```

---

## Flag Lifecycle Management

### Naming Convention
```
{scope}-{feature}-{purpose}

Examples:
  billing-annual-plans-enabled    # permanent operational flag
  dashboard-analytics-v2-rollout  # temporary rollout flag
  signup-social-first-experiment  # temporary A/B test
  maintenance-mode                # operational kill switch
```

### Cleaning Up Old Flags

Stale feature flags are tech debt. Clean them up.

```typescript
// scripts/audit-feature-flags.ts
import { db } from "@/db"

const flags = await db.query.featureFlags.findMany()

for (const flag of flags) {
  const ageInDays = (Date.now() - flag.createdAt.getTime()) / (1000 * 60 * 60 * 24)

  if (flag.rolloutPercentage === 100 && ageInDays > 30) {
    console.log(`STALE: ${flag.key} -- 100% for ${Math.round(ageInDays)} days. Remove flag and hardcode.`)
  }

  if (!flag.enabled && ageInDays > 90) {
    console.log(`DEAD: ${flag.key} -- disabled for ${Math.round(ageInDays)} days. Delete.`)
  }
}
```

### Cleanup Checklist
1. Search codebase for the flag key
2. Remove all conditional branches
3. Keep the "enabled" code path, delete the "disabled" path
4. Delete the flag from the database / PostHog / LaunchDarkly
5. Remove any related A/B test tracking
6. Commit with message: `chore: remove feature flag {key} (fully rolled out)`

---

## Common Gotchas

1. **Deterministic hashing:** Use userId + flagKey for consistent bucket assignment -- never `Math.random()`
2. **Default to disabled:** If flag evaluation fails (network error, missing flag), return `false`
3. **Cache flags:** Don't hit the database on every request. Use in-memory cache with 30s TTL
4. **Don't nest flags:** `if (flagA && flagB && flagC)` is a maintenance nightmare
5. **Track exposure:** Always log when a user sees a flagged feature -- critical for A/B test validity
6. **Plan gating is not a feature flag:** Use a simple plan-to-features mapping for static plan gating. Reserve flags for dynamic rollouts
7. **Clean up flags:** Set calendar reminders. A codebase with 200 stale flags is worse than no flags at all
