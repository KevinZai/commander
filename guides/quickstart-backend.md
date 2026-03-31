# Quickstart Guide: Backend Developer

> Build robust APIs, databases, and services with CC Commander. SaaS mode, CCC domains, and production-grade patterns.

---

## SaaS Mode Setup

Switch to SaaS mode for backend development:

```
/cc mode saas
```

SaaS mode changes Claude's behavior:
- **Architecture-first** — prioritizes clean separation of concerns
- **Auth-aware** — considers authentication and authorization at every layer
- **Database-conscious** — plans schema design before writing queries
- **Production-grade** — includes error handling, logging, rate limiting, and input validation by default
- **Test-driven** — writes tests alongside implementation

### One-Time Setup

For the best backend experience:

```
/init
```

When the decision tree asks about your build type, select "API" or "SaaS." CC Commander configures stack-specific rules including database patterns, API conventions, and testing standards in your project's `CLAUDE.md`.

---

## Key CCC Domains for Backend

### ccc-saas (Primary)

Load the entire SaaS domain:

```
use ccc-saas skill
```

This gives you access to **20 SaaS skills** through a single router.

| Category | Skills | What They Do |
|----------|--------|-------------|
| **Auth** | better-auth, auth-patterns | Authentication flows, session management, OAuth, JWT, RBAC |
| **Billing** | stripe-subscriptions, billing-automation, paywall-upgrade-cro | Stripe integration, subscription lifecycle, metered billing |
| **Database** | database-designer, database-migrations, drizzle-neon, postgres-patterns, redis-patterns | Schema design, migrations, query optimization, caching |
| **API** | api-design, fastify-api, backend-patterns | REST/GraphQL design, validation, error handling, middleware |
| **Metrics** | saas-metrics-coach, metrics-dashboard, analytics-product | MRR tracking, churn analysis, usage analytics |

### ccc-devops (Deployment + Infrastructure)

```
use ccc-devops skill
```

| Category | Skills | What They Do |
|----------|--------|-------------|
| **CI/CD** | github-actions-reusable-workflows, github-actions-security | Pipeline design, secret management, reusable workflows |
| **Containers** | docker-development, container-security | Dockerfile optimization, multi-stage builds, security scanning |
| **Cloud** | aws-solution-architect, aws-lambda-best-practices, aws-s3-patterns, aws-cloudfront-optimization, aws-iam-security | AWS architecture, serverless, CDN, IAM policies |
| **Monitoring** | grafana-dashboards, prometheus-configuration, promql-alerting, sentry-automation | Dashboards, alerts, error tracking, APM |
| **Deploy** | setup-deploy, land-and-deploy, infra-runbook | Zero-downtime deploy, rollback strategies, runbooks |

### ccc-data (Data + Analytics)

```
use ccc-data skill
```

| Category | Skills | What They Do |
|----------|--------|-------------|
| **Pipelines** | ETL design, data ingestion, stream processing | Data pipeline architecture |
| **Storage** | Data warehousing, schema design, partitioning | Storage optimization |
| **Analytics** | Analytics engineering, visualization, dashboards | Business intelligence |

---

## Prompt Templates for Backend

### REST API

```
Build a REST API with Express/Fastify that serves:
- GET /api/v1/users — paginated list (cursor-based)
- GET /api/v1/users/:id — single user with relations
- POST /api/v1/users — create user (validated with Zod)
- PATCH /api/v1/users/:id — partial update
- DELETE /api/v1/users/:id — soft delete

Requirements:
- Input validation with Zod schemas
- Consistent error response format: { error: { code, message, details } }
- Rate limiting (100 req/min per IP)
- Request logging with correlation IDs
- TypeScript strict mode
- Tests with Vitest + supertest
```

### Database Schema

