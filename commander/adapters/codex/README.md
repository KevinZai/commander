# Codex Adapter — CC Commander

**Status:** runtime-hardened translator (v0.3) · 2026-07-22
**Target:** OpenAI Codex CLI + Codex Desktop (macOS / Windows)

---

## TL;DR

Codex adopted the **same Agent Skills spec** Anthropic shipped in Dec 2025. CC Commander's plugin is **~90% portable to Codex with mechanical translation**. The skills layer ports 1:1 (plus four small, conservative prose transforms — see below), MCP servers port 1:1, agents are translated from Claude markdown frontmatter to Codex TOML, and hooks are filtered through the verified 10-event Codex hook surface before the generated plugin writes handlers.

What does NOT port for free:

- `agents/*.md` (YAML frontmatter, Claude format) → must be translated to `agents/*.toml` (Codex format)
- `.claude-plugin/plugin.json` → `.codex-plugin/plugin.json` (similar shape, different required fields)
- Marketplace metadata (`commander-hub` → Codex marketplace JSON catalog)
- 13 Claude-only hook events with no Codex equivalent (`SessionEnd`, `Notification`, `PostToolUseFailure`, `PostToolBatch`, `StopFailure`, and the extended-only events — see the capability matrix below)
- `AskUserQuestion` (Claude-only chip picker — skills get a one-line fallback note instead)
- The `Workflow(...)` tool (not packaged for Codex — skills get a one-line fallback note instead)

This adapter contains the translator, runtime hook detector, local telemetry hook, and the Codex-flavored manifest template. The repo build pipeline imports these ESM modules and emits `commander/cowork-plugin-codex/` from the canonical Claude plugin tree.

### Correction (2026-07-22)

A prior version of this adapter (through v0.2) rewrote every `${CLAUDE_PLUGIN_ROOT}` reference in hooks and skill bodies to `${CODEX_PLUGIN_ROOT}` — but **`CODEX_PLUGIN_ROOT` is not a real Codex variable**. That rewrite broke every generated hook command and every skill instruction that referenced the plugin root, on every Codex install. Verified against primary docs (learn.chatgpt.com/docs/hooks): Codex exposes its native `PLUGIN_ROOT`/`PLUGIN_DATA` env vars to plugin hook commands, plus `CLAUDE_PLUGIN_ROOT`/`CLAUDE_PLUGIN_DATA` as documented compatibility aliases "for compatibility with existing plugin hooks." As of v0.3, `${CLAUDE_PLUGIN_ROOT}` is left verbatim everywhere — hooks, skill bodies, the telemetry-init snippet — and it resolves correctly under Codex. The same pass also corrected the hook-event capability list (see below) and added `async` stripping.

## Build

Run the Codex plugin build from the repo root:

```bash
npm run build:codex
```

The build reads `commander/cowork-plugin/`, regenerates `commander/cowork-plugin-codex/`, and writes:

- `.codex-plugin/plugin.json`
- `skills/` with `SKILL.md` files passed through unchanged
- `agents/*.toml`
- `hooks.json` with unsupported lifecycle events dropped
- `.mcp.json` with the bundled MCP servers passed through

Smoke-test the artifact with:

```bash
node --test commander/tests/codex-build.test.js
```

---

## How Codex's plugin model works

**Plugin layout (mirrors Claude almost exactly):**

```
my-plugin/
├── .codex-plugin/plugin.json   # required manifest (vs .claude-plugin/plugin.json)
├── skills/                     # SKILL.md + frontmatter — IDENTICAL spec
├── agents/*.toml               # subagent definitions (NOT .md — TOML format)
├── hooks.json                  # lifecycle hooks (mostly compatible)
├── .mcp.json                   # MCP servers (Codex prefers TOML in config.toml)
├── commands/                   # slash commands (deprecated → use skills)
└── assets/                     # icons, logos
```

**Install commands:**
- `codex plugin marketplace add KevinZai/commander`
- `/plugins` inside Codex Desktop or CLI to browse + install

---

## Capability matrix

Verified 2026-07-22 against primary Codex docs (learn.chatgpt.com/docs/hooks).

