# Platform facts — verified 2026-10-13

Single source of truth for the v8.0.0 revamp. Every model id, event name and
field below was checked on 2026-10-13 against the primary source named in the
section. Prefer this file over memory; when it disagrees with a primary doc,
the primary doc wins and this file gets fixed.

Workers: cite this file instead of re-researching. Do not introduce a model id,
hook event, or frontmatter key that is not listed here without adding it here
first with its source.

---

## 1. Anthropic models (Claude API)

Source: platform.claude.com/docs/en/about-claude/models/overview (fetched 2026-10-13).

| Model | API id (also the alias) | Role | Context / max out | Price in/out per MTok | Default effort |
|---|---|---|---|---|---|
| Claude Fable 5.1 | `claude-fable-5-1` | Demanding reasoning, long-horizon agentic work | 1M / 128K | $10 / $50 | high |
| Claude Opus 5.5 | `claude-opus-5-5` | Long-running agentic coding and knowledge work; recommended default | 1M / 128K | $4 / $20 | medium |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Best speed/intelligence balance | 1M / 128K | $2 / $10 | high |
| Claude Haiku 5.5 | `claude-haiku-5-5` | High-volume, latency-sensitive: classification, extraction, routing | 1M / 128K | from $0.10 / $0.50 | medium |

- Thinking is **adaptive and always on** for Fable 5.1 and Opus 5.5; adaptive for Sonnet/Haiku 5.5. `thinking: {type: "disabled"}` is not accepted at `xhigh`/`max`.
- Effort levels: `low`, `medium`, `high`, `xhigh`, `max`. Max is session-scoped in Claude Code (not saved as default).
- Prompt-cache reads: 2.5% of input price on Fable 5.1; 5% on Opus 5.5 and Sonnet 5.5; 10% elsewhere. Sonnet 5.5 cache reads were cut to $0.10/MTok in Claude Code 2.1.296.
- Retirement commitments: Fable 5.1 not before 2027-09-01; Opus 5.5 2027-09-22; Sonnet 5.5 2027-09-28; Haiku 5.5 2027-10-07.
- Dateless ids are pinned snapshots from the 4.6 generation on; there is no `-latest` alias to use.
- Claude Mythos 5.1 shares the underlying model with Fable 5.1 and is available only to approved organizations. Never default to it.

**Legacy, still served (do not recommend as defaults):** Claude Fable 5 (`claude-fable-5`), Opus 5 (`claude-opus-5`), Sonnet 5 (`claude-sonnet-5`), Haiku 4.5 (`claude-haiku-4-5`), Opus 4.8 / 4.7 / 4.6 / 4.5, Sonnet 4.6.

**Claude Code model aliases** (subagent `model:` frontmatter, `/model`, Agent tool): `fable`, `opus`, `sonnet`, `haiku`, `inherit`, or a full id such as `claude-opus-5-5`. Aliases track the newest model in that line, so prefer aliases in plugin frontmatter and name the full id only in prose that is about a specific model.

### Commander routing (v8 default)

| Tier | Claude | Use |
|---|---|---|
| Deep | `fable` (Fable 5.1) | architecture, migrations, threat models, verification of load-bearing claims |
| Default | `opus` (Opus 5.5) | implementation, review, orchestration |
| Fast | `sonnet` (Sonnet 5.5) | bounded edits, docs, routers, focused reviews |
| Bulk | `haiku` (Haiku 5.5) | classification, routing, extraction, hook-side summaries |

---

## 2. Claude Code (CLI 2.1.296, 2026-10-09)

Sources: code.claude.com/docs/en/changelog, /hooks, /sub-agents, /skills, /plugins-reference, /plugins/mods, /workflows, /plugin-evals (all fetched 2026-10-13).

### 2.1 Features that landed since Commander 7.4.2 (2026-08-01)