```
use database-designer skill

Design a database schema for a project management app:
- Users (name, email, avatar, role)
- Projects (name, description, owner, status)
- Tasks (title, description, assignee, project, priority, status, due_date)
- Comments (body, author, task, parent_comment for threading)

Requirements:
- PostgreSQL (via Drizzle ORM)
- Proper indexes for common queries
- Soft delete on all tables
- Created/updated timestamps
- Cascade rules for deletions
```

### Authentication

```
use better-auth skill

Set up authentication for a Next.js app:
- Email/password registration with email verification
- OAuth providers: Google, GitHub
- Session management (HTTP-only cookies)
- RBAC: admin, member, viewer roles
- Password reset flow
- Rate limiting on auth endpoints
- CSRF protection

Use better-auth library. PostgreSQL for session storage.
```

### Background Jobs

```
Build a job queue system using BullMQ + Redis:
- Email sending queue (with retry, backoff)
- Image processing queue (thumbnail generation)
- Webhook delivery queue (with dead letter queue)
- Scheduled jobs (daily report generation)

Requirements:
- Typed job payloads (Zod schemas)
- Dashboard endpoint for queue status
- Graceful shutdown handling
- Failed job alerting
- Configurable concurrency per queue
```

---

## Framework-Specific Tips

### Node.js / Express / Fastify

```bash
mkdir my-api && cd my-api
npm init -y
claude
/init   # Select API when asked
```

Key patterns CC Commander enforces:
- **Repository pattern** — data access behind interfaces
- **Service layer** — business logic separated from routes
- **Validation middleware** — Zod schemas at the boundary
- **Error handling** — centralized error handler, no try/catch in routes
- **Structured logging** — pino with correlation IDs

```
use ccc-saas skill. Build a Fastify API with:
- Route/service/repository layers
- Drizzle ORM with PostgreSQL
- Zod validation on all inputs
- JWT auth with refresh tokens
- OpenAPI spec generation
```

### Laravel (PHP)

```bash
composer create-project laravel/laravel my-app
cd my-app
claude
/init   # Select Laravel when asked
```

Key skills for Laravel:
- `laravel-patterns` — Eloquent, service classes, form requests, jobs, events
- `laravel-tdd` — Feature tests, unit tests, database factories
- `laravel-verification` — Laravel-specific verification checklist

```
use laravel-patterns skill. Build a multi-tenant SaaS with:
- Team-based tenancy (shared database, scoped queries)
- Spatie permissions for RBAC
- Laravel Cashier for Stripe billing
- Event-driven architecture (events + listeners + queues)
- Feature tests for all endpoints
```

### Python / FastAPI

```bash
mkdir my-api && cd my-api
python -m venv .venv && source .venv/bin/activate
claude
/init   # Select Python API when asked
```

Key skills:
- `python-patterns` — async patterns, Pydantic models, dependency injection
- `python-testing` — pytest fixtures, parameterized tests, mocking

```
Build a FastAPI service with:
- Pydantic v2 models for request/response
- SQLAlchemy 2.0 async with PostgreSQL
- Alembic migrations
- Background tasks with Celery
- Structured logging with structlog
- 90%+ test coverage with pytest
```

---

## Database Patterns

### Schema Design Workflow

```
Step 1: use database-designer skill
Step 2: Describe your domain entities and relationships
Step 3: Review the schema — check indexes, constraints, cascade rules
Step 4: Generate migrations with Drizzle or Alembic
Step 5: Write seed data for development
Step 6: /verify — check for missing indexes, N+1 query risks
```

### Common Database Skills

| Pattern | Skill | Use When |
|---------|-------|----------|
| PostgreSQL optimization | `postgres-patterns` | Query tuning, indexes, JSONB, full-text search |
| Redis caching | `redis-patterns` | Session storage, rate limiting, job queues, pub/sub |
| Drizzle + Neon | `drizzle-neon` | Serverless PostgreSQL with TypeScript ORM |
| ClickHouse analytics | `clickhouse-io` | High-volume analytics, time-series data |
| Migrations | `database-migrations` | Schema versioning, zero-downtime migrations |

---

## Testing Strategy

### Test Pyramid for Backend

