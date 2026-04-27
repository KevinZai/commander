# Wave 4-A: Codex Desktop GUI Compatibility Specification

**Status:** Research complete — 2026-04-26  
**Author:** Wave 4-A (Codex Desktop GUI Research subagent)  
**Scope:** Read-only research; no translate.js edits made

---

## Executive Summary

Codex Desktop (v26.415, April 2026) exposes a richer GUI surface than the CLI alone. The key finding is that `tool/requestUserInput` — the Codex Desktop equivalent of Claude Code Desktop's `AskUserQuestion` chip picker — is **confirmed available but marked experimental** in the App Server protocol. Slash-command popup pickers for `/model`, `/personality`, and `/plugins` exist natively in the Desktop GUI. No sidebar widget or toolbar plugin API exists as of this research date. The marketplace `interface` object drives install-surface presentation.

**Confidence levels:**
- `ask_user_question` / `tool/requestUserInput` parity — **HIGH** (confirmed in official App Server docs)
- Slash-command picker available in Desktop — **HIGH** (confirmed in official docs + changelog)
- Summary pane / plan pane (no plugin write API) — **MED** (observed feature, no plugin write surface documented)
- Marketplace "Featured" placement via `featured_plugin_ids` in `plugin/list` response — **MED** (listed in App Server API but editorial process undocumented)
- Sidebar widget / toolbar plugin API — **LOW confidence it exists** (not found in any source)

---

## 1. Capability Matrix: Claude Code Desktop GUI vs Codex Desktop

| Primitive | Claude Code Desktop | Codex Desktop | Status |
|---|---|---|---|
| **Forced-choice chip picker** | `AskUserQuestion` — native chip pickers, click-first UX | `tool/requestUserInput` (App Server experimental method) — 1-3 questions, `isOther` for free-form option, tab-navigable in TUI | **Parity exists; experimental flag** |
| **Slash-command popup** | `/ccc-*` skills auto-appear in autocomplete | `/model`, `/personality`, `/plugins`, `/permissions`, `/agent`, `/status` — built-in; plugin skills appear as `/skill-name` in the popup overlay | **Parity exists** |
| **Model picker** | Built-in via `/model` or settings | `/model` → popup with model list (backed by `model/list` App Server API); `hidden` field controls visibility | **Parity exists** |
| **Plan / summary pane** | Plan mode + plan file | Desktop shows task sidebar with plans, sources, artifacts; no plugin write API exposed | **Read-only from plugin perspective** |
| **Approval dialog** | `PermissionRequest` hook | `PermissionRequest` hook (Desktop renders native approval UI); also `approval/respond` via App Server | **Parity exists; richer in Desktop** |
| **Plugin browser sidebar** | N/A (marketplace is Claude UI) | Desktop has `/plugins` command → tabbed plugin browser with enable/disable toggles, install, uninstall, marketplace sources | **Desktop-native; no plugin hook into sidebar** |
| **In-app browser** | N/A | Desktop has Atlas-backed in-app browser; no plugin API to open URLs inside it | **Desktop-only; no plugin hook** |
| **Status bar** | `commander/status-line.js` text output | No documented plugin status bar API; TUI shows session progress | **No equivalent plugin hook** |
| **Memory / context indicator** | Text output only | Desktop shows memory preview badge (v26.415); no plugin write API | **Read-only** |
| **Computer use integration** | N/A | Desktop exposes background computer use (v26.415); no plugin API to trigger it | **Desktop-only** |
| **Thread automations** | N/A | Background automations resume across days; no plugin API | **Desktop-only** |
| **Worktree picker** | N/A | Desktop shows worktree selector; no plugin API | **Desktop-only** |

---

## 2. Key GUI Primitive: `tool/requestUserInput`

### What it is
The App Server exposes `tool/requestUserInput` as an **experimental** method (requires `capabilities.experimentalApi: true` in the `initialize` request). It prompts the user with 1–3 short questions for a tool call. Questions can include `isOther: true` for a free-form "Other" option.

