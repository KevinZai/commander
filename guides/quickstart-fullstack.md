# Quickstart Guide: Full-Stack Developer

> Build complete applications from database to deployment. Combines backend + frontend workflows with the Bible's SaaS mode.

---

## The Full-Stack Bible Workflow

Full-stack development touches every layer. The Bible's SaaS mode is designed specifically for this — it combines API design, database patterns, frontend architecture, auth, and deployment into a single coherent workflow.

```
/cc mode saas
```

SaaS mode gives you:
- **Full lifecycle** — schema to UI to deployment
- **Auth-first** — authentication and authorization considered at every layer
- **Type-safe** — shared types between frontend and backend
- **Production-grade** — error handling, logging, monitoring, and testing included by default

---

## Recommended Stack

The Bible has deep skill support for these stacks. You can use any stack, but these have the most specialized skills:

### Primary Stack (Most Bible Skills)

| Layer | Technology | Bible Skill |
|-------|-----------|-------------|
| Frontend | Next.js 15 (App Router) | `nextjs-app-router` |
| UI Components | shadcn/ui v4 | `shadcn-ui` |
| Styling | Tailwind CSS v4 | `tailwind-v4` |
| ORM | Drizzle | `drizzle-neon` |
| Database | PostgreSQL (Neon) | `postgres-patterns` |
| Auth | better-auth | `better-auth` |
| Billing | Stripe | `stripe-subscriptions` |
| Caching | Redis | `redis-patterns` |
| Testing | Vitest + Playwright | `tdd-workflow`, `e2e-testing` |
| Deploy | Docker + AWS | `docker-development`, `aws-solution-architect` |

### Alternative Stacks

| Stack | Bible Skills |
|-------|-------------|
| Vue/Nuxt + Fastify | `vue-nuxt`, `fastify-api` |
| Laravel (PHP monolith) | `laravel-patterns`, `laravel-tdd`, `laravel-verification` |
| SvelteKit + Prisma | `frontend-design`, `database-designer` |
| Python FastAPI + React | `python-patterns`, `frontend-patterns` |

---

## Project Setup: From Zero to Running App

### Step 1: Initialize

```bash
mkdir my-saas && cd my-saas
npx create-next-app@latest . --typescript --tailwind --app --src-dir
claude
```

### Step 2: Configure with the Bible

```
/init
```

Select "SaaS" when the decision tree asks about your build type. The wizard configures:
- Project `CLAUDE.md` with full-stack conventions
- TypeScript strict mode
- Testing setup (Vitest + Playwright)
- Linting and formatting rules

### Step 3: Load the Mega-Skills

```
use mega-saas skill
```

This loads 20 SaaS-specific skills. For the frontend layer, you can also load:

```
use mega-design skill
```

Both routers coexist in the same session.

### Step 4: Plan the Architecture

```
/plan
Build a SaaS project management app with:

Backend:
- PostgreSQL with Drizzle ORM
- User auth (email + Google OAuth) via better-auth
- REST API: projects, tasks, team members
- Role-based access: owner, admin, member, viewer
- Stripe billing: free, pro ($19/mo), team ($49/mo)

Frontend:
- Next.js 15 App Router
- shadcn/ui components with dark mode
- Dashboard layout with sidebar navigation
- Project board (Kanban-style)
- Settings page for billing and team management

Requirements:
- Type-safe API layer (shared Zod schemas)
- Cursor-based pagination
- Optimistic updates on the frontend
- Full test coverage (unit + integration + E2E)
```

### Step 5: Build Layer by Layer

The Bible recommends building in this order:

```
1. Database schema + migrations       (foundation)
2. Auth setup (registration, login)   (security first)
3. API endpoints + validation         (data layer)
4. Frontend layout + routing          (structure)
5. UI components + data fetching      (features)
6. Billing integration                (monetization)
7. E2E tests                          (verification)
8. Deploy pipeline                    (ship it)
```

Execute each phase:

```
Execute phase 1 of the plan: database schema and migrations.
```

---

## Key Workflows

### Schema-First Development

Always start with the database schema. The Bible's `database-designer` skill catches issues that are expensive to fix later.

```
use database-designer skill

Design the schema for phase 1. Include:
- All entities with their relationships
- Proper indexes for common queries
- Soft delete on all tables
- Created/updated timestamps
- Cascade rules for deletions
- Enum types for status fields
```

Review the schema before generating migrations. Check for:
- Missing indexes on foreign keys
- N+1 query risks
- Proper cascade behavior (what happens when a user is deleted?)
- Enum values covering all states

### Shared Type Safety

The biggest full-stack productivity gain: share types between frontend and backend.

```
Set up shared Zod schemas for the API layer:
- Define schemas in a shared /lib/schemas/ directory
- Backend uses them for request validation
- Frontend uses them for form validation and type inference
- API response types are inferred from the schemas

This eliminates type drift between frontend and backend.
```

### Auth Integration

Auth touches both frontend and backend. The Bible's `better-auth` skill handles both sides:

```
use better-auth skill

Set up authentication across the full stack:
- Backend: session management, OAuth callbacks, RBAC middleware
- Frontend: login/register pages, protected routes, role-based UI
- Shared: user type definitions, permission checks

Include:
- Email/password registration with email verification
- Google OAuth
- Session persistence (HTTP-only cookies)
- Protected API routes (middleware)
- Protected pages (Next.js middleware)
- Role-based UI (show/hide based on permissions)
```

### Frontend + API Integration

```
Build the dashboard page that:
1. Fetches projects from GET /api/v1/projects (Server Component)
2. Shows a grid of ProjectCards (Client Component for interactions)
3. Has a "New Project" button that opens a modal form
4. Form validates with the shared Zod schema
5. Submits via POST /api/v1/projects (Server Action)
6. Optimistically adds the project to the grid
7. Shows a toast notification on success/error
```

