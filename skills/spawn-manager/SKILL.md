---
name: spawn-manager
description: Spawn and manage multiple Claude Code peers for parallel development
triggers:
  - "/spawn"
  - "/spawn-manager"
  - "/multi-agent"
disable-model-invocation: true
---

# Spawn Manager — Multi-Agent Parallel Development

Spawn Manager helps you launch, coordinate, and manage multiple Claude Code instances (peers) working in parallel on the same machine. It builds on Claude Peers MCP (the built-in peer discovery and messaging layer) and adds structured spawning patterns, team templates, cost tracking, and safety controls.

Use this when your task benefits from parallelism: independent workstreams, multi-perspective review, research fanout, or any scenario where 2-8 Claude Code instances working simultaneously outperform one instance working sequentially.

## Prerequisites

Claude Peers MCP ships with Claude Code. No configuration needed. Every Claude Code instance on the same machine can discover and message other instances automatically.

Four MCP tools are available to every instance:

| Tool | Purpose |
|------|---------|
| `list_peers` | Discover active Claude Code instances (scopes: machine, directory, repo) |
| `send_message` | Send a message to a specific peer by its instance ID |
| `set_summary` | Broadcast a 1-2 sentence summary of your current work (visible to all peers) |
| `check_messages` | Poll for incoming messages from other peers |

## Spawning Patterns

### 1. Quick Spawn

Fire-and-forget single peer for a focused, self-contained task. Zero coordination overhead.

**When to use:** You need one thing done in the background while you continue your own work. The task is independent and does not require back-and-forth.

**How to spawn:**

```bash
# Non-interactive — peer runs the task, prints output, and exits:
claude --print "Your focused task here" --allowedTools "Edit,Write,Read,Bash,Grep,Glob"

# Interactive — peer stays open for follow-up:
claude
# Then paste: set_summary("Quick spawn: [task description]") and begin
```

**Examples:**

```bash
# Write tests while you implement the feature
claude --print "Write comprehensive unit tests for src/auth/jwt.ts. Cover all exported functions, edge cases, and error paths. Use Vitest. Output to src/auth/__tests__/jwt.test.ts"

# Generate API docs while you build endpoints
claude --print "Generate OpenAPI 3.1 spec for all routes in src/api/. Output to docs/openapi.yaml"

# Security audit while you code
claude --print "Audit src/ for OWASP top 10 vulnerabilities. Report as markdown with severity, file:line, issue, and fix. Output to reports/security-audit.md"
```

### 2. Team Spawn

Spawn N peers with explicitly assigned roles, file boundaries, and tasks. You remain the coordinator.

**When to use:** A feature decomposes into 2-5 independent workstreams that can run simultaneously. Each peer owns a clear slice of the codebase.

**How to spawn:**

1. Define the work breakdown: roles, tasks, file boundaries, branch names
2. Open N terminal tabs or panes (iTerm2 split panes, tmux, etc.)
3. Launch a Claude Code instance in each with role-specific instructions
4. Set your own summary: `set_summary("Coordinator: managing N peers for [goal]")`
5. Monitor with `list_peers` and `check_messages`
6. Merge branches when all peers complete

**Peer launch template:**

```bash
claude --print "
ROLE: [role name — e.g., Frontend Developer]
TASK: [specific deliverable — e.g., Build the settings page with form validation]
BRANCH: spawn/[goal]/[role]
FILE BOUNDARIES: [explicit list of files/directories this peer owns]
WHEN DONE: Commit your work, then send a message to the coordinator peer:
  'DONE: [summary of what was built, any issues, files changed]'
Call set_summary('[Role]: [status]') immediately on startup and whenever your focus changes.

CONTEXT:
[Paste all relevant context: specs, API contracts, schemas, type definitions, examples.
The peer does NOT share your session. Include everything it needs.]
"
```

**Example — Auth feature team of 3:**

```bash
# Terminal 1 — Backend
claude --print "ROLE: Backend Developer
TASK: Implement JWT auth — signup, login, refresh, logout endpoints
BRANCH: spawn/auth/backend
FILE BOUNDARIES: src/api/auth/, src/services/auth/, src/db/migrations/
..."

# Terminal 2 — Frontend
claude --print "ROLE: Frontend Developer
TASK: Build login page, signup page, forgot-password flow
BRANCH: spawn/auth/frontend
FILE BOUNDARIES: src/pages/auth/, src/components/auth/, src/hooks/useAuth.ts
..."

# Terminal 3 — Tests
claude --print "ROLE: Test Engineer
TASK: Write unit + integration tests for auth endpoints and pages
BRANCH: spawn/auth/tests
FILE BOUNDARIES: tests/auth/, src/__tests__/auth/
..."
```

