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

Full QA pass before shipping. Detects test framework, runs all suites, reports coverage delta, flags edge cases and flaky tests. Delegates analysis to the `qa-engineer` subagent. Never marks QA passed with open 🔴 Critical findings.

## Triggers

- `/ccc-qa` or `/qa`
- "QA pass", "run all tests", "test coverage check"
- "before shipping", "pre-release checks", "is this ready to ship"
- "check test coverage", "find missing tests"
- "flaky test", "test suite health"
- Coming from `/ccc-review` or `/ccc-ship`

## When NOT to Use

- Greenfield project with no tests yet — use `/ccc-testing` to scaffold the test suite first
- Single-function bug fixes where a targeted unit test is the right move (write it directly)
- Pure documentation or config-only changes with no testable behavior

## Process

### Step 1 — Detect test framework

Run the following in parallel via `Bash`:

```bash
# Detect JS/TS frameworks
cat package.json 2>/dev/null | grep -E '"(vitest|jest|playwright|mocha|cypress|jasmine)"' | head -10

# Detect config files
ls *.config.{ts,js,mjs} vitest.config.* jest.config.* playwright.config.* pytest.ini setup.cfg \
   go.mod Cargo.toml pom.xml 2>/dev/null

# Detect Python
python3 -m pytest --collect-only -q 2>/dev/null | tail -5

# Detect Go
go test ./... -list '.*' 2>/dev/null | head -10

# Detect Rust
cargo test --no-run 2>/dev/null | tail -5

# Baseline coverage (if previously run)
cat .ccc/coverage-history.json 2>/dev/null || cat coverage/coverage-summary.json 2>/dev/null | head -30
```

**Detection logic:**
- `vitest.config.*` present → **Vitest** (`npx vitest run --coverage`)
- `jest.config.*` present or `"jest"` in scripts → **Jest** (`npx jest --coverage`)
- `playwright.config.*` present → **Playwright** (`npx playwright test`)
- `pytest.ini` or `setup.cfg [tool:pytest]` → **pytest** (`python3 -m pytest --cov`)
- `go.mod` present → **Go test** (`go test ./... -cover`)
- `Cargo.toml` present → **cargo test** (`cargo test 2>&1`)
- `pom.xml` present → **JUnit via Maven** (`mvn test`)
- None detected → report to user and offer to scaffold via `/ccc-testing`

### Step 2 — Confirm scope

```yaml
question: "Which test suites should we run?"
options:
  - label: "🧪 All suites (unit + integration + E2E)"
    description: "Full QA pass. Slowest, most thorough. Use before releases."
  - label: "⚡ Unit + integration only"
    description: "Skip E2E. Fast — good for mid-session checks."
  - label: "🎭 E2E only (Playwright / Cypress)"
    description: "Browser tests only. Requires running dev server."
  - label: "📊 Coverage report only"
    description: "No new test run — parse last run's coverage output."
  - label: "🔁 Flaky test audit (run suite 3×)"
    description: "Detect non-deterministic tests by running the full suite three times and comparing results."
```

### Step 3 — Run tests

Execute based on detected framework and confirmed scope. Capture full stdout. Time the run.

**Vitest (unit + coverage):**
```bash
npx vitest run --coverage --reporter=verbose 2>&1 | tail -80
```

**Jest:**
```bash
npx jest --coverage --forceExit 2>&1 | tail -80
```

**Playwright (E2E):**
```bash
# Confirm dev server is running first
curl -s http://localhost:3000 > /dev/null && echo "server up" || echo "server down"
npx playwright test --reporter=list 2>&1 | tail -60
```

**pytest:**
```bash
python3 -m pytest --cov=. --cov-report=term-missing -q 2>&1 | tail -60
```

**Go:**
```bash
go test ./... -cover -count=1 2>&1 | tail -40
```

**Flaky test detection (3-run mode):**
```bash
for i in 1 2 3; do
  echo "=== Run $i ===" && npx vitest run --reporter=json 2>/dev/null | \
  jq '[.testResults[].assertionResults[] | {name:.fullName, status:.status}]'
done
```
Compare outputs across 3 runs. Any test with differing `status` across runs is flagged as flaky.

### Step 4 — Compute coverage delta

