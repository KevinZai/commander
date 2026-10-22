# Repair commands for failing doctor rows

Linked from [../SKILL.md](../SKILL.md) Step 4. Doctor prints the matching
block for the user to paste; it never runs any of these itself. Destructive
lines (`rm -rf`) are for the user to review and run.

## Clone missing or corrupted

```bash
# Remove stale marketplace state, then re-add the marketplace
rm -rf ~/.claude/plugins/marketplaces/commander-hub
```

Then re-add it: in Claude Code run `/plugin marketplace add KevinZai/commander`
and `/plugin install commander@commander-hub`; in Desktop use Settings →
Plugins → Add Marketplace → `KevinZai/commander`.

## `temp_*` directories present (interrupted clone)

```bash
ls ~/.claude/plugins/marketplaces/
rm -rf ~/.claude/plugins/marketplaces/temp_*
```

`/ccc-tuneup --fix` can archive these instead of deleting them.

## Commander not in `enabledPlugins`

Open `/plugin` (CLI) or Settings → Plugin Marketplace (Desktop), find
`commander`, and enable it. Manual alternative: add `"commander@commander-hub": true`
to `enabledPlugins` in `~/.claude/settings.json` after backing the file up.

## `claude plugin validate --strict` fails

Read the printed errors and warnings. In a dev checkout fix the named file and
re-run `claude plugin validate --strict commander/cowork-plugin`. For an
end-user install, the failure ships with the release: reinstall
(`claude plugin update commander`) and report the validator output in a
GitHub issue.

## Mod installed but not drawing

Mods need Claude Code 2.1.287 or later (Desktop 2.1.286 or later) and draw only
in the CLI and the Desktop Code tab; they run without drawing in VS Code,
`claude -p` and cloud sessions. Update Claude Code, then open `/plugin` and
confirm the mod is enabled and lists no dropped hooks.

## Bundled MCP servers not responding

Restart Claude Code or Desktop, run `/mcp reconnect all`, then re-run
`/ccc-doctor`. The server list lives in `.mcp.json` inside the plugin source
(`~/.claude/plugins/marketplaces/commander-hub/commander/cowork-plugin/.mcp.json`
for a CLI marketplace install).

## Codex doctor reports problems

Run `codex doctor --summary` for the short form, `codex login` if auth is the
failing check, and `codex plugin list --json` to confirm the Commander mirror
is installed. Codex updates through `codex plugin marketplace upgrade`; see
[../../ccc-update/references/install-modes.md](../../ccc-update/references/install-modes.md#codex).
