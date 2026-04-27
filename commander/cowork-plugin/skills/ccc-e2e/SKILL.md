---
name: ccc-e2e
description: "CC Commander — end-to-end pre-release assessment. Fans out via /ccc-fleet into 3 isolated worktrees (QA audit + unit tests + Playwright E2E), each invoking /ccc-testing sub-skills, then synthesizes into a severity-ranked PASS/FAIL verdict. Use before tagging a release, after a major feature merge, or when you need confidence the whole product works — not just one piece. [Commander]"
model: sonnet
effort: high
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - TodoWrite
  - mcp__ccd_session__spawn_task
  - mcp__ccd_session__mark_chapter
argument-hint: "[scope: quick | full | qa-only | e2e-only]"
---

# /ccc-e2e — End-to-End Pre-Release Assessment

**CC Commander** · /ccc-e2e · Full-surface confidence before you ship

Composes /ccc-fleet + /ccc-testing to run a full pre-release assessment in parallel across 3 isolated worktrees. One command. Three workers. One verdict.

## Session markers

Call `mcp__ccd_session__mark_chapter` at these phase transitions:

| Trigger | title | summary |
|---------|-------|---------|
| After user confirms scope, before fan-out | `"E2E assessment: <branch>"` | `"3-worker fan-out starting on <branch>"` |
| When all workers have reported back | `"E2E workers complete"` | `"QA: <status> / Unit-TDD: <status> / E2E: <status>"` |
| After verdict is written | `"E2E verdict: <PASS/FAIL>"` | `"<N> Critical, <N> High — verdict: <PASS/FAIL>"` |

## Sidebar chips (spawn_task)

After the verdict is rendered, spawn ONE `mcp__ccd_session__spawn_task` chip per **Critical** finding:

- `title`: imperative fix phrase under 60 chars
- `prompt`: self-contained — include the worker that reported it, file:line if available, issue summary, and fix direction. The spawned session has no memory of this conversation.
- `tldr`: 1-2 sentences plain English.

Only Critical findings get chips. High/Medium/Low go into the verdict artifact as TodoWrite items.

## Response shape (EVERY time)

### 1. Brand header

```
**CC Commander** · /ccc-e2e · Full-surface pre-release confidence
```

### 2. Context strip

Four parallel reads (silent on failure):

- `git rev-parse --abbrev-ref HEAD` → current branch
- `git rev-list --count main..HEAD 2>/dev/null` → commits ahead
- `git diff --shortstat main..HEAD 2>/dev/null` → diff size
- `test -f package.json && node -p "require('./package.json').version"` → version

Render one line:
> 🧭 Branch: `<branch>` · <N> commits ahead · <X> files changed · version: `<ver>`

### 3. Scope picker — `AskUserQuestion`

```
question: "What scope should I assess?"
header: "CC Commander E2E"
multiSelect: false
options:
  - label: "🔬 Full assessment (QA + Unit-TDD + E2E)"
    description: "3 parallel workers. ~15-30 min. Use before tagging a release."
    preview: "Most thorough. 3 worktrees, 3 agents, severity-ranked verdict."
  - label: "🧪 QA + Unit-TDD only (no E2E)"
    description: "2 workers. ~8-15 min. Use for non-UI changes."
    preview: "Skips Playwright. Good for API/library changes."
  - label: "🎭 E2E only (Playwright)"
    description: "1 worker. ~5-10 min. Use when fixing a specific UI regression."
    preview: "Runs /ccc-testing e2e-testing + visual-regression only."
  - label: "🏃 Quick QA pass only"
    description: "1 worker. ~3-5 min. Use for sanity check, not release gate."
    preview: "Runs /ccc-testing qa-only. Finds but does not fix."
```

**Recommendation logic** (prepend to ONE label):
- Branch ahead of main + version bumped → "Full assessment"
- No UI/CSS files in diff → "QA + Unit-TDD only"
- Only UI/CSS files in diff → "E2E only"
- Small patch, low risk → "Quick QA pass only"

## Step 2 — Fan out workers

On scope pick, dispatch the appropriate workers via the `Agent` tool with `run_in_background: true`. Each worker runs in its own isolated worktree to prevent merge conflicts and shared-state contamination.

### Full assessment (3 workers)

**Worker 1 — QA audit** (`../qa-audit/` worktree):
- `Agent`, `subagent_type: qa-engineer`, `model: sonnet`, `run_in_background: true`
- Task: "Run /ccc-testing qa-only in this worktree. Report: bug count by severity (Critical/High/Medium/Low), affected files, reproduction steps for any Critical. Return JSON: `{worker: 'qa', status: 'pass|fail', findings: [{severity, file, description}], duration_s}`"

**Worker 2 — Unit-TDD** (`../unit-tdd/` worktree):
- `Agent`, `subagent_type: qa-engineer`, `model: sonnet`, `run_in_background: true`
- Task: "Run /ccc-testing tdd-workflow + test-strategy in this worktree. Execute the full test suite. Report: pass/fail counts, coverage delta vs last run, any failing test names. Return JSON: `{worker: 'unit-tdd', status: 'pass|fail', tests_pass: N, tests_fail: N, coverage_delta: '+N%|-N%', duration_s}`"

