---
name: tech-debt-assessment
category: planning
skills: [ccc-audit, ccc-refactor-clean, ccc-quality-gate]
mode: plan
estimated_tokens: 600
---

# Technical Debt Assessment

## When to Use
Use to evaluate the health of a codebase, prioritize cleanup work, or justify refactoring time. Run it on a regular cadence or before major feature work. The assessment is read-only; cleanup happens afterwards.

## Template

```
Assess the technical debt in this codebase. Quantify it, categorize it and produce a prioritized cleanup plan. Do not edit any file during the assessment.

**Project:**
{{project_root_path}}

**Stack:**
{{e.g., Next.js + Prisma + PostgreSQL}}

Phase 1: Automated scans
Run the project's own checks and report the actual output. Use the commands defined in the project's manifest or CI config; for a TypeScript project these are typically:
- `npx tsc --noEmit 2>&1 | wc -l` for the type-error count.
- The project's coverage command (for example `npx vitest run --coverage`) for the coverage percentage.
Count with Grep:
- `TODO` and `FIXME` comments.
- `any` usage (`: any`, `as any`).
- `@ts-ignore` and `@ts-expect-error` suppressions.
- `eslint-disable` comments.
- `console.log` statements that should use the project's logger.
Find source files over 400 lines with Glob and a line count.

Phase 2: Structural analysis
- Map the project structure with Glob.
- Identify circular imports.
- Find duplicated code across files.
- Find dead code (exports with no importers).
- Review dependencies for outdated packages, security advisories and unused packages.

Phase 3: Categorize the debt

| Category | Description | Count | Severity |
|---|---|---|---|
| Type safety | `any` usage, suppressions, missing types | X | HIGH |
| Test coverage | Untested modules, missing edge cases | X | HIGH |
| Code quality | Large files, deep nesting, duplication | X | MEDIUM |
| Dead code | Unused exports, unreachable branches | X | LOW |
| Dependencies | Outdated packages, security advisories | X | MEDIUM |
| Documentation | Missing docs, outdated comments | X | LOW |

State how each count was produced (command or pattern), and spot-check a few matches before assigning severity.

Phase 4: Prioritized cleanup plan
Rank by impact on development velocity against effort to fix.

| Priority | Item | Category | Effort | Impact | Suggested sprint |
|---|---|---|---|---|---|
| 1 | ... | ... | S/M/L | HIGH/MED/LOW | ... |
| 2 | ... | ... | S/M/L | HIGH/MED/LOW | ... |

Phase 5: Metrics to track
Define health metrics to measure over time:
- Type-error count (target: 0).
- Test coverage percentage (target: 80% or the project's threshold).
- `any` count (target: decreasing).
- Source files over 400 lines (target: decreasing).
- Dependency age (target: no package more than 6 months behind).
```

## Tips
- `/ccc-audit` gives a quick scored health report; `/ccc-xray` adds docs, CI and session-cost scores.
- `/ccc-refactor-clean` removes dead code one item at a time with a test run after each deletion; `/ccc-quality-gate` runs format, lint and type checks on a chosen scope.
- Present the result as a debt budget: a fixed share of each sprint for cleanup.

## Example

```
Assess the technical debt in this codebase. Quantify it, categorize it and produce a prioritized cleanup plan.

**Project:** . (the repository root)
**Stack:** Next.js + Prisma + PostgreSQL + Tailwind
```
