---
description: Open the Linear board, pick issues, create tasks, and manage your project directly from CCC.
---

# /ccc:linear — Linear Board

Open your Linear project board directly in CCC. View issues by status, pick one to work on, or create new ones.

## What This Command Does

1. Connects to Linear using your `LINEAR_API_KEY_PERSONAL` env var
2. Shows your project board: In Progress, Todo, Backlog, Done
3. Progress bar showing completion percentage
4. Pick an issue to start working on (auto-assigns, starts session)
5. Create new issues directly from CCC

## Setup

1. Get a Linear API key: [linear.app/settings/api](https://linear.app/settings/api)
2. Set it: `export LINEAR_API_KEY_PERSONAL=lin_api_xxxxx`
3. Run `ccc` > Settings > Linear Setup > Choose your team and project
4. Done. The board will load automatically.

## Usage

```
/ccc:linear              # Open the board
ccc > Linear Board       # Same thing via menu
```

## Board View

```
  ─── Linear Board ───────────────────
  ████████████████░░░░░░ 18/24 done

  In Progress (2)
    CC-61 Remotion hero video
    CC-62 README overhaul

  Todo (3)
    CC-48 Foundation + submodules
    CC-49 Vendor scanner

  Backlog (1)
    CC-50 Showstopper CLI UI

  Done: 18 issues
```

## Actions

- **Pick an issue** — assigns to you, moves to In Progress, starts a CCC session
- **Create issue** — quick title + description, auto-adds to project
- **Refresh** — reload the board

## Session Integration

When you pick an issue and build:
- CCC creates a session linked to the Linear issue
- Progress comments auto-posted to the issue
- Session completion auto-moves issue to Done
- Cost and duration tracked on the issue
