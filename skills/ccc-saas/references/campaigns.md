# ccc-saas campaigns

Multi-step sequences. Run one sub-skill (or one listed pair) at a time and finish each step's check before the next. Sub-skill files live beside the router at `../<sub-skill>/SKILL.md`. Timelines are rough planning ranges, not commitments.

## Greenfield SaaS

Zero to a deployed MVP. Rough range: 2 to 4 weeks with billing.

1. `saas-scaffolder` — generate the project from a starter template.
2. `database-designer` + `drizzle-neon` — design and implement the schema.
3. `better-auth` — authentication and authorization.
4. `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` — the UI shell.
5. `api-design` + `backend-patterns` — the API layer.
6. `stripe-subscriptions` + `billing-automation` — billing.
7. `webhook-patterns` — Stripe and third-party webhooks.
8. `signup-flow-cro` — the signup experience.
9. `saas-metrics-coach` — metrics tracking from day one.
10. Ship through `/ccc-ship` once every check is green.

## Add billing to an existing app

Retrofit Stripe billing into an app that already has auth and a database. Rough range: 1 to 2 weeks.

1. `stripe-subscriptions` — Checkout, Customer Portal, webhook handlers.
2. `billing-automation` — invoicing, dunning, grace periods.
3. `database-designer` — billing tables (subscriptions, invoices, usage).
4. `webhook-patterns` — webhook receiving with idempotency.
5. `paywall-upgrade-cro` — pricing page and upgrade flow.
6. `feature-flags` — gate features by plan tier.
7. `saas-metrics-coach` — MRR, churn and LTV dashboards.

## Growth phase

Optimize an existing SaaS for conversion and retention, in two-week cycles.

1. `saas-metrics-coach` — baseline MRR, churn, LTV, CAC.
2. `signup-flow-cro` — audit and optimize the signup funnel.
3. `paywall-upgrade-cro` — pricing page and trial-to-paid flow.
4. `form-cro` — every other user-facing form.
5. `feature-flags` — gradual rollouts and A/B tests.
6. `multi-tenant` — when expanding to team or B2B plans.
7. Measure against the baseline, then repeat.

## B2B multi-tenant expansion

Convert a single-tenant SaaS to multi-tenant for team and enterprise plans. Rough range: 2 to 4 weeks.

1. `multi-tenant` — choose the tenancy model (schema-per-tenant or row-level security).
2. `database-designer` + `drizzle-neon` — redesign the schema for tenancy.
3. `better-auth` — organizations and RBAC.
4. `stripe-subscriptions` — per-organization billing.
5. `webhook-patterns` — tenant-aware webhook processing.
6. `feature-flags` — per-tenant feature gating.
7. `api-design` — tenant-scoped endpoints.
