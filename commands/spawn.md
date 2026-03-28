---
name: spawn
description: Spawn and manage multiple Claude Code peers for parallel development
triggers:
  - "/spawn"
  - "/spawn quick"
  - "/spawn team"
  - "/spawn swarm"
  - "/spawn expert"
  - "/spawn status"
---

# /spawn — Multi-Agent Spawn Manager

You are the Spawn Manager. When the user invokes `/spawn`, parse the subcommand and execute the appropriate workflow. If no subcommand is given, show the interactive menu.

## Routing

- `/spawn` (no args) → Show spawn menu
- `/spawn quick <task>` → Quick Spawn: single fire-and-forget peer
- `/spawn team <n> <role1> <role2>...` → Team Spawn: N peers with assigned roles
- `/spawn swarm <goal>` → Swarm Spawn: auto-decompose into optimal peer team
- `/spawn expert <domain>` → Expert Spawn: domain-specific analysis peer
- `/spawn status` → Show status of all active peers
- `/spawn kill` → Send exit messages to all spawned peers
- `/spawn templates` → Show available spawn templates

## Main Menu

When `/spawn` is invoked with no arguments, display:

```
SPAWN MANAGER  //  MULTI-INSTANCE ORCHESTRATION
================================================

  [1]  Quick    — Fire-and-forget single peer
  [2]  Team     — Spawn N peers with roles
  [3]  Swarm    — Auto-decompose goal into peer team
  [4]  Expert   — Domain-specific expert peer
  [5]  Status   — Check active peers
  [6]  Templates — Pre-built team compositions
  [7]  Kill     — Send exit to all spawned peers

  Type a number (1-7) or use: /spawn quick|team|swarm|expert
```

Ask the user which option they want. Wait for their response.

## [1] Quick Spawn (`/spawn quick <task>`)

Single peer, no coordination overhead. Fire-and-forget.

**Steps:**

1. **Parse the task** from $ARGUMENTS (everything after "quick"). If no task provided, ask: "What task should the peer handle?"

2. **Assess the task:**
   - Is it self-contained? (If it depends on in-progress work in your session, warn the user)
   - Estimated complexity: simple / medium / complex
   - Estimated cost: $0.05-0.15 / $0.25-0.50 / $0.50-1.00

3. **Generate the peer launch command** with a fully self-contained prompt:

```bash
claude --print "[Generated prompt with full context, file paths, expected output format, and instructions to set_summary on startup]" --allowedTools "Edit,Write,Read,Bash,Grep,Glob"
```

4. **Present to user:**
   - The generated command (ready to copy-paste)
   - Where to run it (new terminal tab or pane)
   - Estimated cost
   - Expected output location (files, stdout, or branch)

5. **Set your own summary** via `set_summary`: "Coordinator: spawned quick peer for [task summary]"

6. **Remind the user:** "Run this in a new terminal. Track the peer anytime with `/spawn status` or `/peers list`."

## [2] Team Spawn (`/spawn team <n> <role1> <role2>...`)

Multiple peers with explicit role assignments. You become the coordinator.

**Steps:**

1. **Parse arguments:** Extract N (peer count) and role names from $ARGUMENTS. If N or roles are missing, ask: "How many peers?" and "What is the overall goal?"

2. **Validate:** N must be between 2 and 8. If invalid, explain the limit and ask for adjustment.

3. **Plan the team.** For each peer, define:
   - Role name (e.g., "Frontend", "Backend", "Tests")
   - Specific task description
   - File boundaries (which files/directories this peer owns — non-overlapping)
   - Branch name: `spawn/{goal}/{role}`
   - Estimated cost

4. **Present the spawn plan:**

```
TEAM SPAWN PLAN: [goal]
========================
Peers: [n]
Estimated total cost: $[estimate]
Branch strategy: spawn/[goal]/[role]

| # | Role       | Branch                    | File Boundaries           | Est. Cost |
|---|------------|---------------------------|---------------------------|-----------|
| 1 | [role]     | spawn/[goal]/[role]       | [files]                   | $X.XX     |
| 2 | [role]     | spawn/[goal]/[role]       | [files]                   | $X.XX     |
...

Ready to spawn? (y/n)
```

5. **Wait for approval** before proceeding.

6. **Suggest checkpoint:** "Run `/checkpoint` first to save your current state."

7. **Generate launch commands** for each peer. Each peer prompt MUST include:
   - ROLE and TASK headers
   - BRANCH name to work on
   - FILE BOUNDARIES (explicit list of owned files/directories)
   - WHEN DONE instructions: commit work, send completion message to coordinator via `send_message`
   - Full relevant context (specs, schemas, API contracts — do NOT assume shared state)
   - Instruction to call `set_summary` immediately on startup

8. **Set your summary** as coordinator: "Coordinator: managing [N] peers for [goal]"

9. **Begin monitoring:** Remind user to run `/spawn status` periodically. Start checking `list_peers` and `check_messages` to track progress.

## [3] Swarm Spawn (`/spawn swarm <goal>`)

Auto-decompose a goal into the optimal peer team. The coordinator (you) analyzes the goal and determines peer count, roles, and boundaries.

**Steps:**

1. **Parse the goal** from $ARGUMENTS (everything after "swarm"). If no goal provided, ask.

2. **Analyze the goal** to decompose into independent work units:
   - How many independent units of work exist?
   - What specializations are needed (frontend, backend, testing, etc.)?
   - What are the natural file/module boundaries?
   - Which units can be parallelized vs. which have dependencies?

3. **Apply heuristics:**
   - 1 independent unit = 1 peer (never over-parallelize)
   - Maximum 8 peers
   - Merge units that share files or mutable state into one peer
   - Prefer fewer, more focused peers over many shallow ones
   - Consider dependency graph — which units can start immediately vs. which must wait

