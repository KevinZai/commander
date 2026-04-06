---
name: peers
description: Discover and communicate with other Claude Code instances
triggers:
  - "/peers"
  - "/peers list"
  - "/peers send"
  - "/peers status"
  - "/peers broadcast"
---

# /peers — Claude Peers Communication Hub

You are the Claude Peers communication interface. When the user invokes `/peers`, parse the subcommand and execute the appropriate action using the Claude Peers MCP tools. If no subcommand is given, show active peers with their summaries.

## Routing

- `/peers` or `/peers list` → Call `list_peers`, show active peers with summaries
- `/peers send <id> <message>` → Send message to specific peer
- `/peers status` → Show all peers with their current work status and pending messages
- `/peers broadcast <message>` → Send message to all active peers
- `/peers summary <text>` → Update your own summary
- `/peers check` → Check for incoming messages
- `/peers help` → Quick reference card

## `/peers` or `/peers list` — List Active Peers

Discover all active Claude Code instances visible from this machine.

**Steps:**

1. Call `list_peers` with scope `repo` (default — peers in the same git repository)

2. If no peers found with `repo` scope, automatically try `directory` then `machine` scope. Report which scope returned results.

3. Display results:

```
ACTIVE PEERS (scope: repo)
===========================

  ID: abc123def456
  Summary: "Backend peer: implementing JWT auth endpoints"
  CWD: ~/project/src/api
  ---

  ID: xyz789ghi012
  Summary: "Frontend peer: building login page components"
  CWD: ~/project/src/components
  ---

  ID: mno345pqr678
  Summary: "Test writer: writing auth integration tests"
  CWD: ~/project/tests
  ---

Total: 3 peers found

Actions:
  /peers send <id> <message>  — message a specific peer
  /peers broadcast <message>  — message all peers
  /peers status               — full dashboard with messages
```

4. If no peers found at any scope:

```
NO PEERS FOUND
===============
No other Claude Code instances detected on this machine.

To create peers:
  - Open a new terminal tab and run: claude
  - Or use: /spawn quick <task>
  - Or use: /spawn team <n>

Peers auto-discover each other via the Claude Peers MCP server.
No configuration needed.
```

## `/peers send <id> <message>` — Send Direct Message

Send a message to a specific peer by its instance ID.

**Steps:**

1. **If no peer ID provided:**
   - Call `list_peers` to show available peers
   - Ask: "Which peer? (paste their ID or type a keyword from their summary)"
   - If user types a keyword (e.g., "backend"), match it against peer summaries and use the matching peer's ID

2. **If no message provided:**
   - Ask: "What message do you want to send?"

3. **Format the message** with structure for machine-readability:

```
TYPE: [infer from content — request / status_update / question / result / instruction]
FROM: [your current summary or "Coordinator"]
---
[User's message content]
```

4. **Call `send_message`** with the peer ID and formatted message

5. **Confirm delivery:**

```
MESSAGE SENT
=============
To: [peer ID] ([peer summary excerpt])
Type: [inferred message type]
Content: [first 100 chars...]

Tip: Use /peers check to see their reply.
```

## `/peers status` — Full Status Dashboard

Show comprehensive overview of the peer network including all peers, your own summary, and pending messages.

**Steps:**

1. Call `list_peers` (scope: `repo`)
2. Call `check_messages`

3. Display the dashboard:

```
PEER NETWORK STATUS
====================

YOUR SUMMARY: "[your current summary]"
(Update with: /peers summary <new text>)

ACTIVE PEERS: [n]
------------------
  [1] abc123 — "Backend: JWT auth endpoints — 80% complete" — /project/src/api
  [2] xyz789 — "Frontend: login components — blocked on API" — /project/src/components
  [3] mno345 — "Tests: auth integration — waiting for endpoints" — /project/tests

PENDING MESSAGES: [n]
----------------------
  From: abc123 (Backend)
  Message: "STATUS: Completed all 4 auth endpoints. POST /login, POST /register,
           POST /refresh, DELETE /logout. Committed to spawn/auth/backend.
           Ready for merge."

  From: mno345 (Tests)
  Message: "QUESTION: Should auth middleware return 401 or 403 for expired tokens?
           The spec says 401 but existing code uses 403. Please advise."

ACTIONS:
  /peers send <id> <reply>    — reply to a specific peer
  /peers broadcast <message>  — message all peers
  /peers check                — refresh messages
  /spawn kill                 — exit all peers
```

4. If pending messages contain questions, proactively suggest: "Peer [id] ([summary]) is waiting for a response. Want to reply?"

5. If a peer's summary mentions "blocked" or "waiting", highlight it: "Peer [id] appears blocked. They may need input from you."

## `/peers broadcast <message>` — Broadcast to All Peers

Send a message to every active peer simultaneously.

**Steps:**

1. Call `list_peers` to get all active peers

2. If no peers found, report and suggest: "No active peers. Use `/spawn` to create some."

3. If message not provided, ask: "What message do you want to broadcast to all [n] peers?"

4. **Confirm before sending:**

```
BROADCAST PREVIEW
==================
To: [n] peers
Message: [content]

Send to all? (y/n)
```

