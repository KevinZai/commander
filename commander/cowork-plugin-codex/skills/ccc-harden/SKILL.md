---
name: ccc-harden
description: "Production hardening audit across 11 pillars (Vercel, GitHub, Sentry, PostHog, Stripe, Cloudflare, Secrets/PII). Read-only; --fix applies safe auto-fixes. Use pre-launch. NO PII."
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

# /ccc-harden — Production Hardening Audit

Audit a site across **11 hardening pillars** to confirm it's safe to ship. Read-only by default. Apply safe auto-fixes with `--fix`.

## What it checks

| Pillar | What it verifies |
|--------|-----------------|
| **1. Vercel** | Project link, env vars, deploy headers, deploy protection, domain |
| **2. GitHub Linkage** | Remote URL, branch tracking, .gitignore coverage, working tree clean |
| **3. GitHub Org** | Branch protection on main, Dependabot enabled, secret scanning, CODEOWNERS |
| **4. Sentry** | SDK installed, DSN set, source maps uploading, alert rules, sample rate |
| **5. PostHog** | SDK installed, env vars set, autocapture config, event whitelist |
| **6. Plausible** | Script present, site ID, goals, funnels, recent traffic |
| **7. Clarity** | Script presence, project ID |
| **8. Google** | GA4, Search Console verified, sitemap submitted, Tag Manager |
| **9. Stripe** | Keys present, webhook configured, test/live separation |
| **10. Secrets & PII** | gitleaks scan, CSP/HSTS/X-Frame headers, .env audit, log scrubbing |
| **11. Cloudflare** | DNS health, TLS/SSL, bot management, caching, HTTP/3, WAF |

## When to use

✅ **Use when:**
- Pre-launch checklist for a new site
- Before a security review or compliance audit
- Periodic monthly/quarterly health check
- After a major refactor that touched config files
- When you suspect a leaked secret

🚫 **Don't use when:**
- Project is pre-MVP / local-only (overkill)
- Quick fix that doesn't touch infra/config (use `$ccc-doctor` instead)

## Trigger flow

When the user invokes `$ccc-harden`:

1. **Read `.harden.json`** at project root. If missing, run `bash ~/.claude/skills/harden-site/lib/tier.sh` to auto-classify (production/staging/parked/personal) and generate it.

2. **Ask the user** via AskUserQuestion which mode:
   - **Audit only** (read-only, default — recommended)
   - **Apply auto-fixes** (writes to vercel.json, .gitignore, etc.)
   - **Single pillar** (pick from list of 11)

3. **Run pillars** based on `.harden.json` enabled list:
   ```bash
   for pillar in ~/.claude/skills/harden-site/pillars/*.sh; do
     name=$(basename "$pillar" .sh | sed 's/^[0-9]*-//')
     enabled=$(jq -r ".pillars[\"$name\"]" .harden.json)
     [ "$enabled" = "true" ] && bash "$pillar" --audit
   done
   ```

4. **Aggregate results** into a single summary:
   - Total checks · pass · warn · fail · skipped
   - Top 5 manual actions required
   - Top 5 auto-fixable items
   - Severity-ranked (CRITICAL → HIGH → MEDIUM → LOW)

5. **Offer next step** via AskUserQuestion:
   - **Apply auto-fixes now** (re-runs with `--fix`)
   - **Show full report** (paginated output of all pillars)
   - **Create Linear issues** for manual actions
   - **Done — I'll triage manually**

## Privacy guarantee (NO PII)

CC Commander's hardening audit **never** sends data to PostHog or any telemetry endpoint. Every check is:
- Local-only (reads files, runs `gh`/`vercel`/`fly`/`op` CLIs)
- Reports rendered in the terminal
- Findings written to `.harden.report.md` (gitignored by default)

Telemetry from `$ccc-harden` itself emits **only**:
- `skill_invoked` with `skill_id=ccc-harden`
- `harden_audit_completed` with `{ tier, pillars_run, pass, warn, fail }` (counts only, no file paths, no findings)

Zero PII. Zero secrets. Zero file content. Ever.

## Exit behavior

| Result | Exit | Next action |
|--------|------|-------------|
| All pass | 0 | "✅ Ready to ship." |
| Warnings only | 1 | "🟡 Review warnings before launch." |
| Failures | 2 | "🔴 Block launch until fixes applied." |
| Missing tokens | 3 | "⏭️ Pillar skipped — set up `op` access." |

## Setup (first run)

If the user has never run hardening before:

1. Auto-classify the project: `bash ~/.claude/skills/harden-site/lib/tier.sh`
2. Edit `.harden.json` to enable/disable pillars per their stack
3. For pillars that need API tokens (Vercel, Cloudflare, PostHog management API):
   - Verify tokens in 1Password Alfred vault (see `~/.claude/skills/harden-site/TOKENS.md`)
   - Run `op signin` if not already authenticated
4. First run is read-only — always show what would change before fixing

## Related skills

- `$ccc-doctor` — generic project health check (lighter weight, no API tokens)
- `$ccc-security` — OWASP audit + threat modeling (deeper than infra hardening)
- `$ccc-deploy-check` — pre-deploy gate (12 quick checks before pushing)
- `$ccc-deploy` — actual deploy workflow (uses hardening output as a precondition)

## Vendor sources

This skill wraps `~/.claude/skills/harden-site/` (Kevin's site-hardening skill, a fork of the upstream "harden" pattern). The 11 pillars and auto-fix logic live there; this plugin skill is the UX layer that makes them discoverable inside CC Commander.

To update the underlying logic, edit `~/.claude/skills/harden-site/pillars/*.sh` — this skill re-reads them every invocation.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
