---
name: code-review
category: coding
skills: [ccc-review, security-audit, ccc-quality-gate]
mode: plan
estimated_tokens: 800
---

# Code Review

## When to Use
Use after finishing a feature or fix and before opening a pull request, when the changes need a full review rather than a quick read. For a review of the current branch with no custom checklist, the built-in `/code-review` or `/ccc-review` is faster.

## Template

```
Review the code changes below. Read the files with Glob and Read, report findings ordered by severity, and do not edit any file.

**Files to review:**
{{file_paths_or_glob_pattern}}

**Context:**
{{what_the_code_does_and_why_it_was_changed}}

Review checklist:
1. Correctness: does the logic do what it claims, including edge cases?
2. Security: input validation, injection, authorization gaps, secret exposure.
3. Performance: algorithmic cost, unnecessary re-renders, N+1 queries.
4. Immutability: mutation of shared objects or arrays.
5. Error handling: errors handled at boundaries, with user-facing messages kept separate from internal diagnostics.
6. Types: strictness, `any` usage, missing generics.
7. Tests: coverage gaps and missing edge-case tests.
8. Naming: whether functions and variables describe themselves.
9. File size: files over 400 lines that should be split.

For each finding, report:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- File:Line: exact location
- Issue: what is wrong and the input or state that triggers it
- Fix: a concrete code change

Before reporting a CRITICAL or HIGH finding, confirm it by reading the surrounding code; drop it if an existing guard already prevents the failure.

After the review, run the project's type check (for TypeScript, `npx tsc --noEmit`) and report its actual output.
```

## Tips
- For a large changeset, run `git diff --stat` first and review the highest-risk files first.
- For a second, independent pass, delegate a security-only review to a fresh-context subagent (Agent tool) with the `security-audit` skill; it keeps the session's selected model unless you choose another tier.
- `/code-review --max-findings all` lists every finding instead of the top few; `codex review --uncommitted` gives an optional cross-model opinion when the Codex CLI is installed.

## Example

```
Review the code changes below. Read the files with Glob and Read, report findings ordered by severity, and do not edit any file.

**Files to review:**
src/api/auth/*.ts

**Context:**
Added JWT refresh token rotation. When a refresh token is used, the old one is invalidated and a new pair is issued. This prevents token replay attacks.

Review checklist:
1. Correctness: does the logic do what it claims, including edge cases?
...
```
