# /ccc-testing campaigns and examples

Each campaign runs its lanes in order. Every step uses the source rule from the skill (toolkit sub-skill, else plugin fallback) and ends with a test run before the next step starts.

## Full testing strategy (new project)

1. `test-strategy` — analyze the project; recommend test types and coverage targets
2. `tdd-workflow` — set up the framework and write the first tests
3. `e2e-testing` — critical user-flow tests
4. `visual-regression` — screenshot baselines
5. `load-testing` — performance benchmarks against a recorded baseline
6. `verification-loop` — confirm everything passes

## Bug fix with tests

1. `qa` or `qa-only` — identify the bug
2. `tdd-workflow` — write a failing test that reproduces it
3. Fix the bug; the test goes green
4. `ai-regression-testing` — check for related regressions
5. `verification-before-completion` — prove the fix works

## Pre-release QA

1. `qa` — full QA pass (`/ccc-qa all`)
2. `e2e-testing` — full E2E suite
3. `visual-regression` — compare against baselines
4. `load-testing` — stress test under load
5. `verification-loop` — final sign-off

## TDD feature build

1. `test-strategy` — what to test for this feature
2. `tdd-workflow` — red/green/refactor loop
3. `e2e-testing` — the user-flow test
4. `verification-before-completion` — prove it works

## Lane distinctions

- `tdd-workflow` writes tests before code; `qa` tests code that already exists.
- `qa` fixes what it finds; `qa-only` reports and stops.
- `verification-loop` answers "did I do this right?"; `qa` searches more broadly for bugs.
- `visual-regression` compares pixels; `e2e-testing` checks behavior.
- `eval-harness` builds model or prompt evals; `tdd-workflow` builds code tests.
- Load-test only after a baseline run exists.

## Examples

- "Write tests for this auth module using TDD" → lane `tdd-workflow`: failing tests first, then the implementation that passes them, in a worktree.
- "Run a full QA pass before the release" → the pre-release campaign: `qa` → `e2e-testing` → `visual-regression` → `load-testing` → `verification-loop`.
- "Set up Playwright E2E tests for our checkout flow" → lanes `e2e-testing` + `webapp-testing`: page objects, fixtures and CI wiring.
