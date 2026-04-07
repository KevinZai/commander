# Repo Audit Handoff (2026-04-07)

## Overall Score
- 71 / 100

## Priority Findings
1. High: `video/` has known vulnerable deps (3 high, 3 moderate).
   - `video/package.json` pins old Remotion stack (`@remotion/cli` 4.0.0).
   - `npm audit` recommends non-breaking bump to `@remotion/cli@4.0.446`.

2. Medium: `dashboard/` dependency health + lock consistency issues.
   - `dashboard npm ci` initially failed due to lock drift vs `package.json`.
   - `npm audit` shows 2 moderate vulns (`vite`, `esbuild`).

3. Medium: Skill-count logic inconsistent with repo reality.
   - `commander/skill-browser.js` lists 367 skills while repo contains 456 `SKILL.md` files.
   - Public docs/README claim 450+/455; CLI currently reports 367 (`ccc --status`).

4. Medium: CI PII scan self-flags repo content.
   - `.github/workflows/ci.yml` PII regex catches current text in `CHANGELOG.md` and `docs/EVALUATION.md`.

5. Low: Branding/version mismatch causes failing test.
   - `commander/branding.js` strips `.0` (`2.2.0` -> `2.2`).
   - `commander/tests/paths.test.js` expects exact equality with `package.json` version.

6. Low: `pre-compact` hook test is environment-fragile.
   - Writes to `~/.claude/sessions`; restricted environments can fail writes.

7. Low-Medium: Workflow hardening opportunity.
   - `discovery-scan.yml` uses shell string `execSync` with interpolated repo input.

## Repro Commands Used
- `npm test`
- `bash tests/smoke.sh`
- `node bin/kc.js --help`
- `node bin/kc.js --status`
- `find bin commander hooks extensions -type f \( -name '*.js' -o -name '*.cjs' -o -name '*.mjs' \) -print0 | xargs -0 -I{} node --check '{}'`
- `npm audit --json`
- `cd dashboard && npm install && npm run build`
- `cd dashboard && npm audit --json`
- `cd video && npm ci && npm run render`
- `cd video && npm audit --json`

## Passed Checks
- JS syntax checks passed on executable JS surfaces.
- Root package `npm audit` clean (0 vulnerabilities).
- CLI smoke tests passed.
- No obvious hardcoded live credentials in executable code paths.

## Suggested Next Actions
1. Upgrade `video` Remotion stack to patched line and re-run `npm audit`.
2. Decide canonical skill counting model, fix `listSkills()` recursion/dedupe, and auto-generate published counts.
3. Refactor CI PII scan to avoid known false positives while preserving guardrails.
4. Normalize version formatting (`branding` vs tests).
5. Make hook state/session output directory configurable for testability.

