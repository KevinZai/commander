# Quickstart Guide: Full-Stack Developer

> Build complete applications with CC Commander. Mode switching, combined CCC domains, database patterns, auth flows, billing, testing, and deployment.

---

## Recommended Mode: SaaS

Full-stack development lives in SaaS mode. Switch immediately:

```
/cc mode saas
```

SaaS mode changes Claude's behavior:
- **Architecture-first** — plans before coding, considers scalability from the start
- **TDD by default** — writes tests alongside implementation, not as an afterthought
- **Security-conscious** — checks for injection, auth bypasses, rate limiting gaps
- **Production-ready** — error handling, logging, monitoring built in from line one

### Mode Switching for Full-Stack

Full-stack projects touch every layer. Switch modes as you move through the stack:

| Working on... | Use mode | Why |
|---------------|----------|-----|
| Landing page, UI components, animations | `design` | Visual quality, critique loop, accessibility checks |
| API routes, database, auth, billing | `saas` | Architecture rigor, TDD, security posture |
| Configuration, scripts, tooling, CI/CD | `normal` | Balanced approach, plan-first |
| Quick spike or proof of concept | `yolo` | Speed over quality, skip confirmations |
| Long-running migration or overnight build | `night` | Autonomous with checkpoints, cost-aware |

Switching is instant and free. There is no cost or penalty. Switch 3-5 times per feature.

---

## Combined CCC Domains

Full-stack projects benefit from loading multiple CCC domains in the same session. The routers inside each CCC domain share context, so they work better loaded together.

### The Full SaaS Stack

```
use ccc-saas skill      # Auth, billing, DB, API, frontend (20 skills)
use ccc-design skill    # Landing page, animations, polish (35+ skills)
use ccc-testing skill   # TDD, E2E, verification (testing domain)
```

This gives you **70+ specialist skills** covering the complete SaaS lifecycle.

### The Marketing Stack

```
use ccc-saas skill       # Product backend
use ccc-design skill     # Frontend polish
use ccc-seo skill        # Search optimization, structured data
use ccc-marketing skill  # Content strategy, CRO, email sequences
```

### The Infrastructure Stack

```
use ccc-saas skill       # Application code
use ccc-devops skill     # CI/CD, Docker, monitoring, Terraform
use ccc-security skill   # Security hardening, OWASP, dependency audit
use ccc-testing skill    # All testing types
```

**Tip:** Load CCC domains at the start of your session. You do not need to reload them for each request.

---

## Full Workflow: /init to Deploy

### Step 1: Initialize the Project

```
/init
```

The decision tree walks you through project type selection. For full-stack, select "SaaS" or "Full-Stack". CC Commander configures your project's `CLAUDE.md` with stack-specific rules, file structure conventions, and recommended skills.

### Step 2: Choose a Starter Template

```
/cc templates
```

Three starter templates ship with CC Commander:

| Template | Stack | What You Get |
|----------|-------|-------------|
| `nextjs` | Next.js 15 + Tailwind v4 + shadcn/ui | App Router, route groups, dark mode, TypeScript strict |
| `api` | Fastify + Drizzle + Postgres | Service layer, repository pattern, Zod validation, error handling |
| `cli` | Node.js + Commander + Ink | CLI scaffolding with argument parsing, interactive prompts |

Or skip templates and describe your stack:

```
/plan
Build a full-stack SaaS with Next.js 15, Drizzle ORM, Neon Postgres,
Better Auth, Stripe billing, and shadcn/ui v4.
```

### Step 3: Switch to SaaS Mode

```
/cc mode saas
use ccc-saas skill
```

### Step 4: Build the Backend

Start with the data model. The schema is the source of truth:

```
use database-designer skill
Design a schema for [your domain]: [describe entities and relationships]
```

Then build the API layer:

```
use api-design skill
Build REST endpoints for [resource]: CRUD + [custom operations]
```

Write tests alongside:

```
/tdd
Write integration tests for the [resource] API endpoints
```

### Step 5: Build the Frontend

Switch to design mode for UI work:

```
/cc mode design
use ccc-design skill
Build the [feature] page with [components]
```

Then wire frontend to backend:

```
/cc mode normal
Connect the [feature] page to the API. Handle loading, error, and empty states.
```

