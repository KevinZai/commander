# Audit Action Checklist (2026-04-07, v3)

## Target
- Move score from **88** to **90+** with no High findings.

## 1) Harden tmux resume command path (High)
- [ ] In `commander/engine.js`, remove string-concatenated resume command at `tmuxDispatch`.
- [ ] Use one of:
  - [ ] strict allowlist for `sessionId` (`^[a-zA-Z0-9._:-]+$`) before interpolation, or
  - [ ] literal `send-keys -l` for full command text to prevent shell metacharacter execution.
- [ ] Add regression tests for poisoned `claudeSessionId` input.
- Verify:
  - `node --test commander/tests/dispatch-security.test.js`
  - `npm test`

## 2) Fix ESLint TS parse failures (Medium)
- [ ] Update ESLint config/parser for `skills/browse/test/*.ts` or exclude that subtree intentionally with rationale.
- [ ] Ensure `npx eslint . --max-warnings 120` exits 0.
- [ ] Keep warning budget <=120.
- Verify:
  - `npx eslint . --max-warnings 120`

## 3) Resolve dashboard vulnerabilities (Medium)
- [ ] Upgrade `dashboard` Vite/esbuild path to a non-vulnerable chain.
- [ ] If major upgrade required, document migration + risk acceptance if deferred.
- Verify:
  - `cd dashboard && npm install`
  - `cd dashboard && npm run build`
  - `cd dashboard && npm audit --json`

## 4) Fix count/doc drift (Low-Medium)
- [ ] Align `CLAUDE.md` stats line with canonical output from `scripts/audit-counts.js --json`.
- [ ] Optionally extend `--check` to validate counts across README + CLAUDE.md (not just version/vendor).
- Verify:
  - `node scripts/audit-counts.js --json`
  - `node scripts/audit-counts.js --check`
  - `rg -n "Stats:|skills \(CLI-visible\)|vendor" CLAUDE.md README.md`

## 5) Version string consistency in status line (Low)
- [ ] Remove `.0` truncation in `commander/status-line.js` if full semver is the project standard.
- [ ] Confirm output shows `2.3.0` consistently with package/changelog/readme badge.
- Verify:
  - `node commander/status-line.js --json`
  - `node -e "const p=require('./package.json');const b=require('./commander/branding');console.log(p.version,b.version)"`

## 6) Keep green checks green (Regression guard)
- [x] `npm test` at 187/187
- [x] `node bin/kc.js --test` at 27/27
- [x] Root/video audits clean
- [x] JS syntax checks pass (`hooks`, `commander`, `bin`, `scripts`)
- [x] Secrets + PII scans pass
- [x] tmux split script passes `bash -n`
- [x] CI includes requested test steps + doc-count check
- Verify:
  - `npm test`
  - `node bin/kc.js --test`
  - `npm audit --json`
  - `cd video && npm audit --json`
  - `for f in hooks/*.js; do node --check "$f"; done`
  - `for f in commander/*.js; do node --check "$f"; done`
  - `for f in bin/*.js; do node --check "$f"; done`
  - `for f in scripts/*.js; do node --check "$f"; done`
  - `bash -n bin/ccc-split.sh`

## 7) Final re-audit gate
- [ ] Re-run full v3 command set and regenerate handoff docs.
- [ ] Require:
  - [ ] `npx eslint . --max-warnings 120` passes
  - [ ] no High findings
  - [ ] score >= 90
- Verify:
  - `npm test`
  - `npx eslint . --max-warnings 120`
  - `npm audit --json`
  - `cd dashboard && npm audit --json`
  - `cd video && npm audit --json`
  - `node bin/kc.js --test`
  - `node scripts/audit-counts.js --check`
