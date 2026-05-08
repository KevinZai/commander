---
name: ccc-qa
description: Comprehensive QA workflow. Runs unit + integration + E2E tests, generates coverage delta report, enumerates missing edge cases, quarantines flaky tests. Delegates to qa-engineer agent.
allowed-tools:
  - Bash
  - Read
  - Agent
  - AskUserQuestion
argument-hint: "[unit | integration | e2e | all | coverage]"
---

# /ccc-qa — Comprehensive QA Workflow

Full QA pass before shipping. Detects test framework, runs all suites, reports coverage delta, flags edge cases and flaky tests.

## Triggers

- "QA pass", "run all tests", "test coverage check"
- "before shipping", "pre-release checks"
- Coming from `/ccc-review` or `/ccc-ship`
- User types `/ccc-qa` or `/qa`

## Process

### Step 1 — Detect test framework

Run in parallel via `Bash`:
```bash
# Detect frameworks
cat package.json | grep -E '"vitest|jest|playwright|mocha|cypress"'
ls -1 *.config.{ts,js} vitest.config.* jest.config.* playwright.config.* 2>/dev/null
# Get baseline coverage if cached
cat coverage/coverage-summary.json 2>/dev/null | head -20
```

Identify: framework (vitest / jest / playwright / other), existing coverage baseline, test file count.

### Step 2 — Confirm scope via AskUserQuestion

```
question: "Which test suites should we run?"
options:
  - label: "🧪 All suites (unit + integration + E2E)"
    description: "Full QA pass. Slowest, most thorough."
  - label: "⚡ Unit + integration only"
    description: "Skip E2E. Fast — good for mid-session checks."
  - label: "🎭 E2E only (Playwright)"
    description: "Browser tests only. Requires running dev server."
  - label: "📊 Coverage report only"
    description: "No new test run — parse last run's coverage output."
```

### Step 3 — Run tests via Bash

Execute the appropriate commands based on detected framework and scope. Capture full stdout. Time the run.

Example (vitest):
```bash
npx vitest run --coverage 2>&1 | tail -60
```

Example (playwright):
```bash
npx playwright test 2>&1 | tail -40
```

### Step 4 — Delegate to qa-engineer agent

Pass the raw test output to the `qa-engineer` subagent with this brief:

> "You are the qa-engineer. Analyze the test output below. Return: (1) pass/fail counts per suite, (2) coverage delta vs baseline if available, (3) top 3 missing edge cases inferred from failing or absent tests, (4) any flaky tests (passed with retry or inconsistent timing), (5) a severity-rated summary using 🔴/🟠/🟡/🟢. Keep it under 200 words."

### Step 5 — Present results

Render the agent's report in chat. Then call `AskUserQuestion`:

```
question: "QA complete — what's next?"
options:
  - label: "🔧 Fix failing tests now"
  - label: "🚀 Ship anyway (log findings)"
  - label: "📝 Write missing edge case tests"
  - label: "📌 File issues to Linear"
```

## Anti-patterns

- Do not mark QA "passed" if there are 🔴 Critical findings
- Do not skip the agent — raw test output alone is not a QA report
- Do not run E2E without confirming the dev server is running

> Adapted from gstack — MIT licensed.