### 3. Swarm Spawn

Describe a goal and let the coordinator auto-determine the optimal peer count and role distribution.

**When to use:** You have a large goal but are not sure how to decompose it. The coordinator analyzes the goal and spawns the right team.

**Decomposition process:**

1. State the goal
2. Coordinator analyzes: How many independent units of work? What specializations? What file boundaries?
3. Coordinator applies these heuristics:
   - 1 independent unit = 1 peer (never over-parallelize)
   - Cap at 8 peers (resource limit on a single machine)
   - Each peer must have non-overlapping file ownership
   - If two units share state or files, merge them into one peer
   - Estimate total cost before spawning
4. Coordinator presents the plan: peer count, roles, estimated cost
5. On approval, coordinator spawns the team
6. Swarm works in parallel
7. Coordinator collects, merges, and verifies

**Example:**

```
/spawn swarm "Migrate the entire auth system from NextAuth to Better Auth.
Update all API routes, middleware, session handling, and client-side hooks.
Write migration tests. Update documentation."
```

Coordinator might decompose this into:
- Peer 1: Backend migration (API routes, middleware, session)
- Peer 2: Frontend migration (hooks, components, pages)
- Peer 3: Test writer (migration tests, regression tests)
- Peer 4: Documentation updater (README, API docs, migration guide)

### 4. Expert Spawn

Spawn a single domain-specialist peer pre-configured with domain-specific analysis instructions.

**When to use:** You need specialized analysis (security audit, performance review, design critique, accessibility check) without context-switching from your current task.

**Available expert domains:**

| Domain | Summary Prefix | Focus Areas |
|--------|---------------|-------------|
| `security` | "Security expert:" | OWASP top 10, auth flows, injection, secrets exposure, dependency vulns |
| `performance` | "Performance expert:" | N+1 queries, memory leaks, bundle size, caching, lazy loading, Core Web Vitals |
| `design` | "Design expert:" | Component patterns, accessibility, responsive design, UX heuristics, visual consistency |
| `testing` | "Testing expert:" | Coverage gaps, edge cases, flaky tests, test architecture, mocking strategy |
| `devops` | "DevOps expert:" | CI/CD pipeline, Docker, deployment config, monitoring, infrastructure as code |
| `database` | "Database expert:" | Schema design, indexes, migrations, query optimization, connection pooling |
| `api` | "API expert:" | REST/GraphQL design, versioning, pagination, error handling, rate limiting |
| `accessibility` | "A11y expert:" | WCAG 2.1 AA, screen readers, keyboard navigation, ARIA, color contrast |

**Launch template:**

```bash
claude --print "
You are a [domain] expert. Call set_summary('[Domain] expert: reviewing [target]').

REVIEW TARGET: [file paths, module names, or description of what to review]

Analyze from a [domain] perspective. Structure your findings as:

CRITICAL: [must fix before shipping — security holes, data loss risks, crashes]
HIGH: [should fix soon — performance regressions, accessibility failures]
MEDIUM: [fix when convenient — code quality, minor UX issues]
LOW: [nice to have — optimization opportunities, polish]

For each finding include:
- File and line number
- Description of the issue
- Why it matters
- Recommended fix with code example

Send results to the coordinator peer when done.
"
```

## Spawn Templates

Pre-configured team compositions for common scenarios. Use as starting points and customize.

### Feature Team (4 peers)

| Peer | Role | File Ownership | Deliverable |
|------|------|---------------|-------------|
| 1 | Frontend | `src/components/`, `src/pages/`, `src/hooks/` | UI components, pages, client-side logic |
| 2 | Backend | `src/api/`, `src/services/`, `src/db/` | API endpoints, business logic, database queries |
| 3 | Test Writer | `tests/`, `src/__tests__/` | Unit + integration + E2E scaffolding |
| Coordinator | Integration | All files (merge only) | Branch merging, conflict resolution, final E2E run |

### Review Board (4 peers)

