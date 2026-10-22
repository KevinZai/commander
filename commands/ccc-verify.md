---
description: "Verify the current codebase in a fixed order (build, types, lint, tests with coverage, secrets, debug logs, git status) and return a PASS/FAIL report with a ready-for-PR verdict. Use before committing, before opening a PR, or when asked to check that everything still works."
---

# /ccc-verify — is this ready for a PR

**CC Commander** · /ccc-verify · runs the project's real checks in order and reports actual results, not a self-assessment.

## Arguments

`$ARGUMENTS` selects the depth:

| Mode | Checks |
|---|---|
| `quick` | 1 build, 2 types |
| `full` (default) | 1 to 7 |
| `pre-commit` | 2 types, 3 lint, 4 tests on changed files, 5 secrets, 6 debug logs, 7 git status |
| `pre-pr` | `full` plus a dependency audit (`npm audit --omit=dev`, `pip-audit`, `cargo audit` or `govulncheck ./...`, whichever applies and is installed) |

## What happens

Find each command in the project first (`package.json` scripts, `Makefile`, `pyproject.toml`, CI workflow files) and prefer it over a generic one. Run the checks in this order:

1. **Build.** `npm run build` (or `pnpm build` / `yarn build`), `cargo build`, `go build ./...`, `mvn compile`. If it fails, report the errors and stop; later checks are not meaningful on a broken build.
2. **Types.** `npx tsc --noEmit`, `mypy .` or `pyright`, as configured. Report every error as `path:line`.
3. **Lint.** `npm run lint`, `npx eslint .`, `ruff check .`, `cargo clippy`, `golangci-lint run`, as configured. Report errors and warnings separately.
4. **Tests.** The project's test command with coverage (`npm test -- --coverage`, `pytest --cov`, `go test -cover ./...`, `cargo test`). Report pass/fail counts and coverage percentage against the project threshold.
5. **Secrets.** Scan tracked and staged changes: `gitleaks detect --no-banner` when installed, otherwise `git diff HEAD | grep -nE '(api[_-]?key|secret|token|password)\s*[:=]|-----BEGIN [A-Z ]*PRIVATE KEY'`. Report file and line only, never the matched value.
6. **Debug logs.** `git grep -nE 'console\.log|debugger;' -- ':!*test*' ':!*spec*'` for JS/TS (`print(` for Python, `dbg!` for Rust). Report locations.
7. **Git status.** `git status --short` and `git diff --stat HEAD` for uncommitted and modified files.

If a check's tool is not configured, mark it `SKIPPED (not configured)` rather than passing it.

## Output

```
VERIFICATION: [PASS/FAIL]

Build:    [OK/FAIL]
Types:    [OK/X errors]
Lint:     [OK/X issues]
Tests:    [X/Y passed, Z% coverage]
Secrets:  [OK/X found]
Logs:     [OK/X debug statements]
Git:      [clean/X files changed]

Ready for PR: [YES/NO]
```

`Ready for PR: YES` requires build, types and tests OK and zero secrets. For each failure, list `path:line`, the error and a suggested fix.

## Decision points

When checks fail, ask with AskUserQuestion (plain-text question where it is unavailable): 🟢 Fix the failures now (build and type errors go to `/ccc-build-fix`) · Show the full output of the failing check · Stop with the report.

## Guardrails

- This command is read-only: it never edits files, commits, stashes or pushes. Fixes happen only after the user picks that option.
- Never print secret values found in step 5.
- Never report a check as OK unless its command ran and exited 0 in this run.

## See also

`/ccc-build-fix` · `/ccc-test-coverage` · `/ccc-code-review` · `/ccc-ship`
