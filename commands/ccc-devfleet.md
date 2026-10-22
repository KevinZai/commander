---
description: "Plan a project into dependent missions and run parallel Claude Code agents in isolated worktrees through the DevFleet MCP server, then read each mission's report. Use when the user wants DevFleet orchestration."
---

# /ccc-devfleet — parallel agents via DevFleet

**CC Commander** · /ccc-devfleet · a mission DAG from a plain-language brief, run by parallel agents in their own git worktrees.

DevFleet is an opt-in third-party MCP server, absent by default. Its tools appear as `mcp__devfleet__*`. If they are not exposed in this session, say so, give the install line from DevFleet's own docs (its default is `claude mcp add devfleet --transport http http://localhost:18801/mcp`), and offer `/ccc-fleet` or the Agent tool with `isolation: worktree` as the built-in alternative.

## Flow

```
brief -> plan_project -> show plan -> user approves
      -> dispatch_mission(first) -> agent works in its worktree -> auto-merge
      -> dependents auto-dispatch -> ... -> get_report(each) -> summary
```

## What happens

1. Plan the project from the user's brief:

   ```
   mcp__devfleet__plan_project(prompt="<user's description>")
   ```

   Show the project name and id, each mission's title, type and id, and the dependency DAG (which missions block which).

2. Ask with AskUserQuestion (Codex: a plain-text question) before anything runs, unless the user already said to go ahead:

   - 🟢 Dispatch the plan — starts the first mission; dependents follow automatically
   - Edit the plan — adjust missions with `create_mission` / `cancel_mission`, then show it again
   - Cancel — nothing is dispatched

3. Dispatch the mission with an empty `depends_on`:

   ```
   mcp__devfleet__dispatch_mission(mission_id="<first_mission_id>")
   ```

   Missions from `plan_project` carry `auto_dispatch=true`, so the rest start as their dependencies finish. Missions added by hand with `create_mission` need `auto_dispatch=true` set explicitly for the same behavior.

4. Monitor progress:

   ```
   mcp__devfleet__get_dashboard()
   mcp__devfleet__get_mission_status(mission_id="<id>")
   ```

   Poll `get_mission_status` for long missions so the user sees progress; use `wait_for_mission` only for short ones. Report mission titles and ids with each status.

5. Read the report of every mission that reached a terminal state:

   ```
   mcp__devfleet__get_report(mission_id="<mission_id>")
   ```

   Reports contain `files_changed`, `what_done`, `what_open`, `what_tested`, `what_untested`, `next_steps`, `errors_encountered`.

6. Verify the merged result in the target repo before reporting success:

   ```bash
   git log --oneline -10
   git status --short
   ```

   Then run the project's test command (from `package.json`, `Makefile` or the project `CLAUDE.md`). Report the real result, plus any mission whose changes stayed on its worktree branch because of a merge conflict.

## Tools

| Tool | Purpose |
|---|---|
| `plan_project(prompt)` | Break a brief into chained missions with `auto_dispatch=true` |
| `create_project(name, path?, description?)` | Create a project by hand; returns `project_id` |
| `create_mission(project_id, title, prompt, depends_on?, auto_dispatch?)` | Add a mission; `depends_on` is a list of mission id strings |
| `dispatch_mission(mission_id, model?, max_turns?)` | Start an agent |
| `cancel_mission(mission_id)` | Stop a running agent |
| `wait_for_mission(mission_id, timeout_seconds?)` | Block until done (prefer polling for long work) |
| `get_mission_status(mission_id)` | Check progress without blocking |
| `get_report(mission_id)` | Read the structured report |
| `get_dashboard()` | System overview and free slots |
| `list_projects()` | Browse projects |
| `list_missions(project_id, status?)` | List missions |

When passing `model` to `dispatch_mission`, use an alias (`opus` for implementation, `sonnet` for bounded edits, `haiku` for mechanical work). Without one, DevFleet's configured default applies; the user's selected model is preserved unless they choose otherwise.

## Guardrails

- Dispatch only after the step 2 approval or an explicit "go ahead".
- Dependencies form a DAG; never create a circular dependency.
- When a mission fails, read its report before retrying it.
- Concurrency is configurable (default 3); extra missions queue and start as slots free up. Check `get_dashboard()` for slots.
- Each agent auto-merges its worktree on completion. On a merge conflict the changes stay on the worktree branch; report the branch for manual resolution and never force a merge.

## See also

`/ccc-fleet` · `/ccc-spawn` · `/ccc-orchestrate`
