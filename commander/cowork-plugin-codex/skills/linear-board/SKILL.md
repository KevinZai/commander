---
name: linear-board
description: "\"View your Linear board, pick a task to work on, and sync issue status. Use when: 'linear board', 'show issues', 'pick a task', 'what should I work on', 'my Linear', 'open issues', 'sprint board'.\" [Commander]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[team | filter | issue-id]"
---

# /ccc:linear-board

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

View open issues assigned to you, pick one to work on, or create new issues. Works standalone via environment variables or richly via the Linear MCP.

## Quick Mode (default)

List open issues assigned to the current user, grouped by priority. Show:
- Issue ID, title, status, priority
- Estimated effort (points) if set
- Due date if set

Then offer actions via `AskUserQuestion` — never as a text `[P] [C] [R]` menu:
```
question: "What would you like to do?"
options:
  - label: "🎯 Pick an issue to work on"
    description: "Start a build session for the selected issue."
  - label: "➕ Create a new issue"
    description: "Add a ticket to your Linear board."
  - label: "🔄 Refresh the board"
    description: "Re-fetch latest issue status."
```

When user picks an issue, fetch its full description and delegate to the `builder` agent with the issue as context.

## Standalone Mode

When no ~~project tracker is connected, use environment variables:

```bash
# Priority order for token resolution:
# 1. CC_LINEAR_TOKEN
# 2. LINEAR_DEV_TOKEN_PERSONAL
# 3. Prompt user for token
```

Make GraphQL requests directly to `https://api.linear.app/graphql`:

```graphql
query MyIssues {
  viewer {
    assignedIssues(filter: { state: { type: { nin: ["completed", "cancelled"] } } }) {
      nodes {
        id
        identifier
        title
        priority
        estimate
        state { name }
        dueDate
      }
    }
  }
}
```

## Power Mode

Activate by passing `--power` or `detailed`.

Full board view with:
- All teams (not just assigned)
- Filter by status, priority, label, cycle
- Create issues with full metadata (title, description, team, assignee, priority, estimate, labels)
- Move issue status (Todo → In Progress → Done)
- Add comments to issues
- View issue history and linked PRs

## If Connectors Available

If **~~project tracker** is connected (Linear MCP):
- Rich GraphQL queries — cycles, teams, projects, initiatives
- Create issues with full metadata via `save_issue`
- Update issue status as work progresses
- Link completed work to issues automatically
- View initiative and milestone progress

## Output Format

```
┌─────────────────────────────────────────────────────────────────┐
│ LINEAR BOARD — [Team Name]                    [Date]            │
├──────────┬───────────────────────────────┬────────┬────────────┤
│ ID       │ Title                         │ Status │ Priority   │
├──────────┼───────────────────────────────┼────────┼────────────┤
│ CC-42    │ Add OAuth support             │ Todo   │ Urgent     │
│ CC-45    │ Fix webhook retry logic       │ In Prog│ High       │
│ CC-51    │ Update API docs               │ Todo   │ Medium     │
└──────────┴───────────────────────────────┴────────┴────────────┘
[P] Pick  [C] Create  [R] Refresh  [Q] Quit
```

## Tips

1. **Start every session here** — pick your issue before you start building to stay focused.
2. **Use identifiers** — say "CC-42" to jump directly to an issue without browsing.
3. **Status sync matters** — with ~~project tracker connected, status updates automatically as you work.
4. **Priority filter** — add `urgent` or `high` as an argument to see only critical work.