```bash
# Store current coverage
mkdir -p .ccc
CURRENT=$(cat coverage/coverage-summary.json 2>/dev/null | \
  jq '{lines: .total.lines.pct, branches: .total.branches.pct, functions: .total.functions.pct}')
PREV=$(cat .ccc/coverage-history.json 2>/dev/null | jq '.last // {}')
echo "$CURRENT" > .ccc/coverage-history.json
echo "Previous: $PREV"
echo "Current:  $CURRENT"
```

Report delta as: `lines: 74% → 82% (+8%)`, `branches: 61% → 65% (+4%)`.
Flag any regression (delta < 0) as 🟠 High.

### Step 5 — Delegate to qa-engineer agent

Pass raw test output + coverage delta to the `qa-engineer` subagent:

```
You are the qa-engineer persona. Analyze the test output and coverage delta below.

Return a severity-rated QA report with these sections:
1. Pass/fail counts per suite
2. Coverage delta (lines, branches, functions)
3. Flaky tests detected (name + inconsistency description)
4. Top 5 missing edge cases inferred from failing or absent tests — use this template:
   - empty input (null / undefined / "")
   - max boundary (max int, max string length, rate limit)
   - concurrent access (two writes at same time)
   - unicode / special chars in user-controlled fields
   - expired token / stale session at exact boundary second
5. Severity-rated summary:
   🔴 Critical — test failure blocks ship
   🟠 High — coverage regression or flaky test in critical path
   🟡 Medium — missing edge case with moderate risk
   🟢 Low — informational, style, or nit

Keep total output under 300 words. Do not reproduce the full test log.

--- TEST OUTPUT ---
{raw_output}

--- COVERAGE DELTA ---
{delta}
```

### Step 6 — Present results and next action

Render the agent's report. Then:

```yaml
question: "QA complete — what's next?"
options:
  - label: "🔧 Fix failing tests now"
    description: "Work through 🔴 and 🟠 findings before shipping."
  - label: "📝 Write missing edge case tests"
    description: "Scaffold the missing test cases surfaced by the qa-engineer."
  - label: "🚀 Ship anyway (log findings)"
    description: "Only valid if there are no 🔴 Critical findings. Logs report to .ccc/qa-report.md."
  - label: "📌 File issues to Linear"
    description: "Create Linear issues for each 🟠+ finding."
```

## Edge Case Enumeration Template

When the qa-engineer returns missing edge cases, use this checklist as the base:

| Category      | Example inputs to test |
|---------------|------------------------|
| Empty         | `""`, `null`, `undefined`, `[]`, `{}` |
| Boundary      | `Number.MAX_SAFE_INTEGER`, string of 10,000 chars, 0, -1 |
| Concurrent    | Two simultaneous writes to the same record |
| Unicode       | `"тест@example.com"`, emoji in username, RTL string |
| Expired state | Token at exact TTL boundary, stale session cookie |
| Overflow      | Payload > server max body size, file > upload limit |

## Examples

### Example 1 — Auth refactor QA

```
/ccc-qa unit
```

Framework detected: Vitest. Output: 187/187 pass, coverage 74% → 82% (+8% on `src/auth/*`).
qa-engineer flags: missing concurrent session creation test (🟠 High), expired-token-at-boundary test (🟡 Medium).
Decision chip: user picks "Write missing edge case tests."

### Example 2 — Payment flow QA

```
/ccc-qa all
```

Framework detected: Vitest + Playwright. Unit: 204/210 (6 failing). E2E: 12/12. Coverage delta: −3% branches (🟠 regression).
qa-engineer flags: `POST /checkout` with empty cart returns 500 instead of 400 (🔴 Critical). Blocks ship.
Decision chip: user picks "Fix failing tests now."

### Example 3 — Migration QA (flaky audit)

```
/ccc-qa
# User selects: Flaky test audit (run suite 3×)
```

Run 1: 145 pass. Run 2: 143 pass (2 fail). Run 3: 145 pass.
qa-engineer flags `UserSessionManager.test.ts:88` as flaky (🟠 High — race condition in teardown).
Decision chip: user picks "File issues to Linear."

## Anti-patterns

- Do not mark QA "passed" if there are 🔴 Critical findings
- Do not skip the qa-engineer agent — raw test output alone is not a QA report
- Do not run E2E without confirming the dev server is running
- Do not run the flaky audit with `--watch` mode — always use `run` / `--count=1` for reproducibility

## Attribution

> Adapted from gstack — MIT licensed.
