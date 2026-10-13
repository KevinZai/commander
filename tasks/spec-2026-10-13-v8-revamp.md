# CC Commander v8.0.0 — full revamp plan

Date: 2026-10-13 · Tracker: CC-1415 · Branch: `cc-v8-revamp` (worktree
`~/clawd/.claude/worktrees/cc-v8-revamp`) → pushed to
`origin/cc-e2e-audit-revamp-2026-08`, PR #90 repurposed as the v8 PR.
Base: `origin/main` 62f59db (v7.4.2). Planner: Claude Fable 5.1. Workers: Opus 5.5.

## Outcome

Commander ships as **v8.0.0** with every prompt rewritten to the v8 standard,
every model reference on the October 2026 lineup (Claude 5.5 tier + Fable 5.1;
Codex GPT-6 family), the plugin surface extended to the current Claude Code
platform (33 hook events, onFailure/exec hooks, Mods, plugin workflows, plugin
evals, current subagent/skill frontmatter), Codex CLI management as a
first-class skill, vendors and dependencies refreshed, README/CHANGELOG/docs
rewritten, the PR merged, `v8.0.0` tagged and released on GitHub, and
commanderplugin.com serving the new version.

## Success metric (falsifiable)

Done when all of the following return the expected value in the worktree:

| Check | Expected |
|---|---|
| `git grep -nP 'claude-(fable\|opus\|sonnet)-5(?![-\d])\|claude-haiku-4-5\|\b(Opus\|Fable\|Sonnet) 5(?![.\d])\|Haiku 4\.5\|gpt-5\.[0-9]\|GPT-5\.[0-9]' -- ':!CHANGELOG.md' ':!docs/reference' ':!docs/compat' ':!vendor' ':!mintlify-docs/whats-new-v*' ':!mintlify-docs/quickstart.mdx' ':!site/releases' ':!package-lock.json' ':!commander/adapters/codex/models.js' ':!skills/claude-api/shared/models.md' ':!skills/advisor' ':!**/*.pdf' ':!**/*.png' ':!**/*.ansi'` | no output (git grep -E treats `\b` literally; the registry, the model catalog's legacy table, the advisor tool's stated minimum and dated history are the justified exclusions) |
| `node scripts/check-product-contract.js --check; node scripts/build-from-registry.js --check; node scripts/check-version-parity.js --check; node scripts/audit-counts.js --check; node bin/doc-sync.js; node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --check; node scripts/audit-frontmatter.js --check; node scripts/check-compat.js; node scripts/generate-changelog.js --check-version` | every exit code 0 |
| `npm run test:ci` | exit 0 |
| `npm run build:codex && git status --porcelain commander/cowork-plugin-codex` | empty (mirror committed and current) |
| `claude plugin validate ./commander/cowork-plugin --strict` | Validation passed |
| `node -e "console.log(require('./package.json').version)"` | `8.0.0` |
| `gh api repos/KevinZai/commander/releases/latest --jq .tag_name` | `v8.0.0` |
| `curl -s https://commanderplugin.com/ \| grep -c 8.0.0` | ≥ 1 |

## Verified platform facts

`docs/reference/platform-facts-2026-10.md` (written first; every worker cites it).
Highlights: Claude Fable 5.1 / Opus 5.5 / Sonnet 5.5 / Haiku 5.5 all 1M context;
Claude Code 2.1.296 with 33 hook events, Mods, plugin workflows/evals, Agent
`effort`, `/effort ultracode`, auto permission mode; Codex CLI 0.162.1 with
`gpt-6-astra`, `gpt-6.1-sol` (default), `gpt-6-sol`, `gpt-6-luna`
(all probed live today), `gpt-5.5` retiring 2026-10-14, 12 hook events,
TOML subagents, `codex plugin|agents|cloud|remote-control|doctor|update`.

## Decisions

