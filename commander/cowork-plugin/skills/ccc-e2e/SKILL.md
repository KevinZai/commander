---
name: ccc-e2e
description: "Pre-release assessment that fans out via /ccc-fleet into up to three isolated workers (QA audit, unit tests, Playwright E2E) running /ccc-testing lanes, then writes a severity-ranked PASS or FAIL verdict. Use when about to tag a release, after a large merge, or asking is this ready."
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
argument-hint: "[full | qa-unit | e2e-only | quick | status]"
disable-model-invocation: true
---

# /ccc-e2e — Full-surface confidence before shipping

**CC Commander** · /ccc-e2e · parallel QA, unit and E2E workers, one honest verdict

Composes `/ccc-fleet` (parallel dispatch, worktree isolation) with `/ccc-testing` (testing lanes). Audit only: workers find and report, they do not fix.

## When to use / when not to

- Use before tagging a major or minor release, after merging a feature that touches five or more files, after a cross-module refactor, or when the user feels coverage is thin but cannot say where.
- Quick bug-fix patch: `/ccc-review`. Single-file change: `/ccc-testing`. Docs-only change: skip. Hotfix under time pressure: `/ccc-ship` pre-flight.
- Codex: ask pickers as plain-text questions and run each worker as `codex exec --json --sandbox workspace-write` in its own `git worktree`; the session tools below are skipped.

## What happens

### 1. Context strip

Run in parallel, silent on failure:

```bash
git rev-parse --abbrev-ref HEAD
BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##'); BASE=${BASE:-main}
git rev-list --count "$BASE"..HEAD 2>/dev/null
git diff --shortstat "$BASE"..HEAD 2>/dev/null
git diff --name-only "$BASE"..HEAD 2>/dev/null
test -f package.json && node -p "require('./package.json').version"
```

Render one line: `🎯 Branch: <branch> · <N> commits ahead of <base> · <X> files changed · version: <ver>`.

### 2. Scope

If `$ARGUMENTS` is `status`, jump to "Status" below. If it is `full`, `qa-unit`, `e2e-only` or `quick` (`qa-only` is an alias for `quick`), use it and skip the picker. Otherwise ask the scope picker (Decision points).

After scope is set, call `mcp__ccd_session__mark_chapter` with title `"E2E assessment: <branch>"` and summary `"<N>-worker fan-out starting on <branch>"`.

### 3. Fan out workers

Dispatch with the Agent tool, following `/ccc-fleet`'s Agent-tool rules. Send every worker call in one message so they start together. Every call uses:

- `subagent_type: "qa-engineer"` (`general-purpose` if the plugin agent is not registered)
- `model: "sonnet"`, `effort: "medium"`, `isolation: "worktree"`, `run_in_background: true`
- a prompt that starts: "FIRST: run `git rev-parse --show-toplevel`. It must be your assigned worktree, not the main checkout; abort and report if it is not. Audit only: do not fix, commit, push or merge."

The coordinator stays on the user's selected model.

| Worker | Prompt after the preamble | Returns JSON |
|---|---|---|
| 1 · QA audit | "Run /ccc-testing qa-only. Report bug count by severity (Critical, High, Medium, Low), affected files, and reproduction steps for every Critical." | `{worker: "qa", status: "pass\|fail", findings: [{severity, file, description}], duration_s}` |
| 2 · Unit-TDD | "Run /ccc-testing tdd-workflow and test-strategy. Execute the full test suite with the project's test command (detect from package.json scripts, pyproject.toml or pytest.ini). Report pass and fail counts, coverage delta versus the last run, and failing test names." | `{worker: "unit-tdd", status, tests_pass, tests_fail, coverage_delta, findings, duration_s}` |
| 3 · E2E | "Run /ccc-testing e2e-testing and visual-regression. Run the Playwright suite (`npx playwright test`) and the screenshot baseline comparison. Report pass and fail counts and any visual diffs." | `{worker: "e2e", status, tests_pass, tests_fail, visual_diffs, findings, duration_s}` |

| Scope | Workers |
|---|---|
| `full` | 1, 2, 3 |
| `qa-unit` | 1, 2 |
| `e2e-only` | 3 |
| `quick` | 1, scoped to qa-only, report only |

