# Audit Action Checklist (2026-04-07, v4)

## Current Score
- **91 / 100** (target 90+ achieved)

## 1) Fix `q` quit behavior contract in TUI (Medium)
- [ ] Align behavior with hotkey bar text `[q] quit`.
- [ ] In `commander/tui.js`, remove/adjust `hasQItem` guard so pressing `q` reliably quits or goes back.
- [ ] If `q` should be contextual, update hotkey hint to reflect actual behavior.
- Verify:
  - Run live tmux flow and confirm `q` exits menu.
  - `tmux capture-pane -t audit -p > /tmp/ccc-quit.txt`
  - `grep -q '└' /tmp/ccc-quit.txt`

## 2) Resolve dashboard vulnerabilities (Medium)
- [ ] Upgrade `dashboard` Vite/esbuild chain to patched versions.
- [ ] If major bump required, land migration notes and test coverage.
- Verify:
  - `cd dashboard && npm install`
  - `cd dashboard && npm run build`
  - `cd dashboard && npm audit --json`

## 3) Main-menu E2E capture expectations (Low)
- [ ] Decide whether bookend/panel markers are expected in main menu capture.
- [ ] If expected, render them in menu path; if not expected, update validation script/docs.
- Verify:
  - `grep -q '┌' /tmp/ccc-menu.txt`
  - `grep -q '╭' /tmp/ccc-menu.txt`

## 4) Correct stale README tests badge (Low)
- [ ] Update `README.md` tests badge from `168` to current value (`187`), or automate badge generation.
- Verify:
  - `rg -n 'Tests_Passing' README.md`
  - `npm test` confirms count parity.

## 5) Keep security/runtime regressions closed (Guardrail)
- [x] Session ID allowlist + `send-keys -l` literal mode in `tmuxDispatch`
- [x] YOLO env gate + explicit yes confirmation gate
- [x] `state.js` writes locked to `0o600`
- [x] `generateSessionName` slug sanitizer
- [x] ESLint now passes with configured ignores (0 errors)
- [x] `npm test` 187/187 and `kc --test` 27/27
- Verify:
  - `npm test`
  - `npx eslint . --max-warnings 120`
  - `node bin/kc.js --test`
  - `node scripts/audit-counts.js --check`

## 6) Optional hardening improvements
- [ ] Add dedicated test for `q` quitting behavior in `commander/tests/tui-visual.test.js`.
- [ ] Add CI check to compare README test badge count against `npm test` parsed count.
- [ ] Add automated tmux smoke snapshot test in CI (non-interactive capture assertions).
