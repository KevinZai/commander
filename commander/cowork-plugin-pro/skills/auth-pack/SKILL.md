---
name: ccc-pro-auth
description: "[C:pro] — SAML, OIDC, and enterprise identity provider scaffolds · Pro tier only"
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

- Scaffold SAML 2.0 SP metadata and assertion consumer service handlers
- Wire OIDC Authorization Code flow with PKCE (RFC 7636 compliant)
- Generate Okta integration: app registration, attribute mapping, group sync
- Generate Auth0 integration: tenant config, rules/actions, M2M credentials
- Generate Azure AD / Entra ID integration: app registration, manifest, MSAL config
- Scaffold JIT (just-in-time) user provisioning with conflict resolution
- Add MFA enforcement at the middleware layer (TOTP + WebAuthn)
- Generate role-based access control schema + middleware stubs (RBAC)
- Add session security hardening: rotation, sliding windows, device fingerprinting
- Scaffold SSO test suite: happy path, expired assertion, replayed token, IdP-initiated
- Generate identity provider migration runbook (Okta → Auth0, Auth0 → Cognito, etc.)
- Add passwordless flows: magic link + passkey (WebAuthn Level 2)
- Scaffold OAuth 2.0 client credentials flow for M2M / service accounts
- Wire logout: SLO (Single Logout) for SAML, end_session for OIDC

## Why Pro-only

Enterprise identity patterns require deep, opinionated scaffolding against 6+ IdP vendor APIs — each with its own quirks, SDK versions, and compliance gotchas. The curation and testing burden is high. This pack will save 2–4 weeks of integration work per project.

## Coming in v4.2

This skill is scaffolded. Full implementation ships in v4.2. Sign up at [cc-commander.com/pro](https://cc-commander.com/pro) to get notified and receive early access.

## Tier check

This skill checks `isPro()` from `commander/cowork-plugin/lib/license.js` before running. If your license tier is `starter`, it surfaces an upgrade prompt and exits cleanly — no partial scaffolding, no silent failure.

## Reference

- [Pricing and tiers](https://cc-commander.com/pricing)
- [Free vs Pro comparison](https://cc-commander.com/free-vs-pro)
- [License activation](/plugin/license-activation)