```
Unit tests (70%) — individual functions, utilities, validators
  - Fast, isolated, no I/O
  - Mock external dependencies
  - Vitest or pytest

Integration tests (20%) — API endpoints, database operations
  - Real database (test container or in-memory)
  - HTTP requests via supertest or httpx
  - Seed data with factories

E2E tests (10%) — critical user flows
  - Full stack running
  - Playwright for browser flows
  - API client for service-to-service
```

### TDD Workflow

```
/tdd

Build the user registration endpoint:
1. POST /api/v1/auth/register
2. Validates: email (unique), password (8+ chars, 1 uppercase, 1 number)
3. Hashes password with bcrypt
4. Creates user in database
5. Sends verification email (queued)
6. Returns 201 with user object (no password)

Write tests first. I want to see them fail before implementation.
```

---

## API Design Patterns

### Consistent Response Format

All API responses should follow a standard envelope:

```typescript
// Success
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150 }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

### Pagination

Prefer cursor-based pagination over offset-based for large datasets:

```
GET /api/v1/users?cursor=eyJpZCI6MTAwfQ&limit=20

Response:
{
  "data": [...],
  "meta": {
    "next_cursor": "eyJpZCI6MTIwfQ",
    "has_more": true
  }
}
```

### Versioning

Use URL-based versioning (`/api/v1/`, `/api/v2/`) for public APIs. Header-based versioning is acceptable for internal services.

---

## Deployment Patterns

### Docker Development

```
use docker-development skill

Create a Docker Compose setup with:
- App container (Node.js or Python)
- PostgreSQL 16
- Redis 7
- Development hot-reload
- Production multi-stage build
- Health checks on all services
```

### CI/CD Pipeline

```
use github-actions-reusable-workflows skill

Create a GitHub Actions pipeline:
- Lint + type check on every PR
- Run tests with PostgreSQL service container
- Build Docker image on merge to main
- Deploy to staging automatically
- Deploy to production on manual approval
```

### Monitoring

```
use ccc-devops skill

Set up monitoring for a production API:
- Prometheus metrics endpoint (/metrics)
- Grafana dashboard (request rate, latency p50/p95/p99, error rate)
- PagerDuty alerts for: >1% error rate, p99 >500ms, disk >80%
- Structured logging with request correlation IDs
- Sentry for error tracking with source maps
```

---

## Power Tips

1. **Always `/plan` before building an API** — route design, schema design, and auth decisions are expensive to change later. Plan mode catches design issues early.

2. **Load `ccc-saas` once per session** — the router remembers context. You do not need to reload it for each request within the same session.

3. **Use `database-designer` before writing any schema** — it checks for missing indexes, improper cascade rules, and normalization issues that cause pain later.

4. **Test at the integration level for APIs** — unit tests on route handlers add little value. Test the full request/response cycle including validation, auth, and database operations.

5. **Validate at the boundary, trust internally** — use Zod/Pydantic at API entry points. Internal functions can trust the data has been validated.

6. **Use `/cc mode saas` for the full lifecycle** — it combines API design, database patterns, auth, billing, and deployment into a single coherent workflow.

7. **Rate limit everything** — every public endpoint should have rate limiting. CC Commander's API patterns include this by default.

8. **Soft delete by default** — use `deleted_at` timestamps instead of `DELETE`. CC Commander's database patterns enforce this.

---

## Recommended First Backend Project

New to CC Commander's backend workflow? Build this:

```
/cc mode saas
/init       # Select API template

/plan
Build a bookmark manager API:
- Users can register and login
- Users can create, list, update, and delete bookmarks
- Bookmarks have: url, title, description, tags (array)
- Users can search bookmarks by title or tag
- Paginated responses (cursor-based)

Tech: Fastify, Drizzle ORM, PostgreSQL, Zod validation, JWT auth.
Write tests alongside implementation.
```

This covers: auth, CRUD, search, pagination, validation, testing — the core backend patterns you will use in every project.