| Capability | Claude Code | Codex | Adapter status |
|---|---|---|---|
| Plugin format | `.claude-plugin/plugin.json` | `.codex-plugin/plugin.json` | translate.js ✅ |
| Skills (SKILL.md) | ✅ | ✅ (identical spec since Dec 2025) | passthrough + 4 conservative prose transforms ✅ |
| Slash commands | first-class | deprecated → use skills | skip — already skills ✅ |
| Hooks — supported (10) | `SessionStart`, `SubagentStart`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop` | same | hooks-detector.js + translate.js ✅ |
| Hooks — Claude-only, dropped | `SessionEnd`, `Notification`, `PostToolUseFailure`, `PostToolBatch`, `StopFailure`, `Elicitation`, `ElicitationResult`, `TaskCreated`, `TaskCompleted`, `ConfigChange`, `UserPromptExpansion`, `InstructionsLoaded`, `Setup` | ❌ no equivalent | drop on translate ❌ |
| Hook `"async": true` | ✅ supported | parsed but **skipped** — "asynchronous command hooks aren't supported yet" | stripped on translate; handler still runs, synchronously, with a clamped timeout ⚠️ |
| Env vars in hook commands | `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PLUGIN_DATA` | native `PLUGIN_ROOT` / `PLUGIN_DATA`, plus `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PLUGIN_DATA` as documented compatibility aliases | kept verbatim — no rewrite ✅ |
| Sub-agent personas | `agents/*.md` (YAML) | `agents/*.toml` (TOML) | translate.js (md→toml) ⚠️ |
| MCP servers | `.mcp.json` | `[mcp_servers.<name>]` in config.toml or `.mcp.json` | translate.js (json→toml) ✅ |
| Marketplace install | `commander-hub` repo | `marketplace.json` catalog | manifest.json + builder ⚠️ |
| AskUserQuestion | ✅ chip picker | ❌ no equivalent | one-line fallback note appended per skill file ❌ |
| Workflow(...) tool | ✅ | ❌ not packaged | one-line fallback note appended per skill file ❌ |
| `/ccc-<name>` invocation | `/ccc-<name>` slash form | `$ccc-<name>` skill form | rewritten inside backticks only (URLs/paths untouched) ✅ |
| Memory primitive | `CLAUDE.md` | `AGENTS.md` | filename swap ✅ |
| Hook trust gate | N/A | Installing/enabling a plugin does **not** auto-trust its hooks — Codex skips plugin-bundled hooks until the user reviews and trusts the current hook definition | user action required post-install; documented, not automatable ⚠️ |

**Bottom line:** the hook-event surface is now a straight 10-for-10 mechanical map (up from the prior, unverified 6-8 event subset). The remaining real gaps are two Claude-only capabilities referenced from skill prose (`AskUserQuestion`, `Workflow(...)`) and the Codex-side hook trust gate, which no adapter can bypass.

---

## File map (what this scaffold contains)

| File | Purpose |
|---|---|
| `README.md` | this file — strategy + capability matrix |
| `package.json` | marks this adapter folder as ESM without changing the repo root |
| `manifest.template.json` | Codex `.codex-plugin/plugin.json` template (filled by translator) |
| `translate.js` | ESM translator: Claude plugin tree → Codex plugin tree |
| `hook-event-map.json` | Event name + payload mapping table |
| `hooks-detector.js` | Reads `~/.codex/config.toml`, detects Codex CLI hook support, and validates hook maps |
| `telemetry.js` | Local JSONL telemetry emitter for Commander-on-Codex usage events |
| `ask-bridge.js` | **Experimental, not shipped in the build.** Speculative bridge to Codex Desktop's `tool/requestUserInput` App Server method — every wire-format assumption is unverified against a live Desktop instance and documented inline. Falls back to plain readline. Not wired into `build-codex.js`; do not treat as production-ready. |

See "Status" below for what's shipping vs. still pending.

---

## Runtime hook detection

`hooks-detector.js` returns:

```json
{
  "codexVersion": "0.125.0",
  "supportedEvents": ["SessionStart", "SubagentStart", "PreToolUse", "PermissionRequest", "PostToolUse", "PreCompact", "PostCompact", "UserPromptSubmit", "SubagentStop", "Stop"],
  "droppedFromClaude": ["SessionEnd", "Notification", "PostToolUseFailure", "PostToolBatch", "StopFailure", "Elicitation", "ElicitationResult", "TaskCreated", "TaskCompleted", "ConfigChange", "UserPromptExpansion", "InstructionsLoaded", "Setup"]
}
```

The translator uses this detector before writing hooks. If `hook-event-map.json` points at a Codex event that the current runtime does not support, translation throws instead of producing a plugin that silently drops handlers at runtime.

No version threshold is documented for hook-event support, so `supportedEventsForVersion()` returns the verified set unconditionally regardless of the detected Codex CLI version.

Hook commands are deep-cloned during translation. `${CLAUDE_PLUGIN_ROOT}` is kept verbatim (see the "Correction" note above). The one real transform is stripping `"async": true` — Codex parses it but silently skips the handler ("asynchronous command hooks aren't supported yet"), so translation removes the flag and clamps the timeout so the handler still runs, now synchronously.

**Hook trust gate:** installing or enabling this plugin does not automatically trust its hooks. Codex skips plugin-bundled hooks until the user reviews and trusts the current hook definition — there is no adapter-side workaround; this is a one-time manual step on the Codex side after install.

---

## Local telemetry

`telemetry.js` appends one JSON event per line to:

```
~/.codex/commander-telemetry.jsonl
```

Event shape:

```json
{ "ts": "2026-04-26T04:00:00.000Z", "event": "session.lifecycle", "plugin_version": "4.0.0-beta.11" }
```

Supported event helpers:

- `recordSkillInvoked(skill, payload, options)`
- `recordAgentDispatched(agent, payload, options)`
- `recordHookFired(hookEvent, payload, options)`
- `recordMcpToolCalled(tool, payload, options)`
- `recordSessionLifecycle(phase, payload, options)`

No network calls are made. Tests can override the output path with `CODEX_COMMANDER_TELEMETRY_PATH` or the `telemetryPath` option.

`translate.js --telemetry-init` emits a `commander-telemetry-init.toml` snippet:

```toml
[[hooks.SessionStart]]
name = "commander-telemetry"
command = "node ${CLAUDE_PLUGIN_ROOT}/adapters/codex/telemetry.js session SessionStart"
timeout_ms = 1000
```

The build pipeline should write that snippet beside the generated Codex plugin or include it in Codex config assembly. **Caveat:** this snippet is a manual addition to a user's own `~/.codex/config.toml`, not part of the generated plugin tree (`adapters/` is not copied into `commander/cowork-plugin-codex/`) — Codex's plugin-root env vars are documented for commands Codex itself spawns as *plugin* hooks, so a user-level `~/.codex/config.toml` hook may need an absolute path instead. Not resolved here; flagged for follow-up.

---

## Translator CLI

Examples:

```bash
node commander/adapters/codex/translate.js --agent commander/cowork-plugin/agents/architect.md
node commander/adapters/codex/translate.js --hooks commander/cowork-plugin/hooks/hooks.json --verbose
node commander/adapters/codex/translate.js --telemetry-init
```

`--verbose` logs every translation decision to stderr, including model remaps, effort remaps, hook drops, and hook event remaps.

---

## Status

**Shipping today:** `commander/cowork-plugin-codex/` is generated on every `npm run build:codex` and gated in CI by `scripts/check-compat.js` (17 checks, incl. Codex manifest shape, `.agents/plugins/marketplace.json` resolution, and the `AGENTS.md` byte cap) plus `commander/tests/codex-build.test.js`. It is not yet submitted to a standalone Codex marketplace listing — installation today is via the local `.agents/plugins/marketplace.json` entry pointing at the generated tree.

**Still pending:**
1. Publish `commander-codex` as its own listed marketplace artifact (today it's a local marketplace-json entry, not a public Codex marketplace submission).
2. Live smoke test in Codex Desktop against a real installed plugin, including the hook trust-gate flow.
3. Resolve the `telemetry.js` config.toml snippet's plugin-root-vs-absolute-path question (see "Local telemetry" above).

---

## Why this matters for positioning

Kevin's README claim — *"a PM layer for whichever AI coding tool you use"* — is **defensible today** for Codex specifically because OpenAI adopted Anthropic's Agent Skills spec verbatim. It is NOT defensible for Cursor, Windsurf, Cline, or Continue, which use proprietary formats. **Codex is the cheapest second-platform win**.
