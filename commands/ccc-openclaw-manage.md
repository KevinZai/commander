---
name: ccc-openclaw-manage
description: "Inspect and manage an OpenClaw gateway, its agents, sessions, health and logs from a Claude Code session through the openclaw CLI. Use when you run OpenClaw and want status, agent or session operations without leaving Claude Code."
---

# /ccc-openclaw-manage — OpenClaw operations from Claude Code

**CC Commander** · /ccc-openclaw-manage · runs `openclaw` CLI operations for an OpenClaw install you already operate.

OpenClaw is an optional third-party agent runtime. Nothing here works unless the `openclaw` CLI is installed and a gateway is configured.

## Arguments

`$ARGUMENTS` is one of the subcommands below. With no argument, run `status`.

| Subcommand | Effect | Changes state |
|---|---|---|
| `status` | Gateway health, channels, recent sessions | no |
| `agents list` | Configured agents | no |
| `agents status <id>` | Sessions for one agent | no |
| `agents restart <id>` | Reset one agent's session | yes |
| `sessions list` | Stored sessions | no |
| `sessions send <agent> <message>` | Send a message to an agent | yes (external message) |
| `sessions cleanup` | Session-store maintenance | yes |
| `health` | Read-only health checks | no |
| `health --fix` | Propose repairs, apply only approved ones | yes |
| `logs [agent]` | Recent gateway or agent log lines | no |

## What happens

1. Confirm the CLI is present.

   ```bash
   command -v openclaw && openclaw --version
   ```

   If it is missing, report that OpenClaw is not installed and stop.

2. Run the read-only command for the subcommand. Confirm exact flags with `openclaw <command> --help` when the installed version differs.

   ```bash
   openclaw gateway status                       # status: gateway
   openclaw status                               # status: channels and recent sessions
   openclaw agents list                          # agents list
   openclaw sessions list --agent <id> --json    # agents status <id>
   openclaw sessions list --all-agents --json    # sessions list
   openclaw health --json                        # health
   openclaw doctor --lint                        # health: read-only findings
   openclaw logs --limit 200 --plain             # logs
   ```

   For `logs <agent>`, filter the gateway log output for that agent id. If the gateway is unreachable, report the exact error and stop; do not start or restart it.

3. For a state-changing subcommand, show the exact command first, then ask with AskUserQuestion:

   - 🟢 Run it — executes the shown command once.
   - Show only — prints the command for the user to run.
   - Cancel — nothing changes.

   Commands by subcommand:

   ```bash
   openclaw sessions cleanup      # sessions cleanup
   openclaw message --help        # sessions send: confirm the send syntax, then send
   ```

   For `agents restart <id>`, find the agent's reset or session command in `openclaw agents --help` and `openclaw sessions --help`. If the installed version has none, say so instead of improvising.

4. For `health --fix`, run `openclaw doctor --lint` and list each finding with its proposed repair. Ask per repair with the picker above. Never run `openclaw doctor --fix` or `--repair` as a blanket action.

5. Verify. Re-run the matching read-only command from step 2 and report its actual output.

## Done when

The read-only command output, or the post-change re-check, is reported with its exit status.

## Guardrails

- Never restart, stop or reinstall the gateway, update OpenClaw, or edit its config file without the user's explicit approval for that action.
- Sending a message to an agent is an external write; ask at the moment of sending.
- Do not print tokens, passwords or secret values from config or logs.
- Do not record agent names, hostnames or ports from the user's install into any file this repository ships.

## See also

`/ccc-openclaw` · `/ccc-peers` · `/ccc-pm2`
