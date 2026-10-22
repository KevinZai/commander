---
description: "Define, run, and report evals for a feature before and during implementation, tracking capability and regression pass rates in .claude/evals/. Use when starting eval-driven development or checking whether a feature is ready to ship."
---

# /ccc-eval — eval-driven feature tracking

**CC Commander** · /ccc-eval · eval definitions, run logs, and a ship/no-ship report per feature.

## Arguments

`$ARGUMENTS`:

- `define <name>` — create a new eval definition
- `check <name>` — run the evals and record results
- `report <name>` — produce the full report
- `list` — show every eval definition and its status
- `clean [<name>]` — trim old run logs, keeping the last 10 runs

No argument behaves like `list`. A missing `<name>` for `define`, `check` or `report`: ask for it in plain text.

## What happens

### define

1. If `.claude/evals/<name>.md` already exists, show it and stop; never overwrite a definition.
2. Run `mkdir -p .claude/evals` and write `.claude/evals/<name>.md` with today's date in place of `<date>`:

   ```markdown
   ## EVAL: <name>
   Created: <date>

   ### Capability Evals
   - [ ] [Description of capability 1]
   - [ ] [Description of capability 2]

   ### Regression Evals
   - [ ] [Existing behavior 1 still works]
   - [ ] [Existing behavior 2 still works]

   ### Success Criteria
   - pass@3 > 90% for capability evals
   - pass^3 = 100% for regression evals
   ```

3. Ask the user to replace each bracketed placeholder with a concrete, checkable criterion (an observable output, a command result, or a test name). Write their answers into the file.
4. Verify: `test -f .claude/evals/<name>.md && grep -c '^- \[ \]' .claude/evals/<name>.md` prints the number of criteria.

### check

1. Read `.claude/evals/<name>.md`. If it is missing, say so and suggest `/ccc-eval define <name>`.
2. Find the project's test command: the `test` script in `package.json` (`npm test`), `pytest` for `pyproject.toml`/`pytest.ini`, `go test ./...` for `go.mod`, `cargo test` for `Cargo.toml`. If none is found, ask the user for the command.
3. For each capability eval, verify the criterion directly (run the named command, call the endpoint, read the output). Record PASS or FAIL and the attempt number. A criterion that cannot be checked is FAIL with the reason, never an assumed PASS.
4. For each regression eval, run the relevant tests with the command from step 2 and compare against the previous run in the log. Record PASS or FAIL.
5. Append one run entry to `.claude/evals/<name>.log`: timestamp, each eval id with PASS/FAIL and attempt, and the exact commands run.
6. Report:

   ```
   EVAL CHECK: <name>
   ========================
   Capability: X/Y passing
   Regression: X/Y passing
   Status: IN PROGRESS / READY
   ```

   READY requires every regression eval passing and the capability success criterion met.

### report

1. Read the definition and every run in `.claude/evals/<name>.log`.
2. Compute pass@1 and pass@3 for capability evals and pass^3 for regression evals from the logged runs only.
3. Output:

   ```
   EVAL REPORT: <name>
   =========================
   Generated: <date>

   CAPABILITY EVALS
   ----------------
   [eval-1]: PASS (pass@1)
   [eval-2]: PASS (pass@2) - required retry
   [eval-3]: FAIL - see notes

   REGRESSION EVALS
   ----------------
   [test-1]: PASS

   METRICS
   -------
   Capability pass@1: <n>%
   Capability pass@3: <n>%
   Regression pass^3: <n>%

   NOTES
   -----
   [Issues, edge cases, observations]

   RECOMMENDATION
   --------------
   [SHIP / NEEDS WORK / BLOCKED]
   ```

### list

1. Run `ls .claude/evals/*.md 2>/dev/null`. If none exist, say so and suggest `/ccc-eval define <name>`.
2. For each definition, read the latest run in its `.log` and print one line:

   ```
   EVAL DEFINITIONS
   ================
   feature-auth      [3/5 passing] IN PROGRESS
   feature-search    [5/5 passing] READY
   feature-export    [0/4 passing] NOT STARTED
   ```

### clean

1. Count run entries in each targeted `.claude/evals/*.log` (one feature with `<name>`, all features otherwise).
2. Show how many entries each log would lose, then ask with AskUserQuestion (plain-text question where unavailable): 🟢 Keep the last 10 runs — older entries are removed from the log · Cancel — nothing changes.
3. On confirmation, rewrite each log with only its last 10 entries. Verify by recounting entries and reporting the new totals.

## Done when

The subcommand's output block has been printed from data actually read or run; for `define`, `check` and `clean` the file check in that section has passed.

## Guardrails

- Never mark an eval PASS without running or reading the evidence for it.
- Never overwrite an existing definition or delete a definition file.
- `clean` only trims `.log` files and only after the user picks it.

## See also

`/ccc-tdd` · `/ccc-learn-eval` · `/ccc-verify` · `/ccc-quality-gate`
