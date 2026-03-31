---
name: KZ Mega-Testing
description: "Complete testing ecosystem — 15 skills in one. TDD, E2E, verification, QA, regression, visual testing, and load testing."
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
---

# KZ Mega-Testing

> Load ONE skill. Get the entire testing domain. Built from 11 proven skills + 4 new ones.

## Absorbed Skills Manifest

| # | Original Skill | What It Does | Status |
|---|----------------|--------------|--------|
| 1 | `e2e-testing` | Playwright end-to-end testing — page objects, fixtures, assertions, CI setup | Absorbed |
| 2 | `webapp-testing` | Playwright for local web apps — dev server integration, visual testing | Absorbed |
| 3 | `tdd-workflow` | Test-driven development — red/green/refactor cycle, coverage tracking | Absorbed |
| 4 | `verification-loop` | Comprehensive verification — multi-step validation before marking done | Absorbed |
| 5 | `verification-before-completion` | Proof-of-work verification — evidence that changes work correctly | Absorbed |
| 6 | `ai-regression-testing` | AI-assisted regression — detect regressions using AI analysis of test results | Absorbed |
| 7 | `eval-harness` | Eval-driven development — build evals first, then implement to pass them | Absorbed |
| 8 | `qa` | Full QA pass — find bugs, fix them, commit fixes | Absorbed |
| 9 | `qa-only` | Report-only QA — find and report bugs without fixing them | Absorbed |
| 10 | `plankton-code-quality` | Write-time quality — catch issues as code is written, not after | Absorbed |
| 11 | `python-testing` | Python testing — pytest, fixtures, mocking, TDD for Python projects | Absorbed |
| 12 | `testing-router` | Routes your testing task to the right specialist | **NEW** |
| 13 | `test-strategy` | Generates a complete testing strategy for any project | **NEW** |
| 14 | `visual-regression` | Visual regression testing — screenshot comparison, Percy, Chromatic | **NEW** |
| 15 | `load-testing` | Load testing — k6/Artillery scripts, performance benchmarks, stress testing | **NEW** |

**Replaces loading:** e2e-testing, webapp-testing, tdd-workflow, verification-loop, verification-before-completion, ai-regression-testing, eval-harness, qa, qa-only, plankton-code-quality, python-testing

---

## Routing Matrix

| Your Intent | Route To | Don't Confuse With |
|-------------|----------|--------------------|
| "Write tests first" / "TDD" | `tdd-workflow` | `qa` (testing existing code) |
| "E2E tests" / "Playwright" | `e2e-testing` + `webapp-testing` | `tdd-workflow` (unit level) |
| "Verify my work" / "Is this done?" | `verification-loop` | `qa` (broader scope) |
| "QA this" / "Find bugs" | `qa` (fix) or `qa-only` (report) | `verification-loop` (did I do this right?) |
| "Test strategy" / "What should I test?" | `test-strategy` | `tdd-workflow` (how to test) |
| "Visual regression" / "Screenshot tests" | `visual-regression` | `e2e-testing` (functional) |
| "Load testing" / "Performance test" | `load-testing` | `visual-regression` (visual) |
| "Check for regressions" | `ai-regression-testing` | `visual-regression` (visual only) |
| "Build evals" / "Eval-driven" | `eval-harness` | `tdd-workflow` (code tests, not evals) |
| "Python tests" / "pytest" | `python-testing` | `tdd-workflow` (language-agnostic) |
| "Code quality while writing" | `plankton-code-quality` | `qa` (post-hoc) |

---

## Campaign Templates

### Full Testing Strategy
1. `test-strategy` → analyze project, recommend test types and coverage targets
2. `tdd-workflow` → set up test framework, write first tests
3. `e2e-testing` → critical user flow tests
4. `visual-regression` → screenshot baselines
5. `load-testing` → performance benchmarks
6. `verification-loop` → verify everything passes

### Bug Fix with Tests
1. `qa` or `qa-only` → identify the bug
2. `tdd-workflow` → write failing test reproducing the bug
3. Fix the bug → test goes green
4. `ai-regression-testing` → check for related regressions
5. `verification-before-completion` → prove the fix works

### Pre-Release QA
1. `qa` → full QA pass
2. `e2e-testing` → run full E2E suite
3. `visual-regression` → compare against baselines
4. `load-testing` → stress test under load
5. `verification-loop` → final sign-off

### TDD Feature Build
1. `test-strategy` → what to test for this feature
2. `tdd-workflow` → red/green/refactor loop
3. `e2e-testing` → user flow test
4. `verification-before-completion` → prove it works