1. **Branch strategy.** Merge main into the stale branch (done, 37c04ea), carry the uncommitted 2026-09-05 prompt-condensation edits forward as a baseline commit (0969431), build v8 on top. The main checkout is untouched; its dirty tree is snapshotted in the session scratchpad.
2. **Scope of "rewrite all prompts".** Plugin skills, agents, rules, personas, menus, `CLAUDE.md.template`, `AGENTS.md`, toolkit `commands/*.md`, `prompts/*`. The 467 ecosystem skills under `skills/` and `vendor/` are third-party or bulk content: they get the model-reference sweep, not a rewrite. The Codex mirror is regenerated, never hand-edited.
3. **Model naming.** Plugin frontmatter uses aliases (`fable`, `opus`, `sonnet`, `haiku`) so it tracks the newest model; prose names the full id only when describing a specific model. Codex routing: `gpt-6-astra` deep, `gpt-6.1-sol` default executor, `gpt-6-sol` bounded, `gpt-6-luna` bulk.
4. **Hooks stay shell-form, quoted.** Exec-form `args` would remove the quoting trap but Codex cannot run it; one `hooks.json` must mirror to both.
5. **New plugin components.** A Commander HUD mod (band above the prompt), plugin-distributed workflows (`/commander:<name>`), an `evals/` suite, `settings.json` with `subagentStatusLine`, manifest directory-listing fields. The Codex mirror emits TOML subagents and the 12-event hook set.
6. **Vendors.** Refresh all 19 submodules to upstream heads with the license scanner gate. Add new vendors only when the license is MIT/Apache-2.0 verified from the repo's LICENSE file; candidates: `anthropics/skills`, `anthropics/claude-code-playground` (sample mods).
7. **Release path.** Codex adversarial review (`codex review --base origin/main`) + Claude review workflow → fix → gates → squash-merge PR #90 (merge authority: this session, per the standing Codex-audit rule) → tag `v8.0.0` → `release.yml` creates the GitHub release → website agent syncs commanderplugin.com and pushes `main` (Vercel deploys).
8. **Ownership.** Workers edit only files in their lane. The orchestrator alone edits `commander/contract.json`, every `plugin.json`/`marketplace.json`, `package.json`, `CLAUDE.md`, `CHANGELOG.md`, `README.md`, and runs `build:codex`.

## Lanes

