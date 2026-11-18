# Plugin directory submission

Status: prepared for review, nothing submitted. Every external step below needs Kevin (or a paid claude.ai account owner). Requirements were read from public Anthropic docs on 2026-11-18; they move, so re-read the checklist page before submitting.

Sources: [Publish and distribute a plugin](https://code.claude.com/docs/en/plugins/publish), [plugin pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist), [Submit your plugin](https://claude.com/docs/plugins/submit), [component support by app](https://claude.com/docs/plugins/platform-support), [plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces), [plugins reference](https://code.claude.com/docs/en/plugins-reference), and the README of the anthropics/claude-plugins-community repository on GitHub.

## How distribution works today

| Route | Install string | State |
|---|---|---|
| Own marketplace (`commander-hub`, from `.claude-plugin/marketplace.json` at the repo root, plugin source `./commander/cowork-plugin`) | `/plugin install commander --marketplace KevinZai/commander` | Live. This is the launch-day install path. |
| Anthropic directory (claude.ai Discover, Cowork, `/plugin directory` in Claude Code 2.1.287+) | `cc-commander@claude-community` | Not submitted. Needs the mirror repo and a portal submission. |
| `claude-plugins-official` | n/a | Not open to portal submissions; only through an Anthropic partner contact. Not pursued. |

The community marketplace is a read-only mirror: `anthropics/claude-plugins-community` is synced nightly from Anthropic's internal review pipeline, and pull requests against it are closed automatically. The only way in is the portal at claude.ai/directory/manage (short link in that README: clau.de/plugin-directory-submission). So "submit to the directory" and "submit to the community marketplace" are one action. Once approved, users can also run `claude plugin marketplace add anthropics/claude-plugins-community` and `claude plugin install cc-commander@claude-community`.

## Why a mirror repo

The directory reads one plugin folder from a GitHub repository (the folder that holds `.claude-plugin/plugin.json`; a subfolder is allowed through the "Plugin path" field). Commander keeps the plugin in `commander/cowork-plugin/` inside a monorepo. The repo already ships a generated mirror for the listing:

- Builder: `scripts/build-directory-mirror.js` (`npm run build:directory-mirror`); documented in `docs/DIRECTORY.md`; transforms covered by `tests/directory-mirror.test.js`.
- Publisher: `.github/workflows/publish-directory-mirror.yml` pushes a fast-forward commit to `KevinZai/cc-commander-plugin` after a green Release run for a `v*` tag. It needs the public repo to exist and a `MIRROR_PUSH_TOKEN` secret; until then the publish job fails on purpose.
- The mirror renames the plugin to `cc-commander` (display name "CC Commander"), rewrites the `commander:` namespace to `cc-commander:`, writes a listing description with counts read from disk (and fails if it says "Fable"), drops the nested mod manifest and `tests/`, and adds `LICENSE` plus a marker file.

Alternative: submit `KevinZai/commander` with plugin path `commander/cowork-plugin`. The portal's size limits (50 MiB archive, 10,000 files) apply to the whole repository, and the repo is far past the file limit (the ecosystem catalog under `skills/` alone is over 1,400 files). The mirror stays the right choice, and it is one more reason for `cli-split-plan.md`.

## Pre-submission checklist mapped to the repo

Evidence: the mirror was built to a scratch directory with `node scripts/build-directory-mirror.js --out <dir>` (376 files, 3.8 MB, no file over 256 KiB, no symlinks) and validated with the CLI (`claude` 2.1.327). Portal items can only be confirmed by the portal's Validate button, which needs a Claude account; they stay todo until run.

### Repository and folder layout

| Item | State | Evidence |
|---|---|---|
| Folder contains `.claude-plugin/plugin.json` | done | Source `commander/cowork-plugin/.claude-plugin/plugin.json`; mirror has it at the root. |
| One plugin per submission | done | The mirror holds one plugin. The Codex mirror and `cowork-plugin-pro` are not in it. |
| Everything a hook, script or MCP command uses sits inside the plugin folder; no `..` out of it | todo | No requires climb out of the plugin in a source search (the doctor's `../../../lib/...` requires resolve to the plugin's own `lib/`). Confirm with the portal ("Command reaches above the plugin folder"). |
| Regular files only (no symlinks, submodules, LFS pointers) | done | No symlinks in the built mirror; no submodule file in it. |
| No `.DS_Store`, `Thumbs.db`, `desktop.ini`, `__MACOSX` | done | The builder skips `.DS_Store`; none in the mirror. |
| Cross-platform file names; no `export-ignore`, `export-subst` or content-rewriting filters in the attributes file | todo | None in the mirror tree; the new mirror repo must stay clean too. Confirm in the portal. |
| Repo under 50 MiB, 10,000 entries, each plugin file under 5 MiB | done | Mirror is 3.8 MB, 376 files. |

### Manifest and name

| Item | State | Evidence |
|---|---|---|
| `name` lowercase, hyphens, 64 chars or less | done | `cc-commander` in the mirror. |
| Distinctive name, not reserved, not "official" | todo | Portal checks "Name is taken", brand match, look-alikes. The name is permanent once published. |
| `displayName`, `author.name` in one writing system | done | "CC Commander", "Kevin Zicherman". |
| `description`, `author`, `version` set | done | All present; `version` (8.1.6 today) must rise each release; the release gate enforces tag = `package.json` = top CHANGELOG entry. |
| `homepage` parses as a URL, `repository` set | done | `https://commanderplugin.com`; the mirror rewrites `repository` to `https://github.com/KevinZai/cc-commander-plugin`. |
| Component keys spelled per the reference | done | `claude plugin validate --strict` passes. |
| `hooks/hooks.json` not also listed in `plugin.json` | done | The manifest `hooks` entry points to the mod's own hooks file; no warning. |

### README and license

| Item | State | Evidence |
|---|---|---|
| README of 40 words or more at the plugin root | done | `commander/cowork-plugin/README.md`, about 1,600 words, with a "Data & network" table. |
| LICENSE file or `license` in the manifest | done | `"license": "MIT"`; the mirror adds the repository `LICENSE`. |
| Clean license story for a reviewer | todo | A Commons Clause covers four Intelligence Layer files (`commander/dispatcher.js`, `knowledge.js`, `skill-browser.js`, `project-importer.js`; see `docs/LICENSE-INTELLIGENCE.md`). They are CLI files, not in the plugin mirror, so the plugin is plain MIT. Say so in the submission notes; the CLI split makes it structural. |

### Files in the plugin folder

| Item | State | Evidence |
|---|---|---|
| Non-image files under 256 KiB | done | None over in the built mirror. |
| 512 files or fewer | done | 376. |
| Only text, SVG, PNG/JPEG/GIF/WebP, fonts | done | Unusual names are text: `skills/ccc-babysit-pr/scripts/pr-wait` (shell script), `LICENSE`, `evals/` ignore file, marker file. Re-confirm in the portal. |
| README images use Markdown syntax | todo | The README has no images yet (see screenshots). |
| MCP servers declared with `command`+`args` or `url`; no `.mcpb`/`.dxt` | done | `.mcp.json` has two stdio servers. |

### What the plugin runs and connects to

| Item | State | Evidence |
|---|---|---|
| Pin every `npx`/`uvx` package to an exact version | done | `@upstash/context7-mcp@4.3.0`, `@modelcontextprotocol/server-sequential-thinking@1.0.0`. Expected: held for a reviewer ("Runs a pinned npx or uvx package"), not rejected. |
| No registry config (`.npmrc`, `bunfig.toml`, `uv.toml`) | done | None in the mirror. |
| No real credentials in any file; secrets via `userConfig` with `sensitive: true` | todo | Run a secret scan over the built mirror. `lib/secret-patterns.json` contains key-shaped regexes by design; explain it in the notes. |
| No ambient credential read and sent to a server | done | README: no credentials are read; telemetry carries an anonymous id, hook and skill names, timings. |
| `.mcp.json` valid; remote servers over https | done | Only stdio servers are bundled; the 16 opt-in connectors are not in `.mcp.json`. |
| Hook and MCP commands use full `${CLAUDE_PLUGIN_ROOT}` paths, no inline programs | todo | `hooks.json` uses the quoted `node "${CLAUDE_PLUGIN_ROOT}/hooks/x.js"` form (CLAUDE.md). Confirm no "Command path can't be followed" finding. |
| Hook scripts avoid launchers, installs, other variables and calls to other files | todo | Expect a hold: handlers import sibling modules (the PreToolUse dispatcher imports the cost, ceiling and secret handlers), reported as "Scripts the validator couldn't follow". Plan for a reviewer read. |
| No lockfile install at the plugin root | done | No `package.json` at the mirror root. |

### Hooks, skills, agents

| Item | State | Evidence |
|---|---|---|
| `hooks/hooks.json` valid, documented events and types only | done | Strict validate passes; the counts are in `commander/contract.json`. |
| Valid YAML front matter, text `description` | done | `node scripts/audit-frontmatter.js --check`; strict validate passes. |
| Exact component folder and file names | done | `skills/<name>/SKILL.md`, `agents/`, `hooks/`. |
| Mod under `modules` | note | `mods/commander-hud/hooks/hooks.json` names a hooks module; the validator notes the directory has rules for mod code that the CLI does not apply. Directory lists mods for Claude Code only. The HUD is observe-only. Expect a reviewer read. |

### Validation

| Item | State | Evidence |
|---|---|---|
| `claude plugin validate ./commander/cowork-plugin --strict` | done | Passed 2026-11-18. |
| `claude plugin validate <mirror> --strict` | done | Passed on the built mirror; re-run on the exact mirror commit. |
| Install from a local marketplace, start a session | todo | Needs Kevin's machine, then `/ccc-doctor`. |
| `claude plugin eval` | todo | Eight eval cases exist under `commander/cowork-plugin/evals/`; a run spends model usage, so it needs Kevin's go-ahead. |
| Portal Validate | todo | Needs a paid claude.ai plan and the mirror repo. |

### Security and data handling (portal "Data handling" step and the scan)

Answers drawn from the README "Data & network" table and `PRIVACY.html`:

| Question | Answer from the repo |
|---|---|
| Reads or stores personal data | Local state only, under `~/.claude/commander/` (session notes, knowledge base). No credentials read; the secret-leak guard blocks key literals in tool input. |
| Sends data to other services | Off by default: usage events (anonymous id, hook and skill names, timings) to `mcp.commanderplugin.com`, only when `CCC_TELEMETRY=1`. On by default: a session-start update check (GET of the public `plugin.json`; `CCC_OFFLINE=1` disables it) and the bundled MCP servers fetched through `npx -y` from npm. Opt-in: CI status through the user's own `gh` login. |
| Retention | Not stated in the repo. Kevin to confirm the analytics retention setting before answering. |
| Intended for people under 18 | No; a developer tool. |
| Safety posture | The permission gate denies every force-push and remote-delete form; PR workflows open drafts and merge only through the full gate; `"disableAllHooks": true` turns all hooks off. |

The scan flags undisclosed behavior. Keep the README and these answers identical.

### Listing, screenshots, copy

| Item | State | Evidence |
|---|---|---|
| Short and long listing copy | todo (drafted) | `listing-copy.md`. The mirror builder writes its own description; keep the two aligned and free of the word "Fable". |
| Icon (can be set once) | todo | Candidates: `assets/marketplace/composer-icon.svg`, `assets/marketplace/logo.svg`. Kevin picks. |
| Screenshots | todo | Not a portal requirement, but the listing shows the README. Existing: `docs/assets/screenshots/main-menu.png`, `dashboard.png`, `cockpit-footer.png`, `cockpit-status.png`, plus GIFs. Needed: one capture each of `/ccc-start`, the `/ccc-xray` scorecard, the `/ccc-plan` plan pane, a `/ccc-build` verified scaffold, a `/ccc-review` report and the `/ccc-ship` GO/CAUTION/NO-GO scorecard. `scripts/marketplace-screenshot-capture.js` exists. |
| Support, docs, privacy, terms URLs | done | All four are in `plugin.json`; check the pages match the README. |
| Directory Policy and Terms read and accepted | todo | Kevin, in the portal (four acknowledgements). |

## What each surface gets

From the component support table: skills load everywhere; agents and hooks load in Cowork and Claude Code, not claude.ai chat; a top-level `bin/` cannot be installed in chat or Cowork (Commander has none); mods are listed for Claude Code only. Lead the listing with skills and treat agents, hooks and the HUD as extras.

## Submission runbook (Kevin only)

1. Release 8.3 through the release gate (`npm run release:gate`), tag, let the Release workflow pass.
2. Create the public repo `KevinZai/cc-commander-plugin` with a `main` branch; add the `MIRROR_PUSH_TOKEN` secret to `KevinZai/commander` (fine-grained, contents read/write on the mirror only).
3. Validate the mirror with `--strict`, install from a local marketplace, run `/ccc-doctor`.
4. Capture the six screenshots, add them to the plugin README, rebuild the mirror.
5. Portal: Submit new, Plugin bundle, repository `KevinZai/cc-commander-plugin`, empty plugin path, tracked branch `main`, Validate, fix every Blocks finding, re-validate, check listing details, answer data handling, tick the acknowledgements, keep the push webhook, Submit for review.
6. Expect a reviewer hold (pinned `npx` packages, hook scripts the validator cannot follow, the mod). Answer any "Requested changes" under the Review tab.
7. When a version passes, press Publish (a reviewer publishes the first version by default). Then confirm the README install line for `cc-commander@claude-community` and announce.

Limits: 10 submissions per organization per 24 hours; one submission per repository and folder.

## Todo summary

Directory route: create the mirror repo and secret; pick the icon; capture and embed screenshots; run the portal Validate and fix findings; accept the directory policy; confirm telemetry retention; run the local install and the eval. Before tagging: add a CHANGELOG line for the Code Mode work (see `listing-copy.md`).
