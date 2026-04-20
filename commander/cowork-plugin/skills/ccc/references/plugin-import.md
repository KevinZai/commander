# Plugin Import (Opt-In)

CC Commander can import your existing Claude Code setup — but ONLY when you ask.

## What Gets Imported (Read-Only)
- CLAUDE.md project instructions
- .claude/skills/ (custom skills)
- .claude/commands/ (slash commands)
- .claude/agents/ (custom agents)
- .claude/settings.json (settings — read only)

## What Does NOT Get Modified
- Nothing. CC Commander never writes to your .claude/ directory.
- Commander state lives in ~/.claude/commander/ (separate).
- Imported context is passed to dispatched sessions via --append-system-prompt.

## How to Import
- CLI: Select "Open a project" from the main menu
- Cowork: Say "import my project" or "open project"
- It will ask for the project path if not auto-detected
