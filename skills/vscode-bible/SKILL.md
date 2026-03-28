---
name: vscode-bible
description: VS Code integration guide — rich buttons, keyboard shortcuts, walkthrough, snippets, and extension configuration for the Claude Code Bible
tags: [vscode, ide, integration, extension]
version: "1.2"
---

# VS Code Bible Integration Guide

> Set up VS Code as the perfect companion for the Claude Code Bible. Rich buttons, keyboard shortcuts, snippets, task runners, and debugging configuration.

---

## Setup

### Step 1: Install the Extension

Install the official Claude Code extension for VS Code:

```
ext install anthropic.claude-code
```

Or search for "Claude Code" in the Extensions panel (`Cmd+Shift+X`).

### Step 2: Bible Auto-Loads

Once installed, the Bible automatically loads from your `~/.claude/` directory. No additional configuration needed. The extension reads:
- `~/.claude/CLAUDE.md` — your global instructions
- `~/.claude/settings.json` — your settings (hooks, MCP servers, permissions)
- `~/.claude/commands/*.md` — your slash commands
- `~/.claude/skills/*/SKILL.md` — your skills

### Step 3: Verify Installation

Open the Claude Code panel and type:

```
/cc
```

You should see the command center with all Bible commands listed.

---

## Keyboard Shortcuts

### Built-in Shortcuts (Claude Code Extension)

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Cmd+Shift+P` → "Claude" | Open Claude Code panel | Primary entry point |
| `Cmd+L` | Focus Claude Code input | Quick access to chat |
| `Cmd+Shift+L` | Add selection to chat context | Highlight code first |
| `Cmd+I` | Inline editing mode | Edit code in-place |
| `Opt+T` | Toggle extended thinking | Deeper reasoning mode |
| `Ctrl+O` | Toggle verbose thinking output | See reasoning process |
| `Escape` | Cancel current generation | Stop mid-response |

### Recommended Custom Keybindings

Add these to your `keybindings.json` (`Cmd+K Cmd+S` → Open Keyboard Shortcuts JSON):

```json
[
  {
    "key": "cmd+shift+i",
    "command": "claude-code.sendText",
    "args": { "text": "/init" },
    "when": "claude-code.active"
  },
  {
    "key": "cmd+shift+p cmd+shift+l",
    "command": "claude-code.sendText",
    "args": { "text": "/plan" },
    "when": "claude-code.active"
  },
  {
    "key": "cmd+shift+v",
    "command": "claude-code.sendText",
    "args": { "text": "/verify" },
    "when": "claude-code.active"
  },
  {
    "key": "cmd+shift+c cmd+shift+c",
    "command": "claude-code.sendText",
    "args": { "text": "/cc" },
    "when": "claude-code.active"
  },
  {
    "key": "cmd+shift+t",
    "command": "claude-code.sendText",
    "args": { "text": "/tdd" },
    "when": "claude-code.active"
  }
]
```

---

## Rich Button Configuration

Add Bible workflow buttons to your VS Code sidebar and title bar.

### settings.json — Sidebar Buttons

Add to your VS Code `settings.json` (`Cmd+,` → Open Settings JSON):

```json
{
  "claude-code.quickActions": [
    {
      "label": "Init Project",
      "command": "/init",
      "icon": "rocket",
      "group": "Bible"
    },
    {
      "label": "Plan Feature",
      "command": "/plan",
      "icon": "list-ordered",
      "group": "Bible"
    },
    {
      "label": "Verify",
      "command": "/verify",
      "icon": "check-all",
      "group": "Bible"
    },
    {
      "label": "Command Center",
      "command": "/cc",
      "icon": "dashboard",
      "group": "Bible"
    },
    {
      "label": "TDD",
      "command": "/tdd",
      "icon": "beaker",
      "group": "Bible"
    },
    {
      "label": "Code Review",
      "command": "/code-review",
      "icon": "eye",
      "group": "Bible"
    },
    {
      "label": "Checkpoint",
      "command": "/checkpoint",
      "icon": "git-commit",
      "group": "Bible"
    },
    {
      "label": "Build Fix",
      "command": "/build-fix",
      "icon": "wrench",
      "group": "Bible"
    }
  ]
}
```

### Context Menu Actions

Add right-click context menu actions for common Bible operations:

```json
{
  "claude-code.contextMenuActions": [
    {
      "label": "Review This Code",
      "command": "/code-review",
      "when": "editorHasSelection"
    },
    {
      "label": "Explain This Code",
      "command": "Explain the selected code in detail",
      "when": "editorHasSelection"
    },
    {
      "label": "Write Tests for This",
      "command": "/tdd",
      "when": "editorHasSelection"
    }
  ]
}
```

---

## Status Bar Integration

The Claude Code extension shows status in the VS Code status bar. The Bible's `statusline.sh` provides additional context when using the terminal:

- **Context gauge** — percentage of context window used
- **Model indicator** — current model (sonnet, opus, etc.)
- **Cost tracker** — session cost in real-time
- **Token count** — tokens consumed this session

To see the status line in your integrated terminal, add to your shell profile:

```bash
# Add to ~/.zshrc or ~/.bashrc
source ~/.claude/lib/statusline.sh
```

---

## 5-Step VS Code Walkthrough

### Step 1: Open Your Project

```
cd ~/my-project
code .
```

Open the Claude Code panel from the sidebar or with `Cmd+Shift+P` → "Claude Code".

### Step 2: Initialize with the Bible

Type in the Claude Code panel:

```
/init
```

The decision tree wizard asks about your build type, stack, and goals. It creates a project-specific `CLAUDE.md` file.

### Step 3: Plan Your First Feature

```
/plan
```

Describe what you want to build. Claude creates an implementation plan with numbered steps, dependencies, and risk assessment.

### Step 4: Build with TDD

```
/tdd
```

Write tests first (RED), implement to pass (GREEN), then refactor (IMPROVE). The TDD workflow guides you through each cycle.

### Step 5: Verify and Ship

```
/verify
```

Runs a full verification loop: tests pass, no TypeScript errors, no console errors, feature works end-to-end. If all checks pass, you are ready to commit.

---

## Snippets Guide

The Bible includes VS Code snippets for quick access to common commands and prompts. Install the snippet file:

```bash
# Copy snippets to VS Code user snippets directory
cp ~/.claude/compatibility/vscode-snippets.json \
   ~/Library/Application\ Support/Code/User/snippets/claude-code-bible.code-snippets
