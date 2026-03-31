---
name: openclaw-coordination
description: Cross-agent coordination between CCC and OpenClaw fleet
version: 1.0.0
category: orchestration
---

# OpenClaw Coordination

Patterns for coordinating between CC Commander sessions and the OpenClaw agent fleet.

## Task Handoff

Hand off work from a CCC session to an OpenClaw agent:

### CCC to Alfred (General Tasks)

```
1. CCC identifies task that needs multi-agent orchestration
2. Use sessions_send to Alfred with task description
3. Alfred evaluates scope and routes to Neo if needed
4. Neo creates Paperclip issue and assigns agent
5. CCC monitors via Paperclip API (localhost:3110)
```

### CCC to Specific Agent

```
1. Identify the right agent for the task:
   - Codex/Gemini/Claude (dev workspace) for code work
   - Viper (trading workspace) for market analysis
   - Morpheus (architecture) for design review
2. Use sessions_send with the agent's session key
3. Include context: project path, branch, relevant files
4. Agent executes and reports back via comms-log
```

## Agent Assist

Request help from an OpenClaw agent during a CCC session:

### Quick Consult

```
Pattern: Ask an agent a question without full task handoff
1. sessions_send to target agent with question
2. Agent responds in same session thread
3. CCC continues with the answer
Use for: architecture questions, code review, security checks
```

### Parallel Work

```
Pattern: CCC and OpenClaw agent work simultaneously
1. CCC works on frontend (branch: cc-42-frontend)
2. Hand off backend to Codex (branch: cc-42-backend)
3. Both report progress to Paperclip
4. CCC merges when both complete
```

## Event Forwarding

Bridge events between CCC hooks and OpenClaw:

### CCC Hook to OpenClaw

```
Hook fires (e.g., test failure) ->
  POST to OpenClaw gateway (localhost:18789) ->
    Gateway routes to appropriate agent ->
      Agent investigates and reports
```

### OpenClaw to CCC

```
Agent completes task ->
  Posts to comms-log channel ->
    CCC polls or receives webhook ->
      Updates local state/Linear
```

## Integration Checklist

- [ ] OpenClaw gateway running (`openclaw gateway status`)
- [ ] Session keys available for target agents
- [ ] Paperclip API accessible (localhost:3110)
- [ ] comms-log channel configured for notifications
- [ ] CCC has `OPENCLAW_GATEWAY_URL` in environment

## Anti-Patterns

- Do NOT send large file contents via sessions_send (use file paths instead)
- Do NOT create circular task chains (CCC -> Agent -> CCC -> Agent)
- Do NOT bypass Neo for multi-agent tasks (always route through orchestrator)
- Do NOT modify openclaw.json from CCC (use Morpheus for config changes)
