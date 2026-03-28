---
name: code-review
category: coding
skills: [code-review, security-audit, quality-gate]
mode: plan
estimated_tokens: 800
---

# Code Review

## When to Use
When you need a thorough review of code changes before committing or merging. Best used after completing a feature or fix, before the PR stage.

## Template

```
Review the following code changes with senior engineer standards. Use Glob and Read to examine the files, then provide findings organized by severity.

**Files to review:**
{{file_paths_or_glob_pattern}}

**Context:**
{{what_the_code_does_and_why_it_was_changed}}

**Review checklist:**
1. **Correctness** — Does the logic do what it claims? Edge cases?
2. **Security** — Input validation, injection, auth gaps, secret exposure
3. **Performance** — O(n) analysis, unnecessary re-renders, N+1 queries
4. **Immutability** — Any mutations of existing objects/arrays?
5. **Error handling** — Are errors caught at boundaries? User-friendly messages?
6. **Types** — TypeScript strictness, `any` usage, missing generics
7. **Tests** — Coverage gaps, missing edge case tests
8. **Naming** — Are functions/variables self-documenting?
9. **File size** — Any files exceeding 400 lines that should be split?

For each finding, output:
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **File:Line:** exact location
- **Issue:** what's wrong
- **Fix:** concrete code suggestion

After the review, run `npx tsc --noEmit` to catch type errors I may have missed.
```

## Tips
- Pair with the `code-review` skill for automated multi-perspective analysis
- For large changesets, use `git diff --stat` first to prioritize high-risk files
- Spawn a subagent for security-specific review using the `security-audit` skill

## Example

```
Review the following code changes with senior engineer standards. Use Glob and Read to examine the files, then provide findings organized by severity.

**Files to review:**
src/api/auth/*.ts

**Context:**
Added JWT refresh token rotation. When a refresh token is used, the old one is invalidated and a new pair is issued. This prevents token replay attacks.

**Review checklist:**
1. **Correctness** — Does the logic do what it claims? Edge cases?
...
```
