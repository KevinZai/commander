---
name: openclaw-bridge
description: Bridge Claude Code Bible skills and hooks to OpenClaw agent orchestration platform
triggers:
  - "/openclaw"
  - "/openclaw-bridge"
disable-model-invocation: true
---

# OpenClaw Bridge

> Connect the Claude Code Bible to the OpenClaw agent orchestration platform. Map skills, translate hooks, generate agent profiles, synchronize config, and hand off sessions between Claude Code and 38+ OpenClaw agents.

## What OpenClaw Is

OpenClaw is a personal AI assistant platform running on Mac Mini M4. It operates a single WebSocket + HTTP gateway on **port 18789**, orchestrating 38+ specialized agents across 12 workspaces. Each agent has its own model, channel bindings, tools, skills, and memory.

**Architecture:**
- **Gateway:** Single Node.js process (launchd-managed) at `http://localhost:18789`
- **Config:** `~/.openclaw/openclaw.json` (JSON5, ~139KB) — source of truth for all agents, channels, models, tools
- **Agent state:** `~/.openclaw/agents/{agentId}/sessions/` (JSONL transcripts)
- **Skills:** `~/.openclaw/skills/` (120+ installed) + per-workspace `skills/` dirs
- **Memory:** `~/.openclaw/memory/` (per-agent SQLite) + `~/.openclaw/lcm.db` (long-context memory)
- **Workspaces:** `~/clawd/workspaces/{name}/` with standard files (SOUL.md, AGENTS.md, TOOLS.md, IDENTITY.md, USER.md)

**Key agents:** Alfred (personal assistant), Morpheus (architect), Neo (orchestrator), Viper (trading), Jarvis (GN platform), Codex/Gemini/Claude (dev), Cleo (home).

## When to Use This Skill

- Deploying a Bible skill as an OpenClaw skill
- Translating Bible hooks to OpenClaw webhook format
- Generating OpenClaw agent personas from Bible workflow modes
- Creating OpenClaw workspace files from Bible config
- Handing off a Claude Code session to an OpenClaw agent (or vice versa)
- Synchronizing Bible config with OpenClaw config
- Debugging Bible-to-OpenClaw integration issues

---

## 1. Skill Mapping: Bible Skills to OpenClaw Skills

Bible skills live in `~/.claude/skills/{name}/SKILL.md` with YAML frontmatter. OpenClaw skills live in `~/.openclaw/skills/{name}/` with a different structure.

### Bible Skill Format
```yaml
---
name: my-skill
description: What this skill does
triggers:
  - "/my-skill"
allowed-tools:
  - Bash
  - Read
  - Write
---
# Skill Content (Markdown instructions)
```

### OpenClaw Skill Format
```json
{
  "id": "my-skill",
  "name": "My Skill",
  "description": "What this skill does",
  "version": "1.0.0",
  "triggers": ["/my-skill"],
  "instructions": "path/to/SKILL.md",
  "tools": ["bash", "read", "write"],
  "autoLoad": false
}
```

### Mapping Procedure

1. **Parse frontmatter** from the Bible SKILL.md
2. **Transform tool names:** Bible uses PascalCase (`Bash`, `Read`, `Write`), OpenClaw uses lowercase (`bash`, `read`, `write`). Map `AskUserQuestion` to `ask_user`. Map `TodoWrite` to `todo`.
3. **Copy skill content** to `~/.openclaw/skills/{name}/SKILL.md` — the markdown body is compatible as-is
4. **Generate skill manifest** in `~/.openclaw/skills/{name}/manifest.json`:

```json
{
  "id": "{name}",
  "name": "{name from frontmatter}",
  "description": "{description from frontmatter}",
  "version": "1.0.0",
  "source": "claude-code-bible",
  "triggers": ["{triggers from frontmatter}"],
  "instructions": "SKILL.md",
  "tools": ["{mapped tool names}"],
  "autoLoad": false,
  "category": "{inferred from skill path}"
}
```

5. **Register in openclaw.json** — add skill ID to the target agent's `skills` array

### Batch Mapping Command

```bash
# Map all Bible skills to OpenClaw format
for skill_dir in ~/.claude/skills/*/; do
  skill_name=$(basename "$skill_dir")
  if [ -f "$skill_dir/SKILL.md" ]; then
    mkdir -p ~/.openclaw/skills/$skill_name
    cp "$skill_dir/SKILL.md" ~/.openclaw/skills/$skill_name/
    # Generate manifest (use the openclaw-bridge hook or manual jq)
  fi
done
```

