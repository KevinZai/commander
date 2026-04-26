---
name: session
description: "Session management — resume work, review what was built, browse session history. Use when the user says 'resume session', 'review work', 'continue where I left off', 'what did I do last time', 'show my sessions', or 'pick up where I left off'."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
argument-hint: "[resume | review | history | export]"
---

# /ccc:session

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Browse, resume, and review CC Commander sessions stored at `~/.claude/commander/sessions/`. Menus sourced from `references/continue-work.json` and `references/review-work.json`.

## Quick Mode (default)

Load the most recent session and present a clear choice:

```bash
ls -t ~/.claude/commander/sessions/*.json 2>/dev/null | head -1
```

Read that session file and show a one-line summary:
```
Last session: Build Next.js dashboard with auth [CC-150] — 2026-04-09 · $2.34 · completed
```

Then ask via AskUserQuestion (from references/continue-work.json):
- **Pick up exactly where I left off** — restore full context and continue
- **Show me what was done** — summarize the session before deciding
- **Start fresh with a summary** — new session, previous work as context
- **Review all recent sessions** — switch to Power Mode review flow
- **Back to main menu**

If no sessions exist: "No sessions found. Start a new build with the `commander` skill."

## Power Mode

Full session browser. Activate by passing `--power`, `review`, or `history` as argument.

### Recent Sessions

```bash
ls -t ~/.claude/commander/sessions/*.json 2>/dev/null | head -10
```

Display each session (from references/review-work.json flow):
```
[2026-04-09] CC-150 — Build dashboard · $2.34 · completed · 4h12m
[2026-04-08] CC-142 — Auth refactor · $0.87 · completed · 1h45m
[2026-04-07] CC-138 — API endpoints · $3.10 · error · 2h30m
```

Then ask:
- "Resume a session" — pick from list, restore context
- "View session details" — read full session JSON, show task breakdown
- "View full history" — paginate all sessions with search
- "Export session summary" — write a markdown report to `~/Downloads/`
- "Back to main menu"

### Session Detail View

Read the session JSON and display:
- Task description and final outcome
- Files created/modified (from session log)
- Cost and token usage
- Lessons extracted (if any)
- Git branch and PR link (if available)

### Resume Protocol

To resume a session:
1. Read `~/.claude/commander/sessions/{id}.json`
2. Extract task, context, and last known state
3. Load the relevant project CLAUDE.md if path is recorded
4. Present context summary and confirm: "Ready to continue. Shall I proceed?"
5. Never silently start executing — always confirm first

## Session JSON Format

```json
{
  "id": "1712700000000",
  "task": "Build Next.js dashboard with auth",
  "timestamp": "2026-04-09T14:22:00Z",
  "status": "completed",
  "cost": 2.34,
  "duration": "4h12m",
  "issue": "CC-150",
  "branch": "cc-150-dashboard-auth",
  "project": "~/clawd/projects/mywifi-redesign",
  "outcome": "Shipped dashboard with Google OAuth, 47 tests passing"
}
```

## If Connectors Available

If **~~project tracker** is connected:
- Show the Linear/Jira issue linked to each session
- When resuming, load current issue status to check if it's still open
- Offer to create a new issue if resuming abandoned work

If **~~source control** is connected:
- Show the branch and PR status for each session
- Link directly to the PR when viewing session details

## Tips

1. Pass `resume` as argument to skip the menu and immediately load the last session.
2. Sessions are never deleted — use `history` to browse all past work going back indefinitely.
3. The `export` argument writes a formatted markdown summary — useful for standup updates or client reports.
