---
description: Launch multiple Claude Code agents in parallel git worktrees for concurrent development.
---

# Parallel Agents

Run multiple Claude Code instances simultaneously, each in its own git worktree, working on independent tasks. Merge results when all agents complete.

## Usage

```bash
/parallel-agents                    # Interactive setup
/parallel-agents 3 "task prompt"   # Launch 3 agents with same task
```

## How It Works

### Git Worktrees

Each agent gets its own git worktree -- a separate working directory that shares the same git history but has its own branch and file state.

```bash
# Claude Code creates worktrees automatically
claude -w                    # Launch in a new worktree
claude -w feat/auth          # Launch in worktree on feat/auth branch
```

### Parallel Execution

```
Main session (coordinator)
     |
     +--> Worktree 1 (agent-1): feat/add-auth
     |      Independent branch, full file access
     |
     +--> Worktree 2 (agent-2): feat/add-dashboard
     |      Independent branch, full file access
     |
     +--> Worktree 3 (agent-3): feat/add-api-tests
            Independent branch, full file access
```

Each agent:
- Has its own branch
- Has its own working directory
- Can read/write files independently
- Cannot see other agents' uncommitted changes
- Runs its own tests and verification

## Quick Start

### Launch Parallel Agents

```bash
# Method 1: From the CLI
claude -w feat/auth &
claude -w feat/dashboard &
claude -w feat/api-tests &

# Method 2: Using /parallel-agents command
/parallel-agents

# Interactive prompt:
# How many agents? 3
# Agent 1 task: Implement auth module with JWT
# Agent 2 task: Build dashboard with charts
# Agent 3 task: Write API integration tests
```

### Monitor Progress

```bash
# Check all worktrees
git worktree list

# Check agent status (if using Claude Peers)
/peers status
```

### Merge Results

```bash
# After all agents complete:
git checkout main
git merge feat/auth
git merge feat/dashboard
git merge feat/api-tests
```

## Use Cases

### Feature Parallelism

Work on 3 independent features at once:

```
Agent 1: "Implement user authentication with JWT, bcrypt, refresh tokens"
Agent 2: "Build the analytics dashboard with chart.js and real-time data"
Agent 3: "Write comprehensive API tests for all endpoints"
```

All three features are independent -- no merge conflicts expected.

### Divide and Conquer

Split a large task into independent pieces:

```
Agent 1: "Migrate files A-M from CJS to ESM"
Agent 2: "Migrate files N-Z from CJS to ESM"
Agent 3: "Update all test files to use ESM imports"
```

### Competitive Implementation

Same task, different approaches -- pick the best:

```
Agent 1: "Implement caching layer using Redis"
Agent 2: "Implement caching layer using SQLite"
Agent 3: "Implement caching layer using in-memory LRU"
```

### Review and Implement

One agent codes while another reviews:

```
Agent 1: "Implement the payment processing module"
Agent 2: "Review agent 1's code as it's committed, post review comments"
```

## Merge Strategy

### Independent Features (No Conflicts Expected)

```bash
git checkout main
git merge --no-ff feat/auth       # merge commit for traceability
git merge --no-ff feat/dashboard
git merge --no-ff feat/api-tests
```

### Potentially Conflicting Changes

```bash
git checkout main
git merge feat/auth               # merge first (most foundational)

# If conflict with feat/dashboard:
git checkout feat/dashboard
git rebase main                   # rebase onto updated main
# Resolve conflicts
git checkout main
git merge feat/dashboard
```

### Squash Merge (Clean History)

```bash
git checkout main
git merge --squash feat/auth
git commit -m "feat: add authentication module"
```

## Claude Peers Integration

When using Claude Peers MCP, agents can communicate:

```bash
# Agent 1 notifies agent 2 that the API types are ready
/peers send agent-2 "API types committed at abc1234. You can import them now."

# Agent 2 receives and acts on the message
# "Got it. Pulling types from abc1234 and updating dashboard."
```

### Coordination Patterns

| Pattern | Description |
|---|---|
| **Independent** | No communication needed. Agents work in isolation. |
| **Pipeline** | Agent 1 completes, notifies agent 2, which starts. |
| **Coordinator** | Main session dispatches and collects results. |
| **Swarm** | All agents work on the same codebase, communicating frequently. |

## Worktree Management

```bash
# List all worktrees
git worktree list

# Remove a worktree (after merge)
git worktree remove .claude/worktrees/feat-auth

# Prune stale worktrees
git worktree prune
```

## Safety Guards

| Guard | Value |
|---|---|
| Max parallel agents | 5 (system resources) |
| Branch policy | Each agent gets its own branch |
| Merge policy | Always merge to main via coordinator |
| Conflict resolution | Stop and report; never auto-resolve |
| Cost tracking | Each agent tracks its own cost independently |
| Cleanup | Worktrees auto-removed after merge or 24h |

## Resource Considerations

Each parallel agent consumes:
- ~1 Claude Code process (CPU + memory)
- ~1 API session (concurrent API calls)
- ~1 git worktree (disk space, typically small)

On a Mac Mini M4 with 16GB RAM: comfortable with 3-4 parallel agents.
On a machine with 32GB+ RAM: up to 5-6 parallel agents.

## Tips

- Only parallelize truly independent tasks -- shared file modifications cause merge conflicts
- Use descriptive branch names so you can tell agents apart in `git worktree list`
- Start with 2 agents if you're new to parallel workflows, then scale up
- Use Claude Peers for agent-to-agent coordination on dependent tasks
- Always verify the merged result (run full test suite after all merges)
- Clean up worktrees after merging -- stale worktrees waste disk space
