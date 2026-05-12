# Repo Re-Audit Handoff (2026-04-07, v2)

## Overall Score
- 82 / 100 (previous: 71 / 100)

## Priority Findings
1. **High**: ESLint custom rule crashes under current ESLint runtime.
- Symptom: `npx eslint . --max-warnings 120` exits with runtime error.
- Error: `TypeError: context.getSourceCode is not a function`
- Affected files:
  - `eslint-rules/test-quality.cjs:51-54` (uses `context.getSourceCode()`)
  - `eslint-rules/test-quality.cjs:103` (TemplateLiteral visitor calls `src(...)`)
- Impact: lint gate is broken; CI/local lint can fail before reporting actual violations.
- Repro:
  - `npx eslint . --max-warnings 120`
  - `node -e "const p=require('./eslint-rules/test-quality.cjs'); const r=p.rules['no-unscoped-service-test']; const v=r.create({sourceCode:{getText:()=>''},report:()=>{}}); v.TemplateLiteral({type:'TemplateLiteral',quasis:[],expressions:[]});"`

2. **Medium**: `npm test` still fails on hook test asserting write access to `~/.claude/sessions`.
- Symptom: 1 failing test out of 168.
- Failing assertion:
  - `tests/hooks.test.js:560` (`creates session file in ~/.claude/sessions/`)
  - `tests/hooks.test.js:576` (`Should create a pre-compact session file`)
- Impact: full test suite not green in restricted/sandboxed environments.
- Repro:
  - `npm test`

3. **Medium**: `dashboard/` still has 2 moderate vulnerabilities.
- `npm audit --json` in `dashboard/` reports:
  - `vite` advisory: `GHSA-4w7w-66w2-5vf9`
  - `esbuild` advisory: `GHSA-67mh-4wv8-2f99`
- Audit indicates fix path requires major upgrade (`vite@8.0.7`).
- Impact: known dependency security risk remains (moderate).
- Repro:
  - `cd dashboard && npm audit --json`

4. **Medium**: Skill count consistency is still ambiguous across methods and docs.
- Measured now:
  - CLI JSON count: `453` (`jq length /tmp/skills-list.json` after `node bin/kc.js --list-skills --json`)
  - Disk count: `458` (`find skills -name 'SKILL.md' | wc -l`)
  - Doc claim: `451 skills (CLI-visible)` at `CLAUDE.md:138`
- Additional reliability issue: prompt-provided counting one-liner fails on chunked stdin.
  - `node bin/kc.js --list-skills --json | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).length))"` exits non-zero with JSON parse error.
- Impact: “correct numbers” checks are not deterministic.

5. **Low**: Public-facing number badges are stale/inconsistent with current runtime state.
- `README.md:9` shows `17_Vendors` and `166_Tests_Passing` while current repo has 19 vendors and test suite size is 168 (with 1 fail).
- `README.md` also mixes `v2.2` display strings and `v2.2.1` (e.g., `README.md:153`, `README.md:224`, `README.md:630`, `README.md:716`).
- Impact: documentation trust/consistency issue.

## Focus-Area Results
- `npm audit`
  - root: **0 vulnerabilities**
  - `dashboard/`: **2 moderate**
  - `video/`: **0 vulnerabilities**
- `npm test` (package.json suite): **167 pass / 1 fail / 168 total**
- JS syntax checks (`hooks/*.js`, `commander/*.js`, `bin/*.js`): **pass**
- ESLint (`npx eslint . --max-warnings 120`): **fails** (custom rule runtime crash)
- Secrets scan (CI grep pattern, excluding `vendor/`): **pass**
- PII scan (CI grep from workflow): **pass**
- Skill count consistency:
  - CLI list count: **453**
  - on-disk `SKILL.md`: **458**
  - doc claim (`CLAUDE.md`): **451**
- tmux split mode (`bin/ccc-split.sh`) syntax: **pass** (`bash -n`)
- tmux split/menu crash audit: **pass** (`commander/tests/tmux-menu-audit.test.js`)
- View session history crash path: **pass** in current tests (`commander/tests/paths.test.js`, `renderSession handles malformed session fields safely`)
- New vendor submodules (`graphify`, `ui-ux-pro-max-skill`):
  - `.gitmodules` entries present (`.gitmodules:52-57`)
  - skill references present (`skills/graphify/SKILL.md`, `skills/ui-ux-pro-max/SKILL.md`, `docs/ECOSYSTEM.md:36-37`)
- Version consistency (`package.json` vs branding vs changelog): **pass** (`2.2.1` matches)

## Repro Commands Used
- `npm test`
- `npx eslint . --max-warnings 120`
- `npm audit --json`
- `cd dashboard && npm audit --json`
- `cd video && npm audit --json`
- `for f in hooks/*.js; do node --check "$f"; done`
- `for f in commander/*.js; do node --check "$f"; done`
- `for f in bin/*.js; do node --check "$f"; done`
- `if grep -rn 'sk-[a-zA-Z0-9]\{20\}\|ghp_[a-zA-Z0-9]\{36\}' --include='*.js' --include='*.json' --include='*.md' --exclude-dir=vendor --exclude-dir=node_modules .; then echo FAIL; else echo PASS; fi`
- `if grep -rn '6418588155\|1477872497599840369\|1480676421457416306\|d852cff2\|k3v80\|/Users/ai/' --include='*.md' --include='*.js' --include='*.html' --exclude-dir=vendor --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=coverage --exclude-dir=kevin --exclude-dir=docs --exclude='CHANGELOG.md' .; then echo FAIL; else echo PASS; fi`
- `node bin/kc.js --list-skills --json > /tmp/skills-list.json && jq length /tmp/skills-list.json`
- `find skills -name 'SKILL.md' | wc -l`
- `node bin/kc.js --list-skills --json | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).length))"`
- `bash -n bin/ccc-split.sh`
- `node --test commander/tests/tmux-menu-audit.test.js`
- `node --test commander/tests/paths.test.js`
- `node bin/kc.js --test`

## What Passed
- CLI self-test: `27/27 passed` (`node bin/kc.js --test`)
- tmux split-mode menu action audit: no crashes; graceful returns validated.
- Session-history rendering edge-case test currently passes.
- Root/video dependency audits are clean.
- Secrets and PII CI grep scans passed.
- JS syntax checks passed for requested file globs.
- Version string consistency across package/branding/changelog is correct.

## Improvement Ideas (Post-Remediation)
1. Add a tiny `scripts/audit-counts.js` that outputs canonical counts (skills/vendors/tests) and auto-updates README/CLAUDE badges.
2. Add an ESLint plugin compatibility test in CI (smoke-lint one file) to fail fast on rule API breaks.
3. Refactor hook tests to always use temp dirs/env overrides instead of relying on `~/.claude`.
4. Add an `npm run audit:full` script that runs all checks in one deterministic sequence and writes machine-readable JSON + markdown artifacts.
