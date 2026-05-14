# CC Commander — VS Code Extension

**Guided AI PM for Claude Code directly in VS Code.** Access 60 plugin skills, 22 specialist agents, and your command hub without leaving the editor.

## Features

- **22 Specialist Agents** in a searchable sidebar panel
  - Architect, Builder, Designer, Security Auditor, Debugger, and 17 more
  - Click to launch with automatic prompt generation
  - Shows effort level and model assignment

- **60 Plugin Skills** with keyboard shortcut access
  - `Ctrl+Shift+Alt+S` (or `Cmd+Shift+Alt+S` on Mac) to open skill picker
  - Full-text search across skill names and descriptions
  - One-click skill launcher

- **Quick Actions Panel** with shortcuts to:
  - Command Hub (`/ccc`)
  - Skill and Agent Pickers
  - CC Commander Bible documentation
  - Claude Code Desktop installer

- **Works with Claude Code Desktop**
  - Automatically opens Claude Code Desktop when available
  - Falls back to inline editor prompt insertion

- **Completely Free**
  - No API keys, no authentication, no license checks
  - Open source (MIT)

## Installation

Install from the VS Code Marketplace or:

```bash
npm install -g @vscode/vsce
cd vscode-extension
npm install
npm run compile
npx vsce package --skip-license
```

Then open the generated `.vsix` file in VS Code.

## Usage

1. Open the CC Commander sidebar (Activity Bar → Rocket icon)
2. Browse Specialist Agents or Plugin Skills
3. Click any agent or skill to launch
4. Or use the keyboard shortcut: `Ctrl+Shift+Alt+S` → select skill

### Inline Prompting

If Claude Code Desktop is not installed, commands insert a prompt into your active editor. You can then manually copy it to Claude Code Desktop or Claude.ai.

### Configuration

Open **Settings** → **CC Commander** to toggle:
- `ccCommander.openInDesktop` — launch in Desktop (default) or inline

## For Full Power

Install **Claude Code Desktop** to unlock:
- All 60 /ccc-* plugin skills
- All 22 specialist sub-agents
- 9 lifecycle hooks with 25+ handlers
- 2 bundled MCP servers (context7, sequential-thinking)
- 16 opt-in MCP connectors
- Free forever

Download: https://claude.ai/download

## Learn More

- **GitHub:** https://github.com/KevinZai/commander
- **Documentation:** https://github.com/KevinZai/commander/blob/main/BIBLE.md
- **Website:** https://commanderplugin.com

## What's Next

After installing:
1. Open the CC Commander sidebar (Rocket icon)
2. Click "Open Command Hub" to access `/ccc` menu
3. Click "Read the Bible" to learn the Kevin Z Method
4. Install Claude Code Desktop for full plugin power

## License

MIT — See LICENSE file for details.

---

**v0.1.0** · Built for Anthropic's Claude Code Desktop · Free & Open Source
