# Codex Compatibility Assessment — 2026-04-24

**TL;DR (verdict):** ✅ **CC Commander can ship to OpenAI Codex** — both CLI and Desktop — with **~85% mechanical translation** of the existing plugin. OpenAI adopted Anthropic's Agent Skills spec in Dec 2025, so SKILL.md files port 1:1. `.claude-plugin/plugin.json` becomes `.codex-plugin/plugin.json` with similar shape. Hooks port with minor event remapping. `agents/*.md` → `agents/*.toml` is the biggest mechanical lift (frontmatter parser → TOML emitter; ~50 LOC, already scaffolded). Three Claude-specific hook events drop on the floor: `Notification`, `PreCompact`, `SubagentStop`. Net: **a Codex marketplace listing is realistic for v4.2 in roughly 3 days of focused work**, and Kevin's "PM layer for whichever AI coding tool you use" claim is defensible *for Codex specifically* — though not yet for Cursor/Windsurf/Cline/Continue (those use proprietary formats).

---

## Codex CLI status (research findings)

OpenAI Codex CLI as of April 2026 has shipped a full plugin/extensibility surface that mirrors Claude Code almost feature-for-feature:

- **Plugins** are first-class. `codex plugin marketplace add owner/repo` installs from GitHub. Plugins live under `plugins/<name>/` with required `.codex-plugin/plugin.json` manifest. ([Plugins – Codex Developers](https://developers.openai.com/codex/plugins))
- **Skills** use the Agent Skills spec — the same spec Anthropic released as an open standard in Dec 2025, which OpenAI explicitly adopted. SKILL.md files with YAML frontmatter (`name`, `description`) work in BOTH platforms unchanged. ([Agent Skills – Codex](https://developers.openai.com/codex/skills))
- **Slash commands** still exist for backwards compat (`$CODEX_HOME/prompts/*.md` → typed as `/<filename>`), but **OpenAI explicitly recommends skills over prompts now**. Custom prompts are deprecated. ([Custom Prompts – Codex](https://developers.openai.com/codex/custom-prompts))
- **Hooks** — `hooks.json` at `~/.codex/hooks.json` or per-plugin. Events: `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `StopFailure`, `PreToolUse`, `PostToolUse`, `PermissionRequest`. Same `{ type: "command", command: "<path>" }` schema as Claude Code, same `matcher` regex semantics. ([Hooks – Codex](https://developers.openai.com/codex/hooks))
- **MCP servers** — STDIO + streaming HTTP, configured in `~/.codex/config.toml` under `[mcp_servers.<name>]` OR via `.mcp.json` files inside plugins. Codex auto-launches them at session start. ([Model Context Protocol – Codex](https://developers.openai.com/codex/mcp))
- **Subagents** — TOML files in `~/.codex/agents/` (global) or `.codex/agents/` (project). Each file = one custom agent with `name`, `description`, `model`, `model_reasoning_effort`, `sandbox_mode`, `developer_instructions`. ([Subagents – Codex](https://developers.openai.com/codex/subagents))
- **AskUserQuestion analog** — Codex has `ask_user_question` (a tabbed picker UI in the bottom composer). Single-choice, multiple-choice, and custom-option modes. ([Issue #9926](https://github.com/openai/codex/issues/9926))
- **Memory file** — `AGENTS.md` (Codex's equivalent of `CLAUDE.md`). Loaded automatically at session start. ([AGENTS.md – Codex](https://developers.openai.com/codex/guides/agents-md))

Local install confirmed: `~/.codex/config.toml` exists on Kevin's machine, currently configured with `gpt-5.5 / xhigh effort`, 5 MCP servers (github, github-gn, linear, linear-gn, n8n-mcp, obsidian-vault, context7, chrome_devtools), and a hooks.json wired to Superset notification scripts.

## Codex Desktop status (research findings)

Codex Desktop ships on **macOS and Windows** as of 2026. ([App – Codex](https://developers.openai.com/codex/app))

- Plugins install via `/plugins` UI inside Desktop — tabbed marketplace browser, inline enable/disable, marketplace add via GitHub URL. Mirrors Cowork Desktop's `/plugin` command surface.
- Computer Use plugin is bundled as the headline first-party plugin (similar role to Claude Code's MCP servers).
- One known caveat: Issue #16783 reports the Desktop UI hides Plugins for some users while CLI marketplace works — early-stage rough edges still being smoothed.
- **No "Codex Desktop is unreleased" gap** — it's shipped, sells the same multi-thread + worktree story Cowork Desktop sells, and the marketplace works today.

## Agents SDK note

OpenAI ships an "Agents SDK" comparable to (but architecturally different from) Anthropic's Claude Agent SDK. Key differences relevant to CC Commander:

- Claude Agent SDK uses **subagents + hooks + MCP** (CCC builds on this primitive directly).
- OpenAI Agents SDK uses **handoffs + guardrails** (when you hand off to a specialist, the parent is *done* — different control-flow model).
- Codex CLI's subagent system is more Claude-like (parent stays in control, waits for results) — so CCC's brain/hands architecture maps natively to Codex CLI.

**This is favorable for porting:** CCC's mental model already matches Codex CLI's subagent model. We're not fighting an architectural mismatch.

---

## What works today (without code changes)

| Component | Notes |
|---|---|
| All 51 SKILL.md files | Spec is identical (Dec 2025 unification). Drop into `commander-codex/skills/` unchanged. |
| All 8 hook handler scripts (the `.js` files) | They read JSON from stdin and write JSON to stdout — Codex sends the same shape. |
| All MCP server configs (`.mcp.json`) | Codex accepts this shape directly OR converts to `[mcp_servers.*]` TOML. Translator handles both. |
| AskUserQuestion calls in skills | Codex CLI ships `ask_user_question` tool with same semantics. Tabbed instead of chip-row but functionally equivalent. |
| 17 persona voice files (`rules/personas/*.md`) | Plain markdown, no Claude-specific syntax. Loaded by reference from agent body. |
| Plugin marketplace install pattern | `codex plugin marketplace add KevinZai/commander` works identically to `/plugin marketplace add KevinZai/commander`. |

## What doesn't work (would need code/config changes)

| Component | Why broken | Severity |
|---|---|---|
| `.claude-plugin/plugin.json` | Wrong directory + wrong required field set | 🟠 mechanical fix — translator handles it |
| `agents/architect.md` (and all 17 persona agent files) | Codex agents are TOML, not Markdown-with-YAML | 🟠 mechanical fix — translator handles it |
| `Notification` hook handler | No Codex equivalent | 🔴 must move to launchd/daemon or drop |
| `PreCompact` hook handler | No Codex equivalent — closest is `SessionEnd` (compaction itself isn't an event) | 🟡 remap with caveat: behavior changes (fires on session end, not compaction trigger) |
| `SubagentStop` hook handler | Codex returns subagent results to parent in-line, no separate stop event | 🟡 fold logic into parent context or drop |
| Model IDs (`claude-opus-4-7`, `claude-sonnet-4-6`) | Codex doesn't speak Anthropic IDs | 🟢 translator remaps to gpt-5.5 / gpt-5.4 / gpt-5.4-mini |
| `tools: [Read, Glob, Grep, Bash]` per-agent | Codex uses coarser `sandbox_mode` (read-only / workspace-write / danger-full-access) | 🟡 translator emits sandbox_mode comment, manual review needed |
| Marketplace metadata (`commander-hub`) | Codex marketplaces are JSON catalogs, different naming | 🟢 build a `commander-codex-hub` marketplace.json alongside |
| Some Claude-Desktop-specific UX (Plan pane integration, spawn_task sidebar chips) | Codex Desktop doesn't have these primitives | 🟡 acceptable — they'll silently no-op, core flow still works |

## What would need to change

### From OpenAI's side
- **Nothing critical.** The platform is feature-complete enough to ship today.
- **Nice-to-have:** equivalent of Claude's `Notification` event (opt-in OS notification hook) — currently must use launchd or daemon.
- **Nice-to-have:** richer `SubagentStop` event so per-subagent telemetry is possible without parsing parent context.
- **Tracking:** ApplyPatchHandler doesn't emit PreToolUse/PostToolUse for `apply_patch` consistently ([openai/codex#16732](https://github.com/openai/codex/issues/16732)) — limits hook coverage on a major write path. Workaround: rely on `Bash` tool for writes when hook telemetry matters.

### From Commander's side
- **v4.2 (3 days):**
  - Wire `commander/adapters/codex/translate.js` into a build script (`npm run build:codex`) that emits `commander/cowork-plugin-codex/` as a build artifact (~0.5 day).
  - Build smoke test: drop generated plugin into `~/.codex/plugins/`, run `codex` interactively, verify `/skills` lists all 51 skills and `/agents` lists all 17 (~0.5 day).
  - Author `marketplace.json` catalog at repo root for `codex plugin marketplace add KevinZai/commander` (~0.5 day).
  - Fix the 3 incompatible hook handlers (`Notification`, `PreCompact`, `SubagentStop`) — drop or relocate (~0.5 day).
  - Update README + docs to add Codex-specific install instructions (~0.5 day).
  - Submit to Codex marketplace (community marketplace listing, not OpenAI-curated) (~0.5 day).
- **v4.3 (post-Codex launch):** unify Claude + Codex builds from one canonical source tree to avoid drift.

---

## Adapter architecture (scaffolded today)

```
commander/adapters/codex/
├── README.md                  ← strategy + capability matrix (96 lines)
├── manifest.template.json     ← Codex .codex-plugin/plugin.json template
├── hook-event-map.json        ← Claude → Codex event mapping table
└── translate.js               ← pure-Node translator, 7 exported functions:
                                  translateManifest, translateAgent,
                                  translateHooks, translateSkill,
                                  translateMcp, mcpToToml, remapModel
```

**Smoke test result (run during this assessment):**
- Real `architect.md` → valid TOML output (model `claude-opus-4-7` → `gpt-5.5`, effort `xhigh` preserved, body wrapped in `developer_instructions = """..."""`).
- Real `hooks.json` → 8 events in, 6 events out (`Notification` + `SubagentStop` dropped, `PreCompact` remapped to `SessionEnd`, other 5 passthrough).

The translator does NOT yet write files — it's a pure module. Phase 2 wires it into a build pipeline.

```
┌──────────────────────────────────────────────────────────────┐
│ commander/cowork-plugin/   ← canonical source (Claude shape) │
└──────────────────────┬───────────────────────────────────────┘
                       │  npm run build:codex
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ commander/adapters/codex/translate.js                        │
│   • plugin.json    → .codex-plugin/plugin.json               │
│   • agents/*.md    → agents/*.toml                           │
│   • hooks.json     → hooks.json (event remap)                │
│   • skills/        → skills/ (passthrough)                   │
│   • .mcp.json      → .mcp.json (passthrough)                 │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ commander/cowork-plugin-codex/  ← generated build artifact   │
│   .codex-plugin/plugin.json                                  │
│   skills/, agents/, hooks.json, .mcp.json                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Recommendation

**🟢 GO — staged for v4.2.**

| Reasoning | Detail |
|---|---|
| **Strategic** | OpenAI + Anthropic converged on the Agent Skills spec. CC Commander is uniquely positioned to be the FIRST cross-platform PM-layer plugin shipped on both. First-mover signal on dual-platform listings is worth more than the engineering cost. |
| **Tactical** | ~85% of the work is already done — the plugin tree maps almost 1:1. The remaining 15% is mechanical translation, fully scaffolded by `translate.js`. |
| **Cost** | ~3 focused days for v4.2 launch. No new infra. No new dependencies. |
| **Risk** | Low. Skills/hooks specs are stable since Dec 2025. The 3 incompatible hook events (`Notification`, `PreCompact`, `SubagentStop`) are non-load-bearing for the core PM workflow. |
| **Marketing** | Validates the README's "PM layer for whichever AI tool you use" claim — at minimum for Codex. Cursor/Windsurf/Cline/Continue remain a separate (harder) effort. |

**Don't ship until:**
1. `npm run build:codex` produces a clean artifact directory.
2. Smoke test passes: `codex` CLI loads all 51 skills + all 17 agents with no errors.
3. README has a Codex install section as prominent as Cowork Desktop's.
4. The 3 dropped hook events are documented in CHANGELOG so existing telemetry expectations are clear.

**Defer to v4.3:** unifying both builds from a single source tree (currently the plan is to maintain `cowork-plugin/` as canonical and generate `cowork-plugin-codex/` — that's fine for v4.2 but creates drift risk over time).

---

## Sources

- [Plugins – Codex Developers](https://developers.openai.com/codex/plugins) — plugin model overview, marketplace install
- [Build plugins – Codex Developers](https://developers.openai.com/codex/plugins/build) — plugin.json manifest schema, directory layout
- [Agent Skills – Codex Developers](https://developers.openai.com/codex/skills) — SKILL.md spec (Dec 2025 Anthropic-OpenAI shared standard)
- [Hooks – Codex Developers](https://developers.openai.com/codex/hooks) — event list, schema, matcher semantics
- [Slash commands in Codex CLI](https://developers.openai.com/codex/cli/slash-commands) — built-in + custom commands
- [Custom Prompts – Codex Developers](https://developers.openai.com/codex/custom-prompts) — prompts deprecated, use skills
- [Subagents – Codex Developers](https://developers.openai.com/codex/subagents) — TOML agent format, parallel orchestration
- [Model Context Protocol – Codex Developers](https://developers.openai.com/codex/mcp) — MCP server config (TOML + JSON)
- [App – Codex Developers](https://developers.openai.com/codex/app) — Codex Desktop for macOS/Windows
- [Codex GitHub Repo](https://github.com/openai/codex) — open-source CLI source
- [openai/codex Issue #16732](https://github.com/openai/codex/issues/16732) — ApplyPatchHandler hook gap
- [openai/codex Issue #9926](https://github.com/openai/codex/issues/9926) — ask_user_question tool design
- [Codex Plugin Marketplace](https://www.codex-marketplace.com/) — third-party community marketplace
- [AGENTS.md spec](https://agents.md/) — cross-tool memory file standard
- [Composio: Claude Agent SDK vs OpenAI Agents SDK 2026](https://composio.dev/content/claude-agents-sdk-vs-openai-agents-sdk-vs-google-adk) — architecture comparison
- [Awesome Codex Plugins (hashgraph-online)](https://github.com/hashgraph-online/awesome-codex-plugins) — community plugin catalog
- [Awesome Codex Subagents (VoltAgent)](https://github.com/VoltAgent/awesome-codex-subagents) — 130+ subagent examples in TOML
- [Local install verified] `~/.codex/config.toml`, `~/.codex/hooks.json`, `~/.codex/plugins/` — accessed 2026-04-24
