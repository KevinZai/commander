---
name: ccc-saas
context: fork
description: CCC domain — complete SaaS development ecosystem — 21 skills in one. Scaffold, authenticate, bill, ship, and grow a production SaaS from zero to revenue. [Commander]
allowed-tools:
  - Read
---

# ccc-saas

> Load ONE skill. Get the entire SaaS stack. 21 skills from scaffold to scale.

## What's Inside

| Area | Skills |
|------|--------|
| Routing & Scaffold | saas-router, saas-scaffolder |
| Auth & Users | better-auth (email/password, OAuth, RBAC, 2FA, magic links) |
| Database | database-designer, drizzle-neon |
| API | api-design, backend-patterns, fastify-api |
| Frontend | nextjs-app-router, shadcn-ui, tailwind-v4 |
| Billing | stripe-subscriptions, billing-automation |
| Growth | saas-metrics-coach, signup-flow-cro, paywall-upgrade-cro, form-cro |
| Advanced | multi-tenant, webhook-patterns, feature-flags |

## Routing Matrix

| Your Intent | Route To |
|-------------|----------|
| "Scaffold a new SaaS" | `saas-scaffolder` |
| "Set up auth" / "Add login" | `better-auth` |
| "Add billing" / "Stripe setup" | `stripe-subscriptions` + `billing-automation` |
| "Design my database" | `database-designer` + `drizzle-neon` |
| "Build the frontend" / "UI" | `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` |
| "Build an API" | `api-design` + `fastify-api` + `backend-patterns` |
| "Track MRR" / "Churn analysis" | `saas-metrics-coach` |
| "Improve signup conversion" | `signup-flow-cro` |
| "Pricing page" / "Trial conversion" | `paywall-upgrade-cro` |
| "Multi-tenant" / "B2B SaaS" | `multi-tenant` |
| "Webhooks" | `webhook-patterns` |
| "Feature flags" / "Gradual rollout" | `feature-flags` |

## Campaign Templates

### Greenfield SaaS (Zero to MVP)
1. `saas-scaffolder` → generate project from starter template
2. `database-designer` + `drizzle-neon` → schema design
3. `better-auth` → authentication + authorization
4. `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` → UI shell
5. `api-design` + `backend-patterns` → API layer
6. `stripe-subscriptions` + `billing-automation` → billing
7. `webhook-patterns` → event handling
8. `signup-flow-cro` → optimize onboarding

### Growth Phase
1. `saas-metrics-coach` → baseline MRR, churn, LTV, CAC
2. `signup-flow-cro` → audit signup funnel
3. `paywall-upgrade-cro` → pricing page + trial-to-paid
4. `feature-flags` → gradual rollouts + A/B tests
5. `multi-tenant` → B2B/team plan expansion

## When to invoke this skill

**Example 1**
- user: start a new SaaS project with auth and Stripe billing
- assistant: Loads ccc-saas and runs saas-scaffolder → better-auth → stripe-subscriptions pipeline.

**Example 2**
- user: add multi-tenant support to my existing app
- assistant: Loads ccc-saas and routes to multi-tenant skill for schema-per-tenant or RLS pattern selection.

**Example 3**
- user: improve my trial-to-paid conversion rate
- assistant: Loads ccc-saas and routes to paywall-upgrade-cro + feature-flags for plan-gated feature exposure and pricing page optimization.
