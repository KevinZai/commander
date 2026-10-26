# CC Commander Pro skill packs (paused)

**Status: paused.** The packs below are scaffolds: skill manifests and capability outlines only. They are not implemented, not sold, have no release date, and are not part of the published plugin. Whether to finish, archive or replace them is an open product decision; until it is made, nothing here changes.

| Pack | Skill name | Focus |
|------|-----------|-------|
| `auth-pack` | `ccc-pro-auth` | SAML, OIDC, Okta/Auth0/Azure AD, passkeys |
| `saas-pack` | `ccc-pro-saas` | Multi-tenant RLS, billing, invitations, RBAC |
| `migration-pack` | `ccc-pro-migration` | Zero-downtime schema changes, backfills, rollbacks |
| `observability-pack` | `ccc-pro-observability` | OpenTelemetry, Honeycomb, Datadog, SLO alerts |
| `chaos-pack` | `ccc-pro-chaos` | Fault injection, circuit breakers, resilience testing |

No license gating is enforced: `commander/cowork-plugin/hooks/license-check.js` is an explicit no-op. The scaffolds' text describes an `isPro()` check that is not wired to anything.

The published plugin is `commander/cowork-plugin/`; all 84 plugin skills there are included with every install.
