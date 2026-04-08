# Repo Re-Audit Handoff (2026-04-07, v3)

## Overall Score
- **88 / 100**
- Prior scores: v1 = 71, v2 = 82
- Delta: +6 from v2, but still below 90 due to unresolved lint/security/dependency consistency issues.

## Executive Summary
Core runtime health improved substantially:
- `npm test` is green at **187/187**.
- `node bin/kc.js --test` is green at **27/27**.
- Root and `video/` audits are clean.
- `scripts/audit-counts.js --check` and `--json` both work.

Remaining blockers for 90+:
1. ESLint currently fails (9 parser errors in TypeScript tests under `skills/browse/test/*.ts`).
2. `dashboard/` retains 2 moderate vulnerabilities (`vite`/`esbuild`).
3. One security hardening gap in tmux resume path (`sessionId` command-string injection surface).
4. Count/docs consistency drift (`skillsCli` 453 vs `CLAUDE.md` stats line claiming 454).

## Priority Findings (with file:line)

### 1) High: tmux resume path can inject shell tokens via unsanitized session ID
- **Where**: `commander/engine.js:60`
- **Code path**: `tmuxDispatch(task, resumeSessionId)` builds command string:
  - `claudeBin + ' --resume ' + sessionId + ' --continue'`
  - sent via `tmux send-keys` without `-l` literal mode.
- **Risk**: if `resumeSessionId` is tainted (e.g., poisoned state/session file), shell metacharacters can execute in pane shell.
- **What’s already good**: new-task path sanitizes task text and uses `send-keys -l` (`commander/engine.js:66-68`).
- **Repro idea**:
  - Prepare a crafted session record with metacharacters in `claudeSessionId`.
  - Trigger resume flow and observe shell token execution behavior in tmux pane.

### 2) Medium: ESLint gate fails due parser errors on TS tests
- **Where**:
  - `skills/browse/test/commands.test.ts:20`
  - `skills/browse/test/config.test.ts:12`
  - `skills/browse/test/cookie-import-browser.test.ts:36`
  - `skills/browse/test/cookie-picker-routes.test.ts:14`
  - `skills/browse/test/find-browse.test.ts:32`
  - `skills/browse/test/gstack-config.test.ts:15`
  - `skills/browse/test/gstack-update-check.test.ts:16`
  - `skills/browse/test/handoff.test.ts:10`
  - `skills/browse/test/snapshot.test.ts:16`
- **Command**: `npx eslint . --max-warnings 120`
- **Observed**: `✖ 127 problems (9 errors, 118 warnings)`; errors are parsing failures (`Unexpected token :`, `!`, type identifiers).
- **Impact**: CI/local lint check fails despite test suite passing.

### 3) Medium: dashboard dependency vulnerabilities remain
- **Where**: `dashboard/` dependency tree (`vite` and transitive `esbuild`)
- **Command**: `cd dashboard && npm audit --json`
- **Observed**:
  - moderate: 2 total
  - `GHSA-67mh-4wv8-2f99` (`esbuild`)
  - `GHSA-4w7w-66w2-5vf9` (`vite`)
  - fix path suggests `vite@8.0.7` (SemVer major)
- **Impact**: known moderate dependency risk accepted/remaining.

### 4) Low-Medium: skills count consistency mismatch between canonical output and docs
- **Where**:
  - canonical script output: `scripts/audit-counts.js` (`--json`)
  - docs claim: `CLAUDE.md:138`
- **Observed**:
  - `node scripts/audit-counts.js --json` => `skillsCli: 453`, `skillsDisk: 458`
  - `CLAUDE.md:138` says `454 skills (CLI-visible)`
- **Impact**: “correct numbers” / trust drift in public/internal docs.

### 5) Low: status-line semver truncates patch `.0`
- **Where**: `commander/status-line.js:99`
- **Code**: `var version = pkg.version.replace(/\.0$/, '');`
- **Observed context**:
  - `package.json` = `2.3.0`
  - `commander/branding.js` uses exact version (`commander/branding.js:11`)
  - `CHANGELOG.md` top release `2.3.0` (`CHANGELOG.md:5`)
  - README badge `v2.3.0` (`README.md:9`)
- **Impact**: UI/version consistency drift (`2.3` vs `2.3.0`).

## Requested Focus Areas — Results

### Runtime + Lint + Audits
- `npm test`:
  - **PASS** — `187 tests`, `14 suites`, `0 fail`.
- `npx eslint . --max-warnings 120`:
  - **FAIL** — 9 parse errors + 118 warnings.
- `npm audit --json`:
  - root: **PASS** (`0` vulns)
  - `dashboard/`: **FAIL** (`2 moderate`)
  - `video/`: **PASS** (`0` vulns)
- `node bin/kc.js --test`:
  - **PASS** (`27/27 passed`)
- `node scripts/audit-counts.js --check`:
  - **PASS** (`PASS: All doc counts verified`)
