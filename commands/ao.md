---
description: "Composio AO — spawn parallel agents with worktree isolation"
---

# /ao — Composio Agent Orchestrator

Wraps the `ao` CLI (`@composio/ao`). Spawns parallel agents across projects with git worktree isolation.

## When activated:

Check if `ao` CLI is available:

```bash
which ao
```

If not found, display:

```
ao CLI not installed.
Run: npm i -g @composio/ao
Then re-invoke /ao once installed.
```

If found, check the version:

```bash
ao --version
```

Then present via AskUserQuestion:

| Option | What it does |
|--------|-------------|
| Spawn agents on current project (Recommended) | Ask: how many, what tasks, model selection |
| Spawn from config file | Read agent-orchestrator.yaml, show configured projects |
| Check running agents | Run `ao status` — show active sessions |
| Stop agents | Run `ao stop` — kill running sessions |
| Something else | Free text |

## Spawn Flow

When user picks "Spawn agents on current project":

1. Ask number of agents via AskUserQuestion:
   - 2 agents
   - 3 agents
   - 5 agents
   - Custom number

2. Ask model via AskUserQuestion:
   - Claude (Recommended)
   - Codex
   - Aider
   - OpenCode

3. Ask task assignment strategy via AskUserQuestion:
   - One shared task (agents collaborate on the same goal)
   - One task per agent (assign a separate task to each agent)
   - Auto-split from description (describe overall goal, split automatically)

4. Collect task(s) — one per agent if individual, or one overall goal if auto-split.

5. Run the spawn command:
   ```bash
   ao spawn --agents [n] --model [model] --task "[task]" --worktree
   ```

6. Show spawned summary:
   ```
   ao spawn complete
   Agents: [n] | Model: [model] | Worktree: isolated
   Task(s):
     Agent 1: [task]
     Agent 2: [task]
     ...
   ```

## Spawn from Config File

When user picks "Spawn from config file":

1. Check for config:
   ```bash
   ls agent-orchestrator.yaml 2>/dev/null || ls .ao/config.yaml 2>/dev/null
   ```

2. If found, read and display the configured projects and agents.

3. Ask which project/config to run via AskUserQuestion.

4. Run:
   ```bash
   ao spawn --config [config_file]
   ```

## Check Running Agents

```bash
ao status
```

Display the output formatted as a table. If no agents running: "No active ao sessions."

## Stop Agents

```bash
ao stop
```

Confirm first: "This will kill all running ao sessions. Proceed?"

If user confirms, run the command and report result.

## After every action, suggest next steps via AskUserQuestion:

| Option | Description |
|--------|-------------|
| Check agent status | Run `ao status` to see progress |
| Spawn more agents | Add agents to the current run |
| View worktrees | `git worktree list` to see isolation state |
| Merge a worktree | Bring completed agent work back to main branch |
| Stop all agents | `ao stop` |
| Back to main menu | Return to /cc or top-level menu |
| Something else | Free text |

## Worktree Merge Helper

When user picks "Merge a worktree":

1. List worktrees:
   ```bash
   git worktree list
   ```

2. Ask which worktree to merge via AskUserQuestion.

3. Show the diff summary:
   ```bash
   git diff main...[worktree_branch] --stat
   ```

4. Ask: "Merge via PR or direct merge?"
   - Create PR → run `gh pr create` with relevant context
   - Direct merge → confirm then `git merge [branch]`

5. After merge, offer to prune the worktree:
   ```bash
   git worktree remove [path]
   ```
