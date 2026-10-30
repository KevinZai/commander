---
name: ccc-testing
description: "Write or plan tests: TDD, E2E, visual, load, regression, evals and verification, in an isolated worktree. Use to add tests or a test strategy."
allowed-tools:
  - Bash
  - Read
  - Glob
  - Skill
  - Agent
  - AskUserQuestion
argument-hint: "[tdd | e2e | verify | qa | qa-only | strategy | visual | load | regression | evals | python]"
---

# $ccc-testing — the right test lane

**CC Commander** · $ccc-testing · one entry to the testing domain; routes to the specialist lane and keeps test work out of your working tree.

## When to use / when not to

- Use when the request is about writing, planning or running tests and the right specialist is not obvious.
- Go straight to `$ccc-qa` for a QA pass over an existing suite, and to `$ccc-e2e` for a parallel pre-release assessment.
- Use `$ccc-systematic-debugging` when a test fails and the cause is unknown.

## What happens

### 1. Match the intent to a lane

An argument or a clear request picks the lane directly:

| Intent | Lane (toolkit sub-skill) | Plugin fallback |
|---|---|---|
| "Write tests first", TDD | `tdd-workflow` | Red-green-refactor inline: write the failing test, run it and show the failure, implement, rerun to green |
| "E2E tests", Playwright | `e2e-testing` + `webapp-testing` | `$ccc-e2e e2e-only` |
| "Verify my work", "is this done?" | `verification-loop`, then `verification-before-completion` | Run the test, lint and build commands the project declares (`package.json` scripts, `Makefile`, `pyproject.toml`) with Bash and quote each exit status |
| "QA this", find and fix bugs | `qa` | `$ccc-qa` |
| Find bugs, report only | `qa-only` | `$ccc-qa`, stopping at the report |
| "What should I test?", test strategy | `test-strategy` | `qa-engineer` agent: a strategy with test types, priorities and coverage targets |
| Visual regression, screenshot tests | `visual-regression` | `$ccc-e2e e2e-only` |
| Load or performance testing | `load-testing` | `performance-engineer` agent: k6 or Artillery script plus a baseline run plan |
| "Check for regressions" | `ai-regression-testing` | `$ccc-review quick` on the diff, then `$ccc-qa unit` |
| Evals, eval-driven development | `eval-harness` | For a Claude Code plugin: `claude plugin eval .` (scaffold with `claude plugin eval init`) |
| Python tests, pytest | `python-testing` | `$ccc-qa unit` |
| Code quality while writing | `plankton-code-quality` | `$ccc-review quick` |

With no argument and no clear intent, ask with AskUserQuestion (Codex: a plain-text question):

- question: "What kind of testing?" · header: "Testing"
- 🟢 Write tests first (TDD) — failing test, then the code that passes it
- QA pass before release — runs every suite with coverage delta via `$ccc-qa`
- E2E tests — Playwright user-flow tests with page objects and CI wiring
- More… — strategy, visual regression, load testing, regressions, evals

"More…" asks a second picker with those four (🟢 Test strategy first).

### 2. Load the lane

The sub-skills ship with the CC Commander CLI toolkit, not inside this plugin. Use the first source that exists:

1. The Skill tool lists the sub-skill name: invoke it with `args: "$ARGUMENTS"`.
2. Glob finds the toolkit copy: `skills/ccc-testing/<lane>/SKILL.md` in the current repo, or `~/.claude/skills/ccc-testing/<lane>/SKILL.md`. Read it and follow it.
3. Neither exists: run the plugin fallback from the table.

Tell the user in one line which source ran: "Lane `<lane>` via toolkit" or "Lane `<lane>` via plugin fallback `<command>`".

### 3. Isolate test-writing work

When a lane writes or rewrites tests through a subagent, dispatch it with the Agent tool using `isolation: worktree` so the user's working tree stays clean, then report the worktree branch and the files it changed for the user to merge. Run in the current tree only when the user asks. Read-only lanes (strategy, qa-only, verify) run in place.

Codex: run the lane in a git worktree the user approves (`/worktree`), or with `codex exec --cd <worktree>`.

Multi-lane campaigns (new-project strategy, bug fix with tests, pre-release QA, TDD feature build) and invocation examples are in [references/campaigns.md](references/campaigns.md).

## Done when

- The chosen lane's own completion check ran and its actual output is quoted (test command exit status and pass/fail counts, or the strategy document path).
- For worktree dispatches, the reply names the worktree branch and its changed files.

## Guardrails

- Never mark a lane done without a test run from this turn; a written test that was never executed is not done.
- Never write tests into the user's working tree from a subagent unless the user asked for in-place work.
- Never load the whole testing catalog; load one lane at a time.

## See also

- `$ccc-qa` — run every suite, coverage delta, flaky audit
- `$ccc-e2e` — parallel pre-release assessment
- `$ccc-systematic-debugging` — root-cause a failing test
- `$ccc-review` — review the change the tests cover

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
