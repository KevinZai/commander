# CC Commander for VS Code

Status panel extension for CC Commander. View session stats, active skills, and health scores directly in your VS Code sidebar.

## Features

- **Session Stats** -- current model, turn count, and cost
- **Active Skills** -- which CCC skills are loaded
- **Health Score** -- project health from last X-Ray scan
- Auto-refreshes every 30 seconds

## Commands

- `CC Commander: Refresh Stats` -- manually refresh the panel
- `CC Commander: Open Dashboard` -- launch CCC interactive mode in terminal
- `CC Commander: Run X-Ray` -- run project health scan

## Requirements

- CC Commander installed (`ccc` available in PATH)
- State file at `~/.claude/commander/state.json`

## Installation

This extension is not yet published to the marketplace. To install locally:

```bash
cd extensions/vscode
npm install -g @vscode/vsce
vsce package
code --install-extension cc-commander-vscode-0.1.0.vsix
```
