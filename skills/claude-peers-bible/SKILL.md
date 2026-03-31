---
name: claude-peers-bible
description: Master guide to Claude Peers — the built-in MCP server for multi-instance communication, coordination, and parallel development workflows
tags: [peers, multi-agent, collaboration, mcp, parallel]
triggers:
  - "/peers"
  - "/claude-peers"
  - "/peer"
---

# Claude Peers — Multi-Instance Communication

Claude Peers is a built-in MCP server in Claude Code that allows multiple Claude Code instances running on the same machine to discover each other, communicate, and collaborate in real time. No extra configuration required — it ships with Claude Code.

This is the foundation for all multi-instance parallel development in CC Commander.

## What Claude Peers Provides

Four MCP tools available to every Claude Code instance:

| Tool | Purpose | When to Call |
|------|---------|-------------|
| `list_peers` | Discover other active Claude Code instances | Before sending messages, to find peers and their IDs |
| `send_message` | Send a message to a specific peer by ID | When you need to communicate results, ask questions, or coordinate |
| `set_summary` | Set a 1-2 sentence summary visible to all peers | On startup and whenever your focus changes |
| `check_messages` | Manually poll for incoming messages | When waiting for peer responses or periodically during long tasks |

## Discovery Scopes

`list_peers` accepts a scope parameter that controls which instances are visible:

| Scope | Finds | Use Case |
|-------|-------|----------|
| `machine` | All Claude Code instances on the machine | Cross-project coordination, resource sharing |
| `directory` | Instances in the same directory | Feature team working on same project |
| `repo` | Instances in the same git repository | Most common — team working on same codebase |

Default scope is `repo`. Start with `repo` scope unless you have a specific reason to go broader.

## Message Anatomy

When you receive a message via `check_messages` or a `<channel source="claude-peers">` notification, it includes:

- **from_id** — The peer's unique instance ID (use this to reply)
- **from_summary** — What the sender is working on (set via `set_summary`)
- **from_cwd** — The sender's working directory
- **content** — The actual message body

Always read `from_summary` and `from_cwd` to understand context before responding.

## Setup Protocol

No MCP configuration needed. Claude Peers is available by default. Every instance should follow this startup sequence:

1. **Set your summary immediately** — Call `set_summary` with a concise description of your role and current task
2. **Discover peers** — Call `list_peers` to see who else is active
3. **Announce if coordinating** — If you are a coordinator, send a message to each peer confirming the work plan

```
Example set_summary:
"Coordinator: managing 3 peers for auth feature — frontend, backend, tests"

"Backend peer: implementing JWT auth endpoints for /api/auth/*"

"Security reviewer: auditing auth implementation for OWASP top 10"
```

## Communication Patterns

### Pattern 1: Coordinator

One Claude Code instance manages the workflow. Others report to it.

```
Coordinator (you)
  |-- send_message --> Peer A (frontend)
  |-- send_message --> Peer B (backend)
  |-- send_message --> Peer C (tests)
  |
  |<-- check_messages -- Results from A, B, C
  |
  V
Synthesize, merge, verify
```

**Best for:** Feature development, build pipelines, any workflow needing a single point of control.

**Coordinator responsibilities:**
1. Plan the work breakdown before spawning peers
2. Send each peer a self-contained prompt with all necessary context
3. Poll `list_peers` periodically to confirm peers are still alive
4. Collect results via `check_messages`
5. Handle failures — respawn or reassign if a peer stops responding
6. Synthesize results and run final verification

### Pattern 2: Swarm

Multiple equal peers collaborate without a designated leader. Each discovers others and communicates directly.

```
Peer A <---> Peer B
  ^            ^
  |            |
  v            v
Peer C <---> Peer D
```

**Best for:** Exploratory research, brainstorming, when no single peer has authority over others.

**Protocol:**
1. Each peer sets a descriptive summary on startup
2. Before starting work, each calls `list_peers` to see the full team
3. Peers send findings to all others as they discover them
4. Any peer can request help from another by sending a targeted message
5. Convergence happens organically — peers build on each other's findings

### Pattern 3: Expert Panel

Specialized instances handle specific domains. A synthesizer collects all expert opinions.

```
Expert: Security ----\
Expert: Performance --+--> Synthesizer --> Final Report
Expert: UX ----------/
```

**Best for:** Code review, architecture decisions, audit workflows.

**Each expert:**
1. Sets summary describing their domain ("Security expert: reviewing auth module for vulnerabilities")
2. Receives the artifact to review via `send_message` from the synthesizer
3. Conducts domain-specific analysis independently
4. Sends structured findings back to synthesizer

**Synthesizer:**
1. Distributes the review target to all experts
2. Collects all expert reports
3. Merges findings, resolves conflicts, ranks by severity
4. Produces unified report

### Pattern 4: Writer-Reviewer

One instance writes, another reviews. The writer iterates based on feedback.

```
Writer --> send_message(code) --> Reviewer
Writer <-- send_message(feedback) <-- Reviewer
Writer --> send_message(revised) --> Reviewer
Writer <-- send_message(approved) <-- Reviewer
```

**Best for:** TDD pairs, code review loops, documentation review.

### Pattern 5: Research Fanout

Multiple instances search in parallel. One synthesizes all findings.

```
Researcher A (search: npm packages) ----\
Researcher B (search: GitHub repos) -----+--> Synthesizer --> Recommendation
Researcher C (search: blog posts) ------/
Researcher D (search: benchmarks) -----/
```

**Best for:** Technology evaluation, competitive analysis, dependency audits.

