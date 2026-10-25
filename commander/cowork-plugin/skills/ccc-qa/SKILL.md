---
name: ccc-qa
description: "Pre-ship QA pass: runs unit, integration and E2E suites, coverage delta and a flaky-test audit. Use to run all tests or check ship readiness."
allowed-tools:
  - Bash
  - Read
  - Write
  - Agent
  - Skill
  - AskUserQuestion
argument-hint: "[unit | integration | e2e | all | coverage | flaky]"
---

# /ccc-qa — QA pass before you ship

**CC Commander** · /ccc-qa · every suite run, coverage delta, flaky tests and missing edge cases, severity-rated.

## When to use / when not to

- Use for "QA pass", "run all tests", "check coverage", "find missing tests", "flaky test", "is this ready to ship", or when `/ccc-review` or `/ccc-ship` hands off here.
- Use `/ccc-testing` first when the project has no tests yet; it scaffolds a suite.
- Skip it for a single-function fix (write the targeted unit test directly) and for docs- or config-only changes with no testable behavior.
- Use `/ccc-e2e` for a fanned-out pre-release assessment across isolated worktrees.

## What happens

### 1. Detect the framework

Run in parallel with Bash; a failing probe means "not this framework":

```bash
grep -E '"(vitest|jest|@playwright/test|mocha|cypress|jasmine)"' package.json 2>/dev/null | head -10
ls vitest.config.* jest.config.* playwright.config.* pytest.ini setup.cfg pyproject.toml go.mod Cargo.toml pom.xml 2>/dev/null
python3 -m pytest --collect-only -q 2>/dev/null | tail -3
cat .ccc/coverage-history.json 2>/dev/null
```

| Evidence | Framework | Run command |
|---|---|---|
| `vitest.config.*` or `vitest` dependency | Vitest | `npx vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=text` |
| `jest.config.*` or `jest` dependency | Jest | `npx jest --coverage --coverageReporters=json-summary --coverageReporters=text` |
| `playwright.config.*` | Playwright | `npx playwright test --reporter=list` |
| `pytest.ini`, `[tool:pytest]` in `setup.cfg`, or `[tool.pytest.ini_options]` in `pyproject.toml` | pytest | `python3 -m pytest --cov=. --cov-report=term-missing -q` |
| `go.mod` | Go | `go test ./... -cover -count=1` |
| `Cargo.toml` | Rust | `cargo test` |
| `pom.xml` | JUnit via Maven | `mvn test` |

When `package.json` defines a `test` script, prefer `npm test` for the unit lane and keep the coverage flags above only if the script does not already set them. If nothing is detected, say so and offer `/ccc-testing` to scaffold a suite; stop.

### 2. Confirm scope

An argument (`unit`, `integration`, `e2e`, `all`, `coverage`, `flaky`) skips this picker. Otherwise ask with AskUserQuestion (Codex: a plain-text question):

- question: "Which test suites should I run?" · header: "QA scope"
- 🟢 All suites — unit, integration and E2E; slowest and most thorough, the pre-release pass
- Unit and integration — skips E2E; a fast mid-session check
- E2E only — Playwright or Cypress; needs the app reachable
- Flaky audit — runs the suite three times and flags tests whose result changes

`coverage` parses the last run's coverage output without running tests (go to step 4).

### 3. Run the suites

Run each selected command from step 1 with Bash, capture the full output to a file and time it:

```bash
mkdir -p .ccc
start=$(date +%s); <run command> > .ccc/qa-<lane>.log 2>&1; echo "exit=$? seconds=$(( $(date +%s) - start ))"
tail -80 .ccc/qa-<lane>.log
```

A non-zero exit with failing tests is a finding, not a skill failure. A non-zero exit with no test output (missing dependency, config error) is reported verbatim and stops that lane.

**E2E precondition.** If `playwright.config.*` has a `webServer` block, Playwright starts the app itself. Otherwise read `baseURL` from the config (default `http://localhost:3000`) and check it:

```bash
curl -s -o /dev/null -w '%{http_code}\n' "<baseURL>"
```

If it is unreachable, ask the user to start the dev server; never start one yourself.

**Flaky audit (three runs, Vitest or Jest):**

```bash
mkdir -p .ccc
for i in 1 2 3; do
  npx vitest run --reporter=json --outputFile=".ccc/flaky-run-$i.raw.json" >/dev/null 2>&1
  # Jest: npx jest --json --outputFile=".ccc/flaky-run-$i.raw.json" >/dev/null 2>&1
  jq '[.testResults[].assertionResults[] | {name: .fullName, status}]' ".ccc/flaky-run-$i.raw.json" > ".ccc/flaky-run-$i.json"
done
jq -s 'add | group_by(.name) | map(select((map(.status) | unique | length) > 1)) | map(.[0].name)' .ccc/flaky-run-1.json .ccc/flaky-run-2.json .ccc/flaky-run-3.json
```

