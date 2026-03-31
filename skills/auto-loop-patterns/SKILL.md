---
name: auto-loop-patterns
description: |
  Pre-built /loop recipes with safety guards for autonomous recurring tasks. 10+
  loop patterns covering PR shepherding, Slack feedback, test monitoring, dependency
  watching, doc updates, cost alerts, build fixes, and knowledge compounding.
  Each recipe includes command, description, safety guards, and example output.
triggers:
  - /auto-loop
  - loop recipe
  - loop pattern
  - recurring automation
  - auto loop
disable-model-invocation: true
---

# Auto Loop Patterns

Pre-built `/loop` recipes for autonomous recurring tasks. Each pattern is battle-tested with safety guards to prevent runaway loops, cost overruns, and unintended side effects.

## How /loop Works

```bash
/loop <interval> <task>           # Run task every interval
/loop 5m babysit                  # Every 5 minutes
/loop 1h pr-pruner                # Every hour
/loop stop                        # Stop current loop
/loop status                      # Check running loops
```

**Safety defaults** (override per recipe):
- Max iterations: 50
- Cost ceiling: $5.00 per loop session
- Auto-stop on 3 consecutive errors
- Context compaction at 70% usage

---

## Recipe 1: PR Babysitter

Auto-reviews, rebases, and shepherds PRs through CI to merge.

### Command

```bash
/loop 5m babysit
```

### What It Does

Every 5 minutes:
1. Check open PRs via `gh pr list`
2. For PRs with failing CI: read logs, attempt fix, push
3. For PRs with merge conflicts: rebase onto base branch
4. For PRs with approved reviews and green CI: merge (if auto-merge enabled)
5. Post status summary to stdout

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 50 |
| Cost ceiling | $3.00 |
| Stop condition | All PRs merged or no open PRs |
| Human gate | Never force-pushes; never merges without approval |
| Permissions | `Bash(gh pr *)`, `Bash(git rebase *)`, `Read(**)` |

### Example Output

```
[babysit] Iteration 3 @ 14:15
  PR #42 — CI green, 2 approvals → merged
  PR #45 — rebased onto main (was 3 commits behind)
  PR #47 — CI failing: vitest snapshot mismatch → auto-fixed, pushed
  Next check in 5m. Cost so far: $0.32
```

---

## Recipe 2: Slack Feedback Collector

Creates PRs from Slack feedback messages every 30 minutes.

### Command

```bash
/loop 30m slack-feedback
```

### What It Does

Every 30 minutes:
1. Search Slack for messages tagged with a feedback emoji or in a `#feedback` channel
2. Group related feedback into themes
3. For actionable items: create a branch, implement the fix, open a PR
4. For non-actionable items: create a GitHub issue with the `feedback` label
5. Mark processed messages with a checkmark reaction

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 20 |
| Cost ceiling | $5.00 |
| Stop condition | No new feedback messages for 2 consecutive cycles |
| Human gate | PRs created as draft; never auto-merges |
| Permissions | `Bash(gh issue create *)`, `Bash(gh pr create *)`, Slack MCP |

### Example Output

```
[slack-feedback] Iteration 2 @ 15:30
  Found 3 new feedback messages in #feedback
  Theme: "Dashboard loading slow" (2 messages) → PR #51 (draft)
  Theme: "Typo in settings page" (1 message) → PR #52 (draft)
  Processed 3 messages. Cost so far: $0.87
```

---

## Recipe 3: Post-Merge Sweeper

Fixes missed review comments and TODOs after merge.

### Command

```bash
/loop post-merge-sweeper
```

### What It Does

After each merge to main (polls every 10 minutes):
1. Check for recently merged PRs with unresolved review comments
2. Read each unresolved comment thread
3. If the comment suggests a code change: implement it
4. Open a follow-up PR referencing the original comment
5. Log skipped comments that need human judgment

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 30 |
| Cost ceiling | $4.00 |
| Stop condition | No unresolved comments on recent merges |
| Human gate | Follow-up PRs are always draft; logs ambiguous comments |
| Permissions | `Bash(gh pr *)`, `Bash(git *)`, `Read(**)`, `Write(**)` |

### Example Output

```
[post-merge-sweeper] Iteration 1 @ 16:00
  PR #42 merged with 2 unresolved comments
    Comment by @alice: "Add error boundary here" → PR #53 (draft)
    Comment by @bob: "Consider perf implications" → Logged (needs human judgment)
  Cost so far: $0.45
```

---

## Recipe 4: PR Pruner

Closes stale PRs with no activity for 7+ days.