**Worker 3 — E2E** (`../e2e/` worktree):
- `Agent`, `subagent_type: qa-engineer`, `model: sonnet`, `run_in_background: true`
- Task: "Run /ccc-testing e2e-testing + visual-regression in this worktree. Run the Playwright suite and screenshot baseline comparison. Report: pass/fail counts, any visual diffs found. Return JSON: `{worker: 'e2e', status: 'pass|fail', tests_pass: N, tests_fail: N, visual_diffs: N, duration_s}`"

### QA + Unit-TDD (2 workers)
Dispatch Worker 1 + Worker 2 only. Skip Worker 3.

### E2E only (1 worker)
Dispatch Worker 3 only.

### Quick QA pass (1 worker)
Dispatch Worker 1 only, with task scoped to `qa-only` (no fixes).

## Step 3 — Emit progress card

After dispatching, emit one card:

> 🔄 **<N> worker(s) running** — ETA ~<X> min. I'll synthesize when all complete.
> 📂 Verdict will land at `tasks/reviews/ccc-e2e-<YYYYMMDD>.md`.
> 💡 Use `/ccc-e2e status` to check in. Or wait — I'll surface the verdict automatically.

## Step 4 — Synthesize and write verdict

When all workers report back (or timeout at 30 min per worker), synthesize:

1. Collect all findings. Merge by severity.
2. Compute overall status: FAIL if any worker `status: fail` OR any Critical finding exists.
3. Compute coverage delta across all workers.
4. Write `tasks/reviews/ccc-e2e-<YYYY-MM-DD>.md` (create `tasks/reviews/` if missing).

### Verdict artifact format

```markdown
# CCC E2E Assessment — <YYYY-MM-DD>

**Branch:** <branch> · **Version:** <ver> · **Scope:** <full|partial>
**Workers:** <N> · **Duration:** <total elapsed>

## Verdict: ✅ PASS / ❌ FAIL

> FAIL if any Critical finding or any worker status is `fail`.

## Worker Summary

| Worker | Status | Tests | Coverage | Duration |
|--------|--------|-------|----------|----------|
| QA audit | ✅/❌ | — | — | Xs |
| Unit-TDD | ✅/❌ | <N>/<total> | <delta> | Xs |
| E2E | ✅/❌ | <N>/<total> | — | Xs |

## Findings

### Critical (N)
- `file:line` — `<description>` — **Worker:** qa

### High (N)
...

### Medium (N)
...

### Low (N)
...

## Next steps
- [ ] <action per Critical/High finding>

## Recommendation
Ship / Patch required / Triage needed
```

## When to use

- Before `git tag v*.*.0` for a major/minor release
- After merging a feature that touches 5+ files
- When refactoring across module boundaries
- When "feels like we should test more" but unclear where

## When NOT to use

- Quick bug-fix patches — use /ccc-review instead
- Single-file changes — use /ccc-testing directly
- Docs-only PRs — skip this, docs don't need E2E
- Hotfixes under time pressure — use /ccc-ship preflight instead

## Flow (pseudocode)

```
1. AUQ → user picks scope

2. /ccc-fleet fan-out:
     Worker 1 (qa): /ccc-testing qa-only in ../qa-audit/
     Worker 2 (unit-tdd): /ccc-testing tdd-workflow in ../unit-tdd/
     Worker 3 (e2e): /ccc-testing e2e-testing+visual-regression in ../e2e/

3. Wait for all (timeout: 30 min per worker)

4. Merge findings → compute verdict:
     FAIL = any Critical OR any worker.status == fail
     PASS = all workers pass, zero Criticals

5. Write tasks/reviews/ccc-e2e-{YYYY-MM-DD}.md

6. Spawn chips for each Critical finding

7. Exit summary: PASS/FAIL + blocker count + artifact path
```

## Depends on

- /ccc-fleet (parallel orchestration + worktree isolation)
- /ccc-testing (testing sub-skill router)
- git worktree (isolation — worktrees must already exist or be created)
- jq / node (for parsing worker JSON reports)

## Anti-patterns — DO NOT do these

- Do not run all workers sequentially — always fan-out in parallel
- Do not merge results without checking worker status field
- Do not mark PASS if any Critical finding exists — verdicts must be honest
- Do not auto-fix findings during assessment — this is audit-only
- Do not skip the verdict artifact — /ccc-ship reads from `tasks/reviews/`
- Do not timeout workers before 30 min — E2E suites are slow

## Brand rules

- 🔬 for full assessment · 🧪 for partial · 🎭 for E2E-only · 🏃 for quick pass
- ✅ PASS / ❌ FAIL — bold, on its own line in the artifact header
- Severity badges: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low
- Artifact always written — never output-only
- Never mention the CLI — Desktop-plugin flow

---

**Bottom line:** one command fans out into up to 3 parallel QA workers, each isolated in its own worktree. Severity-ranked verdict lands in `tasks/reviews/`. Criticals become spawn_task chips for immediate fix sessions.
