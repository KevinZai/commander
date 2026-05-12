# CC Commander Pro — Premium Skill Packs

This directory contains the Pro tier skill collection for CC Commander.

All packs require a valid Pro license (monthly, annual, or lifetime) to activate.
License validation is handled by `commander/cowork-plugin/lib/license.js`.

## Packs (5 total — scaffolded, shipping in v4.2)

| Pack | Skill name | Focus |
|------|-----------|-------|
| `auth-pack` | `ccc-pro-auth` | SAML, OIDC, Okta/Auth0/Azure AD, passkeys |
| `saas-pack` | `ccc-pro-saas` | Multi-tenant RLS, billing, invitations, RBAC |
| `migration-pack` | `ccc-pro-migration` | Zero-downtime schema changes, backfills, rollbacks |
| `observability-pack` | `ccc-pro-observability` | OpenTelemetry, Honeycomb, Datadog, SLO alerts |
| `chaos-pack` | `ccc-pro-chaos` | Fault injection, circuit breakers, resilience testing |

## Status

All 5 packs are currently **scaffolded** — skill manifests and capability outlines are complete.
Full implementation ships in **v4.2** (target: 2026-Q3).

Early access for lifetime license holders will open 2 weeks before the public release.

## License requirement

Each skill calls `isPro()` from `commander/cowork-plugin/lib/license.js` on invocation.
Non-Pro sessions receive a prompt directing to [commanderplugin.com/pricing](https://commanderplugin.com/pricing).

To activate your license, see the [activation guide](https://commanderplugin.com/docs/plugin/license-activation).

## Not included in Starter

These packs are the primary Pro differentiator. Starter tier includes all 60 plugin skills
in `commander/cowork-plugin/skills/` — those will never be paywalled.
