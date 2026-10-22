---
name: ccc-status
description: "Turn periodic progress updates for long sessions on or off, choose the channel (Slack, Discord, email or console), interval and detail level, or send one now. Use when the user asks to be kept posted, pinged on progress, or to stop updates."
usage: /ccc-status [on|off|configure|now|status]
---

# /ccc-status — progress updates while you are away

**CC Commander** · /ccc-status · periodic status messages from a long-running session to the channel you choose.

Subcommand: `$ARGUMENTS` (default `status`).

## How it works

The `hooks/status-reporter.js` PostToolUse hook counts tool calls and, when the interval has elapsed, writes a signal file. The `status-updates` skill then composes and sends the update. The hook reads its settings from its environment:

| Variable | Default | Meaning |
|---|---|---|
| `CC_STATUS_UPDATES` | `0` | `1` enables reporting |
| `CC_STATUS_INTERVAL` | `30` | Minutes between reports |
| `CC_STATUS_CHANNEL` | `auto` | `slack`, `discord`, `email` or `auto` |
| `CC_STATUS_LEVEL` | `brief` | `brief` (one line) or `detailed` (phase breakdown with stats) |

State lives in `${TMPDIR:-/tmp}/cc-status-<sessionId>.json`; the signal file is `${TMPDIR:-/tmp}/cc-status-<sessionId>.signal`.

A session cannot change its own hook environment. Settings take effect when they are in the `env` block of `.claude/settings.local.json` (or exported before launch) and a new session starts.

Channels are optional connectors, absent by default. Detect them from the tools exposed in this session, in this order: Slack, Discord, email (drafts only), then console as the fallback.

## What happens

### on

1. Detect the available channel as above.
2. Write `CC_STATUS_UPDATES=1`, `CC_STATUS_INTERVAL=30`, `CC_STATUS_LEVEL=brief` and the detected `CC_STATUS_CHANNEL` into the `env` block of `.claude/settings.local.json`, preserving every other key.
3. Verify by reading the file back, then report: "Status updates enabled — <channel> every <interval>m, from the next session."

### off

1. Set `CC_STATUS_UPDATES` to `0` in the same `env` block and read it back.
2. Remove this machine's leftover signal files:

   ```bash
   rm -f "${TMPDIR:-/tmp}"/cc-status-*.signal
   ```

3. Report "Status updates disabled."

### configure

Ask with AskUserQuestion (Codex: a plain-text question), one question at a time:

1. Channel — the detected channels, the first marked 🟢, plus Console (prints to the terminal, sends nothing).
2. Interval — 🟢 30 minutes · 15 minutes · 60 minutes · 5 minutes (noisy; for short demos).
3. Detail — 🟢 Brief: one-line summary · Detailed: phase breakdown with duration, cost, tool counts and files changed.

Then write the settings as in **on**, read the file back, and report the stored values.

### now

1. Read `${TMPDIR:-/tmp}/cc-status-<sessionId>.json` for tool counts and timing. If it is absent, build the update from the current task list and conversation instead, and say the hook has no state yet.
2. Compose the update at the configured level: task, progress, duration, tool calls, next step. Mark cost as an estimate if included.
3. Show the composed text, then send it through the configured channel. Report what was sent and where; if the send fails, show the error and do not retry silently.

### status

Print the current configuration from the settings file and the state file:

```
STATUS UPDATES: <ENABLED|DISABLED>
Channel:   <auto|slack|discord|email|console>
Interval:  <n> minutes
Level:     <brief|detailed>
Last sent: <time ago or "never">
Next due:  <time from now>
Tool calls since last: <n>
Session duration: <n>m
```

Write "unknown" for any field neither file provides.

## Done when

The settings file was read back and shows the requested values, or (for `now`) the channel accepted the message and the report names it.

## Guardrails

- Send updates only to the channel the user chose or confirmed; turning updates on in this request is the authorization for later scheduled sends to that channel.
- Email goes out as a draft unless the user explicitly asks to send.
- Never include secrets, tokens or customer data in an update.
- Edit only the `env` keys listed above in the settings file.

## See also

`/ccc-cost` · `/ccc-sessions` · `/ccc-checkpoint`
