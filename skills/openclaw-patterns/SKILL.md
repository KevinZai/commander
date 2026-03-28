---
name: openclaw-patterns
description: Production patterns from a 38-agent orchestration system — COMP protocol, atomic messaging, cost-aware routing, escalation boundaries
tags: [patterns, multi-agent, orchestration, best-practices]
disable-model-invocation: true
---

# OpenClaw Production Patterns

Battle-tested patterns extracted from a production system running 38 AI agents across 12 workspaces. These patterns work standalone — no OpenClaw dependency required.

## 1. COMP System (Commit-Operate-Message-Prove)

Every agent action follows this protocol:

```
COMMIT   → Declare what you're about to do (in task tracker)
OPERATE  → Execute the task
MESSAGE  → Report results (to requester + comms log)
PROVE    → Provide evidence (screenshot, test output, diff)
```

**Why it works:** Creates an audit trail. Any agent can pick up where another left off. Eliminates "I thought I did that" failures.

**How to apply:** Before any multi-step task, write your plan to tasks/todo.md (COMMIT). Execute each step (OPERATE). Update the task with results (MESSAGE). Include verification output (PROVE).

## 2. Daily Micro-Commits

Commit frequently with small, atomic changes:
- Every function/component gets its own commit
- Commit message references the task ID
- Never batch more than 30 minutes of work

**Why:** Enables easy rollback, clear git blame, and lets other agents understand changes.

## 3. Atomic Messaging Protocol

When agents communicate:
- Every message includes: sender, recipient, action, context, expected response
- Every send pairs with a log entry (audit trail)
- Messages are self-contained (recipient shouldn't need to read prior context)

**How to apply in Claude Code:** When using subagents, give complete context in the prompt. Don't assume the subagent has your conversation history.

## 4. Cost-Aware Routing

Route tasks to the cheapest capable model:

| Task Type | Model Tier | Examples |
|-----------|-----------|----------|
| Simple transforms | Free (Ollama, CF Workers) | Format conversion, template fill |
| Code generation | $ (Flash, Groq) | Boilerplate, tests, docs |
| Complex coding | $$ (Sonnet) | Architecture, debugging, review |
| Deep reasoning | $$$ (Opus) | System design, security audit |

**Rule:** Always try the cheaper tier first. Escalate only if quality is insufficient.

## 5. Escalation Boundaries

Clear rules for when to escalate:
- **Stay at current level:** Task is within scope, no blockers
- **Escalate up:** Task needs 2+ agents, spans multiple sessions, needs human approval
- **Escalate to human:** Security concerns, destructive operations, budget exceeded, architectural decisions

## 6. Role-Based Permissions

Each agent/mode has explicit boundaries:
- What files it can read/write
- What commands it can execute
- What external services it can call
- What budget it can spend

**Apply via:** Claude Code's `permissions.allow` and `permissions.deny` in settings.json.

## 7. Profile Injection

Load context based on the task, not the session:
- Workspace-specific instructions (like modes in the Bible)
- Task-specific tool access
- Time-bounded permissions (night mode = more autonomy)

## 8. Session Handoff Protocol

When a session runs out of context or needs fresh start:
1. Save state: `/save-session` or auto via pre-compact hook
2. Write handoff note: what's done, what's next, any blockers
3. New session reads: CLAUDE.md → tasks/todo.md → session file → resume

**This is exactly what the Bible's hooks automate:** context-guard warns at 70%, pre-compact saves before compaction, session-coach gives periodic guidance.

## Integration with Bible Components

| OpenClaw Pattern | Bible Equivalent |
|-----------------|-----------------|
| COMP system | tasks/todo.md + /verify |
| Micro-commits | auto-checkpoint hook |
| Cost routing | Mode system (normal/yolo/night) |
| Escalation | confidence-gate hook |
| Session handoff | pre-compact hook + /save-session |
| Role permissions | Mode-based permission configs |
