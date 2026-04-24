---
name: ccc-doctor
description: "Diagnostic tool for CC Commander. Generates a paste-ready markdown report covering plugin version, Node version, marketplace clone state, MCP server list, settings.json sanity, recent sessions, and common issues with nuclear fix commands. Use when the user types /ccc-doctor, reports a bug, says 'something is broken', 'plugin not loading', 'MCP not working', 'how do I debug', or needs a support snapshot."
model: sonnet
effort: medium
allowed-tools:
  - Bash
  - Read
argument-hint: "[quick | full]"
---

# /ccc-doctor — CC Commander Diagnostic Report

Generates a paste-ready diagnostic snapshot. Paste the output into a GitHub issue or Discord support thread.

## What to do

Run the Bash block below in a single call. Handle every missing file gracefully — use `2>/dev/null || echo "n/a"`. Never crash if a file doesn't exist.

```bash
# ── Plugin version ───────────────────────────────────────────────────
PLUGIN_DIR="$HOME/.claude/plugins/marketplaces/commander-hub/commander"
PLUGIN_JSON="$PLUGIN_DIR/.claude-plugin/plugin.json"
PLUGIN_VERSION=$(python3 -c "import json; d=json.load(open('$PLUGIN_JSON')); print(d.get('version','n/a'))" 2>/dev/null || echo "n/a")

# ── Node + system ────────────────────────────────────────────────────
NODE_VER=$(node --version 2>/dev/null || echo "n/a")
OS_INFO=$(uname -srm 2>/dev/null || echo "n/a")

# ── git HEAD SHA of the marketplace clone ───────────────────────────
GIT_SHA=$(git -C "$PLUGIN_DIR" rev-parse --short HEAD 2>/dev/null || echo "n/a")

# ── Marketplace clone presence ──────────────────────────────────────
CLONE_PATH="$HOME/.claude/plugins/marketplaces/commander-hub/commander"
if [ -d "$CLONE_PATH" ]; then CLONE_PRESENT="yes — $CLONE_PATH"; else CLONE_PRESENT="NO — directory missing"; fi

# ── Temp dirs (mid-clone drift indicator) ───────────────────────────
TEMP_DIRS=$(ls "$HOME/.claude/plugins/marketplaces/" 2>/dev/null | grep '^temp_' | tr '\n' ' ')
if [ -z "$TEMP_DIRS" ]; then TEMP_DIRS="none"; fi

# ── installed_plugins.json ──────────────────────────────────────────
INSTALLED_JSON="$HOME/.claude/plugins/installed_plugins.json"
if [ -f "$INSTALLED_JSON" ]; then
  INSTALLED_COMMANDER=$(python3 -c "
import json
try:
    d = json.load(open('$INSTALLED_JSON'))
    plugins = d if isinstance(d, list) else d.get('plugins', d.get('installed', []))
    found = [p for p in plugins if 'commander' in str(p).lower()]
    print('found — ' + str(found[0]) if found else 'not found in installed list')
except Exception as e:
    print('parse error: ' + str(e))
" 2>/dev/null || echo "parse error")
else
  INSTALLED_COMMANDER="installed_plugins.json not found"
fi

# ── settings.json sanity ────────────────────────────────────────────
SETTINGS="$HOME/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  HAS_MARKETPLACE=$(python3 -c "
import json
try:
    d = json.load(open('$SETTINGS'))
    ekm = d.get('extraKnownMarketplaces', [])
    names = [m if isinstance(m, str) else m.get('name','') for m in ekm]
    found = any('commander' in n.lower() for n in names)
    print('yes — commander-hub in extraKnownMarketplaces' if found else 'NO — commander-hub missing')
except Exception as e:
    print('parse error: ' + str(e))
" 2>/dev/null || echo "parse error")

  ENABLED=$(python3 -c "
import json
try:
    d = json.load(open('$SETTINGS'))
    ep = d.get('enabledPlugins', [])
    found = any('commander' in str(p).lower() for p in ep)
    print('yes — commander in enabledPlugins' if found else 'NO — commander not in enabledPlugins')
except Exception as e:
    print('parse error: ' + str(e))
" 2>/dev/null || echo "parse error")
else
  HAS_MARKETPLACE="settings.json not found"
  ENABLED="settings.json not found"
fi

# ── MCP servers (list only, no connectivity test) ───────────────────
MCP_JSON="$CLONE_PATH/.mcp.json"
if [ -f "$MCP_JSON" ]; then
  MCP_SERVERS=$(python3 -c "
import json
try:
    d = json.load(open('$MCP_JSON'))
    servers = d.get('mcpServers', {})
    print(', '.join(servers.keys()) if servers else 'none')
except:
    print('parse error')
" 2>/dev/null || echo "n/a")
else
  MCP_SERVERS=".mcp.json not found at $MCP_JSON"
fi

# ── Recent sessions ─────────────────────────────────────────────────
SESSION_DIR="$HOME/.claude/sessions"
if [ -d "$SESSION_DIR" ]; then
  SESSION_COUNT=$(ls "$SESSION_DIR" | wc -l | tr -d ' ')
  LATEST_SESSION=$(ls -t "$SESSION_DIR" 2>/dev/null | head -1 || echo "none")
else
  SESSION_COUNT="0"
  LATEST_SESSION="sessions dir not found"
fi

# ── Output ───────────────────────────────────────────────────────────
echo "PLUGIN_VERSION=$PLUGIN_VERSION"
echo "NODE_VER=$NODE_VER"
echo "OS_INFO=$OS_INFO"
echo "GIT_SHA=$GIT_SHA"
echo "CLONE_PRESENT=$CLONE_PRESENT"
echo "TEMP_DIRS=$TEMP_DIRS"
echo "INSTALLED_COMMANDER=$INSTALLED_COMMANDER"
echo "HAS_MARKETPLACE=$HAS_MARKETPLACE"
echo "ENABLED=$ENABLED"
echo "MCP_SERVERS=$MCP_SERVERS"
echo "SESSION_COUNT=$SESSION_COUNT"
echo "LATEST_SESSION=$LATEST_SESSION"
```

