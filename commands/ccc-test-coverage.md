---
description: "Measure test coverage, list the worst-covered files, and write the missing tests until the project threshold (80% when none is set) is met. Use when coverage is low, before a release, or after adding untested code."
---

# /ccc-test-coverage — close the coverage gaps

**CC Commander** · /ccc-test-coverage · runs the real coverage tool, writes tests for the gaps worst-first, and reports before/after numbers.

## Arguments

`$ARGUMENTS` optionally narrows the scope to a path or glob (for example `src/services`). Empty means the whole project.

## What happens

1. **Detect the framework and coverage command.** Use the first match:

   | Indicator | Coverage command |
   |---|---|
   | `vitest.config.*` | `npx vitest run --coverage` |
   | `jest.config.*` or a `jest` key in `package.json` | `npx jest --coverage --coverageReporters=json-summary` |
   | `pytest.ini` / `pyproject.toml` with pytest | `pytest --cov=src --cov-report=json` |
   | `Cargo.toml` | `cargo llvm-cov --json` |
   | `pom.xml` with JaCoCo | `mvn test jacoco:report` |
   | `go.mod` | `go test -coverprofile=coverage.out ./...` then `go tool cover -func=coverage.out` |

   Read the threshold from project config (`coverageThreshold`, `--cov-fail-under`, JaCoCo rules, CI config). Use 80% only when the project sets none. If no coverage tool is configured, ask before installing one (picker below).

2. **Record the baseline.** Run the coverage command, parse the JSON summary or terminal output, and list files below the threshold, worst first. For each, identify:
   - untested functions or methods;
   - missed branches (if/else, switch cases, ternaries, error and catch paths);
   - dead code that inflates the denominator (report it; do not delete it without asking).

3. **Write the missing tests**, file by file, in this order:
   1. happy path with valid input;
   2. error handling: invalid input, missing data, failed network or I/O;
   3. edge cases: empty arrays, null or undefined, boundary values such as 0, -1 and the maximum;
   4. each remaining branch.

   Rules for every test:
   - place it where the project keeps tests (`foo.ts` → `foo.test.ts` by default);
   - copy the project's import style, assertion library and mocking approach;
   - mock only external dependencies (database, APIs, file system, clock);
   - keep tests independent, with no shared mutable state;
   - name tests by behavior, for example `create_user_with_duplicate_email_returns_409`.

   Prioritize complex branching, error handlers, shared utilities, and API handlers (request to response).

4. **Verify.** Run the full test suite; every test must pass. Re-run the coverage command. If files remain below the threshold, repeat step 3 for the remaining gaps. Stop after three passes that add no coverage and report what is blocking.

## Decision points

AskUserQuestion (plain-text question where it is unavailable) when no coverage tool is configured: 🟢 Install the standard tool for this stack (names the exact command, for example `npm i -D @vitest/coverage-v8`) · Use the test runner's built-in output only · Stop.

## Done when

Report the actual output of the final coverage run as a before/after table:

```
Coverage Report
──────────────────────────────────────
File                     Before  After
src/services/auth.ts     45%     88%
src/utils/validation.ts  32%     82%
──────────────────────────────────────
Overall                  67%     84%  ✅
```

Include the threshold used and its source, the test files added, the full-suite pass/fail count, and `git diff --stat`.

## Guardrails

- Never lower a configured threshold, add coverage-ignore comments, or exclude files to reach a number.
- Never weaken an assertion so a test passes; report the defect the test found.
- Do not install dependencies without the user's choice in this conversation.

## See also

`/ccc-tdd` · `/ccc-verify` · `/ccc-build-fix` · `/ccc-e2e`
