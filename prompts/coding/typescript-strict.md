---
name: typescript-strict
category: coding
skills: [coding-standards, refactor-clean, quality-gate]
mode: plan
estimated_tokens: 800
---

# TypeScript Strict Mode Migration

## When to Use
When migrating an existing TypeScript project to strict mode, or tightening a loosely typed codebase. This is a multi-session effort for large projects — this template handles incremental migration.

## Template

```
Migrate this project to TypeScript strict mode incrementally. Zero runtime behavior changes — types only.

**Project root:**
{{project_root_path}}

**Current tsconfig strict settings:**
{{paste_current_strict_flags_or_say_unknown}}

**Phase 1: Assess**
- Read `tsconfig.json` with the Read tool
- Run `npx tsc --noEmit 2>&1 | wc -l` to count current errors
- Run `npx tsc --noEmit --strict 2>&1 | head -100` to preview strict mode errors
- Use Grep to count `any` usage: search for `: any` and `as any` across the codebase
- Categorize errors by type:
  - `strictNullChecks` violations (null/undefined not handled)
  - `noImplicitAny` violations (missing type annotations)
  - `strictPropertyInitialization` violations (class properties)
  - `strictFunctionTypes` violations (callback variance)

**Phase 2: Plan migration order**
Enable flags incrementally (each should result in a passing build before the next):
1. `noImplicitReturns` (easiest, usually few errors)
2. `noFallthroughCasesInSwitch`
3. `noImplicitAny` (medium effort)
4. `strictNullChecks` (highest effort, most impactful)
5. `strictFunctionTypes`
6. `strictPropertyInitialization`
7. `strictBindCallApply`
8. Finally: `"strict": true` (enables all at once)

**Phase 3: Execute per-flag**
For each flag:
1. Enable the flag in tsconfig.json
2. Run `npx tsc --noEmit` to see all new errors
3. Fix errors file-by-file using the Edit tool
4. Prefer narrowing (type guards, nullish coalescing) over `as` casts
5. NEVER add `// @ts-ignore` or `as any` to suppress errors
6. Run tests after each file to verify no runtime changes
7. Commit: `git commit -m "chore: enable {{flag}} strict check"`

**Phase 4: Cleanup**
- Use Grep to find remaining `as any` — each one needs justification or replacement
- Find remaining `// @ts-expect-error` — document why each is necessary
- Run full test suite: `npx vitest run`
- Run `npx tsc --noEmit` — must be zero errors

**Phase 5: Lock it down**
- Ensure `"strict": true` is in tsconfig.json
- Add `npx tsc --noEmit` to the CI pipeline / pre-commit hook
```

## Tips
- For large codebases (500+ errors), migrate one directory at a time using `tsconfig` path includes
- The `quality-gate` skill can enforce zero type errors as a gate before commits
- Track progress with a simple count: errors remaining per flag

## Example

```
Migrate this project to TypeScript strict mode incrementally. Zero runtime behavior changes — types only.

**Project root:**
/Users/me/projects/my-saas

**Current tsconfig strict settings:**
Currently only has "strict": false, "noImplicitAny": false
```
