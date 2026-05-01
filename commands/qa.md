---
name: qa
description: "[C:testing] — Diff-aware QA — analyzes what changed and runs targeted testing with prioritized checklist"
usage: /qa [main|staging <url>|full]
version: 1.3.0
---

# QA — Diff-Aware Quality Assurance
> Inspired by [gstack](https://github.com/garrytan/gstack) by Garry Tan

You are performing targeted QA based on what actually changed. Instead of testing everything, analyze the diff, identify affected user flows, and run focused checks.

**Input:** `{{input}}`

## 1. Analyze the Diff

Determine the diff scope from the input argument:
- No args or empty → `git diff --name-only HEAD~1`
- `main` → `git diff --name-only main...HEAD`
- `staging <url>` → diff against HEAD~1, use the URL for browser QA
- `full` → skip diff filtering, QA all critical flows

Run `git diff --stat HEAD~1` (or `main...HEAD`) for a change summary. Then categorize every changed file:

| Category | Patterns |
|----------|----------|
| Frontend | `*.tsx`, `*.jsx`, `*.css`, `*.html`, `components/`, `pages/`, `app/`, `views/` |
| Backend | `*.ts` (non-component), `*.py`, `api/`, `server/`, `routes/`, `controllers/` |
| Database | `migrations/`, `schema`, `*.sql`, `drizzle/`, `prisma/` |
| Config | `*.json`, `*.yaml`, `*.toml`, `*.env*`, `Dockerfile`, CI files |
| Docs | `*.md`, `docs/`, `README` |

**If ALL changes are docs-only:** Output `No functional changes to test.` and stop.

## 2. Identify Affected Flows

For each changed file, determine:
- What user-facing feature does this file support?
- What critical paths could break?
- Are there API contract changes (new/removed endpoints, changed request/response shapes)?
- Are there schema migrations or env var changes?

List the affected flows with brief descriptions.

## 3. Run Automated Checks

Execute in parallel where possible:

```bash
# TypeScript (if tsconfig.json exists)
npx tsc --noEmit

# Tests (detect runner from package.json scripts)
# Try: npm test, npx vitest run, npx jest --passWithNoTests
npm test 2>/dev/null || npx vitest run 2>/dev/null || echo "No test runner detected"

# Lint (if configured)
npm run lint 2>/dev/null || echo "No linter configured"

# Build (if build script exists)
npm run build 2>/dev/null || echo "No build script"
```

Skip any check that doesn't apply to the project.

## 4. Generate QA Checklist

For each affected flow, create specific test steps with priority:

- **P0 (must test):** Core functionality directly modified, payment flows, auth, data mutations
- **P1 (should test):** Adjacent features that share modified code, UI changes visible to users
- **P2 (nice to test):** Downstream features, edge cases, cosmetic concerns

Include edge cases based on change type:
- API changes → test error responses, validation, backwards compatibility
- UI changes → responsive breakpoints, empty states, loading states
- DB changes → migration rollback, data integrity, null handling
- Config changes → env var fallbacks, feature flags

## 5. Browser QA (If Playwright MCP Available)

If a staging URL was provided or a local dev server is running:

1. Navigate to affected pages
2. Take screenshots of changed UI components
3. Verify critical interactions (clicks, form submissions, navigation)
4. Check for console errors on each page
5. Test responsive layouts if frontend changed

If no browser testing is possible, output manual test instructions instead.

## 6. QA Report

Output the final report in this format:

```
QA REPORT: [feature/change summary]

Changes: X files (Y frontend, Z backend, W config)
Risk Level: [LOW|MEDIUM|HIGH|CRITICAL]

Risk criteria:
  LOW    = docs/config only, no logic changes
  MEDIUM = UI tweaks, non-critical backend changes
  HIGH   = API changes, auth modifications, new features
  CRITICAL = DB migrations, payment logic, security-related changes

Automated:
  Build:  [PASS|FAIL|N/A]
  Types:  [PASS|FAIL|N/A]
  Tests:  [X/Y passed|N/A]
  Lint:   [PASS|X issues|N/A]

Manual Checklist:
  P0:
  - [ ] [critical test step]
  P1:
  - [ ] [important test step]
  P2:
  - [ ] [nice-to-have test]

Screenshots: [attached if Playwright available, otherwise "manual verification needed"]

Verdict: [SHIP IT | NEEDS FIXES | BLOCK]

Verdict criteria:
  SHIP IT    = all automated checks pass, no P0 failures
  NEEDS FIXES = automated check failures or P0 items untested
  BLOCK      = critical risk with failing tests or unverified migrations
```