### How it maps to AskUserQuestion
| Claude Code Desktop | Codex Desktop |
|---|---|
| `AskUserQuestion` tool (native chip pickers) | `tool/requestUserInput` via App Server (1-3 questions, tab-navigable TUI overlay) |
| Triggered inline in skill SKILL.md | Triggered via App Server JSON-RPC call from a hook or skill script |
| Click-first in Cowork Desktop | Tab/keyboard-first in Desktop TUI; Desktop renders a styled question overlay |
| Supports multi-select options | Supports single-choice with `isOther` free-form |

### TUI interaction model (confirmed)
The Desktop/CLI TUI renders a question overlay at the bottom input area:
- One tab per question + a Submit tab
- ←/→ arrow keys to navigate tabs
- For single-choice: selecting an option auto-advances to next tab
- For multi-choice: select/deselect, then Enter for Next
- `isOther` renders a free-text input within the question

### Plugin usage path
A skill script or hook command that needs user input **cannot call `tool/requestUserInput` directly** — it is an App Server method, not a tool in the skill execution sandbox. The correct pattern:

1. Skill invokes a bundled hook script (e.g., `node ${CODEX_PLUGIN_ROOT}/scripts/ask.js`)
2. That script connects to the running App Server via stdio/WebSocket
3. It calls `tool/requestUserInput` with the question array
4. Receives the user's answers and continues execution

This is more complex than Claude Code's inline `AskUserQuestion`. **For most CC Commander skills, the simpler alternative is to emit the questions as markdown text and wait for the user to type — same as the Claude Code SKILL.md prompt pattern.**

---

## 3. Manifest Extension: Desktop-Specific `interface` Fields

The `.codex-plugin/plugin.json` manifest `interface` object controls Desktop install-surface presentation. Current adapter template (`commander/adapters/codex/manifest.template.json`) already covers the base fields.

### Fields currently in CC Commander's template
- `displayName`, `shortDescription`, `longDescription`
- `developerName`, `category`, `capabilities`
- `websiteURL`, `defaultPrompt`, `brandColor`

### Fields missing from current template (needed for full Desktop UX)
| Field | Type | Purpose | Required for Featured |
|---|---|---|---|
| `composerIcon` | `string` (path) | Icon shown in composer/input bar when plugin is active | Recommended |
| `logo` | `string` (path) | Full logo for marketplace card | Recommended |
| `screenshots` | `string[]` (paths) | Up to 5 screenshots for marketplace listing | Required for Featured |
| `privacyPolicyURL` | `string` (URL) | Privacy policy link | Required for Featured |
| `termsOfServiceURL` | `string` (URL) | ToS link | Recommended |

### Assets needed for full marketplace listing
```
commander/cowork-plugin-codex/assets/
├── icon.png           # 128×128 px, composerIcon
├── logo.png           # 1024×1024 px, logo
├── screenshot-1.png   # 1200×800 px, main workflow
├── screenshot-2.png   # 1200×800 px, skill picker
├── screenshot-3.png   # 1200×800 px, agent dispatch
```

---

## 4. Lifecycle Events: Desktop-Only vs CLI

