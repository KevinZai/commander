# Testing

Verify the observable behavior the change affects and run the repository's required checks. Choose unit, integration, or end-to-end tests by the boundary and the failure risk; not every change needs all three.

## Coverage

Keep the project's own coverage threshold. Do not impose a universal percentage, and do not add tests that only mirror implementation details or reversible documentation and configuration edits.

## Test-first

Write the test first when the project requires it, the user asks, or a regression needs reproducing:

1. Write the test.
2. Run it and confirm it fails for the intended reason.
3. Write the minimal implementation.
4. Run it and confirm it passes.
5. Refactor with the test green.

## When tests fail

1. Read the actual output; isolate the failing test.
2. Check fixtures, mocks, and test isolation.
3. Fix the implementation. Change a test only when its assumption is wrong, never to hide a defect.
4. Re-run the affected tests, then broaden only if new failures or unresolved risk justify it.

## Reporting

Report what ran, what passed, what failed, and what remains unverified. A skipped check is reported as skipped. Use `qa-engineer` or `/ccc-testing` for larger suites and `/ccc-e2e` for browser flows.