### Step 6: Add Auth, Billing, Infra

```
/cc mode saas
use better-auth skill — set up email/password + OAuth + RBAC
use stripe-subscriptions skill — add billing with webhooks
use ccc-devops skill — Docker, CI/CD, monitoring
```

### Step 7: Test Everything

```
/tdd            # Unit + integration tests
/e2e            # End-to-end user flows
/verify         # Full verification loop
```

### Step 8: Ship

```
/checkpoint     # Git commit
/deploy         # Build, test, push, deploy
```

---

## Database Patterns

### Supabase (Managed Postgres + Auth + Storage)

```
use ccc-saas skill

Set up Supabase with:
- Postgres database with Row Level Security (RLS)
- Supabase Auth (email/password + OAuth providers)
- Supabase Storage for file uploads
- Real-time subscriptions for live data
- Edge Functions for server-side logic
- Drizzle ORM as the query layer (not the Supabase JS client for complex queries)
```

Supabase tips:
- Use RLS policies for authorization — they run at the database level, not the application level
- Drizzle ORM gives you type-safe queries with better control than the Supabase JS client
- Edge Functions handle server-side logic without a separate API server
- Use database webhooks to trigger external services on data changes

### PostgreSQL with Drizzle ORM (Self-Managed or Neon)

```
use drizzle-neon skill

Set up Drizzle ORM with Neon Postgres:
- Schema definition with TypeScript (drizzle-orm/pg-core)
- Push-based migrations (drizzle-kit push)
- Relational query builder for complex joins
- Connection pooling via Neon's built-in pooler
- Type-safe queries — schema changes break compilation, not runtime
```

Drizzle patterns:
- Define schemas in `src/db/schema/` with one file per entity
- Use `drizzle-kit push` for development, `drizzle-kit generate` + `drizzle-kit migrate` for production
- Relational queries (`db.query.users.findMany({ with: { posts: true } })`) replace raw JOINs
- Index frequently queried columns — Drizzle schema supports inline index definitions

### Database Design Workflow

```
use database-designer skill

1. Describe your domain entities and relationships
2. The skill generates a normalized schema with:
   - Primary keys (UUID or serial)
   - Foreign keys with cascade rules
   - Indexes on frequently queried columns
   - Timestamps (created_at, updated_at)
   - Soft delete (deleted_at) if appropriate
3. Review the schema diagram
4. Generate Drizzle schema files
5. Generate seed data for development
```

---

## API + Frontend Integration

### tRPC (Type-Safe API Layer)

For Next.js projects, tRPC eliminates the API boundary:

```
use ccc-saas skill

Set up tRPC v11 with:
- Router definitions in src/server/routers/
- Input validation with Zod schemas
- React Query integration on the client
- Server-side caller for Server Components
- Middleware for auth, logging, rate limiting
```

tRPC patterns:
- Procedures map to your service layer — keep business logic out of procedure handlers
- Use Zod `.transform()` for input normalization (trim strings, lowercase emails)
- Server-side callers let Server Components call tRPC procedures directly (no HTTP overhead)
- Subscriptions via WebSocket for real-time features

### REST API (Express or Fastify)

```
use api-design skill
use backend-patterns skill

Build a REST API with:
- Fastify (preferred) or Express
- Route -> Controller -> Service -> Repository layer pattern
- Zod validation on all request bodies
- Consistent error response format: { success, data, error, meta }
- Pagination: cursor-based for feeds, offset-based for tables
- Rate limiting per endpoint
- OpenAPI spec generation from route definitions
```

### Frontend Data Fetching

```
use nextjs-app-router skill

Data fetching strategy:
- Server Components: fetch data directly (no client-side fetching)
- Client Components: TanStack Query for server state (not useState + useEffect)
- Server Actions: form submissions and mutations
- Optimistic updates: useMutation with onMutate for instant UI feedback
- Error boundaries: catch and display errors gracefully per component
```

Key rule: Never put API data in React state. Use TanStack Query (or SWR) for server state. Use React state only for UI state (modals, form inputs, toggles).

---

## Auth Flows

### Better Auth (Recommended)