## Bible-Optimized Workflows

### Parallel Feature Build

Spawn 3 peers to build a feature simultaneously:

| Peer | Role | Branch | Task |
|------|------|--------|------|
| Coordinator | Manage and merge | `feature/main` | Track progress, resolve conflicts, run final E2E |
| Frontend | UI implementation | `feature/frontend` | Components, pages, styling |
| Backend | API implementation | `feature/backend` | Endpoints, validation, database |
| Tests | Test suite | `feature/tests` | Unit tests, integration tests, E2E scaffolding |

**Flow:**
1. Coordinator sends detailed specs to each peer with file boundaries
2. Each peer works on their branch independently
3. Peers send progress updates to coordinator every 10-15 minutes
4. Coordinator merges branches in order: backend, frontend, tests
5. Coordinator runs full E2E suite to verify integration

### Multi-Perspective Review

Spawn 3 reviewer peers for thorough code review:

```
Coordinator sends PR diff to:
  1. Security Reviewer  --> checks OWASP, auth, injection, secrets
  2. Performance Reviewer --> checks N+1 queries, memory, caching
  3. Correctness Reviewer --> checks logic, edge cases, error handling

Each sends structured report:
  { severity: "critical|high|medium|low", findings: [...] }

Coordinator merges into unified review.
```

### Overnight Build Swarm

5+ peers tackling independent features while you sleep:

1. Coordinator creates a work manifest with 5-10 independent tasks
2. Each peer gets one task with full context (no shared state needed)
3. Each peer commits to its own branch on completion
4. Each peer sends completion status to coordinator
5. Coordinator tracks progress, respawns failed peers
6. Morning: coordinator presents summary of all completed work

Combine with the `overnight-runner` skill for auto-checkpoint and cost controls.

### Dialectic Review via Peers

Architecture decisions benefit from structured debate:

| Peer | Role | Instruction |
|------|------|-------------|
| FOR | Advocate | Build the strongest case for Option A. Cover benefits, feasibility, precedent. |
| AGAINST | Critic | Build the strongest case against Option A. Cover risks, costs, alternatives. |
| Referee | Judge | Receive both arguments. Score on technical merit, risk, reversibility. Declare winner with reasoning. |

**Protocol:**
1. Coordinator sends the decision question to FOR and AGAINST simultaneously
2. FOR and AGAINST work independently (no communication between them)
3. Both send their arguments to Referee
4. Referee evaluates and sends verdict to Coordinator
5. Coordinator presents the decision with full reasoning chain

## Message Format Best Practices

Always use structured messages for machine-readable communication between peers:

```
TYPE: status_update | request | result | error | question
FROM_ROLE: coordinator | frontend | backend | tester | reviewer
TASK_ID: optional task identifier
---
[Message body with full context]
```

**Rules:**
1. **Always set_summary** when starting work and when focus changes
2. **Respond immediately** to peer messages — pause current work, reply, then resume
3. **Include full context** in every message — peers do not share your session state
4. **Never assume shared knowledge** — each peer has its own context window
5. **Use structured formats** so peers can parse messages programmatically
6. **Checkpoint before sending large outputs** — if your message includes code, save it to a file and send the path instead
7. **Handle disconnects** — if `list_peers` shows a peer disappeared, reassign their work or flag the issue

## Integration with Task Commander

For complex tasks (P6+ in CC Commander priority system), Task Commander can leverage peers:

1. Task Commander evaluates the task scope
2. If parallelizable, it creates a work breakdown with independent units
3. Each unit becomes a peer prompt — self-contained with all context
4. Coordinator peer tracks status and estimated cost per peer
5. Circuit breaker: if a peer stops responding after 3 polls, mark as failed and reassign
6. Cost ceiling: if total peer spend exceeds threshold, kill non-essential peers
7. On completion, coordinator synthesizes all results and runs verification

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `list_peers` returns empty | No other instances running, or wrong scope | Check scope parameter; verify other instances are started |
| Messages not received | Peer exited or crashed | Call `list_peers` to verify peer is alive; respawn if needed |
| Peer has stale summary | Peer didn't update after focus change | Send a message asking for status update |
| Too many peers (>8) | Resource exhaustion risk | Kill non-essential peers; limit concurrent instances |
| Merge conflicts | Multiple peers edited same files | Assign clear file boundaries; coordinator resolves conflicts |
| Peer in wrong scope | Using `machine` when `repo` is needed | Specify scope explicitly in `list_peers` calls |

## Cost Awareness

Each Claude Code peer consumes its own context window and API tokens:

- **Estimate before spawning:** Roughly gauge how many tokens each peer's task will need
- **Set a ceiling:** Coordinator should track total estimated spend across all peers
- **Kill early if stuck:** A peer spinning without progress is burning money
- **Prefer fewer, focused peers** over many unfocused ones
- **Reuse context:** If multiple peers need the same reference material, have the coordinator summarize it rather than each peer reading the full source

## Quick Start Checklist

Starting a multi-peer workflow:

- [ ] Plan work breakdown — identify independent units
- [ ] Determine peer count (2-8, usually 3-4)
- [ ] Write self-contained prompts for each peer (no context bleeding)
- [ ] Define file boundaries so peers do not edit the same files
- [ ] Define branch strategy (one branch per peer, coordinator merges)
- [ ] Set your own summary as coordinator
- [ ] Spawn peers and send initial instructions
- [ ] Poll `list_peers` every few minutes to track health
- [ ] Collect results via `check_messages`
- [ ] Run full verification after merging all peer work
- [ ] Clean up — ensure all peers have exited