| Peer | Role | Reviews For | Report Format |
|------|------|-------------|---------------|
| 1 | Security | OWASP, auth, secrets, deps | severity + finding + fix |
| 2 | Performance | Queries, memory, bundle, caching | metric + issue + recommendation |
| 3 | Correctness | Logic, edge cases, error handling, types | file:line + issue + expected behavior |
| Coordinator | Synthesizer | All reports merged | Unified review with priority ranking |

### Research Squad (5 peers)

| Peer | Role | Search Domain |
|------|------|--------------|
| 1 | NPM Scout | npm registry, package quality, download stats, maintenance |
| 2 | GitHub Scout | Open source repos, stars, recent commits, architecture |
| 3 | Docs Scout | Official docs, tutorials, migration guides, changelogs |
| 4 | Community Scout | Blog posts, Stack Overflow, Discord, Reddit, HN |
| Coordinator | Synthesizer | Merge findings into weighted recommendation matrix |

### Bug Hunt (4 peers)

| Peer | Role | Task |
|------|------|------|
| 1 | Reproducer A | Reproduce bug via path A, document exact steps and environment |
| 2 | Reproducer B | Reproduce bug via alternate path, find minimal reproduction case |
| 3 | Fixer | Receive reproduction from A or B, implement root cause fix |
| 4 | Regression | Write regression tests, verify fix, sweep codebase for sibling bugs |

### Migration Crew (4 peers)

| Peer | Role | Task |
|------|------|------|
| 1 | Schema Writer | Design new schema, write forward migration files |
| 2 | Data Migrator | Write data transformation scripts, handle edge cases and nulls |
| 3 | Rollback Tester | Write and verify rollback migration, test data integrity both ways |
| 4 | Verifier | Run migrations on test data, compare before/after snapshots, validate constraints |

### Content Factory (5 peers)

| Peer | Role | Task |
|------|------|------|
| 1 | Writer A | Draft first content piece with outline approval from coordinator |
| 2 | Writer B | Draft second content piece |
| 3 | Writer C | Draft third content piece |
| 4 | Editor | Review all drafts for tone, accuracy, brand voice, consistency |
| 5 | SEO Optimizer | Optimize titles, meta descriptions, headers, internal links, structured data |

## Coordinator Protocol

When you are the coordinator (the instance that spawns and manages peers), follow this six-step protocol.

### Step 1: Plan the Breakdown

Before spawning anything, define:

- **Peer count:** 2-8 (fewer is better — each peer costs money and adds coordination overhead)
- **Roles:** What each peer is responsible for
- **File boundaries:** Which peer owns which files (non-overlapping)
- **Branch strategy:** One branch per peer (`spawn/{goal}/{role}`)
- **Communication protocol:** How peers report progress and completion
- **Cost ceiling:** Maximum total spend across all peers
- **Exit criteria:** What "done" looks like for each peer

### Step 2: Spawn with Self-Contained Prompts

Each peer prompt MUST be fully self-contained. Include:

- Role and task description
- All relevant context (specs, schemas, API contracts, type definitions)
- Explicit file boundaries
- Branch name to work on
- Output format and completion signal
- Instruction to call `set_summary` immediately on startup

Peers do NOT share your context window. They start with a blank slate. If a peer needs information from a file, either paste the content or instruct the peer to read it.

### Step 3: Monitor Progress

```
Every 5-10 minutes while peers are active:

1. Call list_peers — verify all spawned peers still appear
2. Call check_messages — read any status updates or questions
3. Update your own summary: "Coordinator: 2/4 peers complete, merging frontend"
4. If a peer disappears from list_peers → mark as failed (see Step 5)
5. If a peer asks a question → respond immediately with send_message
```

### Step 4: Collect Results

As peers complete their work:

1. Read their completion message via `check_messages`
2. Verify their branch has commits: `git log spawn/{goal}/{role} --oneline`
3. Review the diff for quality: `git diff main...spawn/{goal}/{role}`
4. Merge into your integration branch: `git merge spawn/{goal}/{role}`
5. Run tests after each merge to catch integration issues early
6. Acknowledge receipt to the peer via `send_message`

### Step 5: Handle Failures

