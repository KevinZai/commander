# Dependabot alert scope note (2026-07-17)

The majority of open Dependabot alerts in this repo (116 of 153 as of this audit) originate from
`skills/engineering-pack/dependency-auditor/test-project/package.json` and
`skills/engineering-pack/dependency-auditor/assets/sample_requirements.txt`. These are **intentional
fixtures** for the dependency-auditor skill's vulnerability-scanning demo — they declare deliberately
outdated packages (including known-CVE versions of mongoose, Django, and Pillow) so the skill can
demonstrate CVE detection against a static `test-inventory.json` golden output. They are never
installed (no lockfile for the npm fixture), never executed, and pose no risk to users of the plugin.

**Do not bump these fixture versions without also regenerating `test-inventory.json`** — the demo's
"vulnerable input" and "expected output" must stay in sync, and no automated test currently guards
that pairing. (This is why Dependabot PRs against `test-project/` are held rather than auto-merged.)

Real, actionable alerts are scoped to:

| Area | Exposure | Status |
|---|---|---|
| `apps/mcp-server-cloud/` | Deployed (deploy-mcp.yml) | hono bumped to ≥4.12.25 (GHSA-88fw-hqm2-52qc, CORS-with-credentials) 2026-07-17 |
| `site/` | Deployed (deploy.yml) | protobufjs (DoS) + ws (DoS) transitive highs — tracked, patch on next site dependency pass (pnpm overrides required for transitive bumps; not worth a risky lockfile churn for DoS-class issues on a static marketing site) |
| `dashboard/` | Local-only dev tool (127.0.0.1:4690) | vite devDependency — bump opportunistically; zero shipped exposure |
| `video/` | Dev-only Remotion render tooling; output is a static mp4/gif | Dependabot PRs #24–26 merged for hygiene 2026-07-17 |
| root `package-lock.json` | devDependencies only (published npm package's sole runtime dep is `figlet`) | bump via `npm audit fix` when next touching root deps |

Method: `gh api repos/KevinZai/commander/dependabot/alerts --paginate`, classification verified by
reading the actual manifests and deploy workflows (not path-guessing). Full triage in the 2026-07-17
session notes.