```

Or on Linux:
```bash
cp ~/.claude/compatibility/vscode-snippets.json \
   ~/.config/Code/User/snippets/claude-code-bible.code-snippets
```

Once installed, type any snippet prefix in a markdown file or the Claude Code input and press `Tab`:

| Prefix | Expands to |
|--------|-----------|
| `kz-init` | `/init` command |
| `kz-plan` | `/plan` with description placeholder |
| `kz-verify` | `/verify` command |
| `kz-mode` | `/cc mode <name>` with mode selector |
| `kz-mega` | Mega-skill loader with selector |
| `kz-tdd` | `/tdd` workflow starter |
| `kz-review` | `/code-review` command |
| `kz-prompt` | Prompt template selector |

See the full snippet file at `compatibility/vscode-snippets.json` for all 16 snippets.

---

## tasks.json — Bible Workflow Tasks

Add Bible commands as VS Code tasks for quick access via `Cmd+Shift+B`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Bible: Init Project",
      "type": "shell",
      "command": "claude",
      "args": ["-p", "/init"],
      "group": "build",
      "presentation": { "reveal": "always", "panel": "new" }
    },
    {
      "label": "Bible: Verify",
      "type": "shell",
      "command": "claude",
      "args": ["-p", "/verify"],
      "group": "test",
      "presentation": { "reveal": "always", "panel": "new" }
    },
    {
      "label": "Bible: Build Fix",
      "type": "shell",
      "command": "claude",
      "args": ["-p", "/build-fix"],
      "group": "build",
      "presentation": { "reveal": "always", "panel": "new" }
    },
    {
      "label": "Bible: TDD",
      "type": "shell",
      "command": "claude",
      "args": ["-p", "/tdd"],
      "group": "test",
      "presentation": { "reveal": "always", "panel": "new" }
    },
    {
      "label": "Bible: Code Review",
      "type": "shell",
      "command": "claude",
      "args": ["-p", "/code-review"],
      "group": "none",
      "presentation": { "reveal": "always", "panel": "new" }
    }
  ]
}
```

Copy to your project's `.vscode/tasks.json` or add to your user tasks configuration.

---

## launch.json — Debugging with Hooks

Debug Bible hooks during development. Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Bible Hook",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/.claude/hooks/${input:hookName}",
      "env": {
        "CLAUDE_HOOK_EVENT": "${input:hookEvent}",
        "KZ_DEBUG": "1"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Run Hook Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/tests/hooks.test.js",
      "args": ["--test"],
      "console": "integratedTerminal"
    }
  ],
  "inputs": [
    {
      "id": "hookName",
      "type": "promptString",
      "description": "Hook filename (e.g., context-guard.js)"
    },
    {
      "id": "hookEvent",
      "type": "pickString",
      "description": "Hook event type",
      "options": ["PreToolUse", "PostToolUse", "Stop", "SessionStart", "PreCompact"]
    }
  ]
}
```

---

## Tips for VS Code + Bible Power Users

1. **Use the terminal panel** — Claude Code in the terminal (`claude` CLI) has full Bible support. Use it alongside the extension for parallel sessions.

2. **Split editor + Claude** — Put Claude Code panel on one side, your code on the other. Use `Cmd+Shift+L` to send selected code to Claude.

3. **Workspace settings** — Put Bible-specific VS Code settings in `.vscode/settings.json` per project to avoid polluting your global settings.

4. **Multi-root workspaces** — If you work in a monorepo, each root can have its own `CLAUDE.md`. The Bible respects the nearest `CLAUDE.md` to the file you are editing.

5. **Custom quick actions** — Extend the `quickActions` array in settings.json with your most-used skills. The icons come from the VS Code icon set (codicon).

6. **Task keyboard shortcuts** — Bind your Bible tasks to keyboard shortcuts via `keybindings.json`:
   ```json
   {
     "key": "cmd+shift+b cmd+shift+v",
     "command": "workbench.action.tasks.runTask",
     "args": "Bible: Verify"
   }
   ```

7. **Extension settings** — The Claude Code extension has settings under `claude-code.*` in VS Code settings. Key ones:
   - `claude-code.enableAutoThinking` — auto-enable extended thinking
   - `claude-code.defaultModel` — default model for new sessions

8. **Git integration** — Use the Source Control panel alongside `/checkpoint`. The Bible's auto-checkpoint hook creates commits that appear in the Git timeline.

9. **Problem panel** — After `/verify`, check the VS Code Problems panel (`Cmd+Shift+M`) for any TypeScript errors or lint warnings that the verification caught.

10. **Terminal profiles** — Create a "Claude Code Bible" terminal profile that sources `statusline.sh` and sets `KZ_NO_ANIMATION=0` for the full visual experience.
