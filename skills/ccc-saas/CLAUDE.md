# KZ Mega-SaaS -- Architecture

This CCC domain contains 20 SaaS specialist skills organized for full-stack SaaS development, from scaffold to scale.

## Skill Map

### Foundation
- `saas-router/` -- Central routing (start here)
- `saas-scaffolder/` -- Project scaffolding from starter templates

### Auth & Users
- `better-auth/` -- Authentication, authorization, organizations, RBAC, 2FA, magic links

### Database
- `database-designer/` -- Schema design, normalization, indexing, query optimization
- `drizzle-neon/` -- Drizzle ORM + Neon Postgres (serverless, migrations, relations)

### API
- `api-design/` -- REST conventions, versioning, pagination, error envelopes
- `backend-patterns/` -- Service layer, repository pattern, DI, job queues
- `fastify-api/` -- Fastify-specific patterns (plugins, hooks, TypeBox validation)

### Frontend
- `nextjs-app-router/` -- Next.js 15+ App Router (server components, actions, streaming)
- `shadcn-ui/` -- shadcn/ui v4 component library (theming, composition, variants)
- `tailwind-v4/` -- Tailwind CSS v4 (CSS-first config, @theme, modern utilities)

### Billing
- `stripe-subscriptions/` -- Stripe Checkout, webhooks, customer portal, usage-based billing
- `billing-automation/` -- Invoicing, dunning, grace periods, revenue recognition

### Growth
- `saas-metrics-coach/` -- MRR, churn, LTV, CAC, cohort analysis, dashboards
- `signup-flow-cro/` -- Signup funnel optimization, onboarding, progressive profiling
- `paywall-upgrade-cro/` -- Pricing page CRO, trial-to-paid conversion, upsell triggers
- `form-cro/` -- Form UX optimization, multi-step forms, abandonment recovery

### Advanced
- `multi-tenant/` -- Multi-tenancy (schema-per-tenant, RLS, subdomain routing)
- `webhook-patterns/` -- Webhook receiving/sending, signature verification, retries
- `feature-flags/` -- Feature flags (PostHog, LaunchDarkly, custom), gradual rollouts, A/B testing

## Usage Flow

1. Check what the user needs -- new project or existing?
2. Route via the Routing Matrix in SKILL.md
3. For new projects, start with `saas-scaffolder`
4. Load ONE specialist skill at a time
5. Follow Campaign Templates for multi-step workflows

## Dependency Graph

```
saas-scaffolder
  -> database-designer + drizzle-neon (schema)
  -> better-auth (auth)
  -> nextjs-app-router + shadcn-ui + tailwind-v4 (frontend)
  -> stripe-subscriptions + billing-automation (billing)
  -> webhook-patterns (webhooks for Stripe + third-party)
  -> feature-flags (plan-gated features)
  -> saas-metrics-coach (tracking from day one)
```

## Anti-Patterns

- Don't load all 20 skills simultaneously -- route, execute, iterate
- Don't skip `saas-scaffolder` on greenfield projects -- it wires everything correctly
- Don't confuse CRO skills (signup-flow-cro, paywall-upgrade-cro, form-cro) with implementation skills (better-auth, stripe-subscriptions)
- Don't use `database-designer` for multi-tenant schema -- use `multi-tenant` instead
- Don't handle webhooks ad-hoc -- use `webhook-patterns` for idempotency and retry logic
- Don't hardcode feature access -- use `feature-flags` for plan-gated features
