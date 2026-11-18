# CLI toolkit split plan

PLAN ONLY. No files move in this change. Purpose: keep the plugin repository lean and reviewable (the Anthropic directory scans a plugin folder and its repository limits are 50 MiB archived and 10,000 entries) by moving the CLI toolkit and its ecosystem catalog into its own repository. Decision for Kevin at the end.

## Why

- The monorepo carries a lot that the plugin does not need. Measured sizes in this checkout: `skills/` 25 MB and about 1,440 files, `commander/` 11 MB and about 1,050 files (most of it `cowork-plugin/`, the Codex mirror and the CLI), `marketing/` 17 MB, `docs/` 4 MB, `video/` 3 MB, `site/` and `apps/`. The plugin itself, built as the directory mirror, is 3.8 MB and 376 files.
- The directory route already needs a generated mirror repo because of this (`docs/DIRECTORY.md`). A cleaner split removes that special case for most contributors.
- Two licenses live in one repo: plain MIT for the plugin, MIT plus Commons Clause for four CLI files (`commander/dispatcher.js`, `knowledge.js`, `skill-browser.js`, `project-importer.js`; `docs/LICENSE-INTELLIGENCE.md`). A separate CLI repo makes the plugin repo plainly MIT and removes a question from directory review.
- The CLI catalog has its own cadence (weekly vendor sync, ecosystem additions); the plugin releases on the Commander Method's gates. Coupling them makes every vendor bump a plugin release candidate.

Primary product stays the Desktop plugin (CLAUDE.md); this split follows that priority.

## What moves, what stays

Proposed new repo: `KevinZai/commander-cli` (name to confirm).

