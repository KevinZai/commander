# Codex Adapter — CC Commander

**Status:** scaffold (v0.1) · 2026-04-24
**Target:** OpenAI Codex CLI ≥ Dec 2025 (Agent Skills release) + Codex Desktop (macOS / Windows)

---

## TL;DR

Codex adopted the **same Agent Skills spec** Anthropic shipped in Dec 2025. CC Commander's plugin is **~85% portable to Codex with mechanical translation** — the skills layer ports 1:1, hooks port 1:1 (same JSON shape, mostly same event names), MCP servers port 1:1 (TOML instead of JSON), and even `AskUserQuestion` exists in Codex CLI.

What does NOT port for free:

- `agents/*.md` (YAML frontmatter, Claude format) → must be translated to `agents/*.toml` (Codex format)
- `.claude-plugin/plugin.json` → `.codex-plugin/plugin.json` (similar shape, different required fields)
- Marketplace metadata (`commander-hub` → Codex marketplace JSON catalog)
- Some niche hook events (Codex has `PermissionRequest`, lacks `Notification` and `PreCompact` — see translate.js)

This adapter contains the translator + the Codex-flavored manifest. **It does not yet generate output** — Phase 2 will wire it into the build pipeline once Kevin approves the strategy.

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
| Hooks | 8 events × 16 handlers | 7 events (PreToolUse/PostToolUse/UserPromptSubmit/SessionStart/SessionEnd/Stop/PermissionRequest) | same | translate.js (event remap) ⚠️ |
| Sub-agent personas | `agents/*.md` (YAML) | `agents/*.toml` (TOML) | same | translate.js (md→toml) ⚠️ |
| MCP servers | `.mcp.json` | `[mcp_servers.<name>]` in config.toml or `.mcp.json` | same | translate.js (json→toml) ✅ |
| Marketplace install | `commander-hub` repo | `marketplace.json` catalog | same | manifest.json + builder ⚠️ |
| AskUserQuestion | ✅ chip picker | ✅ tabbed picker (`ask_user_question`) | ✅ | passthrough ✅ |
| Memory primitive | `CLAUDE.md` | `AGENTS.md` | same | filename swap ✅ |
| Notification hook | ✅ | ❌ | ❌ | drop on translate ❌ |
| PreCompact hook | ✅ | ❌ | ❌ | route to SessionEnd ⚠️ |
| SubagentStop hook | ✅ | ⚠️ partial (subagent results returned to parent) | ⚠️ | drop or fold into Stop ❌ |

**Bottom line:** ~85% of the plugin maps mechanically. The 15% loss is concentrated in lifecycle nuance (`Notification`, `PreCompact`, `SubagentStop`).

---

## File map (what this scaffold contains)

| File | Purpose |
|---|---|
| `README.md` | this file — strategy + capability matrix |
| `manifest.template.json` | Codex `.codex-plugin/plugin.json` template (filled by translator) |
| `translate.js` | Pure-Node translator: Claude plugin tree → Codex plugin tree |
| `hook-event-map.json` | Event name + payload mapping table |

**Not yet implemented (Phase 2):**
- Build script that runs translate.js across all 51 skills + 17 agents + 8 hooks
- CI job that publishes `commander-codex` marketplace entry
- Smoke test against `~/.codex/plugins/`
- Codex marketplace submission (per OpenAI's third-party plugin process — currently community marketplaces only via GitHub URL)

---

## Recommendation

**GO** — but staged:

1. **v4.1 (now):** ship this scaffold. Document Codex compat in README. No actual Codex marketplace presence yet.
2. **v4.2:** wire translate.js into a `npm run build:codex` pipeline. Publish `commander-codex` as parallel marketplace.
3. **v4.3:** unify under one CI build that publishes BOTH Claude + Codex artifacts from a single source tree (`commander/cowork-plugin/`).

Effort estimate for v4.2: **~3 days** (1 day translator polish + 1 day testing in actual Codex CLI + 1 day docs + marketplace setup).

---

## Why this matters for positioning

Kevin's README claim — *"a PM layer for whichever AI coding tool you use"* — is **defensible today** for Codex specifically because OpenAI adopted Anthropic's Agent Skills spec verbatim. It is NOT defensible for Cursor, Windsurf, Cline, or Continue, which use proprietary formats. **Codex is the cheapest second-platform win**.
