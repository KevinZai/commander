---
name: openclaw-bridge
description: |
  Bridge between Claude Code Bible and OpenClaw (38-agent orchestration platform).
  Maps Bible skills to OpenClaw skills, translates hooks to webhook format, generates
  agent profiles from Bible modes, creates workspace templates, handles session handoff
  between Claude Code and OpenClaw agents, and syncs configuration.
triggers:
  - /openclaw-bridge
  - openclaw bridge
  - openclaw integration
  - bible to openclaw
  - sync openclaw
  - openclaw config sync
---

# OpenClaw Bridge

## Overview

OpenClaw is a 38-agent orchestration platform running on localhost:18789. This skill bridges Bible configurations, skills, and hooks into OpenClaw's format, enabling Bible-powered workflows to run across OpenClaw's agent fleet.

**Key Paths:**
- OpenClaw gateway: `http://localhost:18789`
- Config: `~/.openclaw/openclaw.json` (JSON5, source of truth)
- Agent state: `~/.openclaw/agents/{agentId}/sessions/`
- Skills: `~/.openclaw/skills/`
- Memory: `~/.openclaw/memory/` (per-agent SQLite)
- Bible config: `~/.claude/` (skills, hooks, commands, settings)

## Mapping Bible Skills to OpenClaw Skills

### Skill Format Translation

Bible skills are single SKILL.md files. OpenClaw skills are directories with a `skill.json` manifest and a `prompt.md` content file.

**Bible SKILL.md:**
```markdown
---
name: my-skill
description: Does something useful
triggers:
  - /my-skill
  - my skill trigger
---

# My Skill

Instructions here...
```

**OpenClaw equivalent:**
```
~/.openclaw/skills/my-skill/
  skill.json    # Metadata
  prompt.md     # Skill content (body of SKILL.md)
```

**skill.json:**
```json
{
  "id": "my-skill",
  "name": "my-skill",
  "description": "Does something useful",
  "version": "1.0.0",
  "source": "bible",
  "triggers": ["/my-skill", "my skill trigger"],
  "tags": ["bible", "imported"],
  "autoLoad": false,
  "requiredTools": []
}
```

### Automated Skill Sync

Run this to sync all Bible skills to OpenClaw format:

```bash
#!/bin/bash
# bible-to-openclaw-skills.sh
# Syncs Bible SKILL.md files to OpenClaw skill format

BIBLE_SKILLS="$HOME/.claude/skills"
OPENCLAW_SKILLS="$HOME/.openclaw/skills"

for skill_dir in "$BIBLE_SKILLS"/*/; do
  skill_file="$skill_dir/SKILL.md"
  [ -f "$skill_file" ] || continue

  skill_name=$(basename "$skill_dir")
  target_dir="$OPENCLAW_SKILLS/bible-$skill_name"

  mkdir -p "$target_dir"

  # Extract frontmatter fields
  description=$(sed -n '/^---$/,/^---$/p' "$skill_file" | grep '^description:' | sed 's/^description:\s*//')
  name=$(sed -n '/^---$/,/^---$/p' "$skill_file" | grep '^name:' | sed 's/^name:\s*//')

  # Write skill.json
  cat > "$target_dir/skill.json" <<EOJSON
{
  "id": "bible-$skill_name",
  "name": "${name:-$skill_name}",
  "description": "${description:-Imported from Bible}",
  "version": "1.0.0",
  "source": "bible",
  "tags": ["bible", "imported"],
  "autoLoad": false
}
EOJSON

  # Extract body (everything after second ---)
  sed '1,/^---$/d; 1,/^---$/d' "$skill_file" > "$target_dir/prompt.md"

  echo "Synced: $skill_name -> bible-$skill_name"
done

echo "Done. Run 'openclaw doctor' to validate."
```

### Priority Mapping

Bible skills and OpenClaw skills can coexist. Naming convention prevents collisions:

| Source | Naming | Example |
|---|---|---|
| Bible native | `skill-name` | `overnight-runner` |
| OpenClaw native | `skill-name` | `openclaw-health-check` |
| Bible imported to OpenClaw | `bible-skill-name` | `bible-overnight-runner` |

When both exist, OpenClaw agents use the OpenClaw-native version. Bible-imported versions are fallbacks.

## Hook Translation: Bible Hooks to OpenClaw Webhooks

Bible hooks are Node.js scripts that run in Claude Code's hook lifecycle (PreToolUse, PostToolUse, Stop). OpenClaw uses HTTP webhooks for event notification.

### Hook Event Mapping

