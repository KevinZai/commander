---
description: Fork the current session for parallel exploration -- try multiple approaches, merge the best.
---

# Explore Fork

Split your current Claude Code session into parallel branches to explore multiple implementation approaches simultaneously. Try different solutions, compare results, and merge the best one back.

## Usage

```bash
/branch                          # Fork current session into a new branch
/branch "try hooks approach"     # Fork with a description
/branch list                     # Show all active forks
/branch merge <id>               # Merge a fork back into main session
/branch discard <id>             # Discard a fork
```

## How It Works

### Fork a Session

```
/branch "approach A: use context API"

Forked session.
  Fork ID: fork-a1b2c3
  Description: approach A: use context API
  Base commit: abc1234
  Branch: explore/fork-a1b2c3

You're now in the fork. Changes here don't affect the main session.
Use /branch return to go back to the main session.
```

### Resume with --fork-session

```bash
# From the CLI, fork an existing session
claude --resume --fork-session

# This creates a new session with the full context of the previous one
# but on a new git branch, so changes are isolated
```

### Explore Multiple Approaches

```
# Main session: working on state management

/branch "approach A: React Context"
# ... implement with Context API ...
# ... run tests ...
/branch return

/branch "approach B: Zustand"
# ... implement with Zustand ...
# ... run tests ...
/branch return

/branch "approach C: Jotai"
# ... implement with Jotai ...
# ... run tests ...
/branch return

/branch list
# fork-a1b2c3: approach A: React Context (3 commits, tests passing)
# fork-d4e5f6: approach B: Zustand (2 commits, tests passing)
# fork-g7h8i9: approach C: Jotai (4 commits, 1 test failing)

/branch merge fork-d4e5f6
# Merged "approach B: Zustand" into main session.
# Discarding other forks...
```

## Use Cases

### Architecture Exploration

Compare different architectural approaches before committing:

```
"I need to implement caching. Fork three approaches:
1. In-memory with Map
2. Redis
3. SQLite

Each fork: implement, benchmark, and report performance numbers.
I'll merge the winner."
```

### Risky Refactoring

Try a big refactor without risk:

```
/branch "aggressive refactor: flatten all modules"

# If it works → /branch merge
# If it breaks → /branch discard
# Main session is untouched either way
```

### A/B Implementation

Try two UI designs simultaneously:

```
/branch "design A: sidebar navigation"
# ... build it, screenshot it ...
/branch return

/branch "design B: top navigation"
# ... build it, screenshot it ...
/branch return

# Compare screenshots, merge the better one
```

### Bug Fix Investigation

When the root cause is unclear, explore multiple theories:

```
/branch "theory: race condition in auth"
# ... investigate, add logging, test ...
/branch return

/branch "theory: stale cache in middleware"
# ... investigate, clear cache, test ...
/branch return

# Merge whichever theory found the bug
```

## Under the Hood

Each fork creates:
1. A new git branch from the current commit
2. A new Claude Code session with the full conversation context
3. Isolated file changes (via git worktree or branch)

Merging:
1. Cherry-picks or merges the fork branch into the main branch
2. Transfers any session context (lessons learned, decisions made)
3. Cleans up the fork branch

Discarding:
1. Deletes the fork branch
2. Cleans up the session
3. No changes to the main branch

## Comparison Table

When multiple forks are active, request a comparison:

```
/branch compare

| Metric         | Fork A (Context) | Fork B (Zustand) | Fork C (Jotai) |
|----------------|-------------------|-------------------|-----------------|
| Lines of code  | 142               | 98                | 110             |
| Bundle size    | +2.1KB            | +3.8KB            | +1.2KB          |
| Tests passing  | 42/42             | 42/42             | 41/42           |
| Performance    | 12ms render       | 8ms render        | 9ms render      |
| Complexity     | Medium            | Low               | Low             |
```

## Safety

- Forks are isolated git branches -- no risk of polluting main
- Each fork has its own commit history
- Discarding a fork leaves zero trace in the main branch
- Maximum 5 active forks per session (context limit)
- Forks auto-expire after 24 hours if not merged or discarded

## Tips

- Fork early, fork often -- it's cheap and the undo is free
- Give descriptive names to forks ("approach A: hooks" not "fork 1")
- Run tests in each fork to get objective comparison data
- Use `/branch compare` before merging to make data-driven decisions
- Don't let forks drift too far -- merge or discard within the same session
