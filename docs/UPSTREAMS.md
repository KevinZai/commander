# Upstream sources

Every skill, script or package CC Commander takes from another open-source project, with its license, the version we ship and what the last sync did. Checked 2026-11-18 against each upstream's default (or tracked) branch. License compatibility was confirmed from each upstream's LICENSE file at the new commit.

Vendor submodules are listed with their full terms in `vendor/LICENSE`; content copied into our tree is listed in `commander/scripts/copied-content.json`, which `node commander/scripts/audit-licenses.js --check` reads.

## Vendor submodules (`vendor/`)

| Submodule | Upstream | License | Was | Now | Commits pulled | Action |
|---|---|---|---|---|---|---|
| acpx | openclaw/acpx | MIT | v0.19.5 `95adbc5` | v0.22.0 `48c1615` | 99 | Bumped |
| caliber-ai-setup | caliber-ai-org/ai-setup | MIT | `f5dbc00` | same | 0 | Already at HEAD |
| claude-code-best-practice | shanraisshan/claude-code-best-practice | MIT | `70185ea` | `1496dcc` | 419 | Bumped |
| claude-code-playground | anthropics/claude-code-playground | Apache-2.0 | `569c528` | same | 0 | Already at HEAD |
| claude-code-prompts | repowise-dev/claude-code-prompts | MIT | `989fc0e` | same | 0 | Already at HEAD |
| claude-code-ultimate-guide | FlorianBruniaux/claude-code-ultimate-guide | CC-BY-SA-4.0 | v3.44.1 `f499217` | kept | (137 available) | Held: registry policy pins share-alike content; bump only after a re-audit |
| claude-hud | jarrodwatts/claude-hud | MIT | v0.11.2 `02d73c4` | v0.15.3 `9d2b6fa` | 50 | Bumped |
| claude-reflect | BayramAnnakov/claude-reflect | MIT | v3.3.1 `b6c4232` | same | 0 | Already at HEAD |
| claude-skills | alirezarezvani/claude-skills | MIT | v2.12.0 `19392f7` | v2.14.14 `f8593c4` | 304 | Bumped |
| compound-engineering | EveryInc/compound-engineering-plugin | MIT | v3.30.5 `50532b0` | v3.38.1 `f9970d8` | 186 | Bumped |
| everything-claude-code | affaan-m/everything-claude-code | MIT | `b92f181` | `3f14a10` | 1055 | Bumped; `/ccc-ecc` paths (`skills/`, `agents/`, `scripts/hooks/`) and the four scripts it names still exist |
| graphify | Graphify-Labs/graphify, formerly safishamsi/graphify (branch `v8`) | Apache-2.0 (our records said MIT; upstream was already Apache-2.0 at the old pin) | v0.9.88 `a9860f7` | v0.9.112 `340268a` | 774 | Bumped; license corrected in `vendor/LICENSE`, registry and `skills/graphify`; wrapper skill rewritten for the current CLI; submodule URL moved to the new org |
| gstack | garrytan/gstack | MIT (+ Apache-2.0 and MIT derived files in its NOTICE.md) | `dbf400e` | v1.100.0.0 `33b1a96` | 780 | Bumped; NOTICE gained MIT entries only; mapped skills (`make-pdf`, `open-gstack-browser`, `setup-browser-cookies`) still exist |
| mattpocock-skills | mattpocock/skills | MIT | v1.3.1 `49dd158` | v1.3.2 `5863806` | 10 | Bumped; registry note corrected (`to-prd` was removed upstream) |
| mengto-skills | MengTo/Skills | MIT | `83a47fe` | `3cc9345` | 18 | Bumped; all 25 looks and 5 capture workflows that `ccc-design/looks` and `capture` route to still exist |
| oh-my-claudecode | Yeachan-Heo/oh-my-claudecode | MIT | v5.7.1 `7eb8f08` | v5.8.6 `dec7e41` | 887 | Bumped; registry note corrected (`bridge/team.js` and `skills/omc-teams` are gone; runtime is `src/team/`) |
| repomix | yamadashy/repomix | MIT | v1.18.1 `55c6de6` | v1.19.0 `813a886` | 274 | Bumped |
| rtk | rtk-ai/rtk (branch `master`) | Apache-2.0 | v0.51.0 `e001f77` | `e288a18` | 550 | Bumped; LICENSE changed only its copyright line |
| superpowers | obra/superpowers | MIT | v7.0.0 `bb92a77` | v7.0.2 `22f0b46` | 3 | Bumped; `systematic-debugging/SKILL.md` unchanged upstream |
| ui-ux-pro-max-skill | nextlevelbuilder/ui-ux-pro-max-skill | MIT | v2.15.0 `7246805` | `e59ff37` | 28 | Bumped; wrapper skill's install command and counts fixed |

