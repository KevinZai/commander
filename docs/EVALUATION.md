# CC Commander — Evaluation & Testing Guide

## Automated Tests

| Test Suite | Command | Tests | What It Covers |
|-----------|---------|-------|---------------|
| Path tests | `node --test commander/tests/paths.test.js` | 18 | Adventure files, navigation, module exports |
| Hook tests | `node --test tests/hooks.test.js` | 61 | All 25 lifecycle hooks |
| Intelligence tests | `node --test commander/tests/intelligence.test.js` | 57 | Scoring, knowledge, skills, project import |
| Error handling tests | `node --test commander/tests/error-handling.test.js` | 30 | Error logger, action module structure |
| **All tests** | `npm test` | **187** | Everything above |

## Smoke Tests (CLI)

```bash
bash tests/smoke.sh
```

Tests all CLI flags: --version, --test, --status, --list-skills, --template, --stats.

## Coverage

```bash
./node_modules/.bin/c8 node --test commander/tests/paths.test.js tests/hooks.test.js commander/tests/intelligence.test.js commander/tests/error-handling.test.js
```

Target: 75%+ statements. Current: ~60% (improving with new tests).

## Weekly Evaluation Checklist

Use this after leaving CCC untouched for a week or more:

### Automated (run these first)
- [ ] `npm test` — all 187 tests pass
- [ ] `npm run lint` — 0 errors
- [ ] `bash tests/smoke.sh` — all CLI flags work
- [ ] `npm audit` — 0 vulnerabilities

### Manual (verify these by hand)
- [ ] `ccc` launches interactive menu without crash
- [ ] Pick "Build something new" → answer 3 questions → plan appears
- [ ] Pick "Browse skills" → skills list renders with 450+ entries
- [ ] Press Escape during a build → returns to menu gracefully (no stack trace)
- [ ] `ccc --dispatch "fix a typo" --json` returns JSON result
- [ ] Error case: `ccc --dispatch` (no task) shows usage message, doesn't crash

### Security
- [ ] `git grep "k3v80\|6418588\|/Users/ai/" -- ':!kevin/'` returns 0 matches
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] No `--dangerously-skip-permissions` in non-YOLO dispatch paths

### Intelligence Layer
- [ ] `node -e "var d=require('./commander/dispatcher'); console.log(d.scoreComplexity('fix typo').score)"` → score < 25
- [ ] `node -e "var d=require('./commander/dispatcher'); console.log(d.scoreComplexity('build saas with auth').score)"` → score > 75
- [ ] `node -e "var s=require('./commander/skill-browser'); console.log(s.recommendSkills('nextjs app', ['nextjs'], 3).length)"` → returns 3

## Pre-Release Checklist

Before any npm publish or major release:

- [ ] All automated tests pass
- [ ] `npm run lint` clean (0 errors)
- [ ] `npm run prepublishOnly` passes
- [ ] `git grep` PII scan passes
- [ ] CHANGELOG.md updated
- [ ] README.md badge counts match `skill-browser.listSkills().length`
- [ ] `npm pack --dry-run` — review what gets published
- [ ] No files in `kevin/` or `hooks/openclaw-notify.js` in the pack output