| Failure Mode | How to Detect | Response |
|-------------|---------------|----------|
| Peer disappeared | Missing from `list_peers` | Check if work was committed to branch; if yes, merge and continue; if no, respawn with same prompt |
| Peer stuck | No messages for 15+ minutes | Send status request via `send_message`; if no reply after 5 min, reassign the task |
| Peer exceeded cost | Estimated tokens exceed budget | Send termination message; reassign remaining work to cheaper approach |
| Merge conflict | Git reports conflict during merge | Resolve manually; notify affected peers of resolution via `send_message` |
| Wrong output | Peer delivered unexpected results | Send correction with clear re-instructions; include examples of expected output |
| Peer in wrong files | Peer edited files outside its boundary | Revert changes outside boundary; send warning with explicit file list |

### Step 6: Synthesize and Verify

After all peers complete:

1. Merge all branches in dependency order (typically: database, backend, frontend, tests)
2. Run the full test suite
3. Run type checking: `npx tsc --noEmit`
4. Run linters
5. Review the combined diff for coherence
6. Create a summary of what each peer delivered
7. Commit the merged result with a conventional commit message
8. Delete spawn branches: `git branch -d spawn/{goal}/*`

## Cost Management

Multi-peer workflows multiply your API spend. Track aggressively.

### Estimation Table

| Task Complexity | Estimated Tokens per Peer | Estimated Cost per Peer |
|----------------|--------------------------|------------------------|
| Simple (single file edit, focused task) | 10-30K | $0.05-0.15 |
| Medium (multi-file feature, some research) | 50-100K | $0.25-0.50 |
| Complex (architecture, many files, decisions) | 100-200K | $0.50-1.00 |
| Research (reading many files, web search) | 150-300K | $0.75-1.50 |

Multiply per-peer cost by peer count. Add 20% for coordinator overhead. Set a ceiling before starting.

### Budget Controls

- **Per-peer ceiling:** Include in the peer's prompt: "This task should take no more than ~X tokens. If you find yourself exceeding that, summarize progress and stop."
- **Total ceiling:** Sum of all per-peer ceilings + coordinator overhead. If the total would exceed your daily budget, reduce peer count or simplify tasks.
- **Kill trigger:** If any peer appears to exceed 2x its estimated cost (based on output length and complexity), investigate immediately.
- **Post-mortem:** After completion, log actual cost per peer. Use this data to calibrate future estimates.

### Cost-Saving Tips

1. **Use `--print` mode** for peers that do not need interaction — cheaper (no back-and-forth overhead)
2. **Send file paths, not file contents** — let peers read files themselves instead of pasting 500-line files into prompts
3. **Summarize shared context** — if 4 peers all need the same reference doc, summarize it once and send the summary
4. **Kill idle peers** — peers should exit when done. Periodically check `list_peers` and send exit signals to peers that should have finished
5. **Batch related tasks** — two small tasks for one peer is cheaper than two peers with startup overhead each
6. **Use the right model** — if a peer's task is simple (formatting, file copying), consider whether it even needs an LLM

## Safety Rules

1. **Maximum 8 simultaneous peers.** Mac Mini M4 with 16GB RAM imposes real resource limits. Each Claude Code instance consumes memory and CPU. Beyond 8, performance degrades for all instances.

2. **Checkpoint before spawning.** Run `/checkpoint` or `git stash` so you can recover if the spawn operation produces unexpected results. Name the checkpoint: `pre-spawn-[goal]`.

3. **Separate branches per peer.** Never allow multiple peers to commit to the same branch. The coordinator is the only one who merges. Branch naming convention:
   ```
   spawn/{goal}/{role}
   # Examples:
   spawn/auth-feature/frontend
   spawn/auth-feature/backend
   spawn/auth-feature/tests
   ```

4. **Explicit file boundaries.** If two peers edit the same file, you will get merge conflicts. Prevent this by assigning clear file ownership in every peer prompt.

5. **Auto-cleanup.** Peers should exit when their task is complete. Do not leave idle instances running. Periodically call `list_peers` and send termination messages to peers that should have finished but are still alive.

6. **No recursive spawning.** Peers must NOT spawn their own sub-peers unless the coordinator explicitly instructs them to. Keep the hierarchy flat: coordinator -> peers. One level only.

7. **Commit message convention for peers:**
   ```
   feat(frontend): add login page components [spawn: auth-feature]
   feat(backend): add JWT auth endpoints [spawn: auth-feature]
   test: add auth integration tests [spawn: auth-feature]
   ```