All 15 bumps are fast-forwards of the old pin.

## Content copied or adapted into our tree

| Our file(s) | Upstream | License | Our base | Upstream now | Action |
|---|---|---|---|---|---|
| 9 PR skills (`ccc-babysit-pr`, `ccc-council`, `ccc-file-pr`, `ccc-full-send`, `ccc-full-stop`, `ccc-modernize`, `ccc-pr-comments`, `ccc-sol-loop`, `ccc-takeover`) | t3dotgg/tstack | MIT | `92e38e2c` | `11e37a74` | Pin moved to `11e37a74`. Only `council` changed upstream; ported its "prepare before the audit" and "act on results as they arrive" rules, with the preparation gated on the user asking for fixes (row added to `docs/tstack/SAFETY.md`) |
| `ccc-systematic-debugging` | obra/superpowers | MIT | v7.0.0 | v7.0.2 | No change needed: upstream SKILL.md unchanged |
| `ccc-agent-writing` | obra/superpowers `writing-skills` | MIT | historical | v7.0.2 | Attribution link fixed (pointed at a wrong repo). Our skill is now a technical-docs skill, so upstream's restructure is not ported |
| `brand-guidelines`, `canvas-design`, `internal-comms`, `slack-gif-creator`, `theme-factory`, `web-artifacts-builder`, `webapp-testing` | anthropics/skills | Apache-2.0 | — | 2026-11-16 | Byte-identical to upstream; no change |
| `ccc-design/frontend-design` | anthropics/skills | Apache-2.0 | older | 2026-11-16 | Local fork (146 vs 71 lines); left as is |
| `claude-api` | anthropics/skills | Apache-2.0 | local fork | 2026-11-16 | Not synced. Ours is ahead on models (Fable 5.2) but upstream added managed agents, fallbacks, evals and 70 more files. Needs its own port; see follow-ups |
| `ccc-memory`, `ccc-tasks` | anthropics/knowledge-work-plugins | Apache-2.0 | adapted | 2026-11-13 | Heavily reframed for Commander; no line-level sync |
| `ccc-adhd`, `mode-switcher` | ayghri/i-have-adhd | MIT | 2026-10 | 2026-10-11 | Up to date |
| `caveman` | JuliusBrussee/caveman | MIT at our base; Apache-2.0 from 3.0.0 (2026-09-24) | pre-3.0 | 2026-11-17 | Kept at the MIT-era text on purpose; do not sync to the Apache-2.0 upstream |
| `ccc-design/screenshots` | none (clean-room rewrite, 2026-11-19) | Project license | — | — | No longer a copy: rewritten from a functional spec without reading the earlier text, which came from the unreachable Shpigford/skills repo with no license text. Removed from `copied-content.json`; nothing to sync |
| `playground` | frodo-temaki/playground-skill | MIT (README only, no LICENSE file) | — | 2026-01-28 | Identical to upstream |
| `context-mode` | mksglu/context-mode | Elastic License 2.0 | external install | 2026-11-18 | Wrapper only; nothing bundled |
| `ccc-testing/plankton-code-quality` | alexfazio/plankton | MIT | — | 2026-03-08 | Up to date |
| `spawn-manager` (mentions) | smtg-ai/claude-squad | AGPL-3.0 | reference only | — | Link only; no code copied |
| `ccc-recall` (optional) | thedotmack/claude-mem | Apache-2.0 (AGPL-3.0 before 2026) | reference only | — | Not bundled; bundling needs Kevin's decision |
| `jezweb-pack` (`google-apps-script`, `favicon-gen`, `icon-set-generator`) | jezweb/claude-skills | MIT | `1260fa74` | `1260fa74` (2026-11-19) | Added: three sub-skills behind a router, with "CCC safety:" lines; elevenlabs-agents skipped. Skips and edits in `skills/jezweb-pack/DECISIONS.md` |
| `mintlify` | mintlify.com | well-known | `skills-lock.json` hash | — | Not checked in this pass |

## Follow-ups

- Port the upstream `claude-api` skill (managed agents, refusal fallbacks, evals) while keeping our Fable 5.2 model rows.
- The three overlapping vendor workflows (`vendor-update.yml`, `upstream-sync.yml`, `weekly-vendor-sync.yml`) ran green or red for weeks without landing a bump; keep one.
- Decide whether to re-audit and bump `claude-code-ultimate-guide` (CC-BY-SA-4.0).
