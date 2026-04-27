---
name: deploy-check
description: "\"Pre-deployment readiness gate. Use when: 'deploy check', 'ready to ship?', 'pre-deploy', 'deployment gate', 'should I deploy?', 'is it safe to ship?', 'checklist before deploy'.\""
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[environment: staging | production]"
---

# /ccc:deploy-check

> Placeholders like ~~CI/CD and ~~monitoring refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Run a pre-deployment readiness check before shipping. Quick Mode runs the essential checklist in under 60 seconds. Power Mode performs a full assessment with rollback plan.

## Quick Mode (default)

Run this checklist automatically — no questions needed:

```
[ ] Tests pass          → npm test / vitest / pytest (auto-detect)
[ ] Build is clean      → npm run build / tsc --noEmit
[ ] No console.log      → grep -r "console\.log" src/ --include="*.ts"
[ ] No hardcoded secrets → scan for API keys, tokens, passwords in diff
[ ] No TODO/FIXME in    → grep -r "TODO\|FIXME" src/ (warn, don't block)
    changed files
[ ] package.json lock   → check for lockfile changes that don't match package.json
[ ] Migrations are safe → check for destructive SQL (DROP, DELETE without WHERE)
```

Report each check as PASS / WARN / FAIL.

**Verdict:**
- All PASS → **GO** — ship it
- Any WARN → **CAUTION** — review warnings before shipping
- Any FAIL → **NO-GO** — fix before deploying

## Power Mode

Activate by passing `--power` or `detailed` or `production`.

Full deploy readiness assessment:

### Pre-Deploy Checks
1. All Quick Mode checks (above)
2. Diff size — flag if >500 lines changed (increased risk)
3. New dependencies — security scan via `npm audit` or `pip audit`
4. Environment variable diff — any new required env vars documented?
5. Feature flags — is the change gated appropriately?
6. Database migration — reversible? tested on staging?

### Rollback Plan (auto-generated)
```markdown
## Rollback Plan
- **How to roll back:** `git revert <sha>` + redeploy OR feature flag off
- **Data concerns:** [Are there DB migrations that are hard to reverse?]
- **Estimated rollback time:** [X minutes]
- **Owner on call:** [Who to page if this goes wrong]
```

### Risk Assessment
| Dimension | Risk | Notes |
|-----------|------|-------|
| Scope of change | Low/Med/High | Lines changed, files touched |
| Data mutations | Low/Med/High | Schema changes, data migrations |
| External dependencies | Low/Med/High | New 3rd-party calls |
| Traffic impact | Low/Med/High | Hot paths, rate limits |

**Overall risk:** Low (GO) / Medium (CAUTION) / High (NO-GO pending review)

## If Connectors Available

If **~~CI/CD** is connected:
- Pull latest pipeline status — only proceed if all checks green
- Block deploy if tests are failing on the target branch
- Show flaky test history for context

If **~~monitoring** is connected:
- Check current error rates before deploying (don't deploy into an incident)
- Set a deploy marker after shipping for correlation
- Alert if error rate spikes >2x in first 5 minutes post-deploy

## Output

```
┌─────────────────────────────────────────────────────────────────┐
│ DEPLOY CHECK — [Environment]                     [Date/Time]    │
├─────────────────────────────────────────────────────────────────┤
│  ✓ Tests pass                                                    │
│  ✓ Build clean                                                   │
│  ✓ No console.log                                               │
│  ✓ No hardcoded secrets                                          │
│  ⚠ 2 TODOs in changed files (non-blocking)                      │
│  ✓ Lockfile consistent                                           │
│  ✓ No destructive migrations                                     │
├─────────────────────────────────────────────────────────────────┤
│  VERDICT: ✅ GO — Safe to deploy                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tips

1. **Run before every deploy** — 60-second check is cheaper than a 2am rollback.
2. **Production flag adds rigor** — pass `production` to enable the full risk assessment.
3. **Fix FAIL before shipping** — WARNs are judgment calls; FAILs are not.
4. **Rollback plan is required** — if you can't explain how to roll back, you're not ready to ship.
