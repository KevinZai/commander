---
name: refactor-safe
category: coding
skills: [refactor-clean, code-review, tdd-workflow]
mode: plan
estimated_tokens: 700
---

# Safe Refactoring

## When to Use
When refactoring existing code that has (or should have) tests. This template ensures you preserve behavior while improving structure, with rollback safety at each step.

## Template

```
Refactor the following code safely. Behavior must be preserved — this is a structural improvement, not a feature change.

**Target:**
{{file_paths_or_module_to_refactor}}

**Goal:**
{{what_structural_improvement — e.g., extract module, reduce complexity, remove duplication}}

**Constraints:**
- {{any_constraints — e.g., cannot change public API, must stay backward compatible}}

**Phase 1: Baseline**
- Read all target files with the Read tool
- Run existing tests: `npx vitest run {{relevant_test_pattern}}`
- Run type check: `npx tsc --noEmit`
- Record pass/fail counts as the baseline

**Phase 2: Plan**
- List every change you intend to make BEFORE making any edits
- For each change, state: what moves where, what gets renamed, what gets extracted
- Identify risk points where behavior could accidentally change
- Create a git checkpoint: `git stash` or `git commit -m "chore: pre-refactor checkpoint"`

**Phase 3: Execute (incremental)**
- Make ONE structural change at a time
- After each change, run tests and type check
- If any test breaks, STOP and revert that single change — do not push forward
- Use the Edit tool for surgical changes (not Write for full rewrites)

**Phase 4: Verify**
- All original tests pass (same count as baseline)
- No new TypeScript errors
- No files exceed 400 lines
- No functions exceed 50 lines
- Run `npx vitest run --coverage` — coverage must not decrease

**Phase 5: Cleanup**
- Remove any dead imports or unused code introduced by the refactor
- Verify the git diff tells a clean story (reviewable in one pass)
```

## Tips
- Use the `refactor-clean` skill to automate dead code detection after refactoring
- If tests don't exist yet, write characterization tests first (use `test-generation` template)
- Prefer many small commits over one monolithic refactor commit

## Example

```
Refactor the following code safely. Behavior must be preserved — this is a structural improvement, not a feature change.

**Target:**
src/services/billing.ts (682 lines)

**Goal:**
Extract payment processing, invoice generation, and subscription management into separate modules under src/services/billing/

**Constraints:**
- The BillingService class is imported in 14 files — public API must not change
- All 47 existing tests in billing.test.ts must continue to pass
```