| Version | Change Commander must know about |
|---|---|
| 2.1.265 | `--plugin-dir` accepts a folder of plugins |
| 2.1.271 | `userConfig` fields accept `options` (fixed-choice picker); workflow runs pause on usage limits |
| 2.1.283 | `/doctor prompt-audit` audits CLAUDE.md, skills, agents and commands for older-model prompting patterns; `availableModelsMatch`, `deniedModels` managed settings |
| 2.1.284 | Claude Sonnet 5.5 default Sonnet; `/effort ultracode [on|off]` is its own toggle (no longer forces xhigh); interactive sessions start in **auto** permission mode when none is configured; `/mcp reconnect all` |
| 2.1.285 | `claude plugin configure <plugin>`; `claude plugin install --config`; `claude --desktop`; background Bash time limit (30 min default, 2 h max) |
| 2.1.286 | `--bare` connects only named MCP servers; `/hooks` lists configured hooks by event; plugin npm sources that are git repos/folders are refused |
| 2.1.287 | **Claude Mods** (plugins can change deeper behavior); `cc-plugin-you-should-know` built-in mod; PreToolUse/PermissionRequest hooks block when matching fails; Opus 4.7+/Fable default to 1M context on Bedrock/Vertex/Foundry |
| 2.1.288 | `/code-review --max-findings <n>|all`; `claude purge`; auto mode ignores a Sonnet 5.5/Opus 5.5 pin for `ANTHROPIC_DEFAULT_SONNET_MODEL` |
| 2.1.289 | Mods: `agent.spawn` for teammates, one agent id across plugin hook events |
| 2.1.290 | Plugin hooks `turn.step` carry `serverToolUses`; `tool.check` carries `agentId` and `ceiling`; `claude plugin validate` lists gating hooks; `claude attach|logs <name>`; TeammateIdle hooks no longer fire from subagents |
| 2.1.292 | `claude plugin install --marketplace <source>`; **Agent tool `effort` parameter**; MCP protocol 2026-07-28; routines publish private artifacts without asking |
| 2.1.293 | Claude Haiku 5.5 (`claude-haiku-5-5`) default Haiku; `agentType` in `subagentStatusLine`; mods `$.tool.register` accepts `isDeferred` |
| 2.1.295 | Hooks: `onFailure: "block"` for command and HTTP hooks; mods `$.ui.notify`; subagents preload at most 32 skills; `claude plugin validate` prints the README install line |
| 2.1.296 | Subagent `autoCompactWindow`; `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL`; Read `allow_large`; `/plugin` notes dropped hooks on plugin-name collisions |

Also current: Workflow tool (dynamic workflows, `/workflows`, `/deep-research`), Routines (`/schedule`), `/loop`, Remote Control, Claude Code on the web (cloud sessions), the Artifact tool (publish, `capabilities`, shared `db` via ArtifactData, comments, Artifact types via `quickstart`), Claude Docs, `ReportFindings`, `/code-review ultra`, Claude Approvals check, auto permission mode, `/effort` slider.

### 2.2 Hook events (33)

`SessionStart`, `Setup`, `UserPromptSubmit`, `UserPromptExpansion`, `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Notification`, `MessageDisplay`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `Stop`, `StopFailure`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `DirectoryAdded`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch`, `Elicitation`, `ElicitationResult`, `SessionEnd`.

New since Commander's 23-event set: `PermissionDenied`, `MessageDisplay`, `TeammateIdle`, `CwdChanged`, `DirectoryAdded`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreModelSwitch`, `PostModelSwitch`.

Handler types: `command`, `http`, `mcp_tool`, `prompt`, `agent`.

Handler fields: `type` (required); `if` (permission-rule syntax, tool events only); `timeout` (default 600 command/http/mcp_tool, 30 prompt, 60 agent; 30 on UserPromptSubmit/PreModelSwitch/PostModelSwitch; 10 on MessageDisplay); `statusMessage`; `once` (skill frontmatter only). `command` only: `command`, `args` (exec form, no shell), `async`, `asyncRewake`, `shell` (`bash`|`powershell`), `onFailure` (`continue` default | `block`, v2.1.295+). Group-level `matcher`.

`hookSpecificOutput.hookEventName` accepted values and their fields:

| Event | Fields |
|---|---|
| PreToolUse | `permissionDecision` allow/deny/ask/defer, `permissionDecisionReason`, `updatedInput`, `additionalContext` |
| PermissionRequest | `decision: {behavior, updatedInput?}` |
| PermissionDenied | `retry: true` |
| PostToolUse | `updatedToolOutput`, `additionalContext` (+ top-level `decision: "block"`, `reason`) |
| PostToolUseFailure, PostToolBatch, UserPromptSubmit, UserPromptExpansion | `additionalContext` (+ top-level decision/reason) |
| Stop, SubagentStop | top-level `decision: "block"`, `reason`; `additionalContext` |
| SessionStart | `additionalContext`, `initialUserMessage`, `sessionTitle`, `watchPaths` (absolute paths), `reloadSkills` |
| SubagentStart, PostModelSwitch | `additionalContext` |
| PreModelSwitch | `permissionDecision` allow/deny/ask (no defer, no additionalContext), `permissionDecisionReason`; `systemMessage` is shown regardless |
| Elicitation, ElicitationResult | `action` accept/decline/cancel, `content` |
| MessageDisplay | `displayContent` |
| CwdChanged, FileChanged | no decision control; top-level `watchPaths` (absolute paths; replaces the dynamic watch list) and `systemMessage` are read, `continue` is discarded |
| DirectoryAdded | no decision control; `systemMessage` only (delivered to Claude for `slash_command`, debug log for `register_repo_root`) |
| TaskCreated | top-level `decision: "block"` cancels |
| TaskCompleted, TeammateIdle | exit 2 or `{continue:false, stopReason}` |
| PreCompact, ConfigChange | top-level `decision` |
| Setup, Notification, SessionEnd, PostCompact, InstructionsLoaded, StopFailure | side effects only (no hookSpecificOutput) |
| WorktreeCreate | **Not a telemetry hook.** Configuring one *replaces* `git worktree` creation: the hook must create the working copy and print its path (http: `hookSpecificOutput.worktreePath`); "if the hook fails or produces no path, worktree creation fails". Commander never registers one |
| WorktreeRemove | **Not a telemetry hook.** Exit 0 "counts as removed" and git cleanup is skipped; JSON output is discarded. Commander never registers one |

The FileChanged watcher starts only when something names a file to watch: seed it from a SessionStart or CwdChanged hook that returns `watchPaths`, or a FileChanged group whose matcher names a file.

Shell-form `command` strings must quote `"${CLAUDE_PLUGIN_ROOT}"` (Desktop installs live under a path with a space). Exec form (`args`) avoids the quoting trap but Codex does not support `args`; Commander keeps shell form so one `hooks.json` mirrors to Codex.

### 2.3 Subagent frontmatter