| Bible Hook Event | OpenClaw Webhook | Payload |
|---|---|---|
| PreToolUse | `POST /api/webhooks/bible/pre-tool` | `{ tool, input, sessionId }` |
| PostToolUse | `POST /api/webhooks/bible/post-tool` | `{ tool, output, sessionId, duration }` |
| Stop | `POST /api/webhooks/bible/session-end` | `{ sessionId, summary, cost }` |
| cost-alert threshold | `POST /api/webhooks/bible/cost-alert` | `{ sessionId, cost, threshold }` |
| auto-checkpoint | `POST /api/webhooks/bible/checkpoint` | `{ sessionId, editCount, stashRef }` |
| confidence-gate fail | `POST /api/webhooks/bible/confidence-low` | `{ sessionId, score, task }` |

### Webhook Adapter

Use the `hooks/openclaw-adapter.js` hook (see FILE 6) to translate Bible hook events to OpenClaw webhooks in real time. The adapter:

1. Reads the PostToolUse event from stdin
2. Transforms it to OpenClaw's webhook payload format
3. POSTs to `http://localhost:18789/api/webhooks/bible`
4. Falls back gracefully if OpenClaw is not running
5. Controlled by `KZ_OPENCLAW_ENABLED` environment variable

### Registering Webhooks in OpenClaw

Add the Bible webhook endpoint to `openclaw.json`:

```json5
{
  "webhooks": {
    "bible": {
      "enabled": true,
      "endpoints": {
        "pre-tool": "/api/webhooks/bible/pre-tool",
        "post-tool": "/api/webhooks/bible/post-tool",
        "session-end": "/api/webhooks/bible/session-end",
        "cost-alert": "/api/webhooks/bible/cost-alert",
        "checkpoint": "/api/webhooks/bible/checkpoint",
        "confidence-low": "/api/webhooks/bible/confidence-low"
      },
      "auth": "bearer",
      "source": "claude-code-bible"
    }
  }
}
```

## Agent Profile Generation from Bible Modes

Bible has 9 workflow modes. Each mode maps to an OpenClaw agent profile template.

### Mode-to-Profile Mapping

| Bible Mode | OpenClaw Profile | Model | Persona Traits |
|---|---|---|---|
| normal | `bible-standard` | Sonnet | Balanced, task-focused, verification-oriented |
| design | `bible-designer` | Sonnet | Visual, UX-focused, accessibility-aware |
| saas | `bible-saas` | Sonnet | Metrics-driven, customer-focused, growth-oriented |
| marketing | `bible-marketer` | Sonnet | Creative, brand-conscious, conversion-optimized |
| research | `bible-researcher` | Opus | Deep analysis, citation-heavy, systematic |
| writing | `bible-writer` | Sonnet | Polished prose, audience-aware, structured |
| night | `bible-night-worker` | Flash | Cost-efficient, batch-oriented, checkpoint-heavy |
| yolo | `bible-yolo` | Sonnet | Fast, minimal verification, ship-first |
| unhinged | `bible-unhinged` | Sonnet | Creative, unconventional, experimental |

### Profile Generator Script

```bash
#!/bin/bash
# generate-openclaw-profiles.sh
# Creates OpenClaw agent profiles from Bible modes

PROFILES_DIR="$HOME/.openclaw/profiles/bible"
mkdir -p "$PROFILES_DIR"

generate_profile() {
  local mode=$1 model=$2 traits=$3
  cat > "$PROFILES_DIR/bible-${mode}.json" <<EOJSON
{
  "id": "bible-${mode}",
  "name": "Bible ${mode^} Profile",
  "model": "${model}",
  "source": "bible-mode-switcher",
  "traits": "${traits}",
  "systemPromptAppend": "You are operating in ${mode} mode. Follow the Bible mode-switcher rules for this mode.",
  "skills": ["bible-mode-switcher"],
  "costTier": "$([ "$model" = "flash" ] && echo "free" || echo "standard")",
  "maxTurns": $([ "$mode" = "night" ] && echo "200" || echo "100")
}
EOJSON
  echo "Generated: bible-${mode}"
}

generate_profile "normal" "sonnet" "balanced, task-focused, verification-oriented"
generate_profile "design" "sonnet" "visual, UX-focused, accessibility-aware"
generate_profile "saas" "sonnet" "metrics-driven, customer-focused, growth-oriented"
generate_profile "marketing" "sonnet" "creative, brand-conscious, conversion-optimized"
generate_profile "research" "opus" "deep analysis, citation-heavy, systematic"
generate_profile "writing" "sonnet" "polished prose, audience-aware, structured"
generate_profile "night" "flash" "cost-efficient, batch-oriented, checkpoint-heavy"
generate_profile "yolo" "sonnet" "fast, minimal verification, ship-first"
generate_profile "unhinged" "sonnet" "creative, unconventional, experimental"

echo "Profiles generated in $PROFILES_DIR"
```

