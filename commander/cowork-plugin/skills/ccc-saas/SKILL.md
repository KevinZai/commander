---
name: ccc-saas
description: "SaaS router: scaffold, auth, database, API, frontend, Stripe billing, webhooks, multi-tenancy, feature flags, metrics. Use to build or bill a SaaS."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
  - AskUserQuestion
argument-hint: "[new | auth | db | api | ui | billing | webhooks | tenant | flags | metrics | cro]"
model: inherit
---

# /ccc-saas — SaaS work, routed

**CC Commander** · /ccc-saas · the right SaaS method for the job, from scaffold to revenue.

SaaS sub-skills (`saas-router`, `saas-scaffolder`, `better-auth`, `database-designer`, `drizzle-neon`, `api-design`, `backend-patterns`, `fastify-api`, `nextjs-app-router`, `shadcn-ui`, `tailwind-v4`, `stripe-subscriptions`, `billing-automation`, `webhook-patterns`, `multi-tenant`, `feature-flags`, `saas-metrics-coach`, `signup-flow-cro`, `paywall-upgrade-cro`, `form-cro`) ship with the Commander CLI toolkit. Invoke one with the Skill tool when it is listed in this session; otherwise apply the focus in [references/routing.md](references/routing.md). The user's selected model is preserved.

Codex: ask pickers as plain-text questions.

## When to use / when not to

- Use for a multi-user product with accounts, billing or tenants: new SaaS, adding auth or Stripe, schema and API design, upgrade and signup conversion, SaaS metrics.
- Use `/ccc-build` for a plain web app, API or CLI without SaaS concerns, `/ccc-design` for visual direction, `/ccc-marketing` for acquisition beyond the product funnel, `/ccc-data` for warehouse and analytics pipelines.

## What happens

### 1. Detect the stack

Run in one Bash call, silent on failure:

```bash
test -f package.json && grep -oE '"(next|fastify|express|drizzle-orm|@neondatabase/serverless|prisma|better-auth|next-auth|@clerk/nextjs|stripe|tailwindcss|posthog-js|launchdarkly-node-server-sdk)"' package.json | sort -u
ls drizzle.config.* components.json prisma/schema.prisma 2>/dev/null
```

Render one line:

> 🏗️ Stack: `<tools detected | none detected>`

### 2. Route by intent, or ask

An argument or a clear intent routes straight to the sub-skill(s) in [references/routing.md](references/routing.md). `new`, or no codebase with a build request, goes to step 3. A request that spans several areas (zero to MVP, add billing, growth) follows the matching campaign in that file, one sub-skill per step, and confirms the sequence with the user before the first write.

Otherwise ask with AskUserQuestion (header "SaaS"), recommended first:

- 🟢 Add or fix a core feature — auth, database, API or UI for the detected stack
- Billing — `stripe-subscriptions` + `billing-automation` (checkout, portal, webhooks, dunning)
- Grow — `saas-metrics-coach`, `signup-flow-cro`, `paywall-upgrade-cro`
- More — multi-tenancy, webhooks, feature flags or form conversion (a follow-up picker)

### 3. New SaaS

Follow `saas-scaffolder` (default starter: Next.js App Router, shadcn/ui, Tailwind v4, Drizzle with Neon Postgres, Better Auth, Stripe). Ask for a product name, derive `<slug>`, and confirm with AskUserQuestion (🟢 Create it · Change the stack · Cancel) before running anything, since it downloads packages. Create the project in a sub-directory, never inside an existing project's root. Write `.env.example` with placeholder names only; real values go in the gitignored `.env.local`.

Check: `cd <slug> && npm run build` (or the starter's typecheck script).

### 4. Do the work

Follow the routed sub-skill. After any code change, run the project's own checks in one Bash call and report them:

```bash
npm run -s typecheck 2>/dev/null || npx tsc --noEmit; npm test --silent; git status --short
```

Billing and webhooks: verify with Stripe test mode only, using `stripe listen --forward-to localhost:<port>/api/webhooks/stripe` and `stripe trigger checkout.session.completed` when the Stripe CLI is installed. Confirm the handler verifies the signature against the raw body.

## Done when

- Routing only: the sub-skill was invoked or its guidance applied, and the user knows which one.
- New SaaS: `<slug>/` exists and its build or typecheck exited 0 in this turn; report its output.
- Code changed: typecheck and tests exited 0 and `git status --short` lists only the intended files.
- Billing or webhooks changed: a test-mode event reached the handler and returned 2xx, or the user is told exactly which step could not run here.

## Guardrails

- Never use live Stripe keys, create live products or prices, issue refunds, or change a live subscription; test mode only unless the user authorizes a specific live action at that moment.
- Never write secrets (Stripe keys, auth secrets, database URLs) into tracked files; `.env.example` holds names only.
- Never run a database migration against production; generate it, show it, and let the user apply it.
- Never deploy, publish a pricing page, or email users from this skill; hand off to `/ccc-deploy` or `/ccc-ship` with authorization.
- Multi-tenant changes: every tenant-scoped query filters by tenant id or relies on row-level security; flag any query that does neither.

## See also

- `/ccc-build` — non-SaaS apps, APIs and CLIs
- `/ccc-security` — auth and tenant-isolation review
- `/ccc-deploy` — ship the app once checks are green
- `/ccc-marketing` — acquisition and launch beyond the product funnel

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
