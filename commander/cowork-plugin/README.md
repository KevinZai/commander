# CC Commander

> CC Commander — Guided AI PM for Claude Code. **Primary surface: Claude Code Desktop (aka Cowork Desktop).** Brain/hands architecture with **22 specialist sub-agent personas** (architect · reviewer · builder · security-auditor · debugger · designer · qa-engineer · devops-engineer · data-analyst · content-strategist · product-manager · performance-engineer · researcher · technical-writer · fleet-worker · typescript-reviewer · python-reviewer · go-reviewer · rust-reviewer · java-reviewer · kotlin-reviewer · csharp-reviewer). **84 plugin skills** including `/ccc-codex`. **30 lifecycle hooks × 52 handlers**. The **Commander HUD mod**, **6 plugin workflows** (`/commander:<name>`) and **8 plugin evals**. **2 credential-free bundled MCP servers** (`context7` + `sequential-thinking`) + 16 opt-in via `/ccc-connect`. 467 skills across 11 CCC domains. Works in Claude Code Desktop, Cowork Desktop, CLI, Codex, Cursor, Windsurf, Cline, Continue. MIT-licensed.

> Cowork Desktop and Claude Code Desktop are the same app, two UI modes. Install once — 84 skills, 22 agents, 30 lifecycle hooks (52 handlers) and 2 credential-free bundled MCP servers (+16 opt-in via `/ccc-connect`) appear inside every session automatically.

CC Commander is a guided AI PM plugin that orchestrates your development workflow from planning to shipping. Its `/ccc-*` skills open native chip pickers, delegate to specialist agents, and route into the broader CC Commander ecosystem of 467 skills across 11 domains.

## Installation

**One step (Claude Code CLI 2.1.292 or later):**

```
/plugin install commander --marketplace KevinZai/commander
```

This adds the `commander-hub` marketplace from `KevinZai/commander` and installs the plugin. On older builds:

```bash
/plugin marketplace add KevinZai/commander
/plugin install commander
```

**Claude Code Desktop / Cowork Desktop:**
1. Open **Settings → Plugin Marketplace**
2. Click **Add from GitHub** → enter `KevinZai/commander`
3. Find `commander` → click **Install**, then quit and reopen the app

**Codex CLI:**

```bash
codex plugin marketplace add KevinZai/commander
codex plugin add commander@commander-hub
```

Codex runs the generated mirror in `commander/cowork-plugin-codex/`; review its hooks with `/hooks` inside Codex before they run.

**Update:** `claude plugin marketplace update commander-hub && claude plugin update commander`, then restart. `/ccc-update` walks through it; `/ccc-doctor` diagnoses stale installs.

## Example prompts

```
/ccc what should I do first in this repo?
/ccc-review review this branch against main before I open the PR
/ccc-plan turn this Linear issue into a plan with acceptance criteria
/ccc-doctor
```

`/ccc` reads the project and recommends one next step; `/ccc-review` runs the deep-review workflow on the current branch; `/ccc-plan` interviews you and writes a reviewed plan file; `/ccc-doctor` diagnoses the install.

## What's in the plugin

| Directory | Contents |
|---|---|
| `skills/` | 84 `/ccc-*` skills: 32 model-visible, 52 on demand (`disable-model-invocation: true`); long tables in each skill's `references/` |
| `agents/` | 22 specialist agents on model aliases |
| `hooks/hooks.json` | 30 lifecycle hooks, 52 handlers |
| `mods/commander-hud/` | The Commander HUD mod and its `/ccc-hud` command |
| `workflows/` | 6 dynamic workflows, run as `/commander:<name>` |
| `evals/` | 8 `claude plugin eval` cases |
| `rules/` | The Commander Method (`fable-method.md`), workflow-first and persona voice layers |
| `.mcp.json` | 2 bundled MCP servers |

## New in 8.0.0

- **`/ccc-codex`** — manage the Codex CLI from Claude: doctor, models, plugins and marketplaces, MCP servers, Commander agents as Codex TOML subagents, Codex Cloud tasks, remote control, `codex review`, `codex update`, `config.toml`. Every config write asks first, backs up and verifies with `codex doctor --json`.
- **Commander HUD mod** — a band above the prompt with the Commander Method state, running agents, the session's tool-call budget and an update pill; `/ccc-hud` toggles it without a model turn. Observe-only. Needs Claude Code 2.1.287+ (Desktop 2.1.286+). See `docs/MODS.md` in the repository.
- **Plugin workflows** — `ccc-audit`, `ccc-deep-review`, `ccc-fleet-run`, `ccc-migrate`, `ccc-prompt-audit`, `ccc-release-audit`.
- **Plugin evals** — `claude plugin eval ./commander/cowork-plugin --case ccc-plan --runs 3`; cases: hub, plan, review, doctor, fable, update, suggest, codex.
- **Seven new hook events** — PermissionDenied, PreModelSwitch, PostModelSwitch, TeammateIdle, CwdChanged, DirectoryAdded, FileChanged. WorktreeCreate and WorktreeRemove are deliberately not registered.
- **Models by alias** — `fable` (Fable 5.1), `opus` (Opus 5.5), `sonnet` (Sonnet 5.5), `haiku` (Haiku 5.5); Codex on `gpt-6-astra`, `gpt-6.1-sol`, `gpt-6-sol`, `gpt-6-luna`.

