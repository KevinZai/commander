---
name: ccc-saas
description: "Route SaaS work to the right specialist sub-skill: scaffolding, auth, database, API, frontend, Stripe billing, webhooks, multi-tenancy, feature flags, metrics and conversion. Use when building, billing or growing a SaaS product."
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
argument-hint: "[new | auth | db | api | frontend | billing | webhooks | tenancy | flags | metrics | cro]"
model: inherit
effort: medium
---

# /ccc-saas — SaaS work, routed

**CC Commander** · ccc-saas · picks the SaaS sub-skill (or pair) for the request and follows it, one at a time.

The user's selected model is preserved. Codex: ask each picker as a plain-text question with the same options.

## When to use / when not to

- Use for SaaS products: new scaffolds, auth, schema, APIs, Next.js frontends, Stripe billing, webhooks, tenancy, flags, metrics and conversion work.
- Use `/ccc-build` for non-SaaS apps, `/ccc-marketing` for campaigns and copy, and `/ccc-deploy` for releases.

## Sub-skills

Each lives at `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` and loads only when this router reads it.

| Sub-skill | Use for | Not for |
|---|---|---|
| `saas-router` | A routing questionnaire when the request spans many areas | Doing the work |
| `saas-scaffolder` | A new SaaS from a starter template with database, auth, billing and env wired | Existing codebases |
| `better-auth` | Better Auth: email/password, OAuth, organizations, RBAC, magic links, 2FA | Signup conversion |
| `database-designer` | Normalization, indexing, query optimization, schema evolution | Tenancy-specific schema |
| `drizzle-neon` | Drizzle ORM with Neon Postgres: schema, migrations, relations, pooling | Other ORMs |
| `multi-tenant` | Schema-per-tenant, row-level security, subdomain routing, tenant-aware queries | Single-tenant design |
| `api-design` | REST naming, status codes, pagination, errors, versioning, rate limits | Framework specifics |
| `backend-patterns` | Service layer, repositories, dependency injection, job queues | Webhook delivery |
| `fastify-api` | Fastify with schema validation, plugins, hooks, Zod or TypeBox | Express or Next routes |
| `nextjs-app-router` | App Router: server components, server actions, streaming, metadata | Styling |
| `shadcn-ui` | shadcn/ui components: setup, theming, composition, variants | Routing |
| `tailwind-v4` | Tailwind CSS v4: CSS-first config, `@theme`, container queries | Tailwind v3 config files |
| `stripe-subscriptions` | Checkout, webhook verification (raw body), portal, usage-based billing | Pricing-page UX |
| `billing-automation` | Invoicing, dunning, grace periods, usage metering, revenue recognition | Analytics |
| `webhook-patterns` | Receiving and sending: signatures, retries, idempotency, dead-letter queues | Stripe-only handlers |
| `feature-flags` | PostHog, LaunchDarkly or custom flags, gradual rollouts, A/B tests | Pricing experiments |
| `saas-metrics-coach` | MRR, churn, LTV, CAC, NRR, cohorts, investor-ready dashboards | Billing operations |
| `signup-flow-cro` | Signup, registration and trial activation conversion | Auth implementation |
| `paywall-upgrade-cro` | Paywalls, upgrade screens, upsell modals, trial-to-paid | Stripe API work |
| `form-cro` | Non-signup forms: lead capture, contact, demo, multi-step | Signup flows |

## Common requests

| Request | Route |
|---|---|
| New SaaS, no codebase | `saas-scaffolder` first |
| Auth, login, users | `better-auth` |
| Billing, subscriptions | `stripe-subscriptions`, then `billing-automation` |
| Schema design | `database-designer`, then `drizzle-neon` |
| Frontend pages and UI | `nextjs-app-router`, then `shadcn-ui` and `tailwind-v4` |
| API or backend | `api-design`, then `fastify-api` or `backend-patterns` |
| Styling, theming, dark mode | `tailwind-v4` and `shadcn-ui` |

Campaigns (greenfield, add billing, growth phase, B2B multi-tenant) are in [references/campaigns.md](references/campaigns.md).

## What happens

1. **Read the project state** in one Bash call; missing files are not errors:

   ```bash
   test -f package.json && grep -oE '"(next|fastify|drizzle-orm|better-auth|stripe|tailwindcss|@neondatabase/serverless)"' package.json | sort -u
   ls drizzle.config.* components.json 2>/dev/null
   ```

   No `package.json` and a build request means a new project: route to `saas-scaffolder`.

2. **Route.** An argument or an unambiguous request maps to the tables above (`new` → `saas-scaffolder`, `db` → `database-designer`, `tenancy` → `multi-tenant`, `flags` → `feature-flags`, `metrics` → `saas-metrics-coach`, `cro` → a follow-up picker with the three CRO sub-skills). Otherwise go to Decision points.

3. **Load one sub-skill.** Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` (repo fallback: `skills/ccc-saas/<sub-skill>/SKILL.md`). If the file is missing, say so and stop. For a listed pair, finish the first before reading the second.

4. **Do the work** as the sub-skill directs, matching the stack found in step 1 rather than the sub-skill's defaults when they differ.

5. **Verify.** After any code change, run the project's own checks from `package.json` (for example `npm run typecheck`, `npm test`, `npm run build`), then `git status --short`. For schema changes, generate the migration (`npx drizzle-kit generate` with Drizzle) and show it before anything applies it. Report the actual output; on failure, fix within scope and rerun.

## Decision points

No argument and no clear intent: ask with AskUserQuestion (header "SaaS"):

- 🟢 Start a new SaaS — `saas-scaffolder`, then the greenfield campaign
- Add or fix a feature — a follow-up picker: auth, database, API, frontend
- Billing — `stripe-subscriptions` and `billing-automation`
- Grow it — metrics and conversion: `saas-metrics-coach` first

## Done when

- Routing only: the sub-skill file was read and the user knows which one is active.
- Code changed: the project's checks exited 0 in this turn and `git status --short` lists only the intended files.
- Schema changed: the generated migration was shown to the user before it was applied.

## Guardrails

- Never apply a migration to a shared or production database, create live Stripe products or prices, or register production webhooks without the user's explicit OK at that moment.
- Use Stripe test mode keys for development; never write secret keys into the repo.
- Never load several sub-skills at once; route, execute, then move on.
- Keep CRO sub-skills (conversion) separate from implementation sub-skills (auth, billing).

## See also

- `/ccc-build` — non-SaaS apps, APIs and CLIs
- `/ccc-design` — visual direction and design tokens
- `/ccc-deploy` — releases and environments
- `/ccc-marketing` — launch copy and campaigns
