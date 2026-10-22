---
description: "Run formatter, lint and type checks on demand for a path or the whole project, then list what to fix. Use before committing, after large edits, or when the user asks for a quality gate."
---

# /ccc-quality-gate — format, lint and type checks on demand

**CC Commander** · /ccc-quality-gate · runs the checks the post-edit quality hooks run, on a scope you choose, and returns a remediation list.

## Arguments

`/ccc-quality-gate [path|.] [--fix] [--strict]` — parsed from `$ARGUMENTS`:

- `[path|.]` — target; defaults to the current directory
- `--fix` — allow auto-format and auto-fix where the tool supports it
- `--strict` — treat warnings as failures where the tool supports it

## What happens

1. **Detect tooling** for the target. Prefer the project's own scripts in `package.json`, `pyproject.toml`, `Makefile` or `justfile` over the defaults below, and only run tools that are installed (`command -v <tool>` or a local `node_modules/.bin/<tool>`). Record every tool that is configured but missing.

   | Stack | Formatter check (`--fix` form) | Lint / type check (`--strict` form) |
   |---|---|---|
   | JS/TS | `npx prettier --check <path>` (`--write`) or `npx biome check <path>` (`--write`) | `npx eslint <path>` (`--max-warnings 0`; `--fix`), `npx tsc --noEmit` |
   | Python | `ruff format --check <path>` (`ruff format <path>`) or `black --check <path>` (`black <path>`) | `ruff check <path>` (`--fix`), `mypy <path>` (`--strict` only if the project config allows it) |
   | Go | `gofmt -l <path>` (`gofmt -w`) | `go vet ./...`, `staticcheck ./...` when installed |
   | Rust | `cargo fmt --check` (`cargo fmt`) | `cargo clippy` (`-- -D warnings`) |
   | Shell | — | `shellcheck <files>` |

2. **Run formatter checks.** Without `--fix`, run check-only forms. With `--fix`, run the write forms.
3. **Run lint and type checks.** Apply `--strict` flags only when `--strict` was passed. Capture exit code and the first lines of each failure.
4. **Verify after `--fix`.** Re-run the check-only forms from steps 2 and 3, then show what changed:

   ```bash
   git status --short
   git diff --stat
   ```

5. **Report** a remediation list grouped by severity: errors (non-zero exit), warnings, then missing tools. Each item is `path:line — rule — one-line fix`.

## Done when

Every detected check has a recorded pass or fail result from this run, and with `--fix` the re-run results and `git diff --stat` are shown.

## Guardrails

- File writes happen only with `--fix`, and only through the formatter or linter's own fix mode.
- Do not install tools or packages; list missing ones instead.
- This command does not run the test suite; use `/ccc-verify` or `/ccc-test-coverage` for that.

## See also

`/ccc-verify` · `/ccc-build-fix` · `/ccc-python-review` · `/ccc-refactor-clean`