## Workspace Template Generator

Generate OpenClaw workspace files from a Bible project configuration.

### Standard Workspace Files

Bible projects map to OpenClaw workspaces:

| Bible Source | OpenClaw File | Purpose |
|---|---|---|
| `CLAUDE.md` | `AGENTS.md` | Operating instructions |
| Mode config | `IDENTITY.md` | Agent metadata |
| Prompt templates | `SOUL.md` | Persona and tone |
| `.claude/settings.json` | `TOOLS.md` | Available tools |
| User instructions | `USER.md` | Human context |

### Template Generator

```bash
#!/bin/bash
# generate-workspace.sh <project-path> <workspace-name>

PROJECT=$1
WORKSPACE=$2
WORKSPACE_DIR="$HOME/clawd/workspaces/$WORKSPACE"

mkdir -p "$WORKSPACE_DIR/memory"

# AGENTS.md from CLAUDE.md
if [ -f "$PROJECT/CLAUDE.md" ]; then
  cp "$PROJECT/CLAUDE.md" "$WORKSPACE_DIR/AGENTS.md"
  echo "Created AGENTS.md from CLAUDE.md"
fi

# IDENTITY.md
cat > "$WORKSPACE_DIR/IDENTITY.md" <<EOF
# Identity

- **Workspace:** $WORKSPACE
- **Source:** Bible project at $PROJECT
- **Created:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Model:** sonnet
- **Channel:** #$WORKSPACE
EOF

# TOOLS.md from settings.json
if [ -f "$PROJECT/.claude/settings.json" ]; then
  echo "# Tools" > "$WORKSPACE_DIR/TOOLS.md"
  echo "" >> "$WORKSPACE_DIR/TOOLS.md"
  echo "Sourced from: \`$PROJECT/.claude/settings.json\`" >> "$WORKSPACE_DIR/TOOLS.md"
  echo "" >> "$WORKSPACE_DIR/TOOLS.md"
  echo '```json' >> "$WORKSPACE_DIR/TOOLS.md"
  cat "$PROJECT/.claude/settings.json" >> "$WORKSPACE_DIR/TOOLS.md"
  echo '```' >> "$WORKSPACE_DIR/TOOLS.md"
  echo "Created TOOLS.md from settings.json"
fi

echo "Workspace created at: $WORKSPACE_DIR"
```

## Session Handoff: Claude Code <-> OpenClaw Agents

### Claude Code to OpenClaw

When a Claude Code session needs to hand off work to an OpenClaw agent:

1. **Write handoff file:**
```json
{
  "from": "claude-code",
  "to": "alfred",
  "timestamp": "2026-03-28T10:00:00Z",
  "context": {
    "project": "/path/to/project",
    "branch": "feat/new-feature",
    "checkpoint": "tasks/checkpoint.json",
    "currentTask": "Implement API endpoints",
    "completedSteps": ["Schema design", "Model creation"],
    "remainingSteps": ["Route handlers", "Tests", "Documentation"]
  },
  "instructions": "Continue from checkpoint. Route handlers need auth middleware.",
  "skills": ["senior-backend", "verification-loop"]
}
```

2. **Send via OpenClaw API:**
```bash
curl -s -X POST http://localhost:18789/api/sessions/handoff \
  -H 'Content-Type: application/json' \
  -d @tasks/handoff-to-openclaw.json
```

3. **Or via inter-agent protocol:**
```bash
# Use sessions_send to message the target agent
curl -s -X POST http://localhost:18789/api/sessions/send \
  -H 'Content-Type: application/json' \
  -d '{
    "targetAgent": "alfred",
    "message": "Handoff from Claude Code. Read tasks/handoff-to-openclaw.json for context.",
    "priority": "high"
  }'
