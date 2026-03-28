---
name: tech-debt-assessment
category: planning
skills: [audit, refactor-clean, quality-gate]
mode: plan
estimated_tokens: 600
---

# Technical Debt Assessment

## When to Use
When you need to evaluate the health of a codebase, prioritize cleanup work, or justify refactoring time to stakeholders. Run this quarterly or before major feature work.

## Template

```
Assess the technical debt in this codebase. Quantify it, categorize it, and produce a prioritized cleanup plan.

**Project:**
{{project_root_path}}

**Stack:**
{{e.g., Next.js + Prisma + PostgreSQL}}

**Phase 1: Automated scans**
Run these and report findings:
- `npx tsc --noEmit 2>&1 | wc -l` — TypeScript errors count
- `npx vitest run --coverage` — test coverage percentage
- Use Grep to count:
  - `// TODO` and `// FIXME` comments
  - `any` type usage (`: any`, `as any`)
  - `// @ts-ignore` and `// @ts-expect-error` suppressions
  - `eslint-disable` comments
  - `console.log` statements (should be replaced with proper logging)
- Use Glob to find files over 400 lines: check file sizes across `src/**/*.ts`

**Phase 2: Structural analysis**
- Read the project structure with Glob
- Identify circular dependencies (imports that form cycles)
- Find duplicated code (similar patterns in multiple files)
- Check for dead code (exports with zero importers)
- Review the dependency tree — outdated packages, unnecessary dependencies

**Phase 3: Categorize debt**
Group findings into:

| Category | Description | Count | Severity |
|---|---|---|---|
| **Type safety** | `any` usage, ts-ignore, missing types | X | HIGH |
| **Test coverage** | Untested modules, missing edge cases | X | HIGH |
| **Code quality** | Large files, deep nesting, duplication | X | MEDIUM |
| **Dead code** | Unused exports, unreachable branches | X | LOW |
| **Dependencies** | Outdated packages, security advisories | X | MEDIUM |
| **Documentation** | Missing docs, outdated comments | X | LOW |

**Phase 4: Prioritized cleanup plan**
Rank by: (impact on development velocity) x (effort to fix)

| Priority | Item | Category | Effort | Impact | Suggested Sprint |
|---|---|---|---|---|---|
| 1 | ... | ... | S/M/L | HIGH/MED/LOW | ... |
| 2 | ... | ... | S/M/L | HIGH/MED/LOW | ... |
| ... | ... | ... | ... | ... | ... |

**Phase 5: Metrics to track**
Define health metrics to measure over time:
- TypeScript error count (target: 0)
- Test coverage percentage (target: 80%+)
- `any` count (target: decreasing)
- Average file size (target: under 400 lines)
- Dependency age (target: no package >6 months behind)
```

## Tips
- Use the `audit` skill for a quick automated health check
- The `refactor-clean` skill can fix many low-hanging items automatically
- Present the assessment to stakeholders as a "debt budget" — X% of sprint time for cleanup

## Example

```
Assess the technical debt in this codebase. Quantify it, categorize it, and produce a prioritized cleanup plan.

**Project:** /Users/me/projects/my-saas
**Stack:** Next.js 14 + Prisma + PostgreSQL + Tailwind
```
