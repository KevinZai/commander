---
name: typescript-strict
category: coding
skills: [coding-standards, ccc-refactor-clean, ccc-quality-gate]
mode: plan
estimated_tokens: 800
---

# TypeScript Strict Mode Migration

## When to Use
Use when moving an existing TypeScript project to strict mode or tightening a loosely typed codebase. Large projects take several sessions; the template migrates one flag at a time so each step ends with a passing build.

## Template

```
Migrate this project to TypeScript strict mode incrementally. Change types only; runtime behavior must not change.

**Project root:**
{{project_root_path}}

**Current tsconfig strict settings:**
{{paste_current_strict_flags_or_say_unknown}}

Phase 1: Assess.
- Read `tsconfig.json` with the Read tool.
- Count current errors: `npx tsc --noEmit 2>&1 | wc -l`.
- Preview strict-mode errors: `npx tsc --noEmit --strict 2>&1 | head -100`.
- Use Grep to count `: any` and `as any` across the codebase.
- Group the errors by flag:
  - `strictNullChecks`: null or undefined not handled.
  - `noImplicitAny`: missing type annotations.
  - `strictPropertyInitialization`: uninitialized class properties.
  - `strictFunctionTypes`: callback parameter variance.

Phase 2: Plan the order.
Enable one flag at a time; the build must pass before the next flag:
1. `noImplicitReturns` (usually few errors)
2. `noFallthroughCasesInSwitch`
3. `noImplicitAny` (medium effort)
4. `strictNullChecks` (highest effort, largest benefit)
5. `strictFunctionTypes`
6. `strictPropertyInitialization`
7. `strictBindCallApply`
8. Finally `"strict": true`, which enables them all

Phase 3: Migrate each flag.
1. Enable the flag in tsconfig.json.
2. Run `npx tsc --noEmit` to list the new errors.
3. Fix the errors file by file with the Edit tool.
4. Prefer narrowing (type guards, nullish coalescing) over `as` casts.
5. Do not add `// @ts-ignore` or `as any` to silence an error; fix the type instead.
6. Run the tests after each file to confirm runtime behavior is unchanged.
7. On a task branch, commit each flag separately: `git commit -m "chore: enable {{flag}} strict check"`.

Phase 4: Clean up.
- Use Grep to find any remaining `as any`; replace each one or record why it is needed.
- Find any remaining `// @ts-expect-error` and document why each is needed.
- Run the full test suite, for example `npx vitest run`.
- Run `npx tsc --noEmit` and confirm zero errors.

Phase 5: Keep it enforced.
- Confirm `"strict": true` is set in tsconfig.json.
- Add `npx tsc --noEmit` to CI or a pre-commit hook.
- Report the final error count per flag and the test results.
```

## Tips
- For a codebase with hundreds of strict errors, migrate one directory at a time using a separate tsconfig with narrowed `include` paths.
- `/ccc-quality-gate` runs lint and type checks on demand before each commit.
- Track progress as errors remaining per flag.

## Example

```
Migrate this project to TypeScript strict mode incrementally. Change types only; runtime behavior must not change.

**Project root:**
./ (repository root)

**Current tsconfig strict settings:**
Currently only has "strict": false, "noImplicitAny": false
```