## Core skills

Claude sees 32 skills: the 12 core skills (`ccc`, `ccc-build`, `ccc-review`, `ccc-research`, `ccc-security`, `ccc-plan`, `ccc-testing`, `ccc-suggest`, `ccc-systematic-debugging`, `ccc-design`, `ccc-qa`, `ccc-save-session`) plus the skills their menus open. The other 52 load on demand: their descriptions stay out of context and you open them by typing `/ccc-<name>`; when a prompt matches one, the router offers it as a menu choice. The full, generated table of all 84 skills is in the repository [SKILLS-INDEX.md](https://github.com/KevinZai/commander/blob/main/SKILLS-INDEX.md#the-84-plugin-skills).

| Skill | What it does |
|-------|-------------|
| `/ccc` | Click-first hub — Build · Review · Ship · More |
| `/ccc-suggest` | Reads project state and recommends one starred next step |
| `/ccc-plan` | Spec interview → reviewed plan file with evals |
| `/ccc-build` | Scaffold a web app, API or CLI from a three-question spec |
| `/ccc-review` | Branch review via the `ccc-deep-review` workflow |
| `/ccc-ship` | Pre-flight → release → deploy → rollback |
| `/ccc-xray` | Project health scorecard via the `ccc-audit` workflow |
| `/ccc-codex` | Codex CLI management |
| `/ccc-orchestrate` | Goal file → Codex, Codex Cloud or Sonnet executor → verified acceptance criteria |
| `/ccc-ultracode` | Explains `/effort ultracode` and launches a bundled workflow |
| `/ccc-fleet` | Parallel agents in git worktrees |
| `/ccc-console` | Inline console — Overview · Usage · Safety · Memory · History · Launch |
| `/ccc-fable` | Arm the 12-gate Commander Method |
| `/ccc-connect` | Opt-in MCP connector setup |
| `/ccc-doctor` · `/ccc-update` | Diagnose and update the install |

## Specialist agents

22 specialist agents. Skills delegate to them automatically; each has a voice layer in `rules/personas/`.

| Model alias | Agents |
|---|---|
| `fable` (Fable 5.1) | architect, security-auditor |
| `opus` (Opus 5.5) | builder, reviewer, debugger, designer, qa-engineer, devops-engineer, data-analyst, product-manager, performance-engineer, researcher, and the typescript, python, go, rust, java, kotlin and csharp reviewers |
| `sonnet` (Sonnet 5.5) | content-strategist, technical-writer, fleet-worker |

## Lifecycle hooks

30 lifecycle hooks with 52 handlers run automatically throughout every session:

| Event | Handlers | Count |
|-------|----------|-------|
| `SessionStart` | `session-start-orchestrator`, `license-check`, `git-truth`, `update-nudge`, `console-autopen` | 5 |
| `SessionEnd` | `session-save`, `session-end` | 2 |
| `UserPromptSubmit` | `suggest-ticker`, `intent-classifier`, `context-warning`, `context-guard`, `user-prompt-submit`, `skill-runs-logger` | 6 |
| `UserPromptExpansion` | `prompt-expansion-guard` | 1 |
| `PreToolUse` | `cost-tracker`, `cost-ceiling-enforcer`, `secret-leak-guard`, `config-protection`, `doc-file-warning`, `git-push-reminder` | 6 |
| `PostToolUse` | `knowledge-capture`, `mission-control-feed`, `console-log-warn`, `pr-link-notify` | 4 |
| `PostToolUseFailure` | `post-tool-failure-logger` | 1 |
| `PostToolBatch` | `knowledge-capture` | 1 |
| `Stop` | `suggest-lightweight`, `clickability-watch`, `intent-classifier` | 3 |
| `StopFailure` | `stop-failure-handler` | 1 |
| `Notification` | `fleet-notify` | 1 |
| `PreCompact` | `pre-compact` | 1 |
| `PostCompact` | `post-compact-recovery` | 1 |
| `SubagentStart` | `subagent-start-tracker` | 1 |
| `SubagentStop` | `subagent-stop`, `agent-run-logger` | 2 |
| `PermissionRequest` | `permission-gate`, `mission-control-feed` | 2 |
| `PermissionDenied` | `permission-denied-logger` | 1 |
| `PreModelSwitch` | `model-switch-logger` | 1 |
| `PostModelSwitch` | `model-switch-logger` | 1 |
| `TeammateIdle` | `fleet-telemetry` | 1 |
| `CwdChanged` | `session-state-sync` | 1 |
| `DirectoryAdded` | `session-state-sync` | 1 |
| `FileChanged` | `stale-claude-md-nudge` | 1 |
| `Elicitation` | `elicitation-logger` | 1 |
| `ElicitationResult` | `elicitation-result-handler` | 1 |
| `TaskCreated` | `task-tracker` | 1 |
| `TaskCompleted` | `task-tracker` | 1 |
| `ConfigChange` | `config-protection` | 1 |
| `InstructionsLoaded` | `stale-claude-md-nudge` | 1 |
| `Setup` | `license-check` | 1 |
| **TOTAL** | **30 events** | **52 handlers** |

`WorktreeCreate` and `WorktreeRemove` are not registered: a hook on either replaces git's own worktree handling. The Codex mirror wires 11 of Codex's 12 events (Interrupt has no Claude source).

## Data & network

Commander runs locally: hooks, skills and state live on your machine, and no credentials are read. Outbound calls:

| Call | Default | Control |
|------|---------|---------|
| Anonymous usage events (anon id, hook/skill names, timings) to `mcp.commanderplugin.com`, fallback `commander-mcp.fly.dev` | Off | Opt in with `CCC_TELEMETRY=1` or `"telemetry": true` in `~/.commander/config.json`; `CCC_TELEMETRY=0` forces off (all three variables accept `1`/`true`/`yes`/`on` and `0`/`false`/`no`/`off`, any case) |
| Update check at session start (GET of the public `plugin.json` on GitHub) | On | `CCC_OFFLINE=1` (or `true`/`yes`/`on`) disables it |
| CI status lookup via your own `gh` login (`gh run list`) | Off | Opt in with `CCC_CI_TICKER=1` (or `true`/`yes`/`on`) |
| Bundled MCP servers (`context7`, `sequential-thinking`) start through `npx -y`, which fetches each package from the npm registry when Claude Code first launches it (servers start with the session, not on first use) | On | Remove the server from `.mcp.json` |
| Bundled Context7 MCP queries `context7.com` | Only when used | Remove the server from `.mcp.json` |

`CCC_OFFLINE=1` (or `"offline": true` in `~/.commander/config.json`) blocks every call above that Commander makes itself, and makes `ccusage` use cached pricing. `ccc doctor` prints the current mode. `"disableAllHooks": true` in `settings.json` turns every hook off.

## Connected tools

`.mcp.json` bundles two credential-free servers — `context7` (library docs) and `sequential-thinking`. Everything else is opt-in via `/ccc-connect` with your own credentials: Linear, GitHub, Slack, Gmail, Google Calendar, Tavily, Google Drive, Supabase, Figma, Playwright, Notion and more. Skills use `~~category` placeholders (for example `~~project tracker`) for whatever tool you connect. See [CONNECTORS.md](CONNECTORS.md) and [MCP.md](MCP.md).

Every skill works standalone; connected tools make it faster and more complete.

## Knowledge compounding

The `knowledge-capture` hook records Write/Edit file touches to `auto-captures.jsonl` under `~/.claude/commander/`. `/ccc-knowledge` searches and browses what has accumulated:

```
/ccc-knowledge search "rate limiting"
/ccc-knowledge recent
```

## Developing

```bash
claude plugin validate ./commander/cowork-plugin --strict
claude plugin eval ./commander/cowork-plugin --case ccc-hub --runs 3
```

Plugin skills follow `docs/PROMPT-STANDARD.md` in the repository. After adding a skill, re-render the skill table with `node scripts/render-skill-table.js --write SKILLS-INDEX.md` from the repository root.

## Privacy

Commander's privacy policy is at [commanderplugin.com/privacy](https://commanderplugin.com/privacy); it describes what the plugin stores locally and what, if anything, leaves your machine.

## Support

Report bugs and ask questions in [GitHub issues](https://github.com/KevinZai/commander/issues).

## Attribution

CC Commander by [Kevin Z](https://kevinz.ai) ([@kzic](https://x.com/kzic)) · [github.com/KevinZai/commander](https://github.com/KevinZai/commander) · MIT

Orchestrates: [gstack](https://github.com/garrytan/gstack) by Garry Tan · [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) by Every Inc · [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent
