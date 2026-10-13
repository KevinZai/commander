---
name: refactor-safe
category: coding
skills: [ccc-refactor-clean, ccc-review, tdd-workflow]
mode: plan
estimated_tokens: 700
---

# Safe Refactoring

## When to Use
Use when restructuring code that has tests, or should have them, without changing its behavior. Each step is checked against a recorded baseline and can be reverted on its own.

## Template

```
Refactor the code below without changing its behavior. This is a structural change, not a feature change.

**Target:**
{{file_paths_or_module_to_refactor}}

**Goal:**
{{what_structural_improvement — e.g., extract module, reduce complexity, remove duplication}}

**Constraints:**
- {{any_constraints — e.g., cannot change public API, must stay backward compatible}}

Phase 1: Record the baseline.
- Read every target file with the Read tool.
- Run the existing tests, for example `npx vitest run {{relevant_test_pattern}}`.
- Run the type check, for example `npx tsc --noEmit`.
- Record the pass and fail counts as the baseline.

Phase 2: Plan.
- List every change before making any edit.
- For each change, state what moves where, what is renamed, and what is extracted.
- Name the points where behavior could change by accident.
- Create a checkpoint: work on a task branch or in a separate worktree, and commit the starting state, for example `git commit -m "chore: pre-refactor checkpoint"`.

Phase 3: Execute one change at a time.
- Make one structural change.
- Run the tests and the type check after each change.
- If a test breaks, stop and revert that single change before going further.
- Use the Edit tool for targeted changes rather than rewriting whole files with Write.

Phase 4: Verify.
- Every baseline test passes, with the same count as the baseline.
- No new type errors.
- No file over 400 lines and no function over 50 lines.
- Coverage does not decrease, for example `npx vitest run --coverage`.

Phase 5: Clean up.
- Remove dead imports or unused code the refactor introduced.
- Check that `git diff` reads as one reviewable change and report the final test and type-check results.
```

## Tips
- `/ccc-refactor-clean` removes dead code after the refactor, testing before and after each deletion.
- If tests do not exist yet, write characterization tests first with the `test-generation` template.
- Prefer several small commits to one large refactor commit.

## Example

```
Refactor the code below without changing its behavior. This is a structural change, not a feature change.

**Target:**
src/services/billing.ts (682 lines)

**Goal:**
Extract payment processing, invoice generation, and subscription management into separate modules under src/services/billing/

**Constraints:**
- The BillingService class is imported in 14 files — public API must not change
- All 47 existing tests in billing.test.ts must continue to pass
```