```

### OpenClaw to Claude Code

When an OpenClaw agent needs interactive Claude Code follow-up:

1. Agent writes result to the shared project directory
2. Agent posts a handoff flag: `tasks/openclaw-handoff-{agentId}.json`
3. Next Claude Code session detects the flag in session-startup
4. Claude Code reads context and continues

```json
{
  "from": "alfred",
  "to": "claude-code",
  "timestamp": "2026-03-28T14:30:00Z",
  "status": "needs-review",
  "summary": "API endpoints implemented. 2 tests failing -- need human judgment on auth approach.",
  "artifacts": [
    "src/routes/api.ts",
    "tests/api.test.ts",
    "output/alfred-review.md"
  ],
  "blockers": [
    "Test auth-middleware.test.ts:45 -- unclear if JWT or session auth intended",
    "Test rate-limit.test.ts:23 -- rate limit config not in .env.example"
  ]
}
```

## Shared Memory Protocol

Bible sessions and OpenClaw agents can share context through a common memory format.

### Memory File Format

Both systems write to markdown files with tagged entries:

```markdown
# Memory -- 2026-03-28

## [DECISION] Auth approach
JWT with refresh tokens. RSA256. 15min access, 7d refresh.
Source: Claude Code session, confirmed by Morpheus.

## [LEARNED] Rate limiting
Use express-rate-limit with Redis store for distributed deployments.
In-memory store acceptable for single-instance.

## [CORRECTION] API response format
Always use envelope: { success, data, error, meta }.
Previous code was returning raw data arrays.

## [CONTEXT] Project state
- Branch: feat/api-v2
- Last commit: abc1234
- Tests: 42 pass, 2 fail
- Coverage: 78%
```

### Sync Direction

```
Claude Code -> writes to -> project/tasks/memory-sync.md
     |
     v
Bible session-startup reads on next session
     |
     v
OpenClaw agent reads via workspace memory
     |
     v
OpenClaw agent -> writes to -> workspace/memory/YYYY-MM-DD.md
     |
     v
Claude Code reads on next session (via openclaw-handoff flag)
```

## Config Sync: Bible <-> OpenClaw

### What Syncs

| Bible Config | OpenClaw Config | Direction |
|---|---|---|
| `~/.claude/settings.json` | `~/.openclaw/openclaw.json` tools section | Bible -> OpenClaw |
| Bible skills | `~/.openclaw/skills/bible-*` | Bible -> OpenClaw |
| Bible hooks | OpenClaw webhooks | Bible -> OpenClaw (via adapter) |
| OpenClaw agent list | Bible session context | OpenClaw -> Bible (read-only) |
| OpenClaw costs | Bible cost-alert | OpenClaw -> Bible (webhook) |

### Sync Script

```bash
#!/bin/bash
# sync-bible-openclaw.sh
# One-way sync: Bible config -> OpenClaw compatibility layer

echo "=== Bible -> OpenClaw Sync ==="

# 1. Sync skills
echo "Syncing skills..."
bash ~/.claude/scripts/bible-to-openclaw-skills.sh

# 2. Verify webhook registration
echo "Checking webhook registration..."
curl -s http://localhost:18789/api/webhooks | jq '.bible // "NOT REGISTERED"'

# 3. Check adapter hook is installed
if grep -q "openclaw-adapter" ~/.claude/settings.json 2>/dev/null; then
  echo "OpenClaw adapter hook: installed"
else
  echo "OpenClaw adapter hook: NOT INSTALLED"
  echo "  Add openclaw-adapter.js to PostToolUse hooks in settings.json"
fi

# 4. Verify gateway is reachable
if curl -s --max-time 2 http://localhost:18789/api/health >/dev/null 2>&1; then
  echo "OpenClaw gateway: reachable"
else
  echo "OpenClaw gateway: NOT REACHABLE"
fi

echo "=== Sync complete ==="
```

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Webhook POST fails | Gateway not running | Check `openclaw gateway status` |
| Skill not found in OpenClaw | Not synced | Run `bible-to-openclaw-skills.sh` |
| Handoff file not detected | Wrong path | Use project root `tasks/` directory |
| Agent not responding | Wrong session key | Check `shared/INTER-AGENT-PROTOCOL.md` |
| Config sync stale | Manual edit without sync | Re-run `sync-bible-openclaw.sh` |
| Memory conflict | Both systems wrote same entry | OpenClaw version wins (latest timestamp) |

## Safety Rules

1. **Never modify `~/.openclaw/openclaw.json` directly** -- use `openclaw config set` or request via Morpheus
2. **Never restart gateway** without Kevin's explicit approval
3. **Backup before config changes** -- `cp file file.backup-$(date +%Y%m%d-%H%M%S)`
4. **Sync is one-way by default** -- Bible -> OpenClaw (read-only from OpenClaw)
5. **Skills are prefixed** -- all Bible-imported skills use `bible-` prefix in OpenClaw
6. **Webhooks are optional** -- Bible works fine without OpenClaw; adapter fails gracefully
7. **Costs are independent** -- Bible and OpenClaw track costs separately; do not double-count
