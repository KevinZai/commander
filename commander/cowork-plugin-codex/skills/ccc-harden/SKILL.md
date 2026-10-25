---
name: ccc-harden
description: "Pre-launch production hardening audit across hosting, GitHub, error tracking, analytics, payments, secrets/PII headers and Cloudflare. Read-only by default; per-pillar fixes only with approval. Findings stay local. Use when preparing a launch or security review, or after config changes."
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
argument-hint: "[audit | fix <pillar> | pillar <name> | setup]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# $ccc-harden — Production hardening audit

**CC Commander** · $ccc-harden · a severity-ranked hardening report for the current site, with manual and auto-fixable actions separated.

The pillar engine is the optional `harden-site` skill (pillar scripts with `--audit`, `--fix`, `--json`). When it is not installed, the skill runs the read-only native checks in [references/pillars.md](references/pillars.md). The user's selected model is preserved.

Codex: ask the pickers as plain-text questions.

## Pillars

| # | Pillar | Verifies |
|---|---|---|
| 1 | Vercel | project link, env vars, response headers, deploy protection, domain |
| 2 | GitHub linkage | remote, branch tracking, `.gitignore` coverage, clean tree |
| 3 | GitHub org | branch protection, Dependabot, secret scanning, CODEOWNERS |
| 4 | Sentry | SDK, DSN, source maps, alert rules, sample rate |
| 5 | PostHog | SDK, env vars, autocapture config, event allowlist |
| 6 | Plausible | script, site id, goals, recent traffic |
| 7 | Clarity | script, project id |
| 8 | Google | GA4, Search Console, sitemap, Tag Manager |
| 9 | Stripe | keys present, webhook configured, test/live separation |
| 10 | Secrets & PII | gitleaks scan, CSP/HSTS/X-Frame headers, `.env` audit, log scrubbing |
| 11 | Cloudflare | DNS, TLS, bot management, caching, HTTP/3, WAF |

## When to use / when not to

- Use for a pre-launch checklist, before a security review or compliance audit, a periodic health check, after a refactor that touched config, or when a leaked secret is suspected.
- Not for: a pre-MVP or local-only project; application code vulnerabilities (`$ccc-security`); a quick pre-deploy gate (`$ccc-deploy-check`); Commander's own health (`$ccc-doctor`).

## What happens

1. **Find the engine.**
   ```bash
   H="${HARDEN_SITE_DIR:-$HOME/.claude/skills/harden-site}"
   ls "$H"/pillars/*.sh 2>/dev/null || echo "harden-site engine not installed"
   ```
   Engine present: use it for steps 3–6 and Read its `SKILL.md` first. Absent: use [references/pillars.md](references/pillars.md) for steps 3–4 (read-only; fixes become manual actions).

2. **Load or create `.harden.json`** at the project root (site, tier, enabled pillars). Missing: `bash "$H/lib/tier.sh"` classifies the site as production, staging, parked or personal and writes the file; ask before running it, then show the result so the user can switch pillars off for services they do not use. Without the engine, ask which pillars apply and Write the same shape:
   ```json
   { "site": "example.com", "tier": "production", "pillars": { "vercel": true, "github-linkage": true, "github-org": true, "sentry": false, "posthog": false, "plausible": false, "clarity": false, "google": false, "stripe": false, "secrets-pii": true, "cloudflare": true } }
   ```

3. **Pick the mode** with the mode picker (Decision points). `audit`, `pillar <name>` and `fix <pillar>` skip the picker.

4. **Run the enabled pillars, read-only.** Without the engine, run each enabled pillar's commands from [references/pillars.md](references/pillars.md) instead. With it:
   ```bash
   for pillar in "$H"/pillars/*.sh; do
     name=$(basename "$pillar" .sh | sed 's/^[0-9]*-//')
     [ "$(jq -r --arg n "$name" '.pillars[$n] // false' .harden.json)" = "true" ] || continue
     bash "$pillar" --audit; echo "pillar=$name exit=$?"
   done
   ```
   Add `--json` for machine-readable checks. Per-pillar exit codes: 0 pass, 1 warnings, 2 failures, 3 credential unavailable (pillar skipped). Pillars that call a hosting or account API read tokens through the engine's secret-manager helper; if it reports a missing token, tell the user to sign in to their secret manager themselves (for 1Password, `op signin`). A skipped pillar is unavailable coverage, not a pass and not a failure.

5. **Aggregate** into one report: totals (checks, pass, warn, fail, skipped), findings ranked CRITICAL → HIGH → MEDIUM → LOW, the top manual actions, the top auto-fixable items, and the list of skipped pillars with the reason. Exit-code status alone does not prove readiness; cite the check lines behind every CRITICAL and HIGH.

6. **Fix one pillar at a time, only on approval.** For each pillar the user picks:
   1. Show what the pillar's `--fix` will change and the current state.
   2. Copy each local file it will modify to `<file>.bak` (for example `vercel.json`, `.gitignore`).
   3. For changes to a remote account (GitHub branch protection, Cloudflare zone settings, Vercel project settings), name the exact account and project in the confirmation picker.
   4. Run `bash "$H/pillars/<nn>-<pillar>.sh" --fix`, then rerun the same pillar with `--audit` and report the before and after counts.
   Never run `--fix` across all pillars from one general approval.

7. **Next step** with the next-step picker. "Save report" writes `.harden.report.md`; first check `git check-ignore -q .harden.report.md` and, if it is not ignored, offer to add it to `.gitignore`. "Create tracker issues" uses the Linear connector only when it is connected and the user says yes to the exact list.

## Exit behavior

| Result | Exit | Report line |
|---|---|---|
| All pass | 0 | ✅ Ready to ship. |
| Warnings only | 1 | 🟡 Review warnings before launch. |
| Failures | 2 | 🔴 Block launch until fixes are applied. |
| Missing credentials | 3 | ⏭️ Pillar skipped: sign in to the secret manager to cover it. |

## Decision points

Mode (AskUserQuestion, 2–4 options):
- 🟢 Audit only: read-only, nothing changes
- Single pillar: pick one of the enabled pillars (asks again)
- Audit, then fix: audit first, then pick pillars to fix one at a time

Next step after the report:
- 🟢 Fix a pillar: shows the planned change and asks for that pillar
- Save report: writes `.harden.report.md` locally
- Create tracker issues: Linear connector, only the manual actions you approve
- Done: you triage manually

## Done when

- Every pillar in `.harden.json` either ran in this turn (its exit code shown) or is listed as skipped with the reason.
- Every applied fix was followed by a rerun of that pillar's audit, with before and after counts reported.
- A saved report exists at `.harden.report.md` and `git check-ignore` confirms it is ignored, or the user declined.

## Guardrails

- This skill sends no findings anywhere: no telemetry, no upload. Reports render in the terminal or a local file.
- Never print, paste or commit tokens; never ask the user to paste a token into the chat or into `.env` files.
- Never run `--fix` without a per-pillar yes, and never against an account or project the user did not name.
- Never quote secret values from scan output; use gitleaks `--redact` and file paths only.
- Tracker issues and remote account changes each need their own explicit yes.

## See also

- `$ccc-security` — application security lanes and threat modeling
- `$ccc-deploy-check` — quick pre-deploy gate
- `$ccc-deploy` — the deploy itself, with this report as a precondition
- `$ccc-doctor` — Commander install health

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