### Command

```bash
/loop 1h pr-pruner
```

### What It Does

Every hour:
1. List open PRs older than 7 days with no recent commits or comments
2. Post a warning comment: "This PR has been inactive for 7 days. Closing in 24h."
3. On next iteration: close PRs that were warned 24h+ ago
4. Label closed PRs with `stale`

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 24 (one day of hourly checks) |
| Cost ceiling | $1.00 |
| Stop condition | No stale PRs remaining |
| Human gate | Always posts warning before closing; never closes PRs with `do-not-close` label |
| Permissions | `Bash(gh pr list *)`, `Bash(gh pr close *)`, `Bash(gh pr comment *)` |

### Example Output

```
[pr-pruner] Iteration 4 @ 19:00
  Warned: PR #38 (last activity 8 days ago)
  Closed: PR #31 (warned 26 hours ago, no response)
  Skipped: PR #35 (has do-not-close label)
  Cost so far: $0.12
```

---

## Recipe 5: Test Guardian

Runs test suite and auto-fixes flaky tests.

### Command

```bash
/loop 15m test-guardian
```

### What It Does

Every 15 minutes:
1. Run the full test suite (`npm test` / `pnpm test`)
2. Identify flaky tests (tests that fail intermittently)
3. For flaky tests: analyze the failure, apply common fixes (async timing, test isolation, mock cleanup)
4. Re-run fixed tests to verify
5. Commit fixes with message `fix(test): stabilize flaky test {name}`

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 20 |
| Cost ceiling | $3.00 |
| Stop condition | All tests passing for 3 consecutive runs |
| Human gate | Only fixes tests flagged as flaky (failed 1+ times but passed 1+ times in recent runs) |
| Permissions | `Bash(npm test)`, `Bash(pnpm test)`, `Bash(npx vitest *)`, `Bash(git *)`, `Read(**)`, `Write(**)` |

### Example Output

```
[test-guardian] Iteration 5 @ 10:15
  Test suite: 142 passed, 1 flaky, 0 failed
  Fixed: auth.test.ts — added await on async assertion (was race condition)
  Re-run: 143 passed, 0 failed
  Committed: fix(test): stabilize flaky auth.test.ts
  Cost so far: $0.78
```

---

## Recipe 6: Dependency Watcher

Checks for security advisories and critical updates.

### Command

```bash
/loop 10m dependency-watcher
```

### What It Does

Every 10 minutes:
1. Run `npm audit` (or `pnpm audit`)
2. Check for new critical/high severity advisories since last run
3. If new advisory found: create a branch, apply fix, run tests, open PR
4. Log all advisories to `output/security/advisories.log`

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 30 |
| Cost ceiling | $2.00 |
| Stop condition | No new advisories for 6 consecutive cycles (1 hour) |
| Human gate | PRs for critical advisories only; logs medium/low for manual review |
| Permissions | `Bash(npm audit *)`, `Bash(pnpm audit *)`, `Bash(gh pr create *)`, `Bash(git *)` |

### Example Output

```
[dependency-watcher] Iteration 3 @ 11:30
  Audit: 0 critical, 1 high (lodash prototype pollution), 2 moderate
  High: lodash 4.17.20 → 4.17.21 → PR #54 (tests passing)
  Moderate: logged to output/security/advisories.log
  Cost so far: $0.22
```

---

## Recipe 7: Doc Updater

Scans code changes and updates documentation.

### Command

```bash
/loop 1h doc-updater
```

### What It Does

Every hour:
1. Run `git diff HEAD~5 --name-only` to find recently changed files
2. For each changed file: check if corresponding docs exist
3. If docs are outdated (function signatures changed, new exports, removed APIs): update them
4. If new module has no docs: generate stub documentation
5. Commit updates with `docs: update for recent code changes`

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 12 (half a day) |
| Cost ceiling | $3.00 |
| Stop condition | No doc updates needed for 3 consecutive cycles |
| Human gate | Never deletes doc files; only adds or updates sections |
| Permissions | `Bash(git diff *)`, `Bash(git log *)`, `Read(**)`, `Write(docs/**)`, `Write(*.md)` |

### Example Output

```
[doc-updater] Iteration 2 @ 14:00
  Changed files: 8 (src/auth.ts, src/utils.ts, ...)
  Updated: docs/api/auth.md — added new loginWithOTP() docs
  Updated: README.md — updated API reference table
  Generated: docs/api/utils.md (new module, stub created)
  Committed: docs: update for recent code changes
  Cost so far: $0.55
```

