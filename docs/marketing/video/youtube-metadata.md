# YouTube Metadata

## Title

CC Commander: First Plugin on Claude Code and Codex

Character count: 53.

## Description

CC Commander now installs on both Claude Code and Codex from the same repo. In this short demo, Kevin shows the full install path, why the Dec 2025 Agent Skills convergence made it possible, and how `/ccc-fleet` dispatches five real sub-agents in five git worktrees.

Install Commander:
<https://github.com/KevinZai/commander>

Claude Code Desktop / Cowork Desktop:
Settings → Plugin Marketplace → Add from GitHub → `KevinZai/commander` → Install → `/ccc`

Codex CLI:

```bash
codex plugin marketplace add KevinZai/commander && codex plugin install commander
```

Then type:

```text
/ccc-build
```

Timestamps:

- 0:00 — First plugin on Claude Code and Codex
- 0:10 — Install on Claude Code Desktop / Cowork Desktop
- 0:35 — Install on Codex CLI
- 1:00 — Why Dec 2025 changed plugin portability
- 1:30 — `/ccc-fleet`: five agents, five worktrees
- 2:00 — Free forever, 51 skills, 17 agents, 502+ skill ecosystem

Notes:

- Codex support covers the native plugin path shown here.
- Three Claude-only hooks are documented as dropped on Codex: Notification, PreCompact, and SubagentStop.
- Hosted MCP for the wider IDE path is not live yet.

## Tags

CC Commander, Commander, Claude Code, Cowork Desktop, Codex CLI, OpenAI Codex, Claude Code plugin, Codex plugin, Agent Skills, SKILL.md, AI coding agents, coding agents, developer tools, subagents, git worktrees, Kevin Zicherman, KevinZai, slash commands, ccc-build, ccc-fleet, plugin marketplace

## Thumbnail Concept

Split-screen thumbnail:

- Left side: Cowork Desktop chip picker with `/ccc`.
- Right side: Codex terminal with `/ccc-build`.
- Center label: "Claude Code + Codex".
- Small proof strip: "51 skills · 17 agents · 5 worktrees".
- Avoid clutter. Use real UI captures, not abstract art.

## End Screen Elements

- Primary end screen: "Install CC Commander" linking to the repo or launch page.
- Secondary end screen: "Watch the `/ccc-fleet` deep dive" if available.
- Subscribe element in the lower-right corner.
- Leave the final two seconds visually clean so cards do not cover terminal text.