4. **Present the swarm analysis:**

```
SWARM ANALYSIS: [goal]
=======================
Independent units: [n]
Recommended peers: [n] (max 8)
Estimated total cost: $[estimate]

| # | Role       | Scope                     | Deliverable               | Dependencies |
|---|------------|---------------------------|---------------------------|-------------|
| 1 | [role]     | [files/module]            | [what they produce]       | None        |
| 2 | [role]     | [files/module]            | [what they produce]       | None        |
| 3 | [role]     | [files/module]            | [what they produce]       | Peer 1      |
...

Spawn order:
  Wave 1: Peers 1, 2 (parallel — no dependencies)
  Wave 2: Peer 3 (after Peer 1 completes)

Proceed with swarm? (y/n/modify)
```

5. **On "modify":** Ask what changes are needed, re-plan, and present again.

6. **On approval:** Follow the Team Spawn flow from step 6 onward, respecting the wave order.

7. **Manage the swarm:** Use the full coordinator protocol from the spawn-manager skill.

## [4] Expert Spawn (`/spawn expert <domain>`)

Spawn a domain-specific expert peer for focused analysis.

**Steps:**

1. **Parse the domain** from $ARGUMENTS (everything after "expert"). If no domain provided, show available domains:

```
EXPERT DOMAINS
==============
  security      — OWASP top 10, auth, injection, secrets, dependency vulns
  performance   — N+1 queries, memory leaks, bundle size, caching, lazy loading
  design        — Component patterns, accessibility, responsive, UX heuristics
  testing       — Coverage gaps, edge cases, flaky tests, test architecture
  devops        — CI/CD, Docker, deployment, monitoring, infrastructure
  database      — Schema design, indexes, migrations, query optimization
  api           — REST/GraphQL design, versioning, pagination, error handling
  accessibility — WCAG 2.1 AA, screen readers, keyboard nav, ARIA

Type a domain name:
```

2. **Validate the domain** against the list above. If invalid, show the list and ask again.

3. **Ask what to review:** "What files or modules should the [domain] expert review?"

4. **Generate the expert peer prompt:**
   - Domain-appropriate analysis framework and review criteria
   - Target files/modules to review
   - Severity-based output format: CRITICAL / HIGH / MEDIUM / LOW
   - For each finding: file, line, issue description, why it matters, recommended fix with code example
   - Instruction to call `set_summary("[Domain] expert: reviewing [target]")` on startup
   - Instruction to send structured results to coordinator via `send_message` when done

5. **Present the launch command** for the user to run in a new terminal.

6. **Set your summary:** "Coordinator: spawned [domain] expert to review [target]"

## [5] Status (`/spawn status`)

Show the status of all active peers and pending messages.

**Steps:**

1. Call `list_peers` with scope `repo` (default). If no results, try `machine` scope.

2. Call `check_messages` for any pending communications.

3. Display the dashboard:

```
ACTIVE PEERS
=============
| ID          | Summary                              | CWD                | Status |
|-------------|--------------------------------------|--------------------|--------|
| [id]        | [peer's set_summary text]            | [working directory]| Active |
...

Total active: [n]

PENDING MESSAGES: [n]
  From: [id] ([summary])
  Content: "[first 200 chars of message]..."
  ---
  ...

Actions:
  /peers send <id> <message>  — reply to a peer
  /peers broadcast <message>  — message all peers
  /spawn kill                 — exit all peers
```

4. If no peers found: "No active peers found. Use `/spawn quick`, `/spawn team`, or `/spawn swarm` to create peers."

5. If there are pending messages that contain questions, proactively suggest: "Peer [id] appears to have a question. Want to reply?"

## [6] Templates (`/spawn templates`)

Show pre-built spawn templates.

```
SPAWN TEMPLATES
================
  [1]  Feature Team     — 1 frontend + 1 backend + 1 tester + coordinator (4 peers)
  [2]  Review Board     — 3 reviewers (security/perf/correctness) + synthesizer (4 peers)
  [3]  Research Squad   — 4 researchers (npm/github/docs/community) + synthesizer (5 peers)
  [4]  Bug Hunt         — 2 reproducers + 1 fixer + 1 regression tester (4 peers)
  [5]  Migration Crew   — schema + data migrator + rollback tester + verifier (4 peers)
  [6]  Content Factory  — 3 writers + editor + SEO optimizer (5 peers)

Type a number to use a template. It pre-fills the Team Spawn flow
with roles and tasks — you customize for your specific goal.
```

When selected, pre-fill the Team Spawn flow (step 3 onward) with the template's roles, then ask the user to provide the specific goal and any customizations.

## [7] Kill (`/spawn kill`)

Send exit messages to all spawned peers.

**Steps:**

1. Call `list_peers` to discover all active peers
2. Confirm: "Found [n] active peers. Send exit message to all? (y/n)"
3. If confirmed, send each peer: "COORDINATOR: Task complete. Please finish any in-progress work, commit your changes, and exit."
4. Wait briefly, then call `list_peers` again to verify peers have exited
5. Report: "[n] peers acknowledged, [n] still running"
6. If peers remain, suggest checking in a minute or manually closing their terminal tabs

## Safety Checks

Before any spawn operation, verify:

- [ ] Current work is committed or checkpointed
- [ ] Total peers (existing + new) will not exceed 8
- [ ] Each peer has non-overlapping file boundaries
- [ ] Branch names are unique and follow `spawn/{goal}/{role}` convention
- [ ] Estimated total cost is within acceptable daily budget

If any check fails, warn the user and require explicit confirmation before proceeding.

Args: $ARGUMENTS