8. **Rollback plan.** Before spawning, know how you would undo the entire operation. At minimum: `git branch -D spawn/{goal}/*` to delete all spawn branches.

## Integration with Task Commander

For complex tasks (P6+ in CC Commander's priority system), Task Commander can leverage Spawn Manager:

1. Task Commander evaluates scope and determines parallelizability
2. If parallelizable, it creates a work breakdown with independent units
3. Each unit becomes a peer prompt — fully self-contained with all context
4. Coordinator peer tracks status and estimated cost per peer
5. Circuit breaker: if a peer stops responding after 3 polls (~15 minutes), mark as failed and reassign
6. Cost ceiling: if total peer spend exceeds the threshold, kill non-essential peers first (tests, docs) and preserve core work (backend, frontend)
7. On completion, coordinator synthesizes all results and runs the verification loop

## claude-squad Compatibility

[claude-squad](https://github.com/smtg-ai/claude-squad) is a complementary open-source tool for managing multiple Claude Code instances with a terminal UI. It provides:

- Visual dashboard showing all running instances
- Session management and naming
- Easy instance creation and termination
- Output monitoring across all instances

Spawn Manager and claude-squad serve different needs:
- **Spawn Manager:** Structured patterns, templates, cost tracking, coordinator protocol — the "how to think about multi-agent"
- **claude-squad:** Terminal UI for visual monitoring and session management — the "how to see what is happening"

Use both together for the best experience: design your spawn with Spawn Manager's patterns, monitor execution with claude-squad's dashboard.

## Real-Time Monitoring Dashboard

Track your spawn operation in real time using the peers MCP tools:

```
# Check who is alive and what they are doing
list_peers(scope="repo")

# Expected output per peer:
# - instance_id: unique ID
# - summary: what the peer set via set_summary
# - cwd: working directory
# - status: active/idle

# Read incoming messages
check_messages()

# Update your own status
set_summary("Coordinator: 3/4 peers complete, merging backend branch")
```

For a visual dashboard, use claude-squad or build a simple watcher:

```bash
# Poll peer status every 30 seconds (run in a separate terminal)
watch -n 30 'claude --print "Call list_peers(scope=\"repo\") and format as a table showing: ID, Summary, CWD"'
```

## Integration with Bible Skills

| Skill | How It Integrates |
|-------|-------------------|
| `claude-peers-bible` | Foundation — Spawn Manager uses Claude Peers for all discovery and messaging |
| `overnight-runner` | Combine for unattended overnight swarm builds with auto-checkpoint |
| `dispatching-parallel-agents` | Complementary — use dispatch for subagent Tasks, spawn for peer instances |
| `dialectic-review` | Use Expert Spawn to create FOR/AGAINST/Referee peers for architecture decisions |
| `mode-switcher` | Switch to `night` or `yolo` mode before spawning for autonomous operation |
| `confidence-check` | Run before spawning — if confidence < 70%, plan more before parallelizing |
| `verification-loop` | Run after merge to verify the combined output of all peers |
| `context-budget` | Check context usage before spawning — peers consume separate context windows |

## Quick Reference

```
SPAWNING PATTERNS:
  /spawn quick <task>           — Fire-and-forget single peer
  /spawn team <n> <tasks...>    — N peers with explicitly assigned roles
  /spawn swarm <goal>           — Auto-decompose goal and spawn optimal team
  /spawn expert <domain>        — Spawn domain-specialist peer
  /spawn status                 — Show all active peers via list_peers

EXPERT DOMAINS:
  security, performance, design, testing, devops, database, api, accessibility

TEAM TEMPLATES:
  feature-team     — Frontend + Backend + Tests + Coordinator
  review-board     — Security + Performance + Correctness + Synthesizer
  research-squad   — NPM + GitHub + Docs + Community + Synthesizer
  bug-hunt         — Reproducer A + Reproducer B + Fixer + Regression
  migration-crew   — Schema + Data + Rollback + Verifier
  content-factory  — Writer A + Writer B + Writer C + Editor + SEO

LIMITS:
  Max peers: 8 simultaneous
  Branch pattern: spawn/{goal}/{role}
  Cost: estimate before, track during, report after
  Safety: checkpoint before spawn, one branch per peer, explicit file boundaries

COORDINATOR PROTOCOL:
  Plan → Spawn → Monitor → Collect → Handle failures → Synthesize → Verify
```
