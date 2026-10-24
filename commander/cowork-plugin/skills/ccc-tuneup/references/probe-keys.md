# Tune-up probe keys and cost-settings audit

Linked from [../SKILL.md](../SKILL.md) Steps 1–2. The probe is
[`../lib/tuneup-probes.sh`](../lib/tuneup-probes.sh); it is side-effect-free and
emits `SECTION:<NAME>` markers followed by `KEY=VALUE` lines, each falling back
to `n/a`.

## Probe keys

| Key | What it measures | Scorecard row |
|---|---|---|
| `CLONE`, `PLUGIN_SRC` | Resolved marketplace clone root and plugin source | (input) |
| `JUNK_TEMP` | `temp_*` dirs in `~/.claude/plugins/marketplaces/` | 🔄 Junk sweep |
| `JUNK_BAK` | `*.bak` / `*.old` / `*.backup-*` files older than 14 days (count) | 🔄 Junk sweep |
| `ARCHIVE_DUPES` | Hook files present in both `hooks/_archive/` and `hooks/` (exact-name intersection) | 🔄 Junk sweep |
| `STALE_SESSIONS` | `~/.claude/sessions/` files older than 30 days (count) | ⏳ Stale sessions |
| `LOCAL_AGENT_OVERLAP` | `~/.claude/agents/*.md` basenames that match a plugin agent | 🤖 Local agent supersession |
| `SETTINGS_MISSING_KEYS` | Missing structural keys: `showThinkingSummaries`, `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, `toolConcurrency` | 🔧 Settings keys |
| `PLUGIN_ENABLED` | Commander in `enabledPlugins` (yes / no / missing) | 🔐 Plugin enabled |
| `PLUGIN_DISABLED_INSTALLED` | Commander installed but disabled | 🔐 Plugin enabled |
| `MCP_CONNECT_STALE` | Opt-in MCP entries whose configured path or command is missing | 🌐 Opt-in MCP staleness |
| `COST_<KEY>` | `current\|suggested\|verdict` per audited key (below) | 💰 Cost settings |
| `COST_FLAGGED` | Count of non-`ok` cost keys | 💰 Cost settings |
| `SKILL_COUNT` | Live skill directory count in the plugin source | 📝 CLAUDE.md count drift |
| `AGENT_COUNT` | Live `agents/*.md` count | 📝 CLAUDE.md count drift |
| `EVENT_COUNT` | `jq '.hooks \| keys \| length' hooks/hooks.json` | 📝 drift, 🔬 Hooks coverage |
| `HANDLER_COUNT` | `jq '[.hooks[][].hooks // [] \| length] \| add // 0' hooks/hooks.json` | 📝 drift, 🔬 Hooks coverage |
| `VENDOR_COUNT` | `vendor/` directory count at the repo root, when present | 📝 CLAUDE.md count drift |
| `INSTALLED_VERSION` | From `installed_plugins.json`, else `plugin.json` | 📦 Version freshness |
| `CACHED_REMOTE_VERSION` | From `<config dir>/commander/update-cache.json` (else the shared `~/.claude/commander/update-cache.json` that `commander/update-check.js` writes) when under 4 hours old | 📦 Version freshness |
| `CLAUDE_MD_MODE` | `maintainer` or `detect-only` (SKILL.md Step 1e repeats the check) | 📝 CLAUDE.md count drift |

## Cost-settings audit (suggest-only)

The `SECTION:COST` rows surface `settings.json` keys that reduce token spend.
They are never applied by the skill, never offered as a mutating picker
option, and never edited by `--fix` or `--aggressive`.

| Key | Why it cuts spend | Suggested |
|---|---|---|
| `effortLevel` | Lower effort means fewer thinking tokens on routine turns; `xhigh` roughly doubles spend. The user can still raise effort per session with `/effort` | `high` |
| `autoCompactEnabled` | Caps runaway context growth, so fewer overflow re-reads | `true` |
| `env.MAX_THINKING_TOKENS` | Bounds the per-turn reasoning budget | `10000` |
| `env.ENABLE_TOOL_SEARCH` | Defers MCP tool schemas; a large saving with many connected servers | `1` |
| `showThinkingSummaries` | Summaries cost fewer output tokens than full thinking | `true` |
| `cleanupPeriodDays` | Bounds transcript retention, so a smaller resume and search surface | `30` |
| `model` | A premium pin (`fable` or `opus`) on the main thread spends more on routine turns | inform only: route routine work to `sonnet` or `haiku` subagents |

Verdicts: `ok` satisfies the intent (do not surface); `missing` means unset;
`suboptimal` means set to a higher-spend value. `∅` in `current` means unset.
`COST_FLAGGED=n/a` means the probe could not read settings: render the row ⏭️.
`model` is inform-only: never suggest overriding the user's chosen model.

Example detail block printed under the scorecard when `COST_FLAGGED` is above 0:

```
### 💰 Cost settings — suggestions (not applied)
- effortLevel: xhigh → high  (xhigh roughly doubles routine spend)
- env.MAX_THINKING_TOKENS: unset → 10000  (caps per-turn reasoning spend)
- env.ENABLE_TOOL_SEARCH: unset → 1  (defers MCP tool schemas)

# To apply, paste into ~/.claude/settings.json after reviewing (these are your trade-offs):
"effortLevel": "high",
"showThinkingSummaries": true,
"env": { "MAX_THINKING_TOKENS": "10000", "ENABLE_TOOL_SEARCH": "1" }
```

## Scorecard rubric

🟢 90–100 · 🟡 50–89 · 🔴 0–49 · ⏭️ n/a (probe failed or check skipped; never crash).