### Category Inference Table

| Bible Skill Path Pattern | OpenClaw Category |
|--------------------------|-------------------|
| `mega-*` | `mega-skill` |
| `mode-switcher` | `workflow` |
| `*-patterns` | `engineering` |
| `*-testing`, `tdd-*`, `e2e-*` | `testing` |
| `*-security`, `pentest-*`, `harden` | `security` |
| `*-cro`, `*-seo`, `marketing-*` | `marketing` |
| `openclaw-*` | `platform` |
| `paperclip*` | `platform` |
| Everything else | `general` |

---

## 2. Hook Translation: Bible Hooks to OpenClaw Webhooks

Bible hooks are Node.js scripts that read JSON from stdin and write JSON to stdout. OpenClaw hooks are HTTP webhooks (POST requests to the gateway).

### Bible Hook Format
```
stdin → { tool_name, tool_input, tool_output } → hook.js → stdout (passthrough)
                                                          → stderr (logging)
```

### OpenClaw Webhook Format
```
# NOTE: Gateway has NO HTTP webhook endpoints. Use CLI:
# openclaw message send --channel discord --target <id> --message "text" --silent

{
  "event": "bible_hook",
  "hookType": "PostToolUse|PreToolUse|Stop",
  "hookName": "context-guard",
  "source": "claude-code-bible",
  "version": "1.2",
  "timestamp": "2026-03-28T12:00:00.000Z",
  "tool": {
    "name": "Bash",
    "input": { "command": "ls" },
    "output": "file1.txt\nfile2.txt"
  },
  "session": {
    "id": "abc123",
    "cwd": "/Users/ai/project"
  },
  "metadata": {}
}
```

### Translation Rules

| Bible Field | OpenClaw Field | Notes |
|-------------|----------------|-------|
| `tool_name` | `tool.name` | Direct mapping |
| `tool_input` | `tool.input` | Direct mapping |
| `tool_output` | `tool.output` | Truncated to 10KB max |
| `process.env.CLAUDE_SESSION_ID` | `session.id` | Falls back to `SESSION_ID` |
| `process.cwd()` | `session.cwd` | Working directory |
| Hook filename | `hookName` | e.g., `context-guard` |
| Hook type from config | `hookType` | `PreToolUse`, `PostToolUse`, or `Stop` |

### Enabling Translation

Set `KZ_OPENCLAW_ENABLED=1` in your environment. The `openclaw-adapter.js` hook (included in this kit) handles the translation automatically for every PostToolUse event.

### Gateway Endpoint Registration

**NOTE:** The gateway has NO `/api/webhooks/*` endpoints. Use CLI or WebSocket RPC.
For channel binding in `openclaw.json`:

```json
{
  "webhooks": {
    "bible": {
      "enabled": true,
      "source": "claude-code-bible",
      "allowedEvents": ["bible_hook"],
      "targetAgent": "alfred",
      "logToComms": false
    }
  }
}
```

---

## 3. Agent Profile Generation: Bible Modes to OpenClaw Personas

The Bible's mode-switcher skill defines 9 workflow modes. Each maps to an OpenClaw agent persona configuration.

### Mode to Persona Mapping

| Bible Mode | OpenClaw Persona | Model Tier | Tone | Primary Workspace |
|------------|-----------------|------------|------|-------------------|
| `normal` | Default persona | Sonnet | Balanced, professional | `main` |
| `design` | Design Specialist | Sonnet | Creative, visual-first | `dev` |
| `saas` | SaaS Builder | Sonnet | Product-focused, metric-driven | `dev` |
| `marketing` | Marketing Strategist | Sonnet | Persuasive, brand-aware | `main` |
| `research` | Research Analyst | Opus | Thorough, citation-heavy | `architecture` |
| `writing` | Technical Writer | Sonnet | Clear, structured, concise | `main` |
| `night` | Night Owl | Flash | Minimal, cost-efficient | `worker` |
| `yolo` | Speed Runner | Flash | Fast, skip confirmations | `worker` |
| `unhinged` | Creative Chaos | Sonnet | Unrestricted, experimental | `dev` |

### Generating an OpenClaw Agent from a Mode

