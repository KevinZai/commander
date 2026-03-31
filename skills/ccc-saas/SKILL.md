---
name: KZ Mega-SaaS
description: "Complete SaaS development ecosystem -- 20 skills in one. Scaffold, authenticate, bill, ship, and grow a production SaaS from zero to revenue."
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
---

# KZ Mega-SaaS

> Load ONE skill. Get the entire SaaS stack. Built from 15 proven skills + 5 new ones.

## Absorbed Skills Manifest

| # | Original Skill | What It Does | Status |
|---|----------------|--------------|--------|
| 1 | `nextjs-app-router` | Next.js 15+ App Router patterns -- route groups, server components, server actions, streaming, metadata | Absorbed |
| 2 | `shadcn-ui` | shadcn/ui v4 component patterns -- theming, composition, custom components, dark mode | Absorbed |
| 3 | `tailwind-v4` | Tailwind CSS v4 patterns -- CSS-first config, @theme, container queries, modern utilities | Absorbed |
| 4 | `drizzle-neon` | Drizzle ORM + Neon Postgres -- schema design, migrations, relations, serverless connection pooling | Absorbed |
| 5 | `better-auth` | Better Auth -- email/password, OAuth, organizations, RBAC, magic links, two-factor | Absorbed |
| 6 | `stripe-subscriptions` | Stripe subscription lifecycle -- checkout, webhooks (raw body gotcha), portal, usage-based billing | Absorbed |
| 7 | `billing-automation` | Billing automation -- invoice generation, dunning, grace periods, usage metering, revenue recognition | Absorbed |
| 8 | `api-design` | API design patterns -- REST conventions, versioning, pagination, error envelopes, rate limiting | Absorbed |
| 9 | `backend-patterns` | Backend architecture -- service layer, repository pattern, dependency injection, job queues | Absorbed |
| 10 | `fastify-api` | Fastify API patterns -- schema validation, plugins, hooks, decorators, TypeBox | Absorbed |
| 11 | `database-designer` | Database design -- normalization, indexing strategy, query optimization, schema evolution | Absorbed |
| 12 | `saas-metrics-coach` | SaaS metrics -- MRR, churn, LTV, CAC, cohort analysis, investor-ready dashboards | Absorbed |
| 13 | `signup-flow-cro` | Signup flow optimization -- friction reduction, social proof, progressive profiling, onboarding | Absorbed |
| 14 | `paywall-upgrade-cro` | Paywall and upgrade CRO -- pricing page design, trial-to-paid conversion, upsell triggers | Absorbed |
| 15 | `form-cro` | Form conversion optimization -- multi-step forms, validation UX, abandonment recovery | Absorbed |
| 16 | `saas-router` | Routes your SaaS task to the right specialist skill | **NEW** |
| 17 | `saas-scaffolder` | End-to-end SaaS project scaffolder -- starter templates, database, auth, billing wired up | **NEW** |
| 18 | `multi-tenant` | Multi-tenancy patterns -- schema-per-tenant, RLS, subdomain routing, tenant-aware queries | **NEW** |
| 19 | `webhook-patterns` | Webhook implementation -- receiving, sending, signature verification, retries, dead letter queues | **NEW** |
| 20 | `feature-flags` | Feature flag systems -- PostHog, LaunchDarkly, custom flags, gradual rollouts, A/B testing | **NEW** |

**Replaces loading:** api-design, backend-patterns, database-designer, better-auth, stripe-subscriptions, billing-automation, saas-metrics-coach, signup-flow-cro, paywall-upgrade-cro, form-cro, nextjs-app-router, shadcn-ui, drizzle-neon, tailwind-v4, fastify-api

---

## How To Use

**Step 1:** Tell me what you need. I'll route to the right specialist.

**Step 2:** If this is a new project, I'll run `saas-scaffolder` to generate your foundation.

**Step 3:** The specialist skill handles the work. You get full-stack SaaS expertise without loading 20 separate skills.

---

## Routing Matrix

