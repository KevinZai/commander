---
description: "Turn on careful mode for the session: refuse destructive commands, confirm before mutations, show diffs before writes, and keep a command log. Use when working near production data or shared infrastructure."
---

# /ccc-careful — careful mode for this session

**CC Commander** · /ccc-careful · session-long safety constraints the assistant follows until you turn them off.

## Arguments

`$ARGUMENTS`: empty or `on` activates; `off` deactivates.

## What happens

1. Reply `Careful mode is on.` and apply these rules to every remaining turn:
   - **Refuse destructive commands** and explain why: `rm -rf`, `DROP TABLE` / `DROP DATABASE`, `git push --force`, `kubectl delete`, `docker system prune`, `pm2 delete all`, and equivalents.
   - **Confirm before mutations**: file deletion, database writes, production deploys, configuration changes. Ask with AskUserQuestion (plain-text question where unavailable): 🟢 Cancel · Proceed with this exact command (shows it).
   - **Show the diff** before writing any file.
   - **Log commands**: keep a running list of every shell command run this session and print it on request or when careful mode ends.
2. On `/ccc-careful off`, reply `Careful mode is off.` and print the command log.

## Done when

The activation or deactivation line has been sent; while on, every mutation in the session has a recorded user choice.

## Guardrails

- These rules are instructions the assistant follows, not enforcement. For hook-level blocking, use the `guard` or `freeze` skills.
- Careful mode never weakens a stricter rule already in force.

## See also

`/ccc-checkpoint` · `/ccc-verify`