Every name printed is flaky. For other frameworks, run the step 1 command three times with no watch mode (`go test -count=1`, `pytest -rA`) and compare the pass/fail lines. Never use `--watch`.

### 4. Compute the coverage delta

For Vitest and Jest (Istanbul `coverage/coverage-summary.json`):

```bash
mkdir -p .ccc
CURRENT=$(jq -c '{lines: .total.lines.pct, branches: .total.branches.pct, functions: .total.functions.pct}' coverage/coverage-summary.json 2>/dev/null)
PREV=$(jq -c '.last // {}' .ccc/coverage-history.json 2>/dev/null)
[ -z "$PREV" ] && PREV='{}'
if [ -n "$CURRENT" ]; then
  jq -n --argjson last "$CURRENT" --argjson previous "$PREV" '{last: $last, previous: $previous}' > .ccc/coverage-history.json
fi
echo "previous: $PREV"; echo "current:  ${CURRENT:-none}"
```

For pytest, Go and Rust, read the total from the run log (`TOTAL` line, `coverage: N%`) and store it the same way. Report each metric as `lines: 74% → 82% (+8)`. Any negative delta is 🟠 High. With no previous baseline, report the current numbers and say this run is the baseline.

### 5. Delegate the analysis

Dispatch the `qa-engineer` agent with the Agent tool (`effort: "medium"`). If the Agent tool does not list it, use `general-purpose` and make its first instruction "Read `${CLAUDE_PLUGIN_ROOT}/agents/qa-engineer.md` and follow it." Pass the tails of the `.ccc/qa-*.log` files, the flaky list and the delta, with this task:

```
Analyze the test output and coverage delta below. Return a QA report with:
1. Pass/fail counts per suite.
2. Coverage delta (lines, branches, functions).
3. Flaky tests: name and how the result changed across runs.
4. The five most important missing edge cases, inferred from failing or absent tests,
   checked against: empty input, max boundary, concurrent access, unicode or special
   characters in user-controlled fields, expired state at the exact boundary, oversize payloads.
5. Every finding severity-rated:
   🔴 Critical — a test failure that blocks ship
   🟠 High — coverage regression, or a flaky test on a critical path
   🟡 Medium — missing edge case with moderate risk
   🟢 Low — informational or style
Keep it under 300 words. Quote file:line for each finding. Do not reproduce the full log.
```

The edge-case categories and worked examples are in [references/edge-cases.md](references/edge-cases.md).

### 6. Present results and the next action

Render the agent's report, then ask with AskUserQuestion. Put 🟢 on "Fix failing tests" when any 🔴 or 🟠 finding exists, otherwise on "Ship with findings logged":

- question: "QA complete — what next?" · header: "Next"
- 🔧 Fix failing tests — work through 🔴 and 🟠 findings before shipping
- 📝 Write missing edge-case tests — scaffold the cases the qa-engineer surfaced
- 🚀 Ship with findings logged — writes `.ccc/qa-report.md` and hands off to `/ccc-ship`; offered only when there are zero 🔴 findings
- 📌 File issues to Linear — opt-in Linear connector via `/ccc-linear`, one issue per 🟠-or-worse finding; asks before creating anything

## Done when

- Every pass/fail count in the reply is quoted from a run log written in this turn (`ls -l .ccc/qa-*.log`).
- When coverage ran, `jq . .ccc/coverage-history.json` shows the new `last` values.
- The verdict is "QA passed" only with zero 🔴 findings; otherwise it is "QA blocked" with the blocking tests named.
- For "Ship with findings logged", `.ccc/qa-report.md` exists and contains the report.

## Guardrails

- Never mark QA passed with an open 🔴 Critical finding, and never offer the ship option while one exists.
- Never skip the qa-engineer analysis; raw test output alone is not a QA report.
- Never start a dev server or bind a port; ask the user to start it.
- Never run suites in watch mode; always single-run (`run`, `-count=1`).
- Filing tracker issues needs the user's explicit choice in step 6 and the Linear connector; it is absent by default.

## See also

- `/ccc-testing` — testing domain router: TDD, E2E, load and visual testing
- `/ccc-e2e` — parallel pre-release assessment in isolated worktrees
- `/ccc-review` — code review before QA
- `/ccc-ship` — release flow that reads the QA result

Adapted from gstack (MIT licensed).

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