```bash
# Example: Generate a design-focused agent
cat > /tmp/agent-spec.json << 'EOF'
{
  "id": "design-agent",
  "name": "Pixel",
  "model": "claude-sonnet-4-6",
  "workspace": "dev",
  "thinking": "medium",
  "maxTokens": 8192,
  "persona": {
    "tone": "creative, visual-first",
    "role": "Design specialist — UI/UX, component architecture, visual systems",
    "boundaries": ["No backend work", "No database queries", "Defer security to Guardian"]
  },
  "skills": ["shadcn-ui", "frontend-design", "design-review", "tailwind-v4"],
  "sourceMode": "design"
}
EOF
```

### SOUL.md Template from Mode

```markdown
# SOUL.md — {Name} {Emoji}

You are {Name} — {role derived from mode}.

## Identity
- **Name:** {Name}
- **Model:** {model from mode mapping}
- **Workspace:** {workspace from mode mapping}
- **Source Mode:** {Bible mode name}

## Core Expertise
{Generated from mode's skill set}

## Vibe
{Tone from mode mapping}

## Boundaries
{Generated from mode's constraints}
```

---

## 4. Workspace Template Generator

Generate a complete OpenClaw workspace directory from Bible configuration.

### Input: Bible Config
```json
{
  "workspaceName": "my-project",
  "agentName": "Atlas",
  "agentEmoji": "🗺️",
  "role": "Project navigator and task coordinator",
  "model": "sonnet",
  "channel": "discord-my-project",
  "skills": ["task-commander", "delegation-templates", "executing-plans"]
}
```

### Output: Workspace Files

```
~/clawd/workspaces/my-project/
├── SOUL.md          # Persona, tone, boundaries
├── AGENTS.md        # Operating instructions, workflows
├── TOOLS.md         # Available tools and scripts
├── IDENTITY.md      # Name, model, channel metadata
├── USER.md          # Kevin's user context
├── HEARTBEAT.md     # Periodic check-in protocol
├── CRITICAL.md      # Hard rules
└── memory/          # Daily memory logs
    └── .gitkeep
```

### Generation Steps

1. Read Bible skills specified in config
2. Extract tool requirements from each skill's `allowed-tools`
3. Generate SOUL.md from agent name, role, and mode-inferred personality
4. Generate AGENTS.md with standard sections: Channel-Aware Mode, Hard Rules, Session Start, Core Loop, Memory Protocol, Inter-Agent Announce
5. Generate TOOLS.md from aggregated tool list
6. Generate IDENTITY.md from agent metadata
7. Copy USER.md from `~/clawd/workspaces/architecture/USER.md`
8. Create HEARTBEAT.md with default check-in schedule
9. Create CRITICAL.md with fleet-wide hard rules
10. Create `memory/` directory

---

## 5. Session Handoff: Claude Code to OpenClaw Agents

Hand off an active Claude Code session to an OpenClaw agent for continuation.

### Claude Code to OpenClaw

```bash
# 1. Save current session state
/save-session

# 2. Build handoff payload
cat > /tmp/handoff.json << 'EOF'
{
  "type": "session_handoff",
  "from": "claude-code",
  "to": "{target-agent-id}",
  "sessionFile": "~/.claude/sessions/{session-id}.md",
  "context": {
    "cwd": "/current/working/directory",
    "task": "Brief description of what needs to continue",
    "files": ["list", "of", "relevant", "files"],
    "progress": "What has been done so far",
    "nextSteps": "What the receiving agent should do next"
  }
}
EOF

# 3. Send to OpenClaw via sessions_send
# Gateway has no HTTP REST API - use CLI
openclaw sessions send --agent "$targetAgent" --file /tmp/handoff.json
```

### OpenClaw to Claude Code

When an OpenClaw agent needs Claude Code to take over:

1. Agent posts handoff context to `#comms-log` channel
2. Agent writes session summary to `~/clawd/workspaces/{workspace}/memory/handoff-{date}.md`
3. Claude Code user runs `/resume-session` or reads the handoff file directly

### Handoff Protocol

| Step | Actor | Action |
|------|-------|--------|
| 1 | Sender | Save session state and pending tasks |
| 2 | Sender | Build handoff payload with context, files, progress |
| 3 | Sender | Send via `sessions_send` or REST API |
| 4 | Sender | Post to `#comms-log` for audit trail |
| 5 | Receiver | Read handoff payload |
| 6 | Receiver | Load referenced files and session context |
| 7 | Receiver | Continue from `nextSteps` |
| 8 | Receiver | Post acknowledgment to `#comms-log` |