Required: `name`, `description`. Optional: `tools`, `disallowedTools`, `model` (`sonnet|opus|haiku|fable|inherit|<full id>`), `effort`, `permissionMode` (`default|acceptEdits|auto|dontAsk|bypassPermissions|plan`; ignored for plugin subagents), `maxTurns`, `skills` (first 32 preloaded), `memory` (`user|project|local`), `hooks` (**ignored for plugin subagents**), `mcpServers` (ignored for plugin subagents), `background: true`, `omitClaudeMd: true`, `isolation: worktree`, `color`, `initialPrompt` (ignored for plugin subagents), `autoCompactWindow` (2.1.296), `experimental.cacheTtl` (`5m|1h`). Unrecognized keys are ignored silently (Commander's `persona:` is one such key, kept for its own tests).

### 2.4 Skill frontmatter (SKILL.md)

`name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `background`, `hooks`, `paths`, `shell`, `metadata`, `license`, `compatibility`. Substitutions: `$ARGUMENTS`, `$ARGUMENTS[N]`/`$N`, `$name`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`. Dynamic context: `` !`cmd` `` at line start. Limits: keep SKILL.md **under 500 lines**; `description`+`when_to_use` truncate at 1,536 chars; compaction re-attaches each invoked skill's first 5,000 tokens (25,000 combined).

### 2.5 Plugin manifest (`.claude-plugin/plugin.json`)

Fields: `name` (required, kebab-case; reserved prefixes `claude-`, `anthropic-`, `cc-plugin-`), `displayName`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `metadata`, directory-listing fields (`icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl`, `termsOfServiceUrl`), `defaultEnabled`, `dependencies`, `settings` (only `agent`, `subagentStatusLine`), `userConfig` (types string/number/boolean/directory/file; `options`, `multiple`, `sensitive`, `required`, `default`), `types` (mod `.d.ts`), `channels`, `skills`, `commands`, `agents`, `hooks`, `mcpServers`, `lspServers`, `outputStyles`, `workflows`, `experimental.themes|monitors|evals`. Standard layout adds `workflows/`, `output-styles/`, `themes/`, `monitors/monitors.json`, `bin/` (a plugin with a top-level `bin/` is **not installable from claude.ai or Cowork**), `settings.json`. A `CLAUDE.md` at the plugin root is not loaded and triggers a validate warning. `claude plugin validate [--strict]`, `claude plugin details <name>`, `claude plugin eval`, `claude plugin configure`.

### 2.6 Mods

A mod is a plugin whose `hooks/hooks.json` points to a JavaScript/TypeScript hooks module (`register(on)`), run inside Claude Code. Events include `tool.call`, `tool.check`, `turn.step`, `prompt.autocomplete`, `ui.render` (with `{component}` filters such as `Spinner`); API nouns include `$.ui` (panes, bands, buttons, text fields, `notify`, `invalidate`), `$.tool.register` (`isDeferred`), `$.agent` (`list`, `spawn`, `register`), `$.model.complete` (with `cache: true`), `$.http.fetch`, `$.state`. Mods run in the CLI and the Desktop Code tab (draw there), and run without drawing in VS Code, `claude -p`, cloud sessions. Requires 2.1.287+ (Desktop 2.1.286+). `claude plugin validate` lists a mod's `hooks:` and `calls:`. The bundled `plugin-authoring` skill is the authoring reference; Anthropic samples live in `anthropics/claude-code-playground/claude-code/mods`.

### 2.7 Workflows and evals in plugins

- Plugin `workflows/*.js` (or manifest `workflows`) run as `/<plugin>:<meta.name>`. Script API: `agent()`, `parallel()`, `pipeline()`, `phase()`, `log()`, `args`, `workflow()`; `meta` must be a pure literal; `Date.now()`/`Math.random()` throw. `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` pins every workflow agent's model. Size guideline `workflowSizeGuideline` (small/medium/large/unrestricted). Concurrency ≤ 16 per run.
- Evals: `evals/<case>/case.yaml` (or `prompt.md` + `graders/*.md`), `schema_version: "1.1"`, graders (regex, tool_used, rubric); `claude plugin eval . [--case <glob>] [--runs n] [--ablation none|with-without] [--allow-tools …] [--trust-plugin]`; `claude plugin eval init [--bare <name>]`; manifest `experimental.evals` overrides the directory.

---

## 3. OpenAI Codex CLI (0.162.1, 2026-10-09)

Sources: learn.chatgpt.com/docs/{changelog,models,hooks,config-file/config-reference,agent-configuration/subagents,developer-commands}, developers.openai.com/plugins/build/plugins, github.com/openai/codex/releases, local `codex --help` (all 2026-10-13).

### 3.1 Models

Live probe on 2026-10-13 (`codex exec -m <id> "reply with exactly: OK"`, ChatGPT OAuth): every id below returned OK.

| Id | Positioning | Notes |
|---|---|---|
| `gpt-6-astra` | Flagship, most capable | picker + default since 0.153.4 (2026-09-05); Ultrafast tier on Bedrock |
| `gpt-6.1-sol` | Balanced: near-Astra at lower cost | **catalog default since 0.161.0 (2026-10-07)**; Ultrafast on Pro $500 / eligible Enterprise |
| `gpt-6-sol` | Complex coding and agentic work | 2026-09-22; replaces gpt-5.4 and gpt-5.5 on paid plans |
| `gpt-6-luna` | Fast, focused, high-volume | 2026-09-22; replaces gpt-5.4-mini; Free/Go tier model; up to `max` effort, not `ultra` |
| `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` | Previous generation | still served during the GPT-6.1 rollout; fallback chain only |
| `gpt-5.5` | Previous flagship | **retires from Codex 2026-10-14**; API unaffected |

Retired: `gpt-5.4`, `gpt-5.4-mini` (2026-08-31), `gpt-5.3-codex-spark` (2026-09-14), `gpt-5.3-codex`, `gpt-5.2`.

Reasoning effort (`model_reasoning_effort`): `low`, `medium`, `high`, `xhigh`, `max`, `ultra` (model/client dependent; Ultra uses subagents).

**Commander Codex routing (v8):** deep/verify → `gpt-6-astra`; default executor → `gpt-6.1-sol`; bounded implementation → `gpt-6-sol`; mechanical/bulk → `gpt-6-luna`. Fallbacks: 6-astra → 6.1-sol → 6-sol → 5.6-sol; 6-luna → 5.6-luna.

### 3.2 CLI surface

Subcommands: `exec` (`--json`, `--output-last-message`, `-m`, `--cd`, `--sandbox read-only|workspace-write|danger-full-access`, `--ask-for-approval`, `--skip-git-repo-check`; `exec resume --last`, `exec fork`, `exec review`), `review` (`--uncommitted`, `--base`, `--commit`, `--title`), `resume`, `fork`, `agents` (browse agent sessions on the shared app-server daemon), `plugin` (`add`, `list`, `remove`, `marketplace add|list|upgrade|remove`; `--json`), `mcp` (`list|get|add|remove|login|logout`), `remote-control` (`start|stop|pair`, `--json`), `cloud` (`exec|status|list|apply|diff`), `doctor` (`--json`, `--summary`), `update`, `features` (`list|enable|disable`), `sandbox`, `apply`, `queue`, `archive|unarchive|delete`, `app-server`, `completion`, `login|logout`, `migrate-rollouts`. Global: `-c key=value`, `--enable|--disable <feature>`, `--profile`, `--remote <addr>`.

Slash commands: `/model`, `/plugins`, `/hooks`, `/mcp [verbose]`, `/import` (Claude Code or Cursor setup, projects, up to 50 chats), `/review`, `/goal`, `/agent` (`/subagents`), `/worktree`, `/daemon`, `/usage`, `/tui`, `/voice`, `/copy`, `/rename`.

`codex mcp-server` was removed 2026-09-05; the app server (`codex app-server`, experimental) replaces it.

### 3.3 Hooks (12 events)

`PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`, `SessionStart`, `SubagentStart`, `SessionEnd`, `Interrupt`.

Discovery: `~/.codex/hooks.json`, `<repo>/.codex/hooks.json`, `[hooks]` in `config.toml`, plugin `hooks/hooks.json` (or `hooks` in the plugin manifest), managed `requirements.toml`. Non-managed hooks must be trusted via `/hooks`.

Handler fields: `type` (`command` | `mcp_tool`; `prompt`/`agent` parsed but skipped), `command`, `commandWindows`, `timeout` (seconds; default 600; SessionEnd/Interrupt default 1, max 3), `async` (skipped handlers are not run — translate to sync), `matcher` (ignored on UserPromptSubmit/Stop/Interrupt), `statusMessage`, `additionalContextLimit` (default 2500 tokens), `server`/`tool`/`input` (mcp_tool). **No `args`, `onFailure`, `if`, `once`.**

Env: `PLUGIN_ROOT`, `PLUGIN_DATA`, plus `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PLUGIN_DATA` compatibility aliases. Input: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `model`, `permission_mode`, `turn_id`, plus event fields. Output: `continue`, `stopReason`, `systemMessage`; `hookSpecificOutput.additionalContext` on SessionStart/UserPromptSubmit/SubagentStart/PreToolUse/PostToolUse; `permissionDecision` allow/deny on PreToolUse (no `ask`); `decision {behavior}` on PermissionRequest; top-level `decision: "block"` on UserPromptSubmit/PostToolUse/Stop/SubagentStop.

### 3.4 Subagents (custom agents)

TOML files in `~/.codex/agents/` (personal) or `<repo>/.codex/agents/` (project). Required: `name`, `description`, `developer_instructions`. Optional: `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config`, other config keys. Built-ins: `default`, `worker`, `explorer`. `[agents]` config: `enabled`, `max_concurrent_threads_per_session`, `default_subagent_model`, `default_subagent_reasoning_effort`, `interrupt_message`.

### 3.5 Config (`~/.codex/config.toml`)

Keys: `model`, `model_reasoning_effort`, `model_provider`, `approval_policy` (`on-request` | `never` | granular), `sandbox_mode` (`read-only` | `workspace-write` | `danger-full-access`), `profiles` (`$CODEX_HOME/<name>.config.toml`, `--profile`), `mcp_servers.<id>` (stdio or HTTP with `auth`), `agents.*`, `hooks`, `notify`, `project_doc_max_bytes`, `shell_environment_policy`, `tui.*`, `plugins."<name>@<marketplace>".enabled`, `marketplaces.<name>`, `model_catalog_json`, `review_model`, `features.*`. Feature flags on by default: `apps`, `unified_exec`, `shell_snapshot`, `multi_agent`, `goals`, `remote_plugin`, `personality`, `shell_tool`, `enable_request_compression`, `skill_mcp_dependency_install`, `fast_mode`, worktrees (since 0.156); opt-in: `memories`, `code_mode.enabled`, `rollout_budget.enabled`, `cli_daybreak`, `instant_interrupt`, `network_proxy`, `prevent_idle_sleep`.

### 3.6 Plugins and marketplaces

Portable manifest: root `plugin.json` (`$schema` agent-plugins.org 1.0.0; `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `extensions.com.openai`). Codex overlay: `.codex-plugin/plugin.json` (used when the root manifest has no `extensions.com.openai`). `extensions.com.openai`: `apps`, `hooks` (default `hooks/hooks.json`), `onboardingSkill`, `interface` (`displayName`, `shortDescription`, `longDescription`, `developerName`, `category`, `capabilities`, `defaultPrompt`, `websiteURL`, `privacyPolicyURL`, `termsOfServiceURL`, `brandColor`, `composerIcon`, `logo`, `screenshots`). Skills at `skills/<name>/SKILL.md`; MCP servers in root `mcp.json`. Plugin hooks apply only to manually installed desktop plugins and are untrusted until reviewed.

Marketplace: `<repo>/.agents/plugins/marketplace.json` (legacy-compatible `.claude-plugin/marketplace.json`), personal `~/.agents/plugins/marketplace.json`. Entry: `name`, `source` (`{source: "local", path}` | `url`/`git-subdir` with `ref`/`sha` | `npm`), `policy` (`installation`: `AVAILABLE` | `INSTALLED_BY_DEFAULT` | `NOT_AVAILABLE`; `authentication`: `ON_INSTALL` | on first use), `category` (required). Install cache: `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`; on a live Codex 0.162.1 install `<version>` was the plugin's semver for most entries, a short git sha for one git-sourced entry, and `local` for one unversioned entry. Per-project enable: `[plugins."name@marketplace"] enabled = true` in `.codex/config.toml`.

Skill metadata (source: learn.chatgpt.com/docs/build-skills, fetched 2026-10-27): an optional `skills/<name>/agents/openai.yaml` sets `interface` (`display_name`, `short_description`, `icon_small`, `icon_large`, `brand_color`, `default_prompt`: UI metadata in the ChatGPT desktop app), `policy.allow_implicit_invocation` (default `true`; `false` means Codex does not pick the skill from the prompt, while explicit `$skill` invocation still works) and `dependencies.tools` (tool dependencies such as an MCP server). Commander ships one for each tstack-derived skill with implicit invocation off, the Codex counterpart of `disable-model-invocation: true`.

---

## 4. Deprecations Commander must stop referencing as current

| Was | Now |
|---|---|
| Claude Fable 5 (`claude-fable-5`) as deep tier | Fable 5.1 (`claude-fable-5-1`, alias `fable`) |
| Claude Opus 5 as default | Opus 5.5 (`claude-opus-5-5`, alias `opus`) |
| Claude Sonnet 5 / 4.6 as fast tier | Sonnet 5.5 (alias `sonnet`) |
| Claude Haiku 4.5 as bulk tier | Haiku 5.5 (alias `haiku`) |
| GPT-5.6 Sol / Terra / Luna as Codex tiers | GPT-6 Astra / GPT-6.1 Sol / GPT-6 Sol / GPT-6 Luna |
| `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex*` | retired or retiring; fallback-chain history only |
| Codex "10 hook events" | 12 (adds `SessionEnd`, `Interrupt`) |
| Claude Code "23 hook events" / "20-event hookSpecificOutput union" | 33 events; see §2.2 for the union |
| `codex mcp-server` | removed; `codex app-server` |
| Ultracode "forces xhigh" | `/effort ultracode` is a separate toggle (2.1.284) |
| Plan mode as the default posture | auto permission mode is the interactive default (2.1.284); plan mode on request |
