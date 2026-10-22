# ccc-testing campaigns

Multi-lane testing jobs. Run one sub-skill at a time, in order. Each step that writes tests ends with a test run from the same turn, and its actual output is quoted.

## Full testing strategy (new or untested project)

1. `test-strategy` — analyze the project, recommend test types and coverage targets
2. `tdd-workflow` — set up the test framework and write the first tests
3. `e2e-testing` — critical user-flow tests
4. `visual-regression` — screenshot baselines
5. `load-testing` — performance benchmarks
6. `verification-loop` — verify everything passes

## Bug fix with tests

1. `qa` or `qa-only` — identify the bug
2. `tdd-workflow` — write a failing test that reproduces the bug; run it and show the failure
3. Fix the bug; rerun until the test is green
4. `ai-regression-testing` — check for related regressions
5. `verification-before-completion` — prove the fix works with fresh command output

## Pre-release QA

1. `qa` — full QA pass
2. `e2e-testing` — run the full E2E suite
3. `visual-regression` — compare against baselines
4. `load-testing` — stress test under load
5. `verification-loop` — final sign-off

## TDD feature build

1. `test-strategy` — what to test for this feature
2. `tdd-workflow` — red, green, refactor loop
3. `e2e-testing` — user-flow test
4. `verification-before-completion` — prove it works

## Scope

This router is the CLI toolkit entry for the testing domain. The Desktop plugin entry is `commander/cowork-plugin/skills/ccc-testing/`; both dispatch to the same sub-skills.
