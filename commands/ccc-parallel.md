---
description: "Run several Claude Code agents at once, each in its own git worktree and branch, then merge the results through one coordinator. Use when you have independent tasks to develop concurrently."
---

# /ccc-parallel — parallel agents in git worktrees

**CC Commander** · /ccc-parallel · launches independent agents on separate branches and merges their work when they finish.

## Usage

```text
/ccc-parallel                     # interactive setup
/ccc-parallel 3 "<task prompt>"   # three agents on the same task
```

`$ARGUMENTS`: optional agent count and task prompt.

Each agent gets a git worktree: a separate working directory that shares the repository history but has its own branch and file state. Each agent can read and write its own files, cannot see the others' uncommitted changes, and runs its own tests.

```text
Main session (coordinator)
  ├── worktree 1 → feat/add-auth
  ├── worktree 2 → feat/add-dashboard
  └── worktree 3 → feat/add-api-tests
```

## What happens

1. Confirm the starting point:

   ```bash
   git rev-parse --show-toplevel
   git status --short
   git branch --show-current
   ```

   If the tree is dirty, say so; worktrees branch from the committed HEAD, so uncommitted changes are not visible to the agents.

2. Collect the plan. If `$ARGUMENTS` lacks a count or tasks, ask with AskUserQuestion:

   - 🟢 2 agents — easiest to merge and review.
   - 3 agents — more throughput, more merge work.
   - 4 or 5 agents — only for clearly independent tasks.

   Then ask for one task and one branch name per agent. Use descriptive branch names so `git worktree list` tells agents apart.

3. Check independence: list the files or directories each task will touch. If two tasks touch the same files, tell the user and suggest running them in sequence instead.

4. Launch. Pick the mechanism with AskUserQuestion:

   - 🟢 In-session subagents — parallel Agent tool calls with `isolation: worktree`; results return to this session.
   - Separate terminals — the user runs one `claude -w <branch>` per agent (add `--tmux` for a tmux session per worktree).
   - Workflow tool — one run with `parallel()` where the Workflow tool is available.

   Separate-terminal form:

   ```bash
   claude -w feat/auth
   claude -w feat/dashboard
   claude -w feat/api-tests
   ```

   Keep the user's selected model for every agent unless they choose otherwise.

5. Monitor:

   ```bash
   git worktree list
   git -C <worktree-path> log --oneline -5
   ```

   With the optional Claude Peers MCP server, `/ccc-peers status` shows each agent's summary and messages.

6. Merge, after every agent reports done and its tests pass. Ask with AskUserQuestion before merging:

   - 🟢 Merge commits (`--no-ff`) — keeps each branch traceable.
   - Rebase then merge — for branches that may conflict.
   - Squash — one commit per branch.
   - Not now — leave the branches for review.

   Independent features:

   ```bash
   git checkout main
   git merge --no-ff feat/auth
   git merge --no-ff feat/dashboard
   git merge --no-ff feat/api-tests
   ```

   Possible conflicts: merge the most foundational branch first, then rebase the next one onto the updated main.

   ```bash
   git checkout main && git merge feat/auth
   git checkout feat/dashboard && git rebase main
   # resolve conflicts, then:
   git checkout main && git merge feat/dashboard
   ```

   Squash:

   ```bash
   git checkout main
   git merge --squash feat/auth
   git commit -m "feat: add authentication module"
   ```

   On a conflict, stop and report the conflicting files; never auto-resolve.

7. Verify the merged result with the project's full test command (read it from `package.json` or the project's CLAUDE.md) and report the actual result:

   ```bash
   git status --short
   git log --oneline -10
   ```

8. Clean up after the merge, with the user's approval:

   ```bash
   git worktree remove <worktree-path>
   git worktree prune
   ```

## Use cases

| Pattern | Example tasks |
|---|---|
| Feature parallelism | auth module; analytics dashboard; API test suite |
| Divide and conquer | migrate files A–M to ESM; files N–Z; update test imports |
| Competitive implementation | the same cache layer on Redis, SQLite and in-memory LRU; keep the best |
| Implement and review | one agent builds the payment module; another reviews each commit |

## Coordination patterns

| Pattern | Description |
|---|---|
| Independent | No communication; agents work in isolation |
| Pipeline | Agent 1 finishes and notifies agent 2, which then starts |
| Coordinator | The main session dispatches tasks and collects results |
| Swarm | Agents share a codebase and message each other often |

For pipeline or swarm work, the optional Claude Peers MCP server lets agents message each other, for example `/ccc-peers send <id> "API types committed at <sha>; import them now."`.

## Limits

- At most five parallel agents by default. Each one is a Claude Code process, a concurrent API session and a worktree on disk; reduce the count on machines with less memory.
- Each agent works only on its own branch; all merges go through the coordinator.
- Each agent's cost is tracked separately; report them together at the end.

## Guardrails

- Never merge, push, delete a branch or remove a worktree without the user's approval at that step.
- Parallelize only independent tasks; shared file edits cause merge conflicts.
- Never force-push or rewrite main.

## See also

`/ccc-orchestrate` · `/ccc-peers` · `/ccc-pr`
