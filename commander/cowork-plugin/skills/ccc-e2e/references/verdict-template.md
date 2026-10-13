# /ccc-e2e verdict artifact

Write to `tasks/reviews/ccc-e2e-<YYYY-MM-DD>.md` (create `tasks/reviews/` if missing). If the file exists for today, append `-2`, `-3`, and so on rather than overwriting.

```markdown
# CCC E2E Assessment — <YYYY-MM-DD>

**Branch:** <branch> · **Version:** <ver> · **Scope:** <full | qa-unit | e2e-only | quick>
**Workers:** <N> · **Duration:** <total elapsed>

## Verdict: ✅ PASS / ❌ FAIL

> FAIL if any Critical finding exists or any worker status is `fail` or `timeout`.

## Worker summary

| Worker | Status | Tests | Coverage | Duration |
|--------|--------|-------|----------|----------|
| QA audit | ✅/❌ | — | — | Xs |
| Unit-TDD | ✅/❌ | <pass>/<total> | <delta> | Xs |
| E2E | ✅/❌ | <pass>/<total> | — | Xs |

Omit rows for workers the chosen scope did not run.

## Findings

### 🔴 Critical (N)
- `file:line` — <description> — **Worker:** qa

### ⚠️ High (N)
- …

### 🟡 Medium (N)
- …

### 🟢 Low (N)
- …

## Next steps
- [ ] <one action per Critical and High finding>

## Recommendation
Ship / Patch required / Triage needed
```

## Rules

- ✅ PASS or ❌ FAIL is bold and on its own line under the header.
- Every finding names the worker that reported it and, where available, `file:line`.
- A worker that returned no parseable JSON is recorded as `fail` with the raw tail of its output under its row; never drop it.
- Coverage delta comes only from the Unit-TDD worker's report; write `—` when it did not report one.
