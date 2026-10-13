---
name: ccc-openclaw
description: "Connect CC Commander to an OpenClaw gateway: status, skill sync, configuration, health check and agent list. Use when you run OpenClaw alongside Claude Code and want the two integrated."
usage: /ccc-openclaw [status|sync|configure|health|agents]
version: 1.3.0
---

# /ccc-openclaw — OpenClaw integration

**CC Commander** · /ccc-openclaw · integrates Commander with an OpenClaw gateway you already run.

Action: **$ARGUMENTS** (default `status`).

OpenClaw is an optional third-party agent runtime; the integration is off by default. It is driven by `hooks/openclaw-sync.js` and these environment variables:

| Variable | Meaning |
|---|---|
| `CC_OPENCLAW_ENABLED=1` | Turns on the SessionStart skill sync |
| `CC_OPENCLAW_URL` | Gateway base URL (the hook falls back to the gateway's local default) |
| `CC_OPENCLAW_TIMEOUT` | Request timeout in ms |

Start every subcommand by checking `command -v openclaw`. If the CLI is missing, report that and stop.

## status

1. Run:

   ```bash
   openclaw gateway status
   openclaw status
   echo "sync enabled: ${CC_OPENCLAW_ENABLED:-0}  url: ${CC_OPENCLAW_URL:-default}"
   ```

2. Report gateway state and version, connected channels, recent sessions, and whether Commander sync is enabled. Report numbers exactly as the commands print them.

## sync

1. Confirm the gateway answers:

   ```bash
   openclaw health --json
   ```

2. Run the sync hook once, enabled for this invocation only:

   ```bash
   echo '{}' | CC_OPENCLAW_ENABLED=1 node hooks/openclaw-sync.js
   ```

   The hook discovers skills under `~/.claude/skills/` and posts them to the gateway's Commander webhook. It prints a synced count or "Skill sync failed (gateway may not support registry)".

3. Report the line the hook printed. A failure line means the gateway did not accept the registration; do not retry in a loop.

## configure

Ask each setting with AskUserQuestion, one at a time:

1. Gateway URL:
   - 🟢 Use the gateway's configured URL — leaves `CC_OPENCLAW_URL` unset.
   - Custom URL — the user types it; set `CC_OPENCLAW_URL`.
2. Sync on session start:
   - 🟢 Enable — sets `CC_OPENCLAW_ENABLED=1`.
   - Disable — leaves it unset.
3. Event forwarding (Commander events sent to OpenClaw):
   - 🟢 None — nothing is forwarded.
   - Session events only — SessionStart and SessionEnd.
   - Custom — the user lists events.
4. Mode binding (Commander modes mapped to OpenClaw agents):
   - 🟢 Skip — no binding.
   - Bind now — list agents with `openclaw agents list` and let the user pick per mode.

Save the choices to `~/.claude/bible-config.json` (read by `lib/config-reader.js`). Environment variables go in the user's shell profile or the `env` block of `.claude/settings.json`; show the exact change and get approval before writing it. Verify by printing the saved keys, never secret values:

```bash
node -e "const c=require(require('os').homedir()+'/.claude/bible-config.json');console.log(Object.keys(c))"
```

## health

1. Run:

   ```bash
   openclaw health --json
   openclaw doctor --lint
   openclaw logs --limit 50 --plain
   ```

2. Report gateway connectivity and response time, each channel's status, agent status, store or memory findings from `doctor --lint`, and the most recent errors from the log. Include cost or budget figures only if the gateway reports them.

3. Repairs are not part of this subcommand. Point to `/ccc-openclaw-manage health --fix`.

## agents

1. Run:

   ```bash
   openclaw agents list
   openclaw sessions list --all-agents --active 60 --json
   ```

2. Show each agent with its model and active or idle state. Filter by workspace, status or model when `$ARGUMENTS` names one. Show current task, cost and session duration only where the CLI returns them.

## Output

```text
OPENCLAW: <action>
Gateway:  online | offline
Synced:   <count printed by the hook, or n/a>
Status:   OK | ERROR — <exact error>
```

## Guardrails

- Never start, restart or update the gateway, or edit OpenClaw's own config, without explicit approval for that action.
- Never write agent names, hostnames, ports or tokens from the user's install into files this repository ships.
- Do not print secret values from config or logs.

## See also

`/ccc-openclaw-manage` · `/ccc-peers` · `/ccc-pm2`