---

## Recipe 8: Cost Monitor

Alerts if API costs exceed thresholds.

### Command

```bash
/loop 30m cost-monitor
```

### What It Does

Every 30 minutes:
1. Read cost tracking data from `~/.claude/sessions/`
2. Calculate current day/week/month spend
3. Compare against thresholds: daily ($10), weekly ($50), monthly ($150)
4. If threshold exceeded: write alert to `output/alerts/cost-alert.md`
5. If approaching threshold (>80%): write warning

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 48 (one day of 30-min checks) |
| Cost ceiling | $0.50 (this loop itself should be cheap) |
| Stop condition | End of business day (6 PM local) |
| Human gate | Read-only; never modifies cost data, only writes alerts |
| Permissions | `Read(~/.claude/sessions/**)`, `Write(output/alerts/**)` |

### Example Output

```
[cost-monitor] Iteration 6 @ 12:00
  Today: $4.20 / $10.00 (42%)
  This week: $28.50 / $50.00 (57%)
  This month: $89.00 / $150.00 (59%)
  Status: All within limits
  Cost so far: $0.03
```

---

## Recipe 9: Build Shepherd

Watches CI and auto-fixes build failures.

### Command

```bash
/loop 5m build-shepherd
```

### What It Does

Every 5 minutes:
1. Check CI status for current branch via `gh run list`
2. If build is failing: download logs, diagnose the issue
3. Common auto-fixes: missing imports, type errors, lint violations, test snapshot updates
4. Push fix and wait for CI re-run
5. If fix doesn't work after 2 attempts: stop and report

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 30 |
| Cost ceiling | $3.00 |
| Stop condition | Build passing for 2 consecutive checks |
| Human gate | Max 2 fix attempts per failure; escalates after that |
| Permissions | `Bash(gh run *)`, `Bash(git *)`, `Bash(npm run *)`, `Read(**)`, `Write(**)` |

### Example Output

```
[build-shepherd] Iteration 4 @ 09:20
  CI status: failing (typecheck)
  Error: src/api/handler.ts:42 — Property 'userId' does not exist on type 'Request'
  Fix: Added userId to Request interface extension
  Pushed: fix(types): add userId to Request interface
  Waiting for CI re-run...
  Cost so far: $0.44
```

---

## Recipe 10: Knowledge Compounder

Extracts patterns from session history into reusable knowledge.

### Command

```bash
/loop 2h knowledge-compounder
```

### What It Does

Every 2 hours:
1. Scan recent session transcripts in `~/.claude/sessions/`
2. Identify recurring patterns: common fixes, frequent commands, repeated mistakes
3. Extract patterns into `tasks/lessons.md` (if not already captured)
4. Update `CLAUDE.md` with new project-specific rules if a pattern appears 3+ times
5. Generate a knowledge report

### Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 6 (half a day) |
| Cost ceiling | $2.00 |
| Stop condition | No new patterns found for 2 consecutive cycles |
| Human gate | Never overwrites existing lessons; only appends new ones |
| Permissions | `Read(~/.claude/sessions/**)`, `Read(tasks/**)`, `Write(tasks/lessons.md)` |

### Example Output

```
[knowledge-compounder] Iteration 2 @ 16:00
  Scanned: 12 sessions from today
  New patterns found: 2
    1. "Always run tsc before commit" — added to tasks/lessons.md
    2. "Use zod.coerce for form inputs" — added to tasks/lessons.md
  Existing patterns reinforced: 3
  Cost so far: $0.38
```

---

## Creating Custom Loop Recipes

```bash
# General syntax
/loop <interval> <descriptive-task-name>

# With explicit safety guards
/loop 15m my-custom-loop --max-iterations 20 --cost-ceiling 2.00

# With stop condition
/loop 10m monitor-deploy --stop-when "deploy status is 'healthy'"
```

### Custom Recipe Template

```
Interval: <how often>
Task: <one-line description>
Steps:
  1. <step>
  2. <step>
  3. <step>
Safety:
  Max iterations: <number>
  Cost ceiling: $<amount>
  Stop when: <condition>
  Human gate: <what requires human approval>
```

## Anti-Patterns

- Never loop without a cost ceiling — one bad loop can burn your daily budget
- Never auto-merge without approval — use draft PRs as the safety net
- Never loop faster than 1 minute — you'll overwhelm CI and APIs
- Never loop indefinitely — always set max iterations
- Never skip the test run — run one iteration manually before setting up the loop
- Never loop on destructive operations (delete, force-push, drop) without human gates
