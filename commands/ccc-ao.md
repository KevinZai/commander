---
description: "Spawn, monitor, stop and merge parallel agents in isolated git worktrees through the Composio ao CLI. Use when you want several agents working on one project at once."
---

# /ccc-ao — parallel agents in worktrees

**CC Commander** · /ccc-ao · wraps the `ao` CLI (`@composio/ao`) to run parallel agents, each in its own git worktree.

Ask every choice with AskUserQuestion (a plain-text question where it is unavailable): 2 to 4 options, recommended first and marked 🟢. The user's selected model and agent runtime are preserved unless they choose otherwise.

## What happens

1. Check the CLI is installed.

   ```bash
   command -v ao && ao --version
   ```

   If `ao` is missing, stop and report: `ao CLI not installed. Install it with: npm i -g @composio/ao, then run /ccc-ao again.` Do not install it yourself.

2. Ask what to do:
   - 🟢 Spawn agents on this project — choose count, runtime and tasks.
   - Spawn from a config file — run a saved `agent-orchestrator.yaml`.
   - Check running agents — `ao status`.
   - Stop agents — `ao stop`, after confirmation.

   If the user describes something else, handle it with the matching `ao` subcommand (`ao --help`).

## Spawn on this project

1. Ask the agent count: 🟢 2 · 3 · 5 · custom.
2. Ask the agent runtime: 🟢 Claude · Codex · Aider · OpenCode.
3. Ask the task strategy:
   - 🟢 One task per agent — each agent gets its own task.
   - One shared task — all agents work toward one goal.
   - Auto-split — the user gives one goal; split it into one task per agent and show the split before spawning.
4. Collect the task text (one per agent, or one goal).
5. Spawn. Confirm the flags with `ao spawn --help` if the command is rejected.

   ```bash
   ao spawn --agents <n> --model <runtime> --task "<task>" --worktree
   ```

6. Verify with `ao status` and `git worktree list`, then report:

   ```
   ao spawn complete
   Agents: <n> | Runtime: <runtime> | Worktree: isolated
   Agent 1: <task>
   Agent 2: <task>
   ```

   If `ao status` does not show the new sessions, report the spawn output verbatim instead of claiming success.

## Spawn from a config file

1. Find the config.

   ```bash
   ls agent-orchestrator.yaml .ao/config.yaml 2>/dev/null
   ```

2. If none exists, say so and offer the spawn-on-this-project flow.
3. Read the file and list its projects and agents.
4. Ask which project or config to run.
5. Run it, then verify with `ao status`.

   ```bash
   ao spawn --config <config_file>
   ```

## Check running agents

```bash
ao status
```

Show the result as a table. When nothing is running, report `No active ao sessions.`

## Stop agents

Ask first: 🟢 Keep running · Stop all ao sessions (kills every running session). Only on the second choice run:

```bash
ao stop
```

Then run `ao status` and report what is still running.

## Merge an agent's worktree

1. List worktrees and ask which one to merge.

   ```bash
   git worktree list
   ```

2. Find the base branch (`git symbolic-ref --short refs/remotes/origin/HEAD`, falling back to `main`) and show the change summary.

   ```bash
   git diff <base>...<worktree_branch> --stat
   ```

3. Ask how to land it:
   - 🟢 Open a pull request — push the branch and run `gh pr create` with a summary of the diff.
   - Merge directly — `git merge <worktree_branch>` into the current branch.
   - Not yet — leave the worktree as it is.
4. Verify: for a PR, print the PR URL from `gh pr view --json url`; for a merge, `git log -1 --oneline` and `git status`.
5. Offer to remove the merged worktree: 🟢 Keep it · Remove it. Only on the second choice run `git worktree remove <path>`, then `git worktree list` to confirm.

## Next step

After each action, ask: 🟢 Check agent status · Spawn more agents · Merge a worktree · Stop all agents.

## Done when

The last `ao status` (or `git worktree list` / `git log -1` for a merge) output is shown and matches what was reported.

## Guardrails

- Pushing a branch, opening a PR, merging, stopping sessions and removing worktrees each need the user's choice in this conversation, asked at that moment.
- Never force-push and never merge into the default branch without the user picking that option.
- Never install `ao` or other global packages.

## See also

`/ccc-spawn` · `/ccc-devfleet` · `/ccc-parallel` · `/ccc-pr`
