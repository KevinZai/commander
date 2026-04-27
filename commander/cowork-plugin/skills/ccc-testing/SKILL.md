---
name: ccc-testing
context: fork
description: "CCC domain — complete testing ecosystem — 15 skills in one. TDD, E2E, verification, QA, regression, visual testing, and load testing. Default isolation mode for test dispatches: worktree. [Commander]"
allowed-tools:
  - Read
---

# ccc-testing

> Load ONE skill. Get the entire testing domain. 15 skills in one.

**Default isolation:** `worktree` — test dispatches run in an isolated worktree to avoid polluting the working tree.

## What's Inside

| Category | Skills |
|----------|--------|
| Foundation | testing-router, test-strategy |
| Unit & TDD | tdd-workflow, plankton-code-quality, python-testing |
| Integration & E2E | e2e-testing, webapp-testing |
| Visual & Performance | visual-regression, load-testing |
| Quality Assurance | qa, qa-only, ai-regression-testing |
| Verification | verification-loop, verification-before-completion, eval-harness |

## Routing Matrix

| Your Intent | Route To |
|-------------|----------|
| "Write tests first" / "TDD" | `tdd-workflow` |
| "E2E tests" / "Playwright" | `e2e-testing` + `webapp-testing` |
| "Verify my work" / "Is this done?" | `verification-loop` |
| "QA this" / "Find bugs and fix" | `qa` |
| "Find bugs but don't fix" | `qa-only` |
| "Test strategy" / "What should I test?" | `test-strategy` |
| "Visual regression" / "Screenshot tests" | `visual-regression` |
| "Load testing" / "Performance test" | `load-testing` |
| "Check for regressions" | `ai-regression-testing` |
| "Build evals" / "Eval-driven" | `eval-harness` |
| "Python tests" / "pytest" | `python-testing` |

## Campaign Templates

### Full Testing Strategy (New Project)
1. `test-strategy` → analyze project, recommend test types + coverage targets
2. `tdd-workflow` → set up framework, write first tests
3. `e2e-testing` → critical user flow tests
4. `visual-regression` → screenshot baselines
5. `load-testing` → performance benchmarks
6. `verification-loop` → verify everything passes

### Bug Fix with Tests (TDD Protocol)
1. `qa` or `qa-only` → identify the bug
2. `tdd-workflow` → write failing test reproducing the bug
3. Fix → test goes green
4. `ai-regression-testing` → check for related regressions
5. `verification-before-completion` → prove the fix works

### Pre-Release QA
1. `qa` → full QA pass
2. `e2e-testing` → run full E2E suite
3. `visual-regression` → compare against baselines
4. `load-testing` → stress test under load
5. `verification-loop` → final sign-off

## Scope note

This is the **Desktop plugin entry** for the CCC testing domain. For the CLI/catalog entry, see `skills/ccc-testing/`. Content is kept in sync via the same router contract.

## When to invoke this skill

**Example 1**
- user: write tests for this auth module using TDD
- assistant: Loads ccc-testing and routes to tdd-workflow — writes failing tests first, then implements to pass them.

**Example 2**
- user: run a full QA pass before the release
- assistant: Loads ccc-testing and runs pre-release pipeline: qa → e2e-testing → visual-regression → load-testing → verification-loop.

**Example 3**
- user: set up Playwright E2E tests for our checkout flow
- assistant: Loads ccc-testing and routes to e2e-testing + webapp-testing with page objects and CI integration.
