---
name: saas-mode
description: Full-stack SaaS development — auth, billing, DB, CI/CD with production-readiness focus
tags: [mode]
disable-model-invocation: true
---

# SaaS Mode

## Overview

Optimizes Claude for building and maintaining SaaS products end-to-end. Loads the full SaaS stack (auth, billing, database, API, frontend, growth optimization) plus DevOps (CI/CD, infrastructure, monitoring, deployment). Claude thinks in production terms — error handling, scaling, security, billing edge cases, uptime.

## Skills Loaded

**Primary mega-skills:**
- `mega-saas` — 20 SaaS specialist skills (scaffold, auth, billing, DB, API, frontend, growth, multi-tenant, feature flags)
- `mega-devops` — CI/CD, infrastructure, monitoring, deployment, container security

**Key sub-skills surfaced:**
- `saas-scaffolder` — End-to-end project scaffolding
- `better-auth` — Authentication, authorization, RBAC, organizations
- `stripe-subscriptions` + `billing-automation` — Billing lifecycle
- `database-designer` + `drizzle-neon` — Schema design and ORM
- `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` — Frontend stack
- `api-design` + `backend-patterns` — API layer
- `multi-tenant` — Multi-tenancy patterns
- `webhook-patterns` — Robust webhook handling
- `feature-flags` — Plan-gated features and rollouts
- `saas-metrics-coach` — MRR, churn, LTV tracking

## Behavioral Instructions

- **Confirmation flow:** acceptEdits — confirm all file changes before applying
- **Production mindset:** Every line of code should be production-ready. No "we'll fix this later" shortcuts.
- **Security first:** Validate all inputs. Parameterize all queries. Never trust user data. Check auth on every endpoint.
- **Error handling:** Comprehensive error boundaries. User-friendly messages in UI, detailed logs on server. Never leak stack traces.
- **Billing edge cases:** Always consider: failed payments, plan downgrades mid-cycle, webhook retries, idempotency, race conditions.
- **Database discipline:** Migrations for every schema change. Indexes on query patterns. Never raw SQL without parameterization.
- **Testing expectations:** Integration tests for API endpoints. Unit tests for business logic. E2E for critical user flows (signup, billing, auth).
- **Scalability awareness:** Consider connection pooling, caching layers, queue-based processing for heavy operations.
- **Monitoring:** Suggest logging, metrics, and alerting for any production-facing code.
- **Feature gating:** Use feature flags for new features. Never hard-code plan restrictions.

## Hook Emphasis

| Hook | Priority | Reason |
|------|----------|--------|
| auto-checkpoint | Elevated | SaaS work spans many files; frequent save points are critical |
| confidence-gate | Elevated | Wrong decisions in auth/billing are expensive to reverse |
| cost-alert | Standard | |
| context-guard | Standard | |
| session-coach | Standard | |

## Context Strategy

- **Pre-flight check:** Verify context is below 50% before entering — two mega-skills are loaded
- **Compact threshold:** Compact at 65% to preserve room for both mega-skill instructions
- **Priority in context:** Schema files, API routes, auth config, billing handlers, environment config
- **Deprioritize:** Marketing copy, design polish, documentation (unless directly relevant)

## Pre-flight Checklist

- [ ] Confirm context usage is below 50% (two mega-skills require headroom)
- [ ] Identify the existing stack (framework, DB, auth provider, billing provider)
- [ ] Check for `.env` / environment configuration (never commit secrets)
- [ ] Verify database connection and migration status
- [ ] Confirm deployment target (Vercel, AWS, Docker, etc.)
- [ ] Check if this is greenfield or existing codebase (determines entry point)
