---
name: openclaw-agent-scaffolder
description: |
  Scaffold a new OpenClaw agent from scratch. Interviews for requirements, then generates
  complete workspace files (SOUL.md, AGENTS.md, TOOLS.md, IDENTITY.md, USER.md) plus
  the OpenClaw gateway config JSON snippet. Ensures consistency across the 35+ agent fleet.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Bash
---

# OpenClaw Agent Scaffolder

## When to Use
- Creating a new agent for the fleet
- Migrating an agent from one model/channel to another
- Auditing an existing agent's setup for completeness

## Interview Questions

### Required
1. **Agent name + emoji** — e.g., "Hawkeye 🎯"
2. **Role** — one sentence (e.g., "QA specialist — runs tests, security scans, bug filing")
3. **Model tier** — Opus ($$$, deep reasoning) / Sonnet ($$, general) / Flash/Grok ($, fast) / Free (Codex/Groq)
4. **Primary channel** — Discord channel name + ID
5. **Personality/tone** — 1-2 adjectives (e.g., "sharp, dry, zero corporate")

### Situational
6. **Tools needed** — bash, browser, web_search, web_fetch, message, cron, nodes?
7. **Skills to include** — from `~/.openclaw/skills/` or `~/.claude/skills/`
8. **Heartbeat schedule** — how often? what checks?
9. **Inter-agent relationships** — who does it talk to? who delegates to it?
10. **Cost budget** — max per session? per day?

## Output Files

### 1. `{workspace}/SOUL.md` (~30 lines)
```markdown
# SOUL.md — {Name} {Emoji}
You are {Name} — {role}. {1-2 personality sentences}.
## Identity
- Name/Avatar/Model/Channel/Role
## Core Expertise
- {3-5 bullet points}
## What You Do
- {numbered list of primary actions}
## Vibe
- {tone description}
## What You Are Not
- {explicit boundaries}
```

### 2. `{workspace}/AGENTS.md` (~80 lines)
Reference template: `~/clawd/workspaces/architecture/AGENTS.md`
Must include: Channel-Aware Mode, Hard Rules, Session Start, Core Loop, Memory, Inter-Agent Announce

### 3. `{workspace}/TOOLS.md` (~30 lines)
Workspace paths, tool-specific commands, filesystem section

### 4. `{workspace}/IDENTITY.md` (~15 lines)
Name, alt, workspace, model, channel, tone, emoji, role, scope

### 5. `{workspace}/USER.md` (~15 lines)
Copy from `~/clawd/workspaces/architecture/USER.md` (Kevin's info)

### 6. Gateway config snippet
```json
{
  "id": "{agentId}",
  "name": "{Name}",
  "model": "{provider/model}",
  "workspace": "{workspace}",
  "thinking": "{level}",
  "maxTokens": {n},
  "skills": [...],
  "heartbeat": { "intervalMinutes": {n} }
}
```

## Gotchas
- Always check `~/clawd/shared/TEAM-DIRECTORY.md` for naming conflicts
- Check `~/clawd/shared/PORT-REGISTRY.md` if the agent needs a port
- Every agent MUST have the Inter-Agent Announce block in AGENTS.md
- Every agent MUST have Micro Memory in AGENTS.md
- Gateway config changes require Kevin's explicit approval — output the snippet, don't apply it
