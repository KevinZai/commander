---
name: ccc-deploy-check
description: "Pre-deploy readiness gate: tests, build, debug logs, secrets, TODOs, lockfile and destructive-migration checks with a GO, CAUTION or NO-GO verdict, plus risk and rollback plan in power mode. Use when asking ready to ship, should I deploy, is it safe, deploy check, or pre-deploy."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[staging | production | --power]"
disable-model-invocation: true
---

# $ccc-deploy-check — Pre-deploy readiness gate

**CC Commander** · $ccc-deploy-check · a GO, CAUTION or NO-GO verdict before anything goes live

Placeholders like ~~CI/CD and ~~monitoring refer to connected tools, which are opt-in and absent by default. See [CONNECTORS.md](../../CONNECTORS.md).

## When to use / when not to

- Use before any deploy. Quick mode runs by default; power mode adds risk assessment and a rollback plan.
- This skill only reads. To deploy, use `$ccc-deploy`; for the full ship menu (pre-flight matrix, release tagging), use `$ccc-ship`.
- In Codex, ask the picker as a plain-text question; run the power-mode verifier with `codex exec` in a fresh session, read-only.

## What happens

### 1. Resolve the base and changed files

```bash
BASE_REF=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo main)
BASE=$(git merge-base HEAD "$BASE_REF")
git diff --name-only --diff-filter=ACM "$BASE"...HEAD
git diff --shortstat "$BASE"...HEAD
```

If there is no remote or no diff, check the working tree against `HEAD` instead and say so.

### 2. Quick mode (default)

Run every check, no questions. Report each as PASS, WARN or FAIL.

| Check | Command | Result |
|---|---|---|
| Tests pass | `npm test` · `npx vitest run` · `pytest` (auto-detect from `package.json` scripts, `pyproject.toml`, `pytest.ini`) | non-zero exit → FAIL |
| Build is clean | `npm run build` if the script exists, else `npx tsc --noEmit` with a `tsconfig.json` | non-zero exit → FAIL |
| No console.log | `grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" --include="*.js"` limited to changed files | hits → WARN |
| No hardcoded secrets | the secret scan below, on changed files | any hit → FAIL |
| No TODO/FIXME in changed files | `grep -n "TODO\|FIXME"` on changed files | hits → WARN, never blocks |
| Lockfile consistent | `package.json` and its lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) changed together | one without the other → WARN |
| Migrations are safe | the migration grep below, on changed `*.sql` and migration files | `DROP`/`TRUNCATE`, or `DELETE` without `WHERE` → FAIL |

Migration grep (inspect each `DELETE FROM` hit for a `WHERE` clause):

```bash
grep -nEi '\b(DROP (TABLE|COLUMN|DATABASE)|TRUNCATE)\b|DELETE FROM' <changed-migration-files>
```

Secret scan, which prints file names and hit counts only, never the matched text:

```bash
for f in $(git diff --name-only --diff-filter=ACM "$BASE"...HEAD); do
  [ -f "$f" ] || continue
  c=$(grep -cE '(sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(api[_-]?key|secret|password|token)["'\'' ]*[:=][ ]*["'\''][^"'\'' ]{8,})' "$f")
  [ "$c" -gt 0 ] && echo "$f: $c possible secret(s)"
done
```

A missing tool or script is a skip, reported as such, not a FAIL.

**Verdict:** all PASS → ✅ GO · any WARN → 🟡 CAUTION (review warnings first) · any FAIL → 🔴 NO-GO (fix before deploying).

### 3. Power mode

Runs when `$ARGUMENTS` contains `--power`, `detailed` or `production`. Do everything in step 2, then:

1. **Diff size.** From `git diff --shortstat`; over 500 changed lines → flag higher risk.
2. **New dependencies.** `npm audit --omit=dev` or `pip-audit`; high or critical findings → FAIL.
3. **Environment variables.** List new names added in the diff and check each against `.env.example`:

   ```bash
   git diff "$BASE"...HEAD | grep -oE '^\+.*(process\.env\.|os\.environ\[?["'\'']?)[A-Z0-9_]+' | grep -oE '[A-Z][A-Z0-9_]{2,}$' | sort -u
   ```

   An undocumented new variable → WARN. Print names only, never values.
