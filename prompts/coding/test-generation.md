---
name: test-generation
category: coding
skills: [tdd-workflow, test-coverage, e2e-testing]
mode: code
estimated_tokens: 500
---

# Test Generation

## When to Use
When you have existing code that lacks test coverage and you need to backfill tests. Also useful before refactoring to establish a behavioral baseline.

## Template

```
Generate comprehensive tests for the following code. Use the project's existing test framework and patterns.

**Files to test:**
{{file_paths}}

**Test framework:**
{{vitest|jest|playwright|other — or say "detect from package.json"}}

**Step 1: Analyze**
- Read the target files with the Read tool
- Use Glob to find existing test files: `**/*.test.ts`, `**/*.spec.ts`
- Read 2-3 existing test files to match the project's testing style and conventions
- Identify all public functions, classes, and exports that need coverage

**Step 2: Categorize test cases**
For each function/method, identify:
- **Happy path** — normal expected inputs and outputs
- **Edge cases** — empty inputs, boundary values, null/undefined
- **Error cases** — invalid inputs, thrown errors, rejected promises
- **Integration points** — where this code calls other modules (mock boundaries)

**Step 3: Write tests**
- Follow the project's existing patterns (describe/it nesting, naming conventions)
- Use descriptive test names that read like specifications: `it("returns empty array when no items match filter")`
- Mock external dependencies (DB, API calls, file system) — never mock the unit under test
- Test behavior, not implementation details
- One assertion per test when possible

**Step 4: Verify**
- Run the new tests: `npx vitest run {{test_file}}`
- All tests should PASS (these are characterization tests of existing behavior)
- Run coverage: `npx vitest run --coverage` — report the delta
- If any test fails, the test is wrong (the code is the source of truth for characterization tests)
```

## Tips
- For coverage targets, check the project's CLAUDE.md — many mandate 80%+
- Use the `test-coverage` skill to identify the biggest coverage gaps before writing tests
- Write tests in the same directory as the source file unless the project convention differs

## Example

```
Generate comprehensive tests for the following code. Use the project's existing test framework and patterns.

**Files to test:**
src/utils/date-helpers.ts, src/utils/currency.ts

**Test framework:**
detect from package.json

...
```
