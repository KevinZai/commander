---
name: ccc-testing
description: "Testing domain router: picks the lane for TDD, E2E, visual regression, load testing, QA, regression checks, evals, Python tests or verification, and runs test-writing work in an isolated worktree. Use when the user asks to write, plan, run or verify tests."
allowed-tools:
  - Read
  - Glob
  - Bash
  - Agent
  - AskUserQuestion
argument-hint: "[tdd | e2e | verify | qa | qa-only | strategy | visual | load | regression | evals | python | quality]"
model: inherit
effort: medium
---

# /ccc-testing — the right test lane

**CC Commander** · /ccc-testing · one entry to the testing domain; routes to one specialist sub-skill in this directory and keeps test-writing work out of the user's working tree.

The user's selected model is preserved. Codex: ask pickers as plain-text questions.

## When to use / when not to

- Use when the request is about writing, planning, running or verifying tests and the right specialist is not obvious.
- Use `/ccc-qa` for a QA pass over an existing suite, `/ccc-e2e` for a parallel pre-release assessment, and `/ccc-systematic-debugging` when a test fails and the cause is unknown.

## Sub-skills

Each lives at `<dir>/SKILL.md` beside this file. Load one at a time.

| Directory | Use for |
|---|---|
| `testing-router/` | Decision tree when the intent is unclear |
| `test-strategy/` | Testing strategy for a project: test types, priorities, coverage targets |
| `tdd-workflow/` | Red-green-refactor for new features, bug fixes and refactors |
| `e2e-testing/` | Playwright E2E: page objects, fixtures, config, CI, flaky-test handling |
| `webapp-testing/` | Playwright against a local dev server; `scripts/with_server.py` manages server lifecycle |
| `visual-regression/` | Screenshot comparison, Percy, Chromatic, baseline management |
| `load-testing/` | k6 or Artillery scripts, thresholds, bottleneck analysis |
| `qa/` | Find bugs, fix them in source with atomic commits, re-verify |
| `qa-only/` | Find and report bugs without changing code |
| `ai-regression-testing/` | Regression checks where the same model wrote and reviews the code |
| `eval-harness/` | Eval-driven development: write evals first, implement to pass them |
| `python-testing/` | pytest, fixtures, mocking, parametrization, coverage |
| `plankton-code-quality/` | Write-time formatting and linting through PostToolUse hooks |
| `verification-loop/` | Multi-step validation before marking work done |
| `verification-before-completion/` | Evidence before any "done", "fixed" or "passing" claim |

Keep this table matched to the directory: `ls -d "${CLAUDE_SKILL_DIR}"/*/` (repo fallback `ls -d skills/ccc-testing/*/`).

## What happens

### 1. Pick the lane

An argument or a clear request routes directly:

| Intent | Route to | Not to be confused with |
|---|---|---|
| "Write tests first", TDD | `tdd-workflow` | `qa` (testing existing code) |
| "E2E tests", Playwright | `e2e-testing` + `webapp-testing` | `tdd-workflow` (unit level) |
| "Verify my work", "is this done?" | `verification-loop`, then `verification-before-completion` | `qa` (broader scope) |
| "QA this", find and fix bugs | `qa` | `verification-loop` (did I do this right?) |
| Find bugs, report only | `qa-only` | `qa` (changes code) |
| "What should I test?", test strategy | `test-strategy` | `tdd-workflow` (how to test) |
| Visual regression, screenshot tests | `visual-regression` | `e2e-testing` (functional) |
| Load or performance testing | `load-testing` | `visual-regression` (visual) |
| "Check for regressions" | `ai-regression-testing` | `visual-regression` (visual only) |
| Build evals, eval-driven | `eval-harness` | `tdd-workflow` (code tests, not evals) |
| Python tests, pytest | `python-testing` | `tdd-workflow` (language-agnostic) |
| Code quality while writing | `plankton-code-quality` | `qa` (after the fact) |

For a Claude Code plugin, the eval lane also has the platform runner: `claude plugin eval .` (scaffold with `claude plugin eval init`).

With no argument and no clear intent, ask with AskUserQuestion (header "Testing"):

- 🟢 Write tests first (TDD) — failing test, then the code that passes it
- QA pass — find bugs and fix them, or report only
- E2E tests — Playwright user-flow tests with page objects and CI wiring
- More… — strategy, visual regression, load testing, regressions, evals (a follow-up picker; 🟢 Test strategy first)

Multi-lane jobs (full strategy, bug fix with tests, pre-release QA, TDD feature build) follow [references/campaigns.md](references/campaigns.md).

### 2. Find the test command

Before a lane writes or runs tests, read the project's own test entry point and name it:

```bash
test -f package.json && node -e "console.log(require('./package.json').scripts||{})"; ls pytest.ini pyproject.toml playwright.config.* k6*.js 2>/dev/null
```

Use the command the project defines. When none exists, the lane's setup step adds one and says so.

### 3. Run the lane, isolated when it writes

Read `<lane>/SKILL.md` and follow it. Tell the user in one line which lane ran.

When a lane writes or rewrites tests through a subagent, dispatch it with the Agent tool and `isolation: "worktree"`, then report the worktree branch and the files it changed for the user to merge. Run in the current tree only when the user asks. Read-only lanes (`test-strategy`, `qa-only`, `verification-loop`, `verification-before-completion`) run in place.

Codex: run a writing lane in a git worktree the user approves, or with `codex exec --cd <worktree>`.

## Done when

- The lane's test command ran this turn and its exit status and pass/fail counts are quoted, or, for `test-strategy`, the strategy document path is reported.
- A new regression test was shown failing before the fix and passing after it.
- For worktree dispatches, the reply names the worktree branch and its changed files; `git -C <worktree> status --short` output is quoted.

## Guardrails

- Never mark a lane done without a test run from this turn; a written test that was never executed is not done.
- `qa` commits each fix and `plankton-code-quality` clones a third-party repo and copies hook configuration into `.claude/settings.json`: ask with a picker before either commits, stashes, clones or changes hook settings, and never push.
- Never write tests into the user's working tree from a subagent unless the user asked for in-place work.
- Never weaken an assertion or skip a test to turn a run green; report the failure instead.
- Never load every sub-skill at once.

## See also

- `/ccc-qa` — run every suite, coverage delta, flaky audit
- `/ccc-e2e` — parallel pre-release assessment
- `/ccc-systematic-debugging` — root-cause a failing test
- `/ccc-review` — review the change the tests cover
