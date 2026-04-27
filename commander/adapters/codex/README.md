# Codex Adapter — CC Commander

**Status:** runtime-hardened translator (v0.2) · 2026-04-26
**Target:** OpenAI Codex CLI >= 0.125.0 + Codex Desktop (macOS / Windows)

---

## TL;DR

Codex adopted the **same Agent Skills spec** Anthropic shipped in Dec 2025. CC Commander's plugin is **~85% portable to Codex with mechanical translation**. The skills layer ports 1:1, MCP servers port 1:1, agents are translated from Claude markdown frontmatter to Codex TOML, and hooks are filtered through runtime capability detection before the generated plugin writes handlers.

What does NOT port for free:

- `agents/*.md` (YAML frontmatter, Claude format) → must be translated to `agents/*.toml` (Codex format)
- `.claude-plugin/plugin.json` → `.codex-plugin/plugin.json` (similar shape, different required fields)
- Marketplace metadata (`commander-hub` → Codex marketplace JSON catalog)
- Some niche hook events (Codex has `PermissionRequest`, lacks `Notification`, `PreCompact`, and `SubagentStop`)

This adapter contains the translator, runtime hook detector, local telemetry hook, and the Codex-flavored manifest template. The repo build pipeline imports these ESM modules and emits `commander/cowork-plugin-codex/` from the canonical Claude plugin tree.

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

## How Codex's plugin model works (as of 2026-04)

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

| Capability | Claude Code | Codex CLI | Codex Desktop | Adapter status |
|---|---|---|---|---|
| Plugin format | `.claude-plugin/plugin.json` | `.codex-plugin/plugin.json` | same | translate.js ✅ |
| Skills (SKILL.md) | ✅ | ✅ (identical spec since Dec 2025) | ✅ | passthrough ✅ |
| Slash commands | first-class | deprecated → use skills | same | skip — already skills ✅ |
| Hooks | 8 events × 16 handlers | 8 events (PreToolUse/PostToolUse/UserPromptSubmit/SessionStart/SessionEnd/Stop/StopFailure/PermissionRequest) | same | hooks-detector.js + translate.js ✅ |
| Sub-agent personas | `agents/*.md` (YAML) | `agents/*.toml` (TOML) | same | translate.js (md→toml) ⚠️ |
| MCP servers | `.mcp.json` | `[mcp_servers.<name>]` in config.toml or `.mcp.json` | same | translate.js (json→toml) ✅ |
| Marketplace install | `commander-hub` repo | `marketplace.json` catalog | same | manifest.json + builder ⚠️ |
| AskUserQuestion | ✅ chip picker | ✅ tabbed picker (`ask_user_question`) | ✅ | passthrough ✅ |
| Memory primitive | `CLAUDE.md` | `AGENTS.md` | same | filename swap ✅ |
| Notification hook | ✅ | ❌ | ❌ | drop on translate ❌ |
| PreCompact hook | ✅ | ❌ | ❌ | drop on translate ❌ |
| SubagentStop hook | ✅ | ⚠️ partial (subagent results returned to parent) | ⚠️ | drop on translate ❌ |

**Bottom line:** ~85% of the plugin maps mechanically. The 15% loss is concentrated in lifecycle nuance (`Notification`, `PreCompact`, `SubagentStop`).

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

**Still pending:**
- CI job that publishes `commander-codex` marketplace entry
- Smoke test against `~/.codex/plugins/`
- Codex marketplace submission (per OpenAI's third-party plugin process — currently community marketplaces only via GitHub URL)

---

## Runtime hook detection

`hooks-detector.js` returns:

```json
{
  "codexVersion": "0.125.0",
  "supportedEvents": ["SessionStart", "SessionEnd", "UserPromptSubmit", "Stop", "StopFailure", "PreToolUse", "PostToolUse", "PermissionRequest"],
  "droppedFromClaude": ["Notification", "PreCompact", "SubagentStop"]
}
```

The translator uses this detector before writing hooks. If `hook-event-map.json` points at a Codex event that the current runtime does not support, translation throws instead of producing a plugin that silently drops handlers at runtime.

`PreCompact` is intentionally dropped. Codex has `SessionEnd`, but it does not carry the same compaction semantics.

Hook commands are deep-cloned during translation and `${CLAUDE_PLUGIN_ROOT}` is rewritten to `${CODEX_PLUGIN_ROOT}`.

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
command = "node ${CODEX_PLUGIN_ROOT}/adapters/codex/telemetry.js session SessionStart"
timeout_ms = 1000
```

The build pipeline should write that snippet beside the generated Codex plugin or include it in Codex config assembly.

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

## Recommendation

**GO** — but staged:

1. **v4.1 (now):** ship this scaffold. Document Codex compat in README. No actual Codex marketplace presence yet.
2. **v4.2:** publish `commander-codex` as a parallel marketplace artifact from the `npm run build:codex` output.
3. **v4.3:** unify under one CI build that publishes BOTH Claude + Codex artifacts from a single source tree (`commander/cowork-plugin/`).

Effort estimate for v4.2: **~3 days** (1 day translator polish + 1 day testing in actual Codex CLI + 1 day docs + marketplace setup).

---

## Why this matters for positioning

Kevin's README claim — *"a PM layer for whichever AI coding tool you use"* — is **defensible today** for Codex specifically because OpenAI adopted Anthropic's Agent Skills spec verbatim. It is NOT defensible for Cursor, Windsurf, Cline, or Continue, which use proprietary formats. **Codex is the cheapest second-platform win**.