```
use better-auth skill

Set up Better Auth with:
- Email/password authentication
- OAuth providers (Google, GitHub, Discord)
- Magic link (passwordless)
- Two-factor authentication (TOTP)
- Organizations with role-based access (owner, admin, member)
- Session management with secure cookies
- Rate limiting on auth endpoints
```

Better Auth advantages:
- Framework-agnostic — works with Next.js, Remix, SvelteKit, plain Express
- Built-in organization/team support with RBAC
- Session-based (not JWT) — revocable, server-validated
- Handles edge cases: account linking, email verification, password reset

### Auth Patterns

Regardless of auth library, follow these patterns:

1. **Protect API routes** — middleware that validates the session before handlers run
2. **Protect pages** — Server Component checks session; redirect to `/login` if absent
3. **Role-based access** — check user role before rendering admin UI or executing admin actions
4. **Session refresh** — extend session on activity, expire on inactivity
5. **CSRF protection** — enabled by default in most frameworks; verify it is not disabled
6. **Rate limiting** — 5 login attempts per minute per IP, increasing lockout on failure

---

## Billing with Stripe

```
use stripe-subscriptions skill
use billing-automation skill

Set up Stripe billing:
- Products and prices in Stripe Dashboard (or via API)
- Checkout Session for new subscriptions
- Customer Portal for self-service management
- Webhook handler for subscription lifecycle events:
  - checkout.session.completed -> provision access
  - customer.subscription.updated -> update plan
  - customer.subscription.deleted -> revoke access
  - invoice.payment_failed -> dunning flow (warn user, retry, grace period)
- Usage-based billing (if applicable): meter events, usage records
- Entitlement checks: gate features based on subscription tier
```

Billing patterns:
- **Never trust the client** — always verify subscription status server-side via Stripe API
- **Webhook idempotency** — store the Stripe event ID and skip duplicates
- **Grace period** — do not revoke access immediately on payment failure; send warnings first
- **Free tier** — always have one; it reduces friction and lets users try before buying
- **Pricing page** — use `paywall-upgrade-cro` skill for conversion-optimized pricing UI

---

## Webhooks

```
use ccc-saas skill

Webhook handler patterns:
- Verify signatures (Stripe, GitHub, etc.) before processing
- Respond with 200 immediately, then process asynchronously
- Idempotency: store event IDs to prevent double-processing
- Retry handling: webhooks will retry on failure — make handlers idempotent
- Dead letter queue: log failed events for manual inspection
- Timeout: webhook handlers must respond within 30 seconds
```

---

## Testing Strategy

### Unit Tests (Vitest)

```
/tdd
Write unit tests for:
- Service layer functions (business logic)
- Utility functions (formatters, validators, parsers)
- React components (render, interaction, edge cases)
```

Vitest configuration:
- `vitest.config.ts` with path aliases matching `tsconfig.json`
- Mock external dependencies (database, APIs, third-party services)
- Coverage threshold: 80% lines, 80% branches

### Integration Tests (Vitest + Supertest)

```
/tdd
Write integration tests for:
- API endpoints (request -> response -> database state)
- Auth flows (register -> login -> access protected route -> logout)
- Webhook handlers (simulate Stripe events -> verify side effects)
```

Integration test patterns:
- Use a test database (separate from development)
- Seed data before each test, clean up after
- Test the full request/response cycle including middleware

### E2E Tests (Playwright)

```
/e2e
Write E2E tests for critical user flows:
- Sign up -> verify email -> complete onboarding -> see dashboard
- Create resource -> edit -> delete -> verify gone
- Upgrade plan -> see new features -> downgrade -> features gated
```

Playwright configuration:
- `playwright.config.ts` with multiple browsers (Chromium, Firefox, WebKit)
- Base URL pointing to test server
- Screenshot on failure for debugging
- Parallel execution across test files

---

## Stack-Specific Tips

### Next.js + T3 Stack

```bash
npx create-t3-app@latest my-app
cd my-app
claude
/init   # Select SaaS build type
```

```
/cc mode saas
use ccc-saas skill

Set up the T3 stack with:
- App Router with route groups: (marketing), (auth), (dashboard)
- tRPC v11 with Zod input validation
- Drizzle ORM with Neon Postgres
- Better Auth for authentication
- Stripe for billing
- shadcn/ui v4 with dark mode
```

