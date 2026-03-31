---
name: Test Strategy
description: "Generates a complete testing strategy for any project — analyzes codebase, recommends test types, sets coverage targets."
version: 1.0.0
category: testing
parent: ccc-testing
---

# Test Strategy

> Analyze a project and produce a comprehensive testing strategy. Covers what to test, how to test it, and what coverage to target.

## When to Use

- Starting a new project and need a testing plan
- Inheriting a codebase with no tests
- Planning a testing overhaul
- Before a major feature that needs test infrastructure

## Strategy Generation Process

### Step 1: Analyze the Project

Examine the codebase to understand:

```
Project Analysis Checklist:
- [ ] Language and runtime (TypeScript/Node, Python, Go, etc.)
- [ ] Framework (Next.js, FastAPI, Gin, etc.)
- [ ] Existing test infrastructure (test runner, config files)
- [ ] Current coverage (if any)
- [ ] CI/CD pipeline (GitHub Actions, etc.)
- [ ] External dependencies (databases, APIs, queues)
- [ ] User-facing surfaces (web UI, API, CLI)
```

### Step 2: Classify Modules by Risk

Rate each module/area on two axes:

| Risk Level | Change Frequency | Impact if Broken | Testing Priority |
|------------|-----------------|------------------|-----------------|
| Critical | High | High | 95%+ coverage, E2E, visual |
| High | High | Medium | 90%+ coverage, integration |
| Medium | Medium | Medium | 80%+ coverage, unit |
| Low | Low | Low | 70%+ coverage, unit |

Critical modules typically include: authentication, payments, data persistence, core business logic.

### Step 3: Recommend Test Types

```
Test Pyramid (recommended ratios):
                    ┌─────────┐
                    │  E2E    │  10% — Critical user journeys
                    │  (few)  │
                 ┌──┴─────────┴──┐
                 │  Integration   │  20% — API routes, DB queries
                 │  (some)        │
              ┌──┴───────────────┴──┐
              │  Unit Tests          │  70% — Functions, utilities, logic
              │  (many)              │
              └──────────────────────┘

Additional layers (add as needed):
- Visual regression: UI-heavy apps
- Load testing: APIs with SLAs
- Contract testing: Microservices
- Snapshot testing: Serialized outputs
```

### Step 4: Framework Recommendations

#### TypeScript / JavaScript
```json
{
  "unit": "vitest",
  "integration": "vitest + supertest (API) or testing-library (React)",
  "e2e": "playwright",
  "visual": "playwright screenshots or chromatic",
  "load": "k6",
  "coverage": "v8 (via vitest --coverage)"
}
```

#### Python
```json
{
  "unit": "pytest",
  "integration": "pytest + httpx (FastAPI) or Django test client",
  "e2e": "playwright-python",
  "load": "locust or k6",
  "coverage": "pytest-cov"
}
```

#### Go
```json
{
  "unit": "testing (stdlib)",
  "integration": "testing + httptest",
  "e2e": "playwright (via Node sidecar)",
  "load": "k6",
  "coverage": "go test -cover"
}
```

### Step 5: Define Coverage Targets

```
Minimum targets (non-negotiable):
  Overall:     80%
  Critical:    95%
  High:        90%
  New code:    90% (enforced in CI)

Coverage enforcement:
  - Pre-commit: Run affected tests
  - CI: Full suite + coverage report
  - PR gate: No merge below threshold
```

### Step 6: Output the Strategy Document

```markdown
# Testing Strategy: [Project Name]

## Project Profile
- Stack: [language/framework]
- Current coverage: [X%]
- Test runner: [tool]
- CI: [platform]

## Module Risk Classification
| Module | Risk | Coverage Target | Test Types |
|--------|------|----------------|------------|
| auth   | Critical | 95% | Unit, Integration, E2E |
| api    | High | 90% | Unit, Integration |
| utils  | Medium | 80% | Unit |
| config | Low | 70% | Unit |

## Test Infrastructure Setup
1. Install dependencies: [commands]
2. Configure test runner: [config file]
3. Set up CI pipeline: [workflow file]
4. Add coverage reporting: [tool + config]

## Test Writing Priorities (ordered)
1. [Highest risk area] — [test type] — [estimated effort]
2. [Next highest] — [test type] — [estimated effort]
3. ...

## Coverage Enforcement
- CI gate: [threshold]
- Pre-commit hook: [what runs]
- Reporting: [tool + dashboard]
```

## Example: Next.js SaaS App Strategy

```markdown
# Testing Strategy: SaaS Dashboard

## Module Risk Classification
| Module | Risk | Target | Tests |
|--------|------|--------|-------|
| auth (better-auth) | Critical | 95% | Unit, Integration, E2E |
| billing (Stripe) | Critical | 95% | Unit, Integration, E2E |
| API routes | High | 90% | Unit, Integration |
| Dashboard UI | High | 85% | Unit, E2E, Visual |
| Settings pages | Medium | 80% | Unit, E2E |
| Utility functions | Low | 80% | Unit |

## Setup Commands
npm install -D vitest @vitest/coverage-v8 @testing-library/react
npm install -D @playwright/test
npx playwright install

## Priority Order
1. Auth flows — E2E (login, signup, password reset) — 4h
2. Billing integration — Unit + Integration (webhook handling) — 6h
3. API routes — Integration (all endpoints) — 8h
4. Dashboard — E2E (critical paths) + Visual baselines — 4h
5. Utility functions — Unit (pure functions) — 2h
```

## Anti-Patterns

- Setting 100% coverage targets (creates perverse incentives to test trivial code)
- Testing implementation details instead of behavior
- Skipping integration tests because "unit tests are enough"
- Not testing error paths (only happy path coverage)
- Writing tests after the feature is "done" instead of using TDD
- Treating all code as equally important (use risk classification)
