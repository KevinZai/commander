---
name: ccc-openclaw-coordination
description: Cross-agent coordination between CCC and OpenClaw fleet
version: 1.1.0
category: orchestration
updated: 2026-05-15
---

# OpenClaw Coordination

Patterns for coordinating between CC Commander sessions and the OpenClaw agent fleet.

---

## 🚨 CRITICAL — Agent-to-agent comms (read this first)

**Posting to a Discord channel from a bot account does NOT trigger the agent assigned to that channel.** Each agent has `allowFrom` set to Kevin's Discord user ID (`798385347888283649`) in `~/.openclaw/openclaw.json`. Messages sent by the bot — including the openclaw default service account — are filtered out.

**Symptom:** You "send" a message to #prism / #alfred / #morpheus and get a Discord ✅ ID back. The agent never sees it. Kevin sees it. Agent does not respond.

### ❌ WRONG — silent black hole

```bash
openclaw message send --channel discord --target 1480681745669160960 --message "..."
# Returns: ✅ Sent. Message ID: 1504681753149837392
# But the target agent's allowFrom rejects the post. Only Kevin sees it.
```

### ✅ RIGHT — direct Gateway dispatch (bypasses allowFrom)

```bash
openclaw agent --agent prism --deliver --message "..."
# Triggers an actual agent turn via the Gateway.
# Agent processes the message, runs its loop, responds.
# Use --deliver to send the agent's reply back to the channel.
```

### When each pattern applies

| Goal | Use |
|------|-----|
| Trigger an agent to actually process a task | `openclaw agent --agent <name> --deliver --message "..."` |
| Post a status update for Kevin to read | `openclaw message send --channel discord --target <chan> --message "..."` |
| Post for Kevin AND have the agent see it | Both — post for Kevin, then dispatch via `openclaw agent` for the agent |

### Routing reference (2026-05-15)

| Agent | Workspace | Role | Default model |
|-------|-----------|------|---------------|
| Alfred | workspaces/main | Default CCO assistant | Opus 4.8 |
| Morpheus | workspaces/main | System infra (backups, OC config, agent health, PM2) | Opus 4.8 |
| Prism | workspaces/main | Chief Product Officer (strategy, PRDs, ideas) | Sonnet 5 |
| Jarvis | workspaces/guestnetworks | GN technical | Opus 4.8 |
| Damian | workspaces/guestnetworks | GN ops | Sonnet 5 |
| Cleo | workspaces/home | Personal | GPT-5.5 |
| Trading | workspaces/trading | Markets | GPT-5.5 |

**Topic routing (humans + Claude sessions both follow this):**
- System / infra / config / PM2 / backups / agent health → **Morpheus**
- Product / strategy / scoping / market → **Prism**
- Code / dev tasks / repos → **Alfred** (he delegates downstream)
- GN platform → **Jarvis** or **Damian** (Jarvis for tech, Damian for ops)

---

## Task Handoff

### CCC to Alfred (general tasks)

```bash
openclaw agent --agent alfred --deliver --message "Task: <description>
Context: <files / branch / project>
Expected output: <what you need back>"
```

Alfred evaluates scope, routes to specialist if needed, reports via comms-log.

### CCC to specific specialist

```bash
# Architecture review
openclaw agent --agent morpheus --deliver --message "Review architecture for X"

# Product strategy
openclaw agent --agent prism --deliver --message "Should we ship feature Y? Score it."

# Code review
openclaw agent --agent codex --deliver --message "Review diff at <path>"
```

Include explicit context: project path, branch, relevant files. No assume-they-know.

---

## Agent Assist

### Quick consult

```bash
openclaw agent --agent <name> --deliver --message "<question>"
```

Agent responds in same conversation. CCC continues with the answer.

Use for: architecture questions, code review, security checks, product calls.

### Parallel work

```
1. CCC works on frontend (branch: cc-42-frontend)
2. Hand off backend via `openclaw agent --agent codex --deliver --message "Implement backend for CC-42 on branch cc-42-backend"`
3. Both report progress to Paperclip
4. CCC merges when both complete
```

---

## Event Forwarding

### CCC hook → OpenClaw

```
Hook fires (e.g., test failure) →
  POST to OpenClaw Gateway (localhost:18789) →
    Gateway dispatches to agent based on routing →
      Agent investigates and reports
```

### OpenClaw → CCC

```
Agent completes task →
  Posts to comms-log channel →
    CCC polls or receives webhook →
      Updates local state / Linear
```

---

## Integration Checklist

- [ ] OpenClaw gateway running (`openclaw gateway status` or `curl http://localhost:18789/health`)
- [ ] Agent name correct (`openclaw agents list` to verify)
- [ ] Paperclip API accessible (`curl localhost:3100/health`)
- [ ] comms-log channel configured for notifications
- [ ] CCC has `OPENCLAW_GATEWAY_URL` in environment

---

## Anti-Patterns

- ❌ **Posting to Discord channel** when you need agent action. Use `openclaw agent --agent` instead.
- ❌ Sending large file contents via message — pass file paths instead
- ❌ Circular task chains (CCC → Agent → CCC → Agent)
- ❌ Bypassing the right specialist (don't ask Alfred about marketing when Prism is the right call)
- ❌ Modifying `~/.openclaw/openclaw.json` from CCC — route config changes via Morpheus
- ❌ Assuming the agent has session memory of your prior message — restate the context

---

## Verification — did the agent actually receive my message?

```bash
# Use --deliver and look at the stdout — actual agent response comes back inline.
openclaw agent --agent <name> --deliver --message "test ping, reply with timestamp"
```

If the command hangs >30s or returns no agent text, the dispatch failed. Check:
1. Gateway running (`curl http://localhost:18789/health`)
2. Agent name spelled right (`openclaw agents list`)
3. Agent has a configured model + valid auth

---

## Source of truth

This file is canonical at `~/clawd/projects/cc-commander/skills/openclaw-coordination/SKILL.md`.
Mirrored copies live at:
- `~/.claude/plugins/marketplaces/commander-hub/skills/openclaw-coordination/SKILL.md`
- `~/clawd/scripts/laptop-clone/dotfiles/claude/skills/openclaw-coordination/SKILL.md`

Last updated: 2026-05-15 — codified the Discord allowFrom workaround after two failed attempts (Prism + Morpheus) by Claude Code (kevinzai session).