### Events confirmed identical between CLI and Desktop (from hook-event-map.json)
- `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `StopFailure`

### Codex-only event Desktop exposes but CLI also supports
- `SessionEnd` — Desktop fires this reliably (use as PreCompact substitute)
- `PermissionRequest` — Desktop renders a richer native approval dialog

### Desktop-only lifecycle NOT exposed to plugins (as of 2026-04)
- Thread automation resume events (no plugin hook)
- Computer use session events (no plugin hook)
- In-app browser navigation events (no plugin hook)
- Memory compaction events (no plugin hook)

### App Server notifications (accessible to custom clients, not plugin hooks)
The App Server protocol exposes rich Desktop events: `thread/status/changed`, `skills/changed`, `mcpServer/startupStatus/updated`, `plugin/list` with `featured_plugin_ids`. These are for custom clients (e.g., the VS Code extension), not for SKILL.md or hooks.json plugin primitives.

---

## 5. Marketplace: Featured Placement

### What "Featured" means
The `plugin/list` App Server method returns `featured_plugin_ids` as part of the marketplace state. These IDs appear in the "Featured" section of the Desktop `/plugins` browser. Featured plugins get prominent placement in the installer UI.

### How to get Featured (confirmed/inferred)
Based on research across multiple sources:

| Requirement | Status | Confidence |
|---|---|---|
| Plugin in official OpenAI marketplace OR community marketplace catalog | Required | HIGH |
| `screenshots` array populated (up to 5) | Required | HIGH (from manifest spec) |
| `logo` and `composerIcon` assets present | Required | HIGH |
| `privacyPolicyURL` field set | Required | MED |
| Plugin installs cleanly and MCP servers resolve | Required | HIGH |
| No self-serve Featured nomination process confirmed | No formal process | MED — editorial at OpenAI |
| Community marketplace (codex-marketplace.com) has Featured section | Exists | MED |

### Official OpenAI marketplace submission
As of 2026-04, the official OpenAI Codex marketplace (available via Desktop `/plugins`) does **not have a self-serve submission process for third parties**. The marketplace was at 90+ plugins in April 2026 but plugins appear to be curated by OpenAI or via the GitHub-backed community marketplace catalog.

The community marketplace (`codex-marketplace.com`) accepts submissions via `npx codex-marketplace add KevinZai/commander --plugins` — this is the practical route for CC Commander.

---

## 6. Adapter Changes Needed in `translate.js`

The following changes are needed to maximize Codex Desktop UX. These are **specifications for implementation** — no edits were made in this wave.

### 6.1 Add missing manifest interface fields
```js
// In translateManifest(), add these fields to the template replacement
"composerIcon": "./assets/icon.png",
"logo": "./assets/logo.png",
"screenshots": [
  "./assets/screenshot-1.png",
  "./assets/screenshot-2.png",
  "./assets/screenshot-3.png"
],
"privacyPolicyURL": "https://cc-commander.com/privacy",
"termsOfServiceURL": "https://cc-commander.com/terms"
```

### 6.2 Inject `SessionEnd` as a PreCompact substitute
Current behavior: `PreCompact` is dropped. The `SessionEnd` event fires reliably in Desktop.

```js
// In translateHooks(), when PreCompact is dropped:
// Optionally remap to SessionEnd with a warning in --verbose output
if (event === 'PreCompact' && options.remapPreCompactToSessionEnd) {
  log('remap PreCompact -> SessionEnd (Codex Desktop; semantics differ)');
  out.hooks['SessionEnd'] = (out.hooks['SessionEnd'] || []).concat(
    translateHookHandlers(handlers, log)
  );
}
```

Add `--remap-precompact` CLI flag to opt in.

### 6.3 Add `PermissionRequest` hook passthrough
Currently the `PermissionRequest` event exists in `codex_only_events` in `hook-event-map.json` but is not generated by the translator for CC Commander's hooks. A new handler should fire when Codex requests permission for risky tool use:

```json
// In commander/cowork-plugin-codex/hooks.json (generated)
{
  "PermissionRequest": [{
    "hooks": [{
      "type": "command",
      "command": "node ${CODEX_PLUGIN_ROOT}/hooks/permission-gate.js",
      "matcher": ".*"
    }]
  }]
}
```

`permission-gate.js` would log the request and optionally auto-approve low-risk tool calls.

### 6.4 Skill `defaultPrompt` field injection
The manifest `interface.defaultPrompt` controls what text appears pre-filled in the Desktop composer when the user opens CC Commander. Currently set to `/ccc`. Consider augmenting to `/ccc-start` for first-run UX.

### 6.5 `tool/requestUserInput` bridge (optional, high effort)
For skills that need chip-picker UX equivalent on Codex Desktop, a bridge script pattern:

```
commander/cowork-plugin-codex/scripts/ask-bridge.js
```

This would connect to the running App Server stdio, call `tool/requestUserInput`, and return answers as JSON to stdout. Skills can then call `node ${CODEX_PLUGIN_ROOT}/scripts/ask-bridge.js --questions '...'` from a hook.

**Recommendation: Skip for v4.2. The SKILL.md prompt pattern (ask in text, user types choice) works for Codex too. Implement bridge only if user research confirms chip-picker is a strong retention driver on Codex.**

---

## 7. Three Illustrative Skills with GUI Bindings

### 7.1 `/ccc-build` → Codex Desktop forced-picker for project type

**Current Claude Code behavior:** AskUserQuestion chip picker with choices: Web App, API / Backend, CLI Tool, Mobile App

**Codex Desktop binding:**
- `defaultPrompt: "/ccc-build"` in manifest interface (pre-fills composer)
- SKILL.md prompt text presents the same choices as numbered list (simpler)
- Optional: ask-bridge.js to render `tool/requestUserInput` with project type choices

**Adapter change:** None needed beyond `defaultPrompt`. Skill text already handles the question.

### 7.2 `/ccc-review` → Approval-aware review with `PermissionRequest` hook

**Current behavior:** Runs git diff analysis — no permission gate

**Codex Desktop binding:**
- `PermissionRequest` hook fires before Codex runs `git diff` or reads file tree
- Hook script checks scope and auto-approves read-only tool calls
- Blocks destructive tool calls (e.g., `rm`, `git reset --hard`) with an explicit user prompt

**Adapter change:** Add `permission-gate.js` hook (see §6.3) with `/ccc-review` scope awareness.

### 7.3 `/ccc-fleet` → SessionStart hook for worktree detection

**Current behavior:** Dispatches multiple agents; no Desktop-specific UX

**Codex Desktop binding:**
- `SessionStart` hook detects if running inside a Codex Desktop worktree (via `CODEX_WORKTREE` env var or `cwd` containing `.codex-worktrees/`)
- If in worktree: auto-scope the fleet dispatch to the worktree root
- Logs worktree name in skill output for user orientation

**Adapter change:** Extend the `SessionStart` hook handler in `cowork-plugin-codex/hooks/` to check for worktree context.

---

## 8. Estimated Effort

| Work Item | Effort | Priority |
|---|---|---|
| Add missing manifest fields (`composerIcon`, `logo`, `screenshots`, `privacyPolicyURL`) | 0.5 days | HIGH — needed for Featured |
| Create asset files (icon, logo, 3 screenshots) | 1 day | HIGH — needed for Featured |
| Add `--remap-precompact` flag to translate.js | 0.25 days | MED |
| Add `PermissionRequest` hook + `permission-gate.js` | 1 day | MED |
| Implement `ask-bridge.js` for `tool/requestUserInput` | 2 days | LOW (skip for v4.2) |
| Community marketplace submission (codex-marketplace.com) | 0.5 days | HIGH |
| Smoke-test against actual Codex Desktop | 1 day | HIGH |
| Docs update (README, CHANGELOG) | 0.5 days | MED |
| **Total (without ask-bridge)** | **~4.75 days** | |
| **Total (with ask-bridge)** | **~6.75 days** | |

**Recommendation for v4.2:** Ship without ask-bridge (~3 days core work + 1 day testing + 0.5 days docs = ~4.5 days).

---

## 9. Sources

- [App Server docs](https://developers.openai.com/codex/app-server) — JSON-RPC method list including `tool/requestUserInput`, `plugin/list` with `featured_plugin_ids`
- [Build plugins docs](https://developers.openai.com/codex/plugins/build) — manifest structure
- [Codex Plugin Marketplace docs](https://www.codex-marketplace.com/docs) — plugin layout, manifest example
- [Codex changelog](https://developers.openai.com/codex/changelog) — v26.415 Desktop features
- [GitHub issue #9926](https://github.com/openai/codex/issues/9926) — `ask_user_question` TUI tab spec
- [Codex CLI slash commands](https://developers.openai.com/codex/cli/slash-commands) — `/model`, `/personality` popup pickers
- [Agent approvals & security](https://developers.openai.com/codex/agent-approvals-security) — `PermissionRequest` hook
- Existing adapter code: `commander/adapters/codex/README.md`, `translate.js`, `hook-event-map.json`