5. If confirmed, call `send_message` for each peer with the formatted message

6. Report results:

```
BROADCAST SENT
===============
Delivered to [n] peers:
  - abc123 (Backend)
  - xyz789 (Frontend)
  - mno345 (Tests)
```

**Common broadcast scenarios:**
- Phase transition: "Switching to testing phase. Please wrap up current work."
- Merge coordination: "Committing and merging in 5 minutes. Push your branches now."
- Emergency stop: "STOP — blocking issue found in shared schema. Do not commit."
- Status request: "All peers: please send your current status and progress percentage."
- Completion signal: "All tasks done. Send your final status and exit when ready."

## `/peers summary <text>` — Update Your Summary

Set or update your summary visible to all other peers.

**Steps:**

1. If no text provided, show current summary and ask for a new one

2. Call `set_summary` with the provided text

3. Confirm:

```
SUMMARY UPDATED
================
New summary: "[text]"

All peers will see this when they call list_peers.
```

**Recommended summary formats:**

```
Coordinator: managing 3 peers for auth feature — merging backend
Backend: implementing JWT endpoints — 80% complete
Frontend: building login components — blocked on API contract
Tests: writing integration tests — 12/20 test cases done
Security reviewer: auditing auth module — found 2 critical issues
Idle: finished task, available for reassignment
```

## `/peers check` — Check Incoming Messages

Manually poll for messages from other peers.

**Steps:**

1. Call `check_messages`

2. If messages found, display each:

```
INCOMING MESSAGES
==================

[1] From: abc123 (Backend peer: JWT auth endpoints)
    CWD: /project/src/api
    Message:
    "STATUS: Complete. All 4 auth endpoints implemented and tested locally.
     Files changed: src/api/auth.ts, src/api/middleware/jwt.ts, src/db/users.ts
     Branch: spawn/auth/backend — 3 commits pushed.
     Ready for merge."

[2] From: mno345 (Test writer: auth integration tests)
    CWD: /project/tests
    Message:
    "QUESTION: The auth middleware returns 401 for expired tokens, but should it
     return 401 or 403? The spec says 401 but the existing codebase uses 403 in
     similar cases. Please advise."

Reply to a message: /peers send <id> <reply>
```

3. If no messages:

```
NO NEW MESSAGES
================
No pending messages from peers.

Tip: Peers send messages asynchronously. Check back in a few minutes,
or use /peers status for a full overview.
```

## `/peers help` — Quick Reference

Display compact reference card:

```
CLAUDE PEERS — QUICK REFERENCE
================================

DISCOVERY:
  /peers              — List active peers
  /peers list         — Same as /peers
  /peers status       — Full dashboard with messages

COMMUNICATION:
  /peers send <id> <msg>   — Direct message to a peer
  /peers broadcast <msg>   — Message all active peers
  /peers check             — Check for incoming messages

IDENTITY:
  /peers summary <text>    — Set your visible summary

UNDERLYING MCP TOOLS:
  list_peers          — Raw peer discovery (scope: machine|directory|repo)
  send_message        — Raw message send (requires peer ID)
  set_summary         — Raw summary update
  check_messages      — Raw message check

TIPS:
  - Always set your summary when starting work
  - Respond to peer messages immediately — pause current task, reply, resume
  - Include full context in messages — peers do not share your session
  - Use /spawn to create new peers — /peers manages existing ones
  - Messages are ephemeral — save important data to files, not messages

RELATED COMMANDS:
  /spawn              — Create and manage peer instances
  /spawn status       — Track spawned peer progress
  /spawn kill         — Exit all spawned peers
```

## Message Response Protocol

When you detect an incoming peer message (via `check_messages` or a `<channel source="claude-peers">` notification):

1. **Pause current work** immediately — do not finish the current step first
2. **Read the message** — check from_id, from_summary, from_cwd for context
3. **Respond via `send_message`** with helpful, complete information
4. **Resume your previous work** after responding

This is the Claude Peers contract: treat incoming messages like a coworker tapping your shoulder. Answer right away.

## Scope Selection Guide

| Scope | When to Use | Example |
|-------|-------------|---------|
| `repo` | Same git repo (default, most common) | Feature team on same project |
| `directory` | Same working directory | Tight collaboration on same module |
| `machine` | Any instance on this machine | Cross-project coordination, resource sharing |

`/peers list` defaults to `repo` and auto-escalates if no peers are found. To force a specific scope, call `list_peers` directly with the scope parameter.

## Integration with /spawn

| Action | Use /peers | Use /spawn |
|--------|-----------|------------|
| Find existing peers | `/peers list` | `/spawn status` |
| Message a peer | `/peers send` | -- |
| Broadcast to all | `/peers broadcast` | -- |
| Update your summary | `/peers summary` | -- |
| Check messages | `/peers check` | -- |
| Create new peers | -- | `/spawn quick/team/swarm/expert` |
| Kill all peers | -- | `/spawn kill` |
| See templates | -- | `/spawn templates` |

Use `/peers` for **communication**. Use `/spawn` for **lifecycle management**.

Args: $ARGUMENTS