---

## Testing Full-Stack Applications

### Three Layers of Tests

```
Unit (70%) — individual functions, utilities, validators, components
  - Vitest for logic
  - React Testing Library for components
  - Mock API calls and database

Integration (20%) — API endpoints with real database
  - Vitest + supertest
  - Test containers or in-memory database
  - Seed data with factories

E2E (10%) — critical user flows in the browser
  - Playwright
  - Full stack running
  - Test: registration -> login -> create project -> invite member -> complete task
```

### TDD for Full-Stack Features

```
/tdd

Build the "invite team member" feature:

Backend:
- POST /api/v1/projects/:id/invites — send invitation email
- POST /api/v1/invites/:token/accept — accept invitation
- Only project owners and admins can invite
- Invitations expire after 7 days

Frontend:
- "Invite" button on project settings page
- Email input with validation
- Role selector (admin, member, viewer)
- Pending invitations list with resend/revoke

Write tests for both backend and frontend first.
```

### E2E Testing with Playwright

```
use e2e-testing skill

Write E2E tests for the critical user flows:
1. New user: register -> verify email -> first project -> add task
2. Team collaboration: invite member -> member joins -> assigns task
3. Billing: upgrade to pro -> verify features unlocked -> downgrade
4. Settings: change password -> logout -> login with new password

Each test should be independent and use factory functions for setup.
```

---

## Deployment Patterns

### Development Environment

```
use docker-development skill

Create a Docker Compose setup for local development:
- Next.js app with hot reload
- PostgreSQL 16
- Redis 7
- Mailpit (email testing)
- Health checks on all services
- Volume mounts for persistent data
- Environment variable management (.env.example)
```

### Production Pipeline

```
use setup-deploy skill

Set up the production deployment:
1. GitHub Actions CI: lint -> typecheck -> test -> build -> push Docker image
2. Staging: auto-deploy on merge to main
3. Production: deploy on tag (v1.0.0) or manual approval
4. Database migrations run automatically before deploy
5. Rollback strategy: revert to previous Docker image
6. Health check endpoint: GET /api/health
```

### Monitoring

```
use mega-devops skill

Set up production monitoring:
- Application: Sentry for error tracking (frontend + backend)
- Infrastructure: Prometheus + Grafana (request rate, latency, error rate)
- Uptime: health check endpoint polled every 30 seconds
- Alerts: PagerDuty for critical issues, Slack for warnings
- Logging: structured JSON logs with request correlation IDs
```

---

## Full-Stack Patterns

### API Route Organization (Next.js)

```
src/
  app/
    api/
      v1/
        auth/
          register/route.ts
          login/route.ts
          logout/route.ts
        projects/
          route.ts                # GET (list), POST (create)
          [id]/
            route.ts              # GET, PATCH, DELETE
            tasks/
              route.ts            # GET (list), POST (create)
              [taskId]/
                route.ts          # GET, PATCH, DELETE
    (marketing)/                  # Public pages (landing, pricing)
      page.tsx
      pricing/page.tsx
    (dashboard)/                  # Authenticated pages
      layout.tsx                  # Sidebar, auth check
      projects/page.tsx
      projects/[id]/page.tsx
      settings/page.tsx
```

### Environment Variables

```
# .env.example — commit this (no secrets)
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# .env.local — do NOT commit (actual secrets)
```

### Error Handling Pattern

```
Centralized error types (shared between frontend and backend):
- Backend: throw AppError -> middleware catches -> formatted response
- Frontend: API client catches -> displays toast or inline error

The Bible's api-design skill generates this pattern automatically.
```

---

## Power Tips

1. **Schema first, always** — the database schema determines your API shape, which determines your frontend types. Getting the schema right saves hours of refactoring.

2. **Share Zod schemas** — define once in `/lib/schemas/`, import everywhere. Frontend forms and backend validation use the same source of truth.

3. **Use Server Components for data fetching** — keep `"use client"` to interactive components only. Server Components fetch data without client-side waterfalls.

4. **Build auth early** — auth touches every layer. Building it last means retrofitting protected routes, which is error-prone.

5. **Test the seams** — the highest-value tests are at the boundary between layers: API endpoints (integration) and user flows (E2E).

6. **Use `/cc mode saas` for the full lifecycle** — it provides coherent guidance across all layers. Switching modes mid-feature is fine when you need focused design work.

7. **Checkpoint after each phase** — `/checkpoint` after completing each phase of the plan. You can always roll back to a known-good state.

8. **Deploy early, deploy often** — set up CI/CD in phase 1, not phase 8. Deploying early catches environment-specific issues when they are cheap to fix.

---

## Recommended First Full-Stack Project

New to the Bible's full-stack workflow? Build this:

```
/cc mode saas
/init       # Select SaaS template

/plan
Build a URL shortener SaaS:

Database:
- Users (email, password_hash, plan)
- Links (short_code, original_url, user_id, click_count, created_at)
- Clicks (link_id, timestamp, referrer, country, device)

API:
- POST /api/v1/links — create short link (auth required)
- GET /api/v1/links — list user's links with click stats
- GET /:code — redirect to original URL (public, tracks click)
- GET /api/v1/links/:id/analytics — click analytics (auth required)

Frontend:
- Landing page with "try it" form (no auth needed for 1 link)
- Dashboard: list links, click chart, create new link
- Analytics page: clicks over time, top referrers, device breakdown

Auth: email/password, free tier (50 links), pro tier (unlimited + analytics)
Stack: Next.js 15, Drizzle, PostgreSQL, shadcn/ui, Tailwind v4
```

This covers: auth, CRUD, analytics, public routes, protected routes, billing tiers, and responsive UI — the core full-stack patterns you will use in every project.