Then post one card:

> 🔄 **N worker(s) running** — about X min. I will synthesize when all report back.
> 📝 Verdict will land at `tasks/reviews/ccc-e2e-<YYYY-MM-DD>.md`.
> 💡 `/ccc-e2e status` checks progress.

### 4. Wait

Wait for every worker's completion notification. Allow each worker 30 minutes before marking it `timeout`; E2E suites are slow, so never cut one off earlier. When all have reported, call `mark_chapter` with title `"E2E workers complete"` and summary `"QA: <status> / Unit-TDD: <status> / E2E: <status>"` (only workers that ran).

### 5. Synthesize the verdict

1. Parse each worker's JSON. A worker with no parseable JSON counts as `fail`; keep its output tail.
2. Merge findings by severity across workers.
3. Verdict: ❌ FAIL if any worker is `fail` or `timeout` or any Critical finding exists; ✅ PASS only when every worker passed and there are zero Criticals.
4. Write the artifact with the Write tool using [references/verdict-template.md](references/verdict-template.md).
5. Add every High, Medium and Low finding as a TodoWrite item.
6. Call `mark_chapter` with title `"E2E verdict: <PASS|FAIL>"` and summary `"<N> Critical, <N> High — verdict: <PASS|FAIL>"`.

### 6. Fix chips for Criticals

For each Critical finding only, call `mcp__ccd_session__spawn_task` once:

- `title`: imperative fix phrase under 60 characters
- `prompt`: self-contained (the spawned session has no memory of this one): reporting worker, `file:line` if known, issue summary, fix direction, and the verdict artifact path
- `tldr`: one or two plain sentences

When the `mcp__ccd_session__*` tools are not exposed (terminal sessions, Codex), skip markers and chips and list the Critical fixes under "Next steps" in the artifact instead.

### 7. Exit summary

Print: verdict, Critical and High counts, the artifact path, and the worker worktree paths and branches from the Agent results so the user can inspect or remove them.

### Status

For `/ccc-e2e status`: report which workers have returned and which are still running, from this session's background-agent notifications, plus `git worktree list`. Do not dispatch anything.

## Decision points

```
question: "What scope should I assess?"
header: "E2E"
multiSelect: false
options:
  - label: "🔬 Full assessment (QA + Unit-TDD + E2E)"
    description: "3 parallel workers, about 15–30 min. Use before tagging a release."
  - label: "🧪 QA + Unit-TDD only"
    description: "2 workers, about 8–15 min. For API or library changes with no UI."
  - label: "🌐 E2E only (Playwright)"
    description: "1 worker, about 5–10 min. For a specific UI regression."
  - label: "🎯 Quick QA pass"
    description: "1 worker, about 3–5 min. A sanity check, not a release gate."
```

Put the recommended option first and prefix its label with 🟢, using the context strip:

- Branch ahead of base and version bumped → Full assessment.
- No UI or CSS files in the diff → QA + Unit-TDD only.
- Only UI or CSS files in the diff → E2E only.
- Small, low-risk patch → Quick QA pass.

## Done when

- `test -f tasks/reviews/ccc-e2e-<YYYY-MM-DD>.md` succeeds and the file states ✅ PASS or ❌ FAIL.
- Every dispatched worker appears in the worker summary with a status, including failed or timed-out ones.
- The exit summary's counts match the artifact.

## Guardrails

- Never run workers one after another; dispatch them in one message.
- Never merge results without checking each worker's `status`.
- Never mark PASS with a Critical finding or a failed worker.
- Never fix findings during the assessment; this skill audits only.
- Never skip the verdict artifact; it is the durable record of the run.
- Never commit, push, merge worker branches or delete worktrees; those need separate authorization.
- Severity badges: 🔴 Critical · ⚠️ High · 🟡 Medium · 🟢 Low.

## See also

- `/ccc-fleet` — the parallel dispatch and worktree rules this skill follows
- `/ccc-testing` — the testing lanes each worker runs
- `/ccc-qa` — a single-pass QA audit
- `/ccc-ship` — release pre-flight once the verdict is PASS

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