T3 patterns:
- Server Components for data display, Client Components only for interactivity
- tRPC procedures call service functions — never put business logic in procedures
- Drizzle relational queries for complex joins
- Server Actions for form submissions (simpler than tRPC for mutations)

### Remix / React Router v7

```bash
npx create-remix@latest my-app
cd my-app
claude
/init
```

```
Build a Remix application with:
- Nested routes with loaders and actions
- Server-side form handling (no client-side state for forms)
- Optimistic UI with useFetcher
- Drizzle ORM for database
- Cookie-based sessions
- Progressive enhancement (works without JavaScript)
```

Remix patterns:
- Loaders and actions handle data on the server — use them instead of client-side fetch
- Forms work without JavaScript by default — this is the Remix way
- `useFetcher` for non-navigation mutations (likes, toggles, inline edits)

### MERN Stack

```
/plan
Build a MERN stack application with:

Backend (Express):
- TypeScript strict mode
- Mongoose ODM with typed schemas
- JWT auth with refresh token rotation
- Express middleware: cors, helmet, rate-limit, auth
- Zod validation on all endpoints

Frontend (React + Vite):
- React 19 with TypeScript
- TanStack Query for server state
- TanStack Router for type-safe routing
- Tailwind v4
- React Hook Form + Zod for forms
```

MERN-specific tips:
- Use `backend-patterns` skill for Express middleware architecture
- Use `api-design` skill for consistent REST conventions
- Mongoose schemas should validate, but also validate with Zod at the API boundary
- Use TanStack Query for server state — do not put API data in React state

---

## Full-Stack Workflow: Phase by Phase

### Phase 1: Plan (15 minutes)

```
/plan
Describe the complete feature: what it does, who uses it,
what data it needs, what UI it requires.
```

Review the plan. Verify it covers: database, API, auth/authorization, frontend, tests, and deployment.

### Phase 2: Database and API (1-2 hours)

```
/cc mode saas
use ccc-saas skill

Start with the database schema and API endpoints.
```

Write tests alongside implementation:

```
/tdd
Write integration tests for the [feature] API endpoints.
```

### Phase 3: Frontend (1-2 hours)

```
/cc mode design
use ccc-design skill

Build the UI for [feature].
```

Run the critique loop:

```
use critique skill on the [feature] page
```

### Phase 4: Integration (30 minutes)

```
/cc mode normal

Wire the frontend to the API. Handle loading states, error states,
and empty states. Test the full flow end-to-end in the browser.
```

### Phase 5: Testing (30 minutes)

```
/tdd
Write E2E tests for the complete [feature] user flow.
```

### Phase 6: Verify and Ship

```
/verify         # Full verification loop
/checkpoint     # Git commit with conventional message
```

---

## Power Tips

1. **Mode switching is your superpower** — full-stack devs should switch modes 3-5 times per feature. Design mode for UI, saas mode for backend, normal for integration.

2. **Use Task Commander for features > 4 hours** — it prevents scope creep and ensures nothing gets forgotten. The work breakdown alone is worth it even if you execute manually.

3. **Frontend and backend in parallel** — use `/spawn team 2 frontend backend` to dispatch two peers working simultaneously when the frontend and backend can be built independently against an API contract.

4. **Test at every boundary** — unit tests for business logic, integration tests for API endpoints, E2E tests for user flows. CC Commander's `/tdd` and `/e2e` commands make this painless.

5. **Database first, always** — the schema is the source of truth. Get the data model right before writing API or UI code. Use `database-designer` skill for the initial schema.

6. **Do not skip the plan** — full-stack features have the most moving parts. A 15-minute `/plan` saves hours of rework.

7. **Use `/compact` between phases** — full-stack work generates long contexts. Compact between database/API and frontend phases to keep output quality high.

8. **Infrastructure is not an afterthought** — set up Docker, CI/CD, and monitoring as part of the feature, not after it. Use `ccc-devops` alongside `ccc-saas`.

9. **Auth before UI** — implement authentication and authorization before building protected pages. It is much harder to retrofit auth than to build on it from the start.

10. **Billing from day one** — if your app will have paid tiers, integrate Stripe during initial setup. Retrofitting billing into an existing app requires touching every feature for entitlement checks.