## Format the output

After running the Bash block, render the following markdown report. Substitute each variable. Determine pass/fail for each check row automatically.

```
## CC Commander Diagnostic Report

**When:** <current UTC datetime> · **By:** /ccc-doctor

| Item | Value |
|------|-------|
| Plugin version | <PLUGIN_VERSION> |
| Node | <NODE_VER> |
| OS | <OS_INFO> |
| Marketplace clone SHA | <GIT_SHA> |
| Clone directory present | <CLONE_PRESENT> |
| temp_* dirs (drift indicator) | <TEMP_DIRS> |
| installed_plugins.json — commander | <INSTALLED_COMMANDER> |
| settings.json — extraKnownMarketplaces | <HAS_MARKETPLACE> |
| settings.json — enabledPlugins | <ENABLED> |
| Bundled MCP servers | <MCP_SERVERS> |
| Recent sessions count | <SESSION_COUNT> |
| Latest session file | <LATEST_SESSION> |

### Common issues checklist

- [<pass/fail>] Marketplace clone present (directory exists)
- [<pass/fail>] No temp_* dirs (no mid-clone drift)
- [<pass/fail>] commander in extraKnownMarketplaces
- [<pass/fail>] commander in enabledPlugins
- [<pass/fail>] installed_plugins.json references commander

Mark [x] for pass, [ ] for fail.

### Nuclear fix commands (paste into terminal if needed)

If the clone is missing or corrupted:
```bash
# Remove stale marketplace state and re-add
rm -rf ~/.claude/plugins/marketplaces/commander-hub
# Then in Claude Code Desktop: Settings → Plugins → Add Marketplace → KevinZai/commander
```

If temp_* dirs exist (mid-clone drift):
```bash
ls ~/.claude/plugins/marketplaces/
rm -rf ~/.claude/plugins/marketplaces/temp_*
```

If commander not in enabledPlugins:
```bash
# Open Settings → Plugin Marketplace → find commander → Enable
# Or check ~/.claude/settings.json and add "commander" to enabledPlugins array
```

If MCP servers not responding:
```bash
# Restart Claude Code Desktop and retry /ccc-doctor
# Check .mcp.json at: ~/.claude/plugins/marketplaces/commander-hub/commander/.mcp.json
```
```

## Anti-patterns — DO NOT

- Never test MCP connectivity (just list server names — network calls are slow and flaky)
- Never crash if any file is missing — graceful n/a for every field
- Never hardcode the plugin version — always read from plugin.json
- Never output more than one code block to paste — keep it a single unified markdown block

## Tips

1. Run the full Bash block in one call — avoids extra turns.
2. The report is self-contained: user pastes it into a GitHub issue as-is.
3. If PLUGIN_VERSION is n/a and CLONE_PRESENT is NO, the fix is always: re-add the marketplace.
4. temp_* dirs are the #1 cause of "plugin not loading" — always flag them prominently.
