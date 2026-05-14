---
name: ccc-pro-saas
description: "Multi-tenant SaaS scaffolds: row-level security, billing, invitations · Pro tier only"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
tier: pro
status: scaffolded
target_release: v4.2
---

## What this pack will do

- Scaffold multi-tenant data model: `organizations`, `memberships`, `invitations` tables
- Generate Postgres row-level security policies per tenant (service-role bypass + user-scoped reads)
- Wire Stripe billing: subscription lifecycle, webhook handler, upgrade/downgrade/cancel flows
- Wire Lemon Squeezy billing as an alternative to Stripe (same interface, swappable)
- Generate usage-based billing schema: metered events, aggregation, invoice line items
- Scaffold invitation system: token-based invite links, expiry, resend, revoke
- Add organization-level RBAC: owner / admin / member / read-only roles with permission matrix
- Generate onboarding wizard: org creation → plan selection → invite teammates → first project
- Scaffold team management UI: member list, role editing, remove member, transfer ownership
- Add audit log schema + write path: who did what, when, with rollback metadata
- Generate impersonation (support tooling): safe admin-impersonate with audit trail
- Scaffold white-label support: custom domains, logo, brand color overrides per org
- Add feature flag system: org-level flags, gradual rollout, killswitch
- Generate SaaS health dashboard: MRR, churn, active orgs, seat utilization

## Why Pro-only

Multi-tenant SaaS patterns span database schema, backend middleware, billing integration, and frontend flows. Getting RLS wrong causes data leakage across tenants — a production security incident. The depth of correct scaffolding here far exceeds what fits in a free skill.

## Coming in v4.2

This skill is scaffolded. Full implementation ships in v4.2. Sign up at [commanderplugin.com/pro](https://commanderplugin.com/pro) to get notified and receive early access.

## Tier check

This skill checks `isPro()` from `commander/cowork-plugin/lib/license.js` before running. If your license tier is `starter`, it surfaces an upgrade prompt and exits cleanly — no partial scaffolding, no silent failure.

## Reference

- [Pricing and tiers](https://commanderplugin.com/pricing)
- [Free vs Pro comparison](https://commanderplugin.com/free-vs-pro)
- [License activation](/plugin/license-activation)