4. **Feature flags.** Is the change gated where it touches a hot path? Judgment call; note it.
5. **Database migrations.** Is there a matching down migration, and was it run on staging? Missing → WARN.
6. **Fresh-context verifier.** For `production`, spawn one read-only verifier with the Agent tool (fresh context, no edits) and give it the check table and the changed-file list. Ask it to refute the GO or CAUTION verdict by rerunning the FAIL-critical checks (tests, build, secrets, migrations). If it refutes, the verdict becomes NO-GO with its evidence.

Then produce:

```markdown
## Rollback plan
- **How to roll back:** `git revert <sha>` + redeploy (`$ccc-rollback`), platform rollback (`$ccc-ship rollback`), or feature flag off
- **Data concerns:** <migrations that are hard to reverse, or "none">
- **Estimated rollback time:** <minutes>
- **Owner on call:** <who to page, or "ask the user">
```

| Dimension | Risk | Notes |
|---|---|---|
| Scope of change | Low/Med/High | lines changed, files touched |
| Data mutations | Low/Med/High | schema changes, data migrations |
| External dependencies | Low/Med/High | new third-party calls |
| Traffic impact | Low/Med/High | hot paths, rate limits |

**Overall risk:** Low → GO · Medium → CAUTION · High → NO-GO pending review.

### 4. Connected tools (opt-in)

- **GitHub Actions** (no connector needed when `gh` is authenticated): `gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 5`. A failing run on the target branch → FAIL.
- If **~~CI/CD** is connected: pull the latest pipeline status, block on failing tests, and show flaky-test history for context.
- If **~~monitoring** is connected: check current error rates and do not recommend deploying into an incident. Recommend a deploy marker after shipping and an alert if the error rate more than doubles in the first five minutes.

### 5. Report

```
┌─────────────────────────────────────────────────────────────────┐
│ DEPLOY CHECK — <environment>                     <date/time>    │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Tests pass                                                   │
│  ✅ Build clean                                                  │
│  ✅ No console.log                                               │
│  ✅ No hardcoded secrets                                         │
│  ⚠️ 2 TODOs in changed files (non-blocking)                      │
│  ✅ Lockfile consistent                                          │
│  ✅ No destructive migrations                                    │
├─────────────────────────────────────────────────────────────────┤
│  VERDICT: ✅ GO — safe to deploy                                 │
└─────────────────────────────────────────────────────────────────┘
```

Each line carries the command's real result. In power mode, append the risk table and rollback plan.

### 6. Next step — `AskUserQuestion`

- GO or CAUTION: "🟢 Deploy now with $ccc-deploy" (the user runs it; it is user-invoked), "Fix the warnings first", "Run power mode" (quick mode only).
- NO-GO: "🟢 Fix the FAILs" (lists each with `file:line` and the fix direction), "Run power mode for the full picture".

## Done when

- Every quick-mode check shows PASS, WARN, FAIL or skip from a command that ran this session, and the verdict follows the rule in step 2.
- In power mode, the risk table, the rollback plan and the verifier's result are shown.

## Guardrails

- Read-only: never edits files, commits, pushes or deploys.
- Never prints secret values; the secret scan reports file names and counts only.
- Never reports PASS for a check that did not run; a skipped check says "skipped" and why.
- Never treats a WARN as a FAIL or the reverse; TODOs never block.
- A rollback plan is required for production: if the rollback cannot be explained, the verdict is not GO.

## See also

- `$ccc-deploy` — run the deploy and verify health
- `$ccc-ship` — pre-flight matrix, release tagging, platform rollback
- `$ccc-rollback` — revert commits and redeploy
- `$ccc-security` — deeper security review

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
