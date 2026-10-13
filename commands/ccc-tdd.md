---
description: "Build a feature or fix test-first: scaffold the interface, write a failing test, implement the minimum to pass, refactor, then check coverage against the project threshold (80% when none is set). Use when adding a feature, function or component, or reproducing a bug."
---

# /ccc-tdd — red, green, refactor, prove

**CC Commander** · /ccc-tdd · drives one feature or bug fix through the TDD cycle and reports real test and coverage output.

## When to use / when not to

Use for new features, new functions or components, bug fixes (reproduce the bug in a test first), refactors of existing code, and critical business logic.

Do not use for full user-flow tests (use `/ccc-e2e`) or for raising coverage on code that already exists (use `/ccc-test-coverage`).

## Arguments

`$ARGUMENTS` is the feature or bug to build, for example `/ccc-tdd a function that scores market liquidity from volume, spread and trader count`. If it is empty, ask what to build.

## Delegation

When the `tdd-guide` agent is installed (bundled with the ECC vendor pack at `agents/tdd-guide.md`, with the `tdd-workflow` skill at `skills/tdd-workflow/SKILL.md`), delegate the cycle to it with the Agent tool and pass the steps below as its contract. When it is not installed, run the steps in this session. The user's selected model is preserved; do not override it.

## What happens

1. **Detect the test runner and coverage command.** Read `package.json` scripts and config files and pick the first match:

   | Indicator | Test command | Coverage command |
   |---|---|---|
   | `vitest.config.*` | `npx vitest run <file>` | `npx vitest run --coverage` |
   | `jest.config.*` or a `jest` key in `package.json` | `npx jest <file>` | `npx jest --coverage` |
   | `pytest.ini` / `pyproject.toml` with pytest | `pytest <file>` | `pytest --cov=<pkg> --cov-report=term-missing` |
   | `go.mod` | `go test ./<pkg>/...` | `go test -cover ./...` |
   | `Cargo.toml` | `cargo test <name>` | `cargo llvm-cov` |
   | `package.json` `test` script only | `npm test -- <file>` | `npm test -- --coverage` |

   Read the coverage threshold from the project config (`coverageThreshold`, `--cov-fail-under`, CI config). Use 80% only when the project sets none. If no runner is found, ask the user for the test command.

2. **Scaffold the interface.** Define the input and output types and the function or component signature. The body throws or returns a placeholder, for example `throw new Error('Not implemented')`.

3. **Write failing tests (RED).** Place them where the project keeps tests (`foo.ts` → `foo.test.ts` by default) and follow the existing import, assertion and mocking style. Cover:
   - the happy path;
   - edge cases: empty, null or undefined, zero, boundary and maximum values;
   - error conditions and invalid input;
   - for a bug, the exact reproduction.

   Test behavior through the public interface, not implementation details.

4. **Run the tests and confirm they fail for the right reason.** Run the test command from step 1 on the new file. The failure must come from the missing behavior (for example `Not implemented` or a wrong value), not from a syntax error, bad import or broken fixture. Fix the test setup until it does.

5. **Implement the minimum to pass (GREEN).** Write only the code the failing tests require. Run the test command again; every new test must pass and no existing test may break.

6. **Refactor.** Extract constants, remove duplication and improve names while behavior stays fixed. Re-run the test command after each refactor; revert the refactor if a test turns red.

7. **Check coverage.** Run the coverage command from step 1. If the changed files are below the threshold, add tests for the uncovered branches and error paths, then re-run. Hold security, authentication, financial and core business logic to the project's strictest target.

8. **Repeat** steps 3 to 7 for the next scenario until the requested behavior is complete.

## Decision points

Ask with AskUserQuestion (plain-text question where it is unavailable) when:

- the runner cannot be detected: 🟢 Use the command I found in `package.json` · Enter a test command · Set up a runner first (names the install command; nothing is installed without this choice);
- a test cannot be made to fail for the right reason after 3 attempts: 🟢 Show the failing setup and stop · Rewrite the test at a higher level (integration) · Skip this scenario and continue.

## Done when

Run the full test command and the coverage command one final time and report their actual output:

- tests added, with file paths, and the pass/fail count;
- coverage for the changed files against the threshold used, and where that threshold came from;
- any scenario skipped, with the reason;
- `git diff --stat` for the files touched.

## Guardrails

- Never write implementation code before a failing test exists for it, and never skip the RED run.
- Never weaken or delete an assertion to get to green; fix the code or report the defect.
- Prefer real collaborators and integration tests over mocking everything; mock only external services, the network, the clock and the file system.
- Do not install test tooling or dependencies without the user's choice in this conversation.

## See also

`/ccc-plan` (decide what to build) · `/ccc-build-fix` (build errors) · `/ccc-test-coverage` (backfill coverage) · `/ccc-code-review` (review the result) · `/ccc-e2e` (user-flow tests)
