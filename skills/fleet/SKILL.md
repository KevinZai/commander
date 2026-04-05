---
name: fleet
description: "Fleet Commander — launch, monitor, and manage parallel CC agent teams"
triggers: ["fleet", "spawn team", "agent team", "parallel agents", "multi-agent", "/fleet"]
tags: [multi-agent, orchestration, fleet, teams, parallel]
---

# /fleet — Fleet Commander

Fleet Commander API at localhost:4680. Manages parallel Claude Code agent teams.

## When activated, show this status first:

Run `curl -s http://localhost:4680/api/status` and `curl -s http://localhost:4680/api/teams` to get current state.

If the Fleet Commander API is unreachable, display:

```
Fleet Commander is not running.
Start it with: npx @cc-commander/fleet or see skills/fleet/SKILL.md for setup.
```

If reachable, display the header block:

```
Fleet Commander — [version]
Uptime: [formatted] | Active Teams: [count] | Connections: [count]
```

Then present via AskUserQuestion:

| Option | What it does |
|--------|-------------|
| Spawn a new team (Recommended) | Ask team name, agent count, and task — then POST to /api/teams |
| View active teams | GET /api/teams — show table with team name, agents, status, duration |
| View agent details | GET /api/teams/:id — show individual agent status, cost, progress |
| Send message to team | Ask which team and what message — POST /api/teams/:id/message |
| Stop a team | Ask which team — DELETE /api/teams/:id |
| Something else | Free text |

## Spawn Flow

When user picks "Spawn a new team":

1. Ask team name via AskUserQuestion (suggest a name based on current project context or git branch)
2. Ask number of agents: 2, 3, 5, custom
3. Ask task description — or offer to pull from open Linear issues if `LINEAR_API_KEY_PERSONAL` is set:
   ```bash
   curl -s -H "Authorization: Bearer $LINEAR_API_KEY_PERSONAL" \
     "https://api.linear.app/graphql" \
     -d '{"query":"{issues(filter:{state:{name:{eq:\"Todo\"}}}){nodes{identifier title}}}"}'
   ```
4. POST to Fleet Commander API:
   ```bash
   curl -s -X POST http://localhost:4680/api/teams \
     -H "Content-Type: application/json" \
     -d '{"name":"[team_name]","agents":[agent_count],"task":"[task]"}'
   ```
5. Show spawned team summary:
   ```
   Team spawned: [name]
   Team ID: [id]
   Agents: [count] initializing...
   Task: [task]
   ```

## Status Display Format

For active teams, render as:

```
Team: [name] — [agent_count] agents — [status]
  Agent 1: [id] — [status] — $[cost] — [turns] turns
  Agent 2: [id] — [status] — $[cost] — [turns] turns
  Total: $[total_cost] | [duration]
```

Use the following status indicators:
- `initializing` → agents spinning up
- `running` → actively working
- `idle` → waiting for input or next task
- `done` → completed successfully
- `error` → one or more agents failed

## Agent Details View

When user picks "View agent details", ask which team (show list from GET /api/teams), then:

```bash
curl -s http://localhost:4680/api/teams/[id]
```

Render each agent's full status including:
- Current task or last action
- Files modified
- Cost so far
- Turn count
- Any errors or blockers reported

## Send Message Flow

1. Show team list from GET /api/teams
2. Ask which team
3. Ask what to say
4. POST the message:
   ```bash
   curl -s -X POST http://localhost:4680/api/teams/[id]/message \
     -H "Content-Type: application/json" \
     -d '{"message":"[message]"}'
   ```
5. Confirm delivery

## Stop Flow

1. Show team list
2. Ask which team to stop (warn: this terminates agents immediately)
3. Confirm with user
4. DELETE:
   ```bash
   curl -s -X DELETE http://localhost:4680/api/teams/[id]
   ```
5. Confirm stopped

## After every action, suggest next steps via AskUserQuestion:

| Option | Description |
|--------|-------------|
| Check team progress | Poll team status |
| Send guidance to team | Message the active team |
| Spawn another team | Start a new parallel team |
| View costs | Show cost breakdown across all teams |
| Back to main menu | Return to /cc or top-level menu |
| Something else | Free text |

## Cost Tracking

When showing costs, aggregate across all teams:

```
Cost Summary
  [team_name]: $[cost] ([duration])
  [team_name]: $[cost] ([duration])
  ─────────────────────────────
  Total session: $[total]
```

Warn if total exceeds $2.00 (session kill threshold per Kevin's cost rules).
