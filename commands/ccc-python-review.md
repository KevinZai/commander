---
description: "Review changed Python code for security, type safety, error handling, idioms and framework pitfalls, with static analysis results and a merge verdict. Use after editing .py files, before committing Python changes, or when reviewing a Python pull request."
---

# /ccc-python-review — Python review with a merge verdict

**CC Commander** · /ccc-python-review · static analysis plus a `python-reviewer` agent pass, returned as `path:line` findings and an approve, warn or block verdict.

## Arguments

`$ARGUMENTS`: optional paths or a git range (for example `main...HEAD`). Default: uncommitted and staged changes.

## What happens

1. **Find the Python changes.**

   ```bash
   git diff --name-only --diff-filter=ACMR HEAD -- '*.py'
   git diff --name-only --diff-filter=ACMR <range> -- '*.py'   # when a range was given
   ```

   Include `pyproject.toml`, `setup.cfg`, `requirements*.txt` and lock files when they changed. If no Python files changed, say so and stop.
2. **Run static analysis.** Run each tool only when it is installed (`command -v <tool>`) or declared in the project's dev dependencies; prefer the project's own task runner (`make lint`, `tox`, `nox`, `uv run`, `poetry run`) when it defines these checks. Scope to the changed files where the tool allows it.

   ```bash
   ruff check <files>
   ruff format --check <files>      # or: black --check <files>
   isort --check-only <files>       # only when the project uses isort
   mypy <files>
   bandit -q <files>
   pip-audit                         # dependency audit, when dependencies changed
   pytest --cov=<package> --cov-report=term-missing   # when tests exist
   ```

   Record pass, fail or not installed for each. Do not install missing tools.
3. **Delegate the code review.** Call the Agent tool with the `python-reviewer` agent (read-only), passing the changed file list, the diff, the static-analysis output and the detected framework (Django, FastAPI, Flask or none). Ask it to return findings as `path:line` + severity + issue + fix. Codex fallback: run the same review with `codex exec --sandbox read-only` and the same instructions.
4. **Check the findings.** Open each CRITICAL and HIGH finding at its `path:line` and confirm it against the code before reporting it; drop any the code does not support.
5. **Report** in the output format below and give the verdict.

## Severity guide

| Severity | Examples |
|---|---|
| CRITICAL (must fix) | SQL or command injection; `eval`/`exec` on untrusted input; unsafe `pickle` or `yaml.load`; hardcoded credentials; bare `except:` that hides errors |
| HIGH (should fix) | Missing type hints on public functions; mutable default arguments; exceptions swallowed silently; resources opened without a context manager; `type()` where `isinstance()` is meant; shared state without locks |
| MEDIUM (consider) | PEP 8 violations; missing docstrings on public functions; `print` instead of logging; string concatenation in loops; magic numbers; non-f-string formatting; needless list materialization; C-style loops where a comprehension is clearer |

Framework checks the reviewer applies when detected:

- **Django** — N+1 queries (`select_related`, `prefetch_related`), model changes without migrations, raw SQL where the ORM works, multi-step writes without `transaction.atomic()`.
- **FastAPI** — CORS configuration, Pydantic request validation, response models, correct `async`/`await`, dependency injection.
- **Flask** — app and request context handling, error handlers, blueprint organization, configuration management.

Version-gated syntax: flag features newer than the project's declared minimum Python (`requires-python` in `pyproject.toml`, or `python_requires` in `setup.py`), for example `match` statements and `X | None` unions (3.10+) or the walrus operator and positional-only parameters (3.8+).

## Output format

```text
# Python review

## Files reviewed
- <path> (modified|added)

## Static analysis
- ruff: pass | <n> issues | not installed
- mypy: ...
- bandit: ...

## Findings
[CRITICAL] <title>
<path>:<line> — <issue>
Fix: <one-line fix, with a short code snippet when it helps>

## Summary
CRITICAL <n> · HIGH <n> · MEDIUM <n>
Verdict: ✅ approve | ⚠️ warn | ❌ block — <one-line reason>
Formatting: <exact formatter command for the affected files, if any>
```

## Verdict rules

| Verdict | Condition |
|---|---|
| ✅ Approve | No CRITICAL or HIGH findings |
| ⚠️ Warn | Only MEDIUM findings; merge with caution |
| ❌ Block | Any CRITICAL or HIGH finding |

## Done when

Every changed Python file was reviewed, each tool has a recorded result from this run, and every CRITICAL and HIGH finding was confirmed at its `path:line`.

## Guardrails

- Read-only: do not edit files, apply formatter fixes or install packages. Print the fix commands instead.
- Do not report a finding the code does not support.

## See also

`/ccc-code-review` (non-Python concerns) · `/ccc-tdd` · `/ccc-build-fix` · `/ccc-quality-gate`