---

## 6. Shared Memory Protocol

Synchronize session memory between Bible sessions (`~/.claude/sessions/`) and OpenClaw memory databases (`~/.openclaw/memory/`).

### Bible Session Format
```markdown
# Session — 2026-03-28T12:00:00.000Z
- **Session ID:** abc123
- **Working Directory:** /Users/ai/project
- **Key Decisions:** [list]
- **Files Modified:** [list]
- **Lessons Learned:** [list]
```

### OpenClaw Memory Format
```markdown
# 2026-03-28
[DECISION] Chose X over Y because Z
[CORRECTION] Fixed approach to A — was doing B, should be C
[LEARNED] Pattern D works well for situation E
[HANDOFF] Session abc123 → agent-id for continuation
```

### Sync Rules

1. **Bible to OpenClaw:** On `/save-session`, extract tagged entries and append to `~/clawd/workspaces/{workspace}/memory/{date}.md`
2. **OpenClaw to Bible:** On `/resume-session`, scan recent OpenClaw memory files for `[HANDOFF]` and `[DECISION]` tags relevant to current project
3. **Conflict resolution:** OpenClaw memory is append-only. Bible sessions are snapshots. No destructive merges. Both sources are additive.
4. **Tag mapping:**

| Bible Concept | OpenClaw Tag | Direction |
|---------------|-------------|-----------|
| Key Decisions | `[DECISION]` | Bidirectional |
| Lessons Learned | `[LEARNED]` | Bible to OpenClaw |
| Corrections | `[CORRECTION]` | Bidirectional |
| Session Handoff | `[HANDOFF]` | Bidirectional |
| File Changes | `[CHANGED]` | Bible to OpenClaw |
| Task Progress | `[PROGRESS]` | OpenClaw to Bible |

---

## 7. Config Sync: bible-config.json to openclaw.json

### Bible Config Location
Settings in `~/.claude/settings.json` and hook config in `~/.claude/settings.json` under `hooks`.

### OpenClaw Config Location
`~/.openclaw/openclaw.json` — monolithic JSON5 config.

### Sync Points

| Bible Config Key | OpenClaw Config Key | Sync Direction |
|------------------|---------------------|----------------|
| `skills[]` | `agents[].skills[]` | Bible to OpenClaw |
| `hooks[]` | `webhooks.bible` | Bible to OpenClaw |
| `allowedTools[]` | `agents[].tools[]` | Informational only |
| Mode (active) | `agents[].persona` | Bible to OpenClaw |
| Session cost | `budgets.daily` | OpenClaw to Bible |

### Sync Procedure

```bash
# 1. Always backup first
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup-$(date +%Y%m%d-%H%M%S)

# 2. Read Bible skills list
bible_skills=$(jq -r '.skills // [] | .[]' ~/.claude/settings.json 2>/dev/null)

# 3. Map to OpenClaw skill IDs (strip paths, normalize names)
# 4. Update target agent's skill array in openclaw.json via jq
# 5. Validate with openclaw doctor
openclaw doctor
```

**NEVER** sync destructively. Always add, never remove. OpenClaw config changes require Kevin's approval if they affect gateway behavior.

---

## 8. Mega-Skill to Workspace Mapping

Bible mega-skills map to OpenClaw workspaces and agent specializations.

| Bible Mega-Skill | OpenClaw Workspace | Primary Agent | Model |
|-------------------|-------------------|---------------|-------|
| `mega-devops` | `dev` | Codex | Sonnet |
| `mega-security` | `architecture` | Morpheus | Opus |
| `mega-testing` | `dev` | Codex | Sonnet |
| `mega-design` | `dev` | Pixel (worker) | Sonnet |
| `mega-marketing` | `main` | Alfred | Sonnet |
| `mega-saas` | `dev` | Codex | Sonnet |
| `mega-seo` | `main` | Alfred | Sonnet |
| `mega-research` | `architecture` | Morpheus | Opus |
| `mega-data` | `dev` | Codex | Sonnet |
| `mega-mobile` | `dev` | Codex | Sonnet |

### Loading a Mega-Skill via OpenClaw