| # | Lane | Owner | Files owned | Acceptance |
|---|---|---|---|---|
| A1 | Model registry + sweep | Opus worker | `commander/adapters/codex/{models.js,translate.js}`, `scripts/check-codex-models.js`, `commander/tests/codex-models.test.js`, `skills/claude-api/shared/models.md`, `skills/claude-api/**` model refs, `commands/*.md`, `prompts/*`, `skills/**` (non-plugin) model refs, `docs/cheatsheets/*.html`, `dashboard/lib`, `vscode-extension/src`, `tests/screenshot-capture.js`, `screenshots/*`, `mintlify-docs/{introduction,quickstart,dynamic-workflows}.mdx`, `commander/cowork-plugin/hooks/*.js` model strings only, `commander/cowork-plugin/lib/*.js` model/pricing strings | stale-model grep empty outside its exclusions; `node --test commander/tests/codex-models.test.js` green; registry carries GPT-6 family with `verified: 2026-10-13` |
| A2 | Hook surface | Opus worker | `commander/cowork-plugin/hooks/hooks.json`, `hooks/README.md`, `hooks/lib/emit.mjs`, new handler scripts, `commander/adapters/codex/{hook-event-map.json,hooks-detector.js}`, `tests/hooks.test.js`, `commander/tests/hooks-*.test.js`, `commander/tests/*hook*.test.js`, `commander/tests/plugin-schema-validation.test.js` | hooks.json adds handlers for PermissionDenied, PreModelSwitch, PostModelSwitch, TeammateIdle, CwdChanged, DirectoryAdded, FileChanged (and SessionStart `watchPaths` for CLAUDE.md staleness); **never** WorktreeCreate/WorktreeRemove (they replace git worktree handling); every command quoted; emit allowlist = platform union; Codex map = 12 events; hook tests green; reports final event/handler counts |
| A3 | Agents + personas | Opus worker | `commander/cowork-plugin/agents/*.md`, `rules/personas/*.md`, `commander/tests/agent-personas.test.js`, `commander/tests/agent-manifest.test.js` | 22 agents on the v8 agent shape, aliases only, dead fields removed, tests updated and green |
| A4 | Codex CLI management | Opus worker | new `commander/cowork-plugin/skills/ccc-codex/`, `commander/cowork-plugin/skills/ccc-orchestrate/`, `commander/adapters/codex.js` + `commander/tests/codex-adapter.test.js`, `scripts/build-codex.js`, new `commander/adapters/codex/agents-toml.js`, `commander/tests/codex-build.test.js`, `tests/codex-plugin-e2e.test.js`, `skills/codex/SKILL.md{,.tmpl}`, `hooks/codex-review-gate.sh`, `.agents/plugins/marketplace.json` (all but `version`) | `/ccc-codex` covers doctor, models, plugins, mcp, agents, cloud, remote, review, update, import, config; build emits `.codex/agents/*.toml` and derives dropped events from the map; build + e2e tests green |
| A5 | Commander HUD mod | Opus worker (loads `plugin-authoring`) | `commander/cowork-plugin/mods/commander-hud/**`, its tests, `docs/MODS.md` | `claude plugin validate` lists the mod's hooks/calls; mod tests pass; band shows Fable state, active agents, session cost, update pill; `/ccc-hud` command |
| A6 | Plugin workflows + evals | Opus worker | `commander/cowork-plugin/workflows/*.js`, `commander/cowork-plugin/evals/**`, `commander/tests/workflows*.test.js` | 4 workflows modernized + `ccc-prompt-audit` and `ccc-release-audit` added; ≥ 8 eval cases; `claude plugin eval . --case <one> --runs 1 --ablation none` runs |
| A7 | Vendors + deps | Opus worker | `vendor/*`, `.gitmodules`, `apps/mcp-server-cloud/package*.json`, `docs/SECURITY-DEPENDENCY-NOTES.md`, `NOTICE.md` | all submodules at upstream heads; `node --test commander/tests/vendor-scanner.test.js` green; license table updated; new vendors only with verified MIT/Apache LICENSE; reports vendor count |
| A8 | Console + artifact surfaces | Opus worker (loads `artifact-design`, `artifact-capabilities`) | skills `ccc-console`, `ccc-browse`, `ccc-mission-control`, `ccc-usage`, `ccc-safety`, `ccc-fleet-viz`, `ccc-linear-board`, `commander/cowork-plugin/scripts/build-console.mjs`, `commander/cowork-plugin/lib/deck-*.js`, `commander/tests/console-*.test.js` | publish path uses the current Artifact tool contract (icon, description, capabilities/db where state is shared); inline widget path preserved; tests green |
| A9 | Rules, template, AGENTS | Opus worker | `commander/cowork-plugin/rules/{fable-method.md,workflow-first.md}`, `rules/common/*.md`, `menus/*.json`, `CLAUDE.md.template`, `AGENTS.md`, `settings.json.template`, `.claude/settings.json` | v8 standard; no stale models; Opus 5.5 delegation guidance; auto mode; Mods/workflows referenced |
| B | Skill rewrite (pilot → fan-out) | Workflow of Opus workers + verifiers | every `commander/cowork-plugin/skills/*/SKILL.md` not owned by A4/A8, plus `commands/ccc-*.md` and `skills/ccc-*/SKILL.md` domain routers | every file passes the §5 checklist in `docs/PROMPT-STANDARD.md`; `audit-frontmatter --check` green; verifier verdict CONFIRMED per file |
| C1 | Integration | orchestrator | contract, manifests, `CLAUDE.md`, `package.json`, `build:codex`, gates | all gates green at 8.0.0 |
| C2 | Docs | Opus technical writer | `README.md` (orchestrator applies), `CHANGELOG.md` [8.0.0] draft, `mintlify-docs/*` (new `whats-new-v8.mdx`), `CHEATSHEET.md`, `BIBLE.md`, `SKILLS-INDEX.md`, `commander/cowork-plugin/README.md`, `CONNECTORS.md`, `commander/cowork-plugin/hooks/README.md` consistency | doc-sync gates green; README has one current "What's new" section and the one-step install line |
| C3 | Adversarial review + Codex audit | Workflow + `codex review` | — | zero unresolved blocker findings |
| C4 | Release | orchestrator | — | PR #90 merged, `v8.0.0` tagged, GitHub release present |
| D | Website | separate Opus agent | `~/clawd/projects/commanderplugin-com/**` | live site shows 8.0.0; ticker/panels/releases notes added without rewriting history |

## Order

1. Phase A (A1–A9) in parallel; B pilot (3 skills) in parallel with A.
2. B fan-out after the pilot is reviewed.
3. C1 → C2 → C3 (fix loop) → C4.
4. D after C4.

## Stop conditions

- **Done:** success-metric table all green.
- **Blocked:** a gate that cannot pass without a product decision (for example a contract field the counts cannot satisfy), a credential needed for release that is absent, or a destructive action outside this plan. Blocked items are reported with the exact command and output; everything else continues.

## Risks

- Mods API is weeks old: keep the HUD minimal and validated; if `claude plugin validate` rejects it, ship it disabled behind a manifest comment and note it in CHANGELOG as experimental.
- Parallel writers and the Codex mirror: only the orchestrator runs `build:codex`, after Phase A and B land.
- Count gates disagree (three mechanisms): run all of `bin/doc-sync.js`, `docs:sync:check`, `audit-counts --check`, `check-product-contract --check` before every push.
- Historical text: never rewrite CHANGELOG entries, `whats-new-v5/v6/v7`, or site release notes; the stale-model grep excludes them on purpose.
- PII: sweep every diff for `openclaw`, `hermes`, `k3v80`, `/Users/ai`, personal rosters before commit.
