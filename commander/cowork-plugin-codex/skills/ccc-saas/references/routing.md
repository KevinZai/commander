# /ccc-saas — sub-skills and routing

Reference for SKILL.md step 2. Sub-skills ship with the Commander CLI toolkit (`skills/ccc-saas/<name>/SKILL.md` in the repository). When one is not available in the session, apply the focus in its row.

## Sub-skills

| Area | Sub-skill | Focus |
|---|---|---|
| Routing and scaffold | `saas-router` | Picks the specialist; recommends `saas-scaffolder` first for a new project |
| | `saas-scaffolder` | Starter template customized with database, auth, billing and environment configuration |
| Auth and users | `better-auth` | Email/password, OAuth, organizations, RBAC, 2FA, magic links |
| Database | `database-designer` | Schema design, normalization, indexing |
| | `drizzle-neon` | Drizzle ORM with Neon Postgres: migrations, relations, serverless |
| API | `api-design` | REST naming, status codes, pagination, errors, versioning, rate limits |
| | `backend-patterns` | Service layer, repositories, job queues, server-side practice |
| | `fastify-api` | Fastify plugins, hooks, schema validation |
| Frontend | `nextjs-app-router` | Server/client components, server actions, streaming, route groups |
| | `shadcn-ui` | Owned components, variants, forms, data tables, theming |
| | `tailwind-v4` | CSS-first configuration with `@theme`, container queries, v3 migration |
| Billing | `stripe-subscriptions` | Checkout sessions, webhook verification (raw body), customer portal, usage billing, proration, trials |
| | `billing-automation` | Recurring invoicing, subscription lifecycle, dunning |
| Growth | `saas-metrics-coach` | MRR, ARR, churn, LTV, CAC, NRR from the user's numbers |
| | `signup-flow-cro` | Signup, registration and trial-activation friction |
| | `paywall-upgrade-cro` | Paywalls, upgrade screens, feature gates, free-to-paid |
| | `form-cro` | Non-signup forms: lead capture, demo request, checkout |
| Advanced | `multi-tenant` | Schema-per-tenant or row-level security, subdomain routing, tenant-aware queries |
| | `webhook-patterns` | Signature verification, retries, idempotency, dead-letter queues, local testing |
| | `feature-flags` | PostHog, LaunchDarkly or custom flags, gradual rollout, A/B tests, flag cleanup |

## Intent routing

| Intent | Route to |
|---|---|
| "Scaffold a new SaaS" | `saas-scaffolder` |
| "Set up auth", "add login" | `better-auth` |
| "Add billing", "Stripe setup" | `stripe-subscriptions` + `billing-automation` |
| "Design my database" | `database-designer` + `drizzle-neon` |
| "Build the frontend", "UI" | `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` |
| "Build an API" | `api-design` + `fastify-api` + `backend-patterns` |
| "Track MRR", "churn analysis" | `saas-metrics-coach` |
| "Improve signup conversion" | `signup-flow-cro` |
| "Pricing page", "trial conversion" | `paywall-upgrade-cro` |
| "Optimize this form" (not signup) | `form-cro` |
| "Multi-tenant", "B2B SaaS" | `multi-tenant` |
| "Webhooks" | `webhook-patterns` |
| "Feature flags", "gradual rollout" | `feature-flags` |

## Campaigns

### Greenfield SaaS (zero to MVP)

1. `saas-scaffolder` — generate the project from the starter
2. `database-designer` + `drizzle-neon` — schema
3. `better-auth` — authentication and authorization
4. `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` — UI shell
5. `api-design` + `backend-patterns` — API layer
6. `stripe-subscriptions` + `billing-automation` — billing (test mode)
7. `webhook-patterns` — event handling
8. `signup-flow-cro` — onboarding

### Add billing to an existing app

1. `stripe-subscriptions` — checkout, portal, webhook route
2. `webhook-patterns` — idempotent event storage and retries
3. `billing-automation` — invoicing and dunning
4. `paywall-upgrade-cro` — upgrade screens and feature gates

### Growth phase

1. `saas-metrics-coach` — baseline MRR, churn, LTV, CAC
2. `signup-flow-cro` — audit the signup funnel
3. `paywall-upgrade-cro` — pricing page and trial-to-paid
4. `feature-flags` — gradual rollouts and A/B tests
5. `multi-tenant` — B2B and team-plan expansion

## Examples

| User says | Route |
|---|---|
| "Start a new SaaS project with auth and Stripe billing" | `saas-scaffolder` → `better-auth` → `stripe-subscriptions` |
| "Add multi-tenant support to my existing app" | `multi-tenant` (schema-per-tenant or RLS selection) |
| "Improve my trial-to-paid conversion rate" | `paywall-upgrade-cro` + `feature-flags` |