- `node scripts/audit-counts.js --json`:
  - **PASS** (valid canonical JSON)

### Syntax + Scans
- JS syntax (`hooks/*.js`, `commander/*.js`, `bin/*.js`, `scripts/*.js`):
  - **PASS** (`JS_SYNTAX_FAILS:0`)
- Secrets scan (CI regex):
  - **PASS**
- PII scan (CI regex):
  - **PASS**

### Security Review Targets
- `commander/engine.js` tmuxDispatch task sanitization:
  - **PASS with caveat**
  - good: `safeTask` strips control chars and uses `send-keys -l` (`commander/engine.js:66-68`)
  - caveat/high finding: unsanitized `sessionId` in resume command string (`commander/engine.js:60`)
- `commander/engine.js` YOLO confirmation gate:
  - **PASS** (`Type "yes" to proceed` enforced at `commander/engine.js:838-841`)
- `commander/state.js` file permissions (`0o600`):
  - **PASS** on state/sessions/history writes (`commander/state.js:51`, `107`, `132`, `154`, `230`, `260`, `269`)
- `commander/dispatcher.js` `generateSessionName()` slug safety:
  - **PASS** sanitization in implementation (`commander/dispatcher.js:7-9`) and tests
  - tests: `commander/tests/dispatch-security.test.js:7-29`

### New Feature Validation
- `commander/claude-finder.js` resolution chain:
  - **PASS** 5-step chain present (`commander/claude-finder.js:12-52`)
  - tests pass: `commander/tests/claude-finder.test.js`
- `commander/tui.js` pipe-rail select + radios + help + mouse:
  - **PASS** feature implementation present (`commander/tui.js:311-376`, `392-426`, `428-491`)
  - visual tests pass: `commander/tests/tui-visual.test.js`
- `commander/cockpit.js` rounded panels + compact meters + remaining time:
  - **PASS** (`╭╮╰╯` at `109`, `142`; `miniMeter` at `48-58`; `fmtTimeRemaining` at `82-93`)
- `commander/status-line.js` ClaudeSwap/OAuth detection:
  - **PASS** detection chain at `120-133`
- `scripts/audit-counts.js` `--json` and `--check`:
  - **PASS** mode handlers at `85-88`, `90-117`

### Version + Counts + Vendors + tmux + CI
- Version consistency (`package.json`, branding, changelog, README badge):
  - **PASS** at 2.3.0 (`package=branding=changelog=readmeBadge`)
  - Note low drift in `status-line.js` display (`replace(/\.0$/,'')`).
- Skill count cross-check:
  - CLI JSON via `kc --list-skills`: **453**
  - disk `SKILL.md`: **458**
  - docs claim mismatch at `CLAUDE.md:138` (454)
- Vendor submodules (`graphify`, `ui-ux-pro-max-skill`):
  - **PASS** `.gitmodules:52-57`
- tmux split script syntax + Ctrl+A binding:
  - **PASS** `bash -n bin/ccc-split.sh`
  - bindings present (`bin/ccc-split.sh:57-61`, `64`)
- CI workflow test/audit-counts steps:
  - **PASS** requested 9 test steps + audit-counts exist
  - current total `Run *test*` steps = 10 (includes extra vendor/orchestrator) and doc-count step exists (`.github/workflows/ci.yml:114`, `117`).

## Repro Commands Used
- `npm test`
- `npx eslint . --max-warnings 120`
- `npm audit --json`
- `cd dashboard && npm audit --json`
- `cd video && npm audit --json`
- `node bin/kc.js --test`
- `node scripts/audit-counts.js --check`
- `node scripts/audit-counts.js --json`
- `for f in hooks/*.js; do node --check "$f"; done`
- `for f in commander/*.js; do node --check "$f"; done`
- `for f in bin/*.js; do node --check "$f"; done`
- `for f in scripts/*.js; do node --check "$f"; done`
- CI secrets/PII grep commands (from `.github/workflows/ci.yml`)
- `node --test commander/tests/claude-finder.test.js commander/tests/tui-visual.test.js commander/tests/dispatch-security.test.js commander/tests/audit-counts.test.js`
- `bash -n bin/ccc-split.sh`

## What Passed
- Full test suite (`187/187`)
- Self-test (`27/27`)
- JS syntax checks (all requested globs)
- Root/video `npm audit`
- `audit-counts --check` and `--json`
- Secrets + PII scans
- tmux split syntax and bindings present
- CI includes requested test/audit-count steps

## Improvement Ideas to Reach 90+
1. Patch `tmuxDispatch` resume path to avoid command-string composition (`send-keys -l` or strict sessionId regex allowlist).
2. Fix ESLint TS parsing setup (or file overrides) so `npx eslint .` is green under current config.
3. Resolve dashboard moderate vulnerabilities (major Vite upgrade path).
4. Auto-sync CLAUDE stats line from `scripts/audit-counts.js --json` in CI.
5. Remove `.0` stripping in `status-line.js` for semver consistency.
