# Audit Action Checklist (for Claude Code)

## Goal
Close all material issues found in the 2026-04-07 audit and re-run validation.

## 1. Video dependency vulnerabilities (High)
- [x] Bump Remotion stack in `video/package.json` to patched non-breaking versions (target line around `@remotion/cli@4.0.446` or newer secure equivalent).
- [x] Run: `cd video && npm install`
- [x] Run: `cd video && npm audit --json`
- [x] Run: `cd video && npm run render`
- [x] Confirm vuln count is reduced to 0 (or document any accepted residual risk with rationale).

## 2. Dashboard dependency health + lock consistency (Medium)
- [x] Ensure `dashboard/package-lock.json` is in sync with `dashboard/package.json`.
- [x] Upgrade vulnerable `vite`/`esbuild` path to a secure version strategy.
- [x] Run: `cd dashboard && npm install`
- [x] Run: `cd dashboard && npm audit --json`
- [x] Run: `cd dashboard && npm run build`
- [x] Confirm build passes and vulnerability posture is documented. (2 moderate vulns remain — require major vite v8 upgrade, accepted risk)

## 3. Skill counting correctness (Medium)
- [x] Fix `commander/skill-browser.js` traversal/dedupe so listing reflects intended canonical count.
- [x] Decide canonical metric(s):
  - [x] Total `SKILL.md` files: 456 (on disk)
  - [x] Top-level installable skill directories: n/a
  - [x] CLI-visible skills: 451 (canonical for public claims)
- [x] Update commands/output/docs to use one source of truth.
- [x] Run:
  - [x] `node bin/kc.js --list-skills --json` → 451 skills
  - [x] `find skills -name 'SKILL.md' | wc -l` → 456 on disk
- [x] Reconcile public claims in README/CLAUDE/SKILLS-INDEX/changelog. Use "450+" for marketing, "451" for technical.

## 4. CI PII scan false-positive handling (Medium)
- [x] Update `.github/workflows/ci.yml` PII step to avoid self-flagging known historical/context references while preserving protection.
- [x] Verify with local grep command used in workflow.
- [x] Ensure no real PII leak indicators remain in public files.

## 5. Branding version mismatch test failure (Low)
- [x] Align behavior between `commander/branding.js` and `commander/tests/paths.test.js`.
- [x] Choose one:
  - [x] use exact package semver in branding (chosen)
- [x] Run: `npm test`

## 6. pre-compact test robustness (Low)
- [x] Make `hooks/pre-compact.js` write path configurable (e.g., env override) for testability.
- [x] Update tests to use temporary writable directory instead of hardcoding `~/.claude/sessions` assumptions.
- [x] Run: `node --test tests/hooks.test.js`

## 7. Workflow hardening (Low-Medium)
- [x] In `.github/workflows/discovery-scan.yml`, avoid shell-string command composition for repo identifiers; use argument-safe execution.
- [x] Validate workflow script still produces equivalent output.

## 8. Final validation gate
- [x] Run root checks:
  - [x] `npm test` — 166/166 tests pass
  - [x] `bash tests/smoke.sh`
  - [x] `node bin/kc.js --status`
  - [x] `npm audit --json`
- [x] Run per-package checks (`dashboard`, `video`) listed above.
- [x] Summarize before/after:
  - [x] vulnerability counts: video 6→0, dashboard 2 moderate (accepted, require vite v8 major bump)
  - [x] test pass/fail counts: 166/166 pass
  - [x] skill count metrics: CLI-visible 451, on-disk 456, public claim "450+"
  - [x] remaining known risks: dashboard 2 moderate vulns (vite/esbuild), accepted with rationale

## 9. Deliverables
- [ ] Commit with conventional message(s).
- [ ] Include changelog/update notes if public counts or behavior changed.
- [ ] Attach concise remediation report with evidence commands and outputs.