| Your Intent | Route To | Don't Confuse With |
|-------------|----------|--------------------|
| "Scaffold a new SaaS" / "Start a new project" | `saas-scaffolder` | `nextjs-app-router` (framework patterns, not scaffolding) |
| "Set up auth" / "Add login" / "User management" | `better-auth` | `signup-flow-cro` (conversion optimization, not auth implementation) |
| "Add billing" / "Stripe setup" / "Subscriptions" | `stripe-subscriptions` + `billing-automation` | `paywall-upgrade-cro` (conversion, not implementation) |
| "Design my database" / "Schema design" | `database-designer` + `drizzle-neon` | `multi-tenant` (tenancy-specific schema patterns) |
| "Build the frontend" / "UI components" / "Pages" | `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` | `form-cro` (form optimization, not general UI) |
| "Build an API" / "API design" / "Backend" | `api-design` + `fastify-api` + `backend-patterns` | `webhook-patterns` (webhooks specifically) |
| "Track metrics" / "MRR dashboard" / "Churn analysis" | `saas-metrics-coach` | `billing-automation` (billing ops, not analytics) |
| "Improve signup conversion" / "Onboarding" | `signup-flow-cro` | `better-auth` (auth implementation, not CRO) |
| "Pricing page" / "Upgrade flow" / "Trial conversion" | `paywall-upgrade-cro` | `stripe-subscriptions` (Stripe API, not UX) |
| "Fix my forms" / "Form UX" / "Multi-step form" | `form-cro` | `signup-flow-cro` (signup-specific, not general forms) |
| "Multi-tenant" / "Tenant isolation" / "B2B SaaS" | `multi-tenant` | `database-designer` (general DB design) |
| "Webhooks" / "Event notifications" / "Stripe webhooks" | `webhook-patterns` | `stripe-subscriptions` (Stripe-specific webhook handling) |
| "Feature flags" / "Gradual rollout" / "A/B test" | `feature-flags` | `paywall-upgrade-cro` (pricing A/B specifically) |
| "Styling" / "Theming" / "Dark mode" / "CSS" | `tailwind-v4` + `shadcn-ui` | `nextjs-app-router` (routing, not styling) |

---

## Campaign Templates

### Greenfield SaaS

Build a SaaS from zero to deployed MVP.

1. `saas-scaffolder` -- generate project from starter template
2. `database-designer` + `drizzle-neon` -- design and implement schema
3. `better-auth` -- configure authentication + authorization
4. `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` -- build UI shell
5. `api-design` + `backend-patterns` -- design API layer
6. `stripe-subscriptions` + `billing-automation` -- wire up billing
7. `webhook-patterns` -- handle Stripe + third-party webhooks
8. `signup-flow-cro` -- optimize the signup experience
9. `saas-metrics-coach` -- set up metrics tracking from day one
10. Ship it

**Timeline:** 2-4 weeks for MVP with billing

---

### Add Billing to Existing App

Retrofit Stripe billing into an app that already has auth and a database.

1. `stripe-subscriptions` -- Stripe Checkout + Customer Portal + webhook handlers
2. `billing-automation` -- invoicing, dunning, grace periods
3. `database-designer` -- add billing tables (subscriptions, invoices, usage)
4. `webhook-patterns` -- robust webhook receiving with idempotency
5. `paywall-upgrade-cro` -- pricing page + upgrade flow UX
6. `feature-flags` -- gate features by plan tier
7. `saas-metrics-coach` -- MRR, churn, LTV dashboards

**Timeline:** 1-2 weeks

---

### Growth Phase

Optimize an existing SaaS for conversion and retention.

1. `saas-metrics-coach` -- baseline current metrics (MRR, churn, LTV, CAC)
2. `signup-flow-cro` -- audit and optimize signup funnel
3. `paywall-upgrade-cro` -- audit pricing page + trial-to-paid flow
4. `form-cro` -- optimize all user-facing forms
5. `feature-flags` -- set up gradual rollouts + A/B testing
6. `multi-tenant` -- if expanding to B2B / team plans
7. Measure, iterate, repeat

**Timeline:** Ongoing (2-week sprint cycles)

---

### B2B Multi-Tenant Expansion

Convert a single-tenant SaaS to multi-tenant for team/enterprise plans.

1. `multi-tenant` -- choose tenancy model (schema-per-tenant vs RLS)
2. `database-designer` + `drizzle-neon` -- redesign schema for tenancy
3. `better-auth` -- add organization plugin + RBAC
4. `stripe-subscriptions` -- per-organization billing
5. `webhook-patterns` -- tenant-aware webhook processing
6. `feature-flags` -- per-tenant feature gating
7. `api-design` -- tenant-scoped API endpoints

**Timeline:** 2-4 weeks
