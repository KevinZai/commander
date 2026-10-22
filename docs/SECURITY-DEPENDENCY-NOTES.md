# Dependabot alert scope note (2026-07-17)

The majority of open Dependabot alerts in this repo (116 of 153 as of this audit) originate from
`skills/engineering-pack/dependency-auditor/test-project/package.json` and
`skills/engineering-pack/dependency-auditor/assets/sample_requirements.txt`. These are **intentional
fixtures** for the dependency-auditor skill's vulnerability-scanning demo — they declare deliberately
outdated packages (including known-CVE versions of mongoose, Django, and Pillow) so the skill can
demonstrate CVE detection against a static `test-inventory.json` golden output. They are never
installed (no lockfile for the npm fixture), never executed, and pose no risk to users of the plugin.

**Do not bump these fixture versions without also regenerating `test-inventory.json`** — the demo's
"vulnerable input" and "expected output" must stay in sync, and no automated test currently guards
that pairing. (This is why Dependabot PRs against `test-project/` are held rather than auto-merged.)

Real, actionable alerts are scoped to:

| Area | Exposure | Status |
|---|---|---|
| `apps/mcp-server-cloud/` | Deployed (deploy-mcp.yml) | hono bumped to ≥4.12.25 (GHSA-88fw-hqm2-52qc, CORS-with-credentials) 2026-07-17 |
| `site/` | Deployed (deploy.yml) | protobufjs (DoS) + ws (DoS) transitive highs — tracked, patch on next site dependency pass (pnpm overrides required for transitive bumps; not worth a risky lockfile churn for DoS-class issues on a static marketing site) |
| `dashboard/` | Local-only dev tool (127.0.0.1:4690) | vite devDependency — bump opportunistically; zero shipped exposure |
| `video/` | Dev-only Remotion render tooling; output is a static mp4/gif | Dependabot PRs #24–26 merged for hygiene 2026-07-17 |
| root `package-lock.json` | devDependencies only (published npm package's sole runtime dep is `figlet`) | bump via `npm audit fix` when next touching root deps |

Method: `gh api repos/KevinZai/commander/dependabot/alerts --paginate`, classification verified by
reading the actual manifests and deploy workflows (not path-guessing). Full triage in the 2026-07-17
session notes.

---

# 2026-10-13 refresh (v8.0.0, CC-1415 lane A7)

## Vendor submodules

All 19 existing vendors were refreshed with `git submodule update --init --depth 1 --remote -- vendor/<name>`.
License = SPDX id read from the upstream `LICENSE` file at the new SHA; `git diff old new -- LICENSE*`
was empty for every vendor, so there are **no license changes** and no blockers. Notable changes come from
`git -C vendor/<name> log --oneline --no-merges old..new | head` (history deepened with `--shallow-since`).

| Vendor | Old | New | License | Notable upstream changes |
|---|---|---|---|---|
| acpx | `504040f` | `95adbc5` | MIT | v0.19.5: session-recovery and journal-bounding fixes, viewer tooling dependency refresh |
| caliber-ai-setup | `7950921` | `f5dbc00` | MIT | v1.55.2: freshness-hook state-file parse fix, compaction for Cursor and generic agents |
| claude-code-best-practice | `2d3c0a1` | `70185ea` | MIT | Docs drift tracking through Claude Code v2.1.296 (badges and changelog entries) |
| claude-code-playground | (new) | `569c528` | Apache-2.0 | New vendor. Anthropic DevRel hooks, CLAUDE.md, settings, and sample mods under `claude-code/mods/` |
| claude-code-prompts | `989fc0e` | `989fc0e` | MIT | Already at upstream head; no change |
| claude-code-ultimate-guide | `eab8adc` | `f499217` | CC-BY-SA-4.0 | Release notes to Claude Code v2.1.296, diagram refresh and provenance records (license unchanged since adoption) |
| claude-hud | `e39bafc` | `02d73c4` | MIT | v0.11.2; **security:** v0.11.1 stops running commands named in a repository's own git config |
| claude-reflect | `8dc9db4` | `b6c4232` | MIT | v3.3.1: reflect-mod (claude-reflect as a Claude Code mod), quadratic-parsing perf fix |
| claude-skills | `aa8d778` | `19392f7` | MIT | deep-learning-book skill fixes, codex symlink sync |
| compound-engineering | `1e90e0c` | `50532b0` | MIT | v3.30.5: ce-code-review scope and fallback fixes, cross-model peers pinned to one acpx transport |
| everything-claude-code | `e4e4163` | `b92f181` | MIT | Auth-diagnostic and evaluator-input hardening, sandbox-base symlink rejection, Windows test fixes |
| graphify | `00efd6e` | `a9860f7` | Apache-2.0 (also ships `LICENSE-MIT`; `pyproject.toml` declares Apache-2.0) | v0.9.88 on branch `v8`: Java and C/C++ call/include resolution, JS import edges, AST cache schema 12 |
| gstack | `a325940` | `dbf400e` | MIT | v1.91.94: codex `--effort` override, fail-closed review gates; adds `licenses/Apache-2.0.txt` + `NOTICE.md` for Apache-2.0 material derived from pbakaus/impeccable (root license still MIT) |
| mattpocock-skills | `2ab9580` | `49dd158` | MIT | wizard template fixes, code-review standards-file search, diagnosing-bugs mutation check |
| mengto-skills | `46abf78` | `83a47fe` | MIT | 14 illustration skills, game-combat VFX skills (fire, water, ice, lightning) |
| oh-my-claudecode | `41a4c0f` | `7eb8f08` | MIT | v5.7.1: directory diagnostics use the project's TypeScript, release CI authorization rework |
| repomix | `4443737` | `55c6de6` | MIT | Dependency bumps only (jsdom 30, vite-plugin-pwa 2, npm_and_yarn group) |
| rtk | `e0ffd40` | `e001f77` | Apache-2.0 | v0.51.0 (release branch `master`): shell fallback for unresolvable single-string commands, test/env isolation |
| superpowers | `44c9b2d` | `bb92a77` | MIT | Four releases (v6.3.0, v6.4.1, v6.4.2, **v7.0.0** major): rebuilt brainstorming, writing-plans slimmed, Windows hook fixes |
| ui-ux-pro-max-skill | `14ddef5` | `7246805` | MIT | OpenClaw and Amazon Q platform support, SVG icon-generator corruption fix |

Tracking-branch notes, now explicit in `.gitmodules`:

- `rtk`: upstream changed its default branch to `develop` (unreleased work). The previous pin `e0ffd40` is on
  `master`, the release-please branch, and `--remote` on the default branch would have jumped to an unreleased
  head that is not a descendant of the old pin. Pinned to `branch = master`.
- `graphify`: `branch = v8` (upstream default; recorded so refresh tooling does not assume `main`).
- `claude-code-playground`: `branch = main`.

Follow-ups for the integrator (not in this lane's ownership): `superpowers` v7.0.0 rebuilt brainstorming,
which the root `skills/brainstorming/` was adapted from; review before resyncing. `claude-code-ultimate-guide`
remains CC-BY-SA-4.0 (share-alike). It is unchanged since adoption, but adapted text must keep attribution and
the share-alike terms.

## New vendor decisions

Rule: MIT or Apache-2.0 verified from the `LICENSE` file fetched with
`curl https://raw.githubusercontent.com/<owner>/<repo>/<branch>/LICENSE` (not the GitHub API).

| Repository | Decision | Evidence |
|---|---|---|
| `anthropics/claude-code-playground` | **Added** as `vendor/claude-code-playground` (`main`, shallow) | Public; raw `LICENSE` is HTTP 200 and is the Apache License 2.0 text, byte-identical to the cloned file; no other LICENSE, NOTICE, or "all rights reserved" files in the tree. The README says it is not an official product, is provided as-is, and accepts no outside contributions |
| `anthropics/skills` | **Rejected** | Public, but raw `LICENSE`, `LICENSE.md`, and `LICENSE.txt` return 404 on `main` and `master`, so the rule fails. Licensing is per skill: most `skills/*/LICENSE.txt` files are Apache-2.0, while `docx`, `pdf`, `pptx`, and `xlsx` are "© Anthropic, PBC. All rights reserved" source-available terms. Vendoring the whole repo would put proprietary material in the MIT distribution. The Apache-2.0 skills already adapted are attributed in `NOTICE.md` |

Vendor count: 19 → 20 submodules under `vendor/`.

## Dependency audits

| Scope | Command | Result |
|---|---|---|
| root | `npm audit --omit=dev` | 0 vulnerabilities |
| `apps/mcp-server-cloud` | `npm install --package-lock-only --ignore-scripts` | no lockfile change (the existing lock already satisfied the ranges) |
| `apps/mcp-server-cloud` | `npm audit --omit=dev` (before) | 2 moderate: `hono` ≤4.13.6 (8 advisories incl. GHSA-8j4g-w8fx-2239 CORS ReDoS, GHSA-hxh3-vqpv-xpqv jsx XSS), `fast-copy` 4.0.0–4.0.4 (GHSA-jggr-w7fw-pc2j, via pino-pretty) |
| `apps/mcp-server-cloud` | `npm audit fix --package-lock-only --ignore-scripts` | lockfile only: hono 4.12.33 → 4.13.13, fast-copy 4.0.3 → 4.1.2, esbuild 0.28.0 → 0.28.2 (dev, via tsx). `package.json` unchanged; pino stays 9.14.0 (10.x major not taken) |
| `apps/mcp-server-cloud` | `npm audit --omit=dev` / `npm audit` (after) | 0 / 0 vulnerabilities |
