---
name: test-generation
category: coding
skills: [tdd-workflow, ccc-test-coverage, e2e-testing]
mode: code
estimated_tokens: 500
---

# Test Generation

## When to Use
Use when existing code lacks tests and coverage needs to be backfilled, or before a refactor to record current behavior as a baseline.

## Template

```
Write tests for the code below using the project's existing test framework and conventions.

**Files to test:**
{{file_paths}}

**Test framework:**
{{vitest|jest|playwright|other — or say "detect from package.json"}}

Step 1: Analyze.
- Read the target files with the Read tool.
- Use Glob to find existing tests, for example `**/*.test.ts` and `**/*.spec.ts`.
- Read two or three existing test files and match their style and conventions.
- List every public function, class, and export that needs coverage.

Step 2: Choose test cases.
For each function or method:
- Happy path: normal inputs and outputs.
- Edge cases: empty input, boundary values, null or undefined.
- Error cases: invalid input, thrown errors, rejected promises.
- Integration points: calls into other modules, which are the mock boundaries.

Step 3: Write the tests.
- Follow the project's patterns (describe/it nesting, naming).
- Name tests as specifications, for example `it("returns empty array when no items match filter")`.
- Mock external dependencies (database, network, file system); never mock the unit under test.
- Test behavior, not implementation details.
- Keep one behavior per test.

Step 4: Verify.
- Run the new tests, for example `npx vitest run {{test_file}}`.
- These are characterization tests of current behavior, so they should pass. If one fails, check whether the test is wrong or whether you found a real bug; report a suspected bug instead of changing the code.
- Run coverage, for example `npx vitest run --coverage`, and report the actual before-and-after numbers.
```

## Tips
- Check the project's CLAUDE.md or test config for a required coverage threshold.
- `/ccc-test-coverage` lists the worst-covered files so you can start with the largest gaps.
- Put tests next to the source file unless the project uses a separate test directory.

## Example

```
Write tests for the code below using the project's existing test framework and conventions.

**Files to test:**
src/utils/date-helpers.ts, src/utils/currency.ts

**Test framework:**
detect from package.json

...
```