| Path | Today | Destination |
|---|---|---|
| `skills/` (ecosystem catalog, count in `commander/contract.json` as `ecosystem_skills`) | repo root | CLI repo |
| `commands/` (slash-command markdown) | root | CLI repo |
| `prompts/`, `templates/`, `compatibility/` | root | CLI repo |
| `bin/` (`kc.js`, `ccc.js`, `cli.js`, `count-skills.js`, `doc-sync.js`, `generate-index.sh`, `ccc-split.sh`) | root | CLI repo, except `bin/doc-sync.js` if the plugin repo keeps a docs sync (see below) |
| CLI engine: `commander/engine.js`, `tui.js`, `dispatcher.js`, `knowledge.js`, `plugins.js`, `doctor.js`, `skill-browser.js`, `project-importer.js` and the other `commander/*.js` modules, plus `commander/adventures/`, `actions/`, `ingestion/`, `integrations/`, `mcp-server/`, `lib/`, `core/` | `commander/` | CLI repo (as `commander/` or `src/`) |
| Root `hooks/` (CLI hooks: auto-checkpoint, careful-guard, statusline) and root `lib/` (terminal art, themes) | root | CLI repo; the plugin has its own `commander/cowork-plugin/hooks/` and `lib/` |
| `vendor/` (20 submodules) and `.gitmodules` | root | CLI repo (vendors feed the catalog) |
| Vendor automation: `scripts/weekly-vendor-sync.sh`, `.github/workflows/vendor-update.yml`, `upstream-sync.yml`, `discovery-scan.yml`, `scripts/build-from-registry.js` (catalog half), `commander/core/registry.yaml`, `SKILLS-INDEX.md` catalog section, `skills-lock.json` | root | CLI repo |
| `commander/tests/` for CLI modules, root `tests/` for CLI behaviour (`kc-cli-safety`, `install-uninstall-integration`, `airplane-mode`, `statusline-*`) | | CLI repo |
| `install.sh`, `install-remote.sh`, `setup.sh`, `uninstall.sh`, `settings.json.template`, `CLAUDE.md.template` | root | CLI repo (installers for the toolkit) |
| `commander/cowork-plugin/` | stays | Plugin repo |
| `commander/cowork-plugin-codex/` and `commander/adapters/codex/`, `scripts/build-codex.js` | stays | Plugin repo (generated from the plugin) |
| `commander/cowork-plugin-pro/` | stays | Plugin repo, pending the decision in `revenue.md` |
| `commander/contract.json`, `commander/contract.md` | `commander/` | Plugin repo keeps its half (plugin, agents, hooks, MCP); `ecosystem_skills` and `ccc_domains` move to a CLI contract |
| `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, directory mirror builder and workflow | stays | Plugin repo |
| Release gate, parity and contract checks | stays | Plugin repo (reduced), CLI repo gets its own gate |
| `site/`, `mintlify-docs/`, `apps/mcp-server-cloud/`, `video/`, `marketing/`, `dashboard/`, `vscode-extension/`, `extension/`, `extensions/` | root | Stay for now; they are out of this split's scope. `marketing/` (17 MB) is the next candidate for a docs/assets repo |
| `BIBLE.md`, `CHEATSHEET.md`, `SKILLS-INDEX.md` | root | BIBLE and CHEATSHEET stay (product docs; trim catalog tables); the generated skills index splits into plugin skills (stays) and catalog (moves) |

Boundary rule: the plugin never imports from the CLI repo. Today the plugin carries its own copies where it needs shared logic (for example `commander/cowork-plugin/lib/lane-state.js` mirrors `commander/lib/lane.js`, per its header comment), so the cut is mostly clean. Verify with a dependency scan before moving (step 1).

## How the checks change

| Check | Today | After the split |
|---|---|---|
| `npm run check:registry` (`scripts/build-from-registry.js --check`) walks both skill roots, commands, agents, hooks and writes `commander/core/registry.yaml` | one registry for the plugin and the catalog | Split into two: the plugin repo registers plugin skills, agents and hooks only; the CLI repo registers the catalog, commands and vendors. The plugin skill `ccc-browse` already notes that "a marketplace-only install builds the plugin catalog without the repo's ecosystem catalog; that is expected", so the plugin tolerates a missing catalog |
| `npm run check:contract` (`check-product-contract.js`) reads `contract.json`, including `ecosystem_skills`, and compares to the filesystem | one contract | Plugin contract drops `ecosystem_skills` and `ccc_domains`; the CLI repo gets a contract with them; both repos' docs cite the other's number as a link, not as a count, so the parity checker has nothing to compare across repos |
| `node scripts/check-parity.js` counts "N ecosystem skills" against `skills/` | root `skills/` | Plugin repo: remove the ecosystem rule or require the phrase to be absent from plugin docs; CLI repo keeps it. Update `scripts/parity-allowlist.json` |
| `node scripts/audit-counts.js --check` and `CLAUDE.md` release-check marker ("20 vendor") | requires the vendor literal | Marker splits: plugin repo keeps "8.x.y" only; the vendor literal moves to the CLI repo's own instruction file |
| `npm run check:version` | one version across root, plugin, mirror, hosted server | Plugin repo keeps its own; CLI gets an independent version (SemVer, own tags). Document the compatibility matrix (CLI version to minimum plugin version) |
| `bin/doc-sync.js` and `npm run docs:sync:check` (`ccc-doc-sync/sync.js`) | one docs set | Each repo syncs its own docs; docs that quote both sides link across |
| Release gate `scripts/release-gate.js` | one gate (tag = `package.json` = CHANGELOG, all checks, lint, tests, mirror drift) | Plugin gate stays and loses vendor and catalog checks; CLI gets a copy trimmed to its checks. `prepublishOnly` and the npm `files` list (`bin/`, `skills/`, ...) move to the CLI repo. `package.json` name `cc-commander` stays with the CLI package |
| `test:ci` and `npm test` | one list of about 40 test files | Partition by owner; plugin repo keeps plugin, hooks, Codex-drift, directory-mirror and gate tests |
| Vendor sync | weekly workflows open PRs against the monorepo | Run in the CLI repo only; plugin repo never sees vendor churn. `weekly-vendor-sync.sh` keeps its Discord hook |
| Directory mirror | built from `commander/cowork-plugin/` in the monorepo | Unchanged by the split; once the plugin repo is lean, submitting the plugin folder directly (plugin path) becomes an option and the mirror can be retired |

## Migration steps

Each step is reversible until step 6.

1. **Dependency scan (read-only).** List every import and path reference from plugin and Codex mirror into `skills/`, `commands/`, `prompts/`, `templates/`, `compatibility/`, `bin/` and the CLI `commander/*.js`; list every script, workflow and test that touches both sides. Output a table in the tracking issue. Gate: the plugin has zero imports into the CLI side (the `ccc-learn`, `ccc-browse`, `ccc-domains`, `ccc-mobile` and `ccc-upgrade` skills reference the catalog by prose and need a decision: link to the CLI repo, or degrade when it is absent).
2. **Freeze and tag.** Tag the last monorepo release (the 8.3 release) as the common ancestor. Announce a short freeze on catalog and CLI changes.
3. **Create the CLI repo with history.** Use a history-preserving filter of the moved paths (`git filter-repo` on a fresh clone, not on the working repo). Re-add the 20 submodules at the same pinned commits. Run its test suite in CI before anything is deleted from the monorepo.
4. **Stand up CI in the CLI repo.** Copy the workflows (CI, release, vendor-update, upstream-sync, discovery-scan), pin actions by SHA as today, trim the release gate, and add the CLI-side registry and contract checks. Verify `npm test` and the installers on a clean machine.
5. **Split the checks in the plugin repo (still containing the moved files).** Land the reduced registry, contract, parity and gate changes first so they pass both with and without the catalog present. This is the safety rail.
6. **Remove the moved paths from the plugin repo.** One PR: delete the paths in the table, update README, CONTRIBUTING, AGENTS.md, CLAUDE.md, `docs/DIRECTORY.md`, SKILLS-INDEX, `package.json` (`files`, scripts), and replace catalog counts with links. CLAUDE.md's `ecosystem_skills` note and the "20 vendor" marker are rewritten in the same PR. Run the plugin gate, `build:codex`, the mirror build, `claude plugin validate --strict` on both.
7. **Cross-link and redirect.** README in each repo points to the other; the plugin README install section is unchanged; the CLI README says which plugin versions it works with. Old issue and discussion links keep working because the plugin repo keeps the name.
8. **Ship.** Release the plugin as a minor version and the CLI as its own first release; note the move in both CHANGELOGs; update site and docs install snippets that mention the CLI repo path.
9. **Clean up.** Archive the old branches that touched moved paths; remove the weekly vendor workflows from the plugin repo (they would otherwise fail on a missing `.gitmodules`).

Timing: do not run this inside the 8.3 launch window. Suggested: after the first two weekly reviews of the launch (mid-December), so launch work is not blocked by a repository move.

## Risks and mitigations

| Risk | Hidden cost | Mitigation |
|---|---|---|
| A plugin skill relies on the catalog at runtime | A broken menu for plugin-only installs | Step 1 scan; `ccc-browse` already tolerates the absence; test a marketplace-only install with the catalog absent |
| Counts drift across repos (the parity checker only sees one repo) | Contradictory claims in docs and listing copy | No cross-repo counts in prose; link instead; each repo's checker owns its own numbers |
| Vendor submodule re-pin mistakes | Silent version changes in the catalog | Record SHAs from `git submodule status` before the move and compare after |
| History loss or leaked content in the filtered history | Lost blame, or old secrets in a public repo | Filter on a fresh clone; run the secret scan on the new repo before it is public; keep the monorepo history as the archive |
| Commons Clause files end up in the wrong repo | License confusion | Move the four files together with `docs/LICENSE-INTELLIGENCE.md` and the `NOTICE.md` entries; keep the plugin repo free of them |
| The Codex mirror and the plugin drift because the build script moves | A stale distribution | `build:codex` and the Codex adapter stay in the plugin repo; the drift test stays in the plugin gate |
| Two release gates to maintain | Gate rot in the smaller repo | Generate the CLI gate from the shared list; keep one doc, `RELEASE-CHECKLIST.md`, per repo |
| Contributor and automation confusion (hooks, scripts, docs pointing at old paths) | Failed PRs, broken links | Step 6 grep for every moved path across docs, workflows and skills; redirect notice in CONTRIBUTING |
| Installers (`install.sh`, `install-remote.sh`) fetch from the monorepo URL | Broken one-line installs | Keep a stub at the old URL for one release that forwards to the CLI repo |
| Timing: a move during launch | Lost focus and a fragile first impression | Start after the second weekly review |
| Effort estimate unknown | The scan may reveal more coupling (tests, docs generators) | Treat step 1 as the go/no-go; stop if the plugin has more than a handful of CLI imports |

## Open decisions for Kevin

1. Repository name and owner for the CLI repo, and whether `bin/doc-sync.js` stays with the plugin.
2. Whether `commander/cowork-plugin-pro/` stays or goes (depends on the no-paid-tier cleanup in `revenue.md`).
3. Whether to retire the directory mirror after the split and submit the plugin folder directly.
4. Go/no-go after step 1's dependency scan.
