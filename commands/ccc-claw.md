---
description: "Start NanoClaw, the vendored zero-dependency REPL with persistent markdown sessions, model switching, skill hot-load, branching, search, compaction, export and metrics. Use when you want a lightweight persistent agent session outside the main chat."
---

# /ccc-claw — NanoClaw REPL

**CC Commander** · /ccc-claw · launches NanoClaw from the vendored everything-claude-code package.

## What happens

1. Confirm the script exists.

   ```bash
   ls vendor/everything-claude-code/scripts/claw.js
   ```

   If it is missing, report that the everything-claude-code vendor package is not present in this checkout and stop.

2. Tell the user to start it in their own terminal (it is interactive and needs a TTY), optionally with the variables below:

   ```bash
   node vendor/everything-claude-code/scripts/claw.js
   # or, inside vendor/everything-claude-code:
   npm run claw
   ```

   Example: `CLAW_SESSION=api-refactor CLAW_SKILLS=tdd-workflow,coding-standards node vendor/everything-claude-code/scripts/claw.js`

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `CLAW_SESSION` | `default` | Session name (letters, digits, hyphens) |
| `CLAW_SKILLS` | empty | Comma-separated skills loaded at startup |
| `CLAW_MODEL` | `sonnet` | Model alias for the session; the user's choice is kept |

## REPL commands

```text
/help                          Show help
/clear                         Clear the current session history
/history                       Print the full conversation history
/sessions                      List saved sessions
/model [name]                  Show or set the model
/load <skill-name>             Hot-load a skill into context
/branch <session-name>         Branch the current session
/search <query>                Search across sessions
/compact                       Compact old turns, keep recent context
/export <md|json|txt> [path]   Export the session
/metrics                       Show session metrics
exit                           Quit
```

## Notes

- Sessions are stored at `~/.claude/claw/<session>.md`.
- Compaction keeps the most recent turns and writes a compaction header.
- Export supports markdown, JSON turns and plain text.

## Done when

The script path check has passed and the user has the exact launch command.

## See also

`/ccc-sessions` · `/ccc-model-route`