When an OpenClaw agent needs a mega-skill's capabilities, it loads the skill by ID and gains access to all absorbed sub-skills. The routing logic in the mega-skill's SKILL.md handles dispatch to the correct sub-skill.

---

## 9. Setup Instructions

### Prerequisites
- OpenClaw gateway running on `localhost:18789`
- Claude Code Bible installed (`~/.claude/skills/`, `~/.claude/hooks/`)
- `curl` and `jq` available in PATH

### Step 1: Enable the Bridge

```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export KZ_OPENCLAW_ENABLED=1
# Optional: enable debug logging
# export KZ_OPENCLAW_DEBUG=1
```

### Step 2: Install the Adapter Hook

The `openclaw-adapter.js` hook ships with this kit. Verify it is registered in your hooks config:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": ["hooks/openclaw-adapter.js"]
      }
    ]
  }
}
```

### Step 3: Register Webhook Endpoint

Add to `~/.openclaw/openclaw.json` (after backup):

```json
{
  "webhooks": {
    "bible": {
      "enabled": true,
      "source": "claude-code-bible",
      "allowedEvents": ["bible_hook"],
      "targetAgent": "alfred"
    }
  }
}
```

### Step 4: Validate

```bash
# Check gateway is running
curl -s http://localhost:18789/health  # Only HTTP endpoint that works

# Test CLI communication
openclaw message send --channel discord --target 1480676421457416306 \
  -H "Content-Type: application/json" \
  -d '{"event":"bible_hook","source":"test","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}'

# Run openclaw doctor
openclaw doctor
```

---

## 10. Troubleshooting

### Gateway Not Running

```
Symptom: curl to localhost:18789 fails with "Connection refused"
Fix: Check launchd — `launchctl list | grep openclaw`
     Check logs — `openclaw gateway logs --lines 20`
     Do NOT restart without Kevin's approval
```

### Webhook Failures (HTTP 4xx/5xx)

```
Symptom: openclaw-adapter.js logs errors to stderr
Debug: Set KZ_OPENCLAW_DEBUG=1, re-run, check stderr output
Common causes:
  - 401: Missing or expired auth token
  - 404: Webhook endpoint not registered in openclaw.json
  - 413: Payload too large — tool_output exceeds 10KB truncation limit
  - 500: Gateway internal error — check `openclaw gateway logs`
```

### Config Mismatches

```
Symptom: Skills available in Bible but not in OpenClaw agent
Debug: Compare skill lists
  Bible: jq '.skills' ~/.claude/settings.json
  OpenClaw: jq '.agents[] | select(.id == "TARGET") | .skills' ~/.openclaw/openclaw.json
Fix: Run sync procedure (Section 7), then openclaw doctor
```

### Session Handoff Failures

```
Symptom: Target agent does not pick up handoff
Debug: Check #comms-log for handoff post
  Verify target agent is online — openclaw agents list
  Check session file exists at the path specified in handoff payload
Fix: Resend via sessions_send, or post directly to agent's channel
```

### Skill Mapping Errors

```
Symptom: Mapped skill fails to load in OpenClaw
Debug: Validate manifest.json format — must be valid JSON
  Check skill ID does not conflict with existing OpenClaw skills
  Verify SKILL.md was copied to ~/.openclaw/skills/{name}/
Fix: Regenerate manifest, ensure no trailing commas in JSON
```

### Memory Sync Gaps

```
Symptom: Decisions made in Claude Code not visible to OpenClaw agents
Debug: Check ~/.claude/sessions/ for recent session files
  Check ~/clawd/workspaces/{workspace}/memory/ for today's file
Fix: Run /save-session in Claude Code, then verify memory file was written
  Manual fallback: copy relevant entries to memory file
```

---

## Quick Reference

| Operation | Command / Endpoint |
|-----------|-------------------|
| Check gateway health | `curl -s http://localhost:18789/health` |
| Send webhook | `POST /api/webhooks/bible` |
| Session handoff | `POST /api/sessions/send` |
| List agents | `openclaw agents list` |
| Validate config | `openclaw doctor` |
| View logs | `openclaw gateway logs --lines 50` |
| Enable bridge | `export KZ_OPENCLAW_ENABLED=1` |
| Enable debug | `export KZ_OPENCLAW_DEBUG=1` |
| Backup config | `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup-$(date +%Y%m%d-%H%M%S)` |
