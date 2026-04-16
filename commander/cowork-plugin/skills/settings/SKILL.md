---
name: settings
description: "Configuration hub — change theme, set cost ceiling, configure Linear, toggle animations, reset state. Use when the user says 'settings', 'change theme', 'configure', 'set up linear', 'cost ceiling', 'toggle animations', or 'preferences'."
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[name | level | cost | theme | linear | reset]"
---

# /ccc:settings

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Configuration hub for CC Commander. Reads from and writes to `~/.claude/commander/config.json`. Full menu sourced from `references/settings.json`.

## Quick Mode (default)

Load current config and show top 4 most-changed settings:

```bash
cat ~/.claude/commander/config.json 2>/dev/null || echo '{}'
```

Display current values and offer via AskUserQuestion:
- "Change my name" (currently: {name})
- "Change theme" (currently: {theme})
- "Set cost ceiling" (currently: ${costCeiling})
- "More settings..."
- "Back to main menu"

## Power Mode

Full settings menu from `references/settings.json`. Activate by passing `--power` or `all` as argument, or when user selects "More settings...".

### Available Settings

All options from `references/settings.json`:

**a) Display name** — How CC Commander addresses you
- Ask: "What name should I use?" → write to `config.json`

**b) Experience level** — beginner / intermediate / expert
- Affects verbosity, auto-confirm thresholds, and suggested skill complexity
- Ask via AskUserQuestion with 3 options

**c) Cost ceiling** — Max budget per dispatch (default: $10)
- Ask: "Max budget per session?" → validate is a number → write to `config.json`
- Note: $10 hard ceiling in night-mode is separate

**d) Theme** — Visual theme for `ccc` CLI
- Options: Claude Anthropic (default) / OLED Black / Matrix / Surprise Me
- Use Bash to apply if `ccc --theme` is available; otherwise note takes effect on next `ccc` launch

**e) Animations** — Toggle terminal animations
- Ask: Enable / Disable
- Sets `CC_NO_ANIMATION=1` in shell profile if disabled

**l) Linear setup** — Choose team + project, check connection
- Check for `LINEAR_CC_CLIENT_ID` and `LINEAR_CC_CLIENT_SECRET` in environment
- If not set: show instructions to set the following in your shell config (`.bashrc`, `.zshrc`) or via your preferred secrets manager:
  `export LINEAR_CC_CLIENT_ID=<your_client_id>` and `export LINEAR_CC_CLIENT_SECRET=<your_client_secret>`
- If set: test connection, show linked team and project, offer to change

**m) Launch mode** — Simple or Advanced (split tmux)
- Simple: standard single-pane launch
- Advanced: tabbed tmux split mode (`ccc --split`)

**r) Reset all state** — Start fresh (keeps skills, clears sessions/knowledge)
- Confirm: "This will delete all sessions and knowledge base entries. Skills are preserved. Continue?"
- If confirmed: `rm -rf ~/.claude/commander/sessions/ ~/.claude/commander/knowledge/`

### Config File Format

`~/.claude/commander/config.json`:
```json
{
  "name": "Kevin",
  "level": "expert",
  "costCeiling": 10,
  "theme": "claude-anthropic",
  "animations": true,
  "launchMode": "simple",
  "linear": {
    "teamId": "CC",
    "projectId": "commander"
  }
}
```

Use Write to persist all changes. Never silently overwrite — show the proposed change and confirm.

## If Connectors Available

If **~~project tracker** is connected:
- The Linear setup option shows current connection status and allows switching teams/projects
- On successful Linear setup, offer to import open issues immediately

## Tips

1. Pass a setting name directly as argument (e.g., `settings theme`) to jump to that setting.
2. The `linear` argument runs the Linear setup flow without opening the full settings menu.
3. Config is never auto-reset — the reset option requires explicit confirmation.
