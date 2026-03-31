# IDE Compatibility Guide

This guide explains how CC Commander works across different editors and environments. The short version: the kit customizes Claude Code itself, not your IDE, so it works everywhere Claude Code runs.

## How the Kit Works

The kit installs to `~/.claude/`, which is the configuration directory Claude Code reads regardless of which IDE or terminal hosts it. Everything lives there:

- **CLAUDE.md** -- Behavior instructions, always loaded at session start. Defines coding standards, workflow rules, and agent configuration.
- **settings.json** -- Permissions, allowed tools, MCP server connections, model selection, and hook registration.
- **skills/** -- On-demand skill definitions (140+). Claude loads these when relevant to the current task. CCC domains (ccc-seo, ccc-design, ccc-testing, ccc-marketing, ccc-saas, ccc-devops) bundle related sub-skills with a router.
- **commands/** -- Slash commands (55+) like `/init`, `/plan`, `/verify`, `/tdd`, `/code-review`, `/checkpoint`.
- **hooks/** -- Lifecycle automation scripts (Node.js). PreToolUse, PostToolUse, Stop, and other lifecycle events. Registered in `hooks.json`.
- **templates/** -- Project starter templates for common stacks (Next.js + shadcn, Turborepo fullstack, marketing site).

Because Claude Code is IDE-agnostic, the kit is too.

## Supported Environments

| Environment | Support Level | Notes |
|-------------|---------------|-------|
| Terminal (`claude` CLI) | Full | Native experience |
| VS Code (Claude Code extension) | Full | Extension reads `~/.claude/` automatically |
| Cursor | Full | Claude Code runs in Cursor's integrated terminal |
| JetBrains (IntelliJ, WebStorm, etc.) | Full | Official Claude Code plugin reads `~/.claude/` |
| Any terminal running `claude` | Full | SSH sessions, tmux, iTerm2, Warp, Alacritty, etc. |

All features -- skills, commands, hooks, CLAUDE.md rules, settings.json permissions -- work identically across every environment. There is nothing IDE-specific in the kit.

## Project-Level Configuration

Projects can override global configuration with their own files:

- **`CLAUDE.md`** at project root -- Project-specific behavior instructions (tech stack, conventions, architecture notes). Loaded in addition to the global `~/.claude/CLAUDE.md`.
- **`.claude/settings.json`** at project root -- Project-specific permissions, MCP servers, and tool allowlists. Merged with global settings.

The `/init` command generates these files interactively for each project. It detects the tech stack, sets up appropriate permissions, and creates a tailored CLAUDE.md.

Project-level configuration takes precedence over global configuration when both are present.

## Cursor-Specific Notes

Cursor has its own AI features (Cursor Tab, Cmd+K, Composer) that are separate from Claude Code.

- **`.cursorrules`** is for Cursor's own AI, not for Claude Code. It has no effect on Claude Code behavior.
- When you run Claude Code inside Cursor's integrated terminal, it reads `~/.claude/` like any other terminal. The kit works normally.
- Cursor's built-in AI and Claude Code operate independently. They do not share context, configuration, or history.
- If you use both Cursor AI and Claude Code in the same project, consider keeping a `.cursorrules` file for Cursor and a `CLAUDE.md` for Claude Code. See `compatibility/cursorrules-example.txt` for a template.

## VS Code-Specific Notes

The official Claude Code extension for VS Code (`anthropic.claude-code`) reads `~/.claude/` automatically. No additional setup is needed after running the kit installer.

- Install the extension: search "Claude Code" in the VS Code extensions marketplace, or install `anthropic.claude-code`.
- This repo includes `.vscode/extensions.json` recommending the extension for contributors.
- Keyboard shortcuts work the same as in the terminal. The extension provides the same Claude Code experience in a VS Code panel.
- VS Code workspace settings (`.vscode/settings.json`) are for VS Code itself, not Claude Code. See `compatibility/vscode-settings-example.json` for recommended workspace settings that complement the kit.

## JetBrains-Specific Notes

The official Claude Code plugin for JetBrains IDEs (IntelliJ IDEA, WebStorm, PyCharm, etc.) provides the same experience as VS Code and terminal.

- Install via Settings > Plugins > Marketplace, search "Claude Code".
- The plugin reads `~/.claude/` automatically. All kit features work.
- No additional configuration files are needed for JetBrains.

## Agent Orchestrator Compatibility

The kit works with agent orchestration systems that spawn `claude` as a subprocess or integrate with Claude Code's configuration:

- **OpenClaw**: Already integrated. The kit includes `openclaw-health-check` and `openclaw-agent-scaffolder` skills. OpenClaw agents can invoke Claude Code with the full kit loaded.
- **Aider**: Use the `gitagent` export for cross-framework portability. Aider and Claude Code can coexist in the same project.
- **Other orchestrators**: Any system that spawns `claude` as a subprocess inherits the kit automatically, since Claude Code reads `~/.claude/` on startup.
- **Multi-agent setups**: The kit's `dispatching-parallel-agents` and `delegation-templates` skills support coordinating multiple Claude Code instances.

## VS Code Task Shortcuts

CC Commander includes a `.vscode/tasks.json` with pre-configured tasks for common commands. Access via **Terminal > Run Task** or the keyboard shortcut `Ctrl+Shift+P` → "Tasks: Run Task":

| Task | What it does |
|------|-------------|
| CC: Command Center | Opens the `/cc` interactive menu |
| CC: Init Project | Runs `/init` project wizard |
| CC: Code Review | Runs `/code-review` multi-agent review |
| CC: Plan | Runs `/plan` spec-first planning |
| CC: Verify | Runs `/verify` verification loop |
| CC: Grill Me | Runs `/cc grill` Socratic probe |
| CC: Confidence Check | Runs `/cc confidence` assessment |

To add custom keybindings, add to your VS Code `keybindings.json`:

```json
{
  "key": "ctrl+shift+k c",
  "command": "workbench.action.tasks.runTask",
  "args": "CC: Command Center"
}
```

## Terminal Theme: CC Commander

The kit includes 3 iTerm2 color profiles matching the dashboard theme system. Choose the one that matches your preference:

| Profile | File | Description |
|---------|------|-------------|
| Claude Anthropic | `cc-commander.itermcolors` | Amber/indigo/deep navy — professional default |
| OLED Black | `cc-commander-oled.itermcolors` | Pure black background, high contrast |
| Matrix | `cc-commander-matrix.itermcolors` | Enhanced green-on-black with CRT overlay feel |
| ~~KZ Matrix~~ (legacy) | `kz-matrix.itermcolors` | Original matrix theme — preserved for backward compatibility |

### iTerm2 (recommended)

```bash
# Import the default theme
open compatibility/cc-commander.itermcolors

# Or import all 3 themes at once
open compatibility/cc-commander.itermcolors compatibility/cc-commander-oled.itermcolors compatibility/cc-commander-matrix.itermcolors
```

Or manually: iTerm2 → Settings → Profiles → Colors → Color Presets → Import → select the desired profile.

After importing, select your preferred theme from the Color Presets dropdown.

**Optional extras for the full effect:**
- Font: JetBrains Mono or Fira Code (with ligatures)
- Transparency: 0% (pure OLED black)
- Blur: off
- Cursor: blinking vertical bar, green

### Terminal.app (macOS built-in)

Terminal.app doesn't support `.itermcolors` files. Set these manually in Settings → Profiles:
- Background: #000000 (pure black)
- Text: #00FF00 (green)
- Bold: #4CFF4C (bright green)
- Selection: #002E00 (dark green)
- Cursor: #00FF00 (green)

### Other Terminals (Alacritty, Warp, Kitty, WezTerm)

The ANSI color values from `kz-matrix.itermcolors` can be translated to any terminal's config format. Key colors:

| Element | Hex | RGB |
|---------|-----|-----|
| Background | `#000000` | 0, 0, 0 |
| Foreground | `#00FF00` | 0, 255, 0 |
| Bold/Bright | `#4CFF4C` | 76, 255, 76 |
| Cursor | `#00FF00` | 0, 255, 0 |
| Selection BG | `#002E00` | 0, 46, 0 |
| Cyan (accent) | `#00FFFF` | 0, 255, 255 |
| Amber (warning) | `#DEBA00` | 222, 186, 0 |
| Red (error) | `#CC3847` | 204, 56, 71 |

## File Reference

```
~/.claude/
  CLAUDE.md              # Global behavior instructions
  settings.json          # Permissions, MCP, hooks
  commands/              # Slash command definitions
  skills/                # On-demand skill definitions
  hooks/                 # Lifecycle automation (Node.js)
  templates/             # Project starter templates
  lib/                   # Shared libraries
  BIBLE.md               # Comprehensive development guide
  CHEATSHEET.md          # Quick reference for commands and workflows
  SKILLS-INDEX.md        # Searchable skill catalog
```
