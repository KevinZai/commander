---
name: ccc-nightwatch
description: "Remote permission relay for unattended runs: risk-classify each tool call, auto-allow reads, send risky calls to your phone via Telegram or Discord for a tap, hard-deny destructive ones. Use when the user wants to approve from phone, remote YOLO, or run overnight with a safety leash."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[setup | status | test]"
disable-model-invocation: true
---

# /ccc-nightwatch — remote permission relay

**CC Commander** · /ccc-nightwatch · approve or deny an unattended session's risky tool calls from your phone, with destructive calls blocked outright.

A permission hook intercepts tool calls during an unattended run (`/ccc-night-mode`, a `/loop`), scores each against the risk matrix, and either auto-allows it, asks you on Telegram or Discord, or hard-blocks it. Your tap routes back into the session and Claude continues. Full design (hook placement, diagram, examples, limits): [references/relay-design.md](references/relay-design.md).

## When to use / when not to

- Use for long unattended runs where some writes need a human yes but nobody is at the terminal.
- Do not use for short interactive sessions (under about 30 minutes) or single-file fixes; watch the terminal instead.
- Do not use for ideation work; Nightwatch is for execution.
- For outbound status (what shipped) rather than inbound approvals, use `/ccc-broadcast`.

## Risk matrix

| Risk | Examples | Action |
|---|---|---|
| 🟢 Auto-allow | Read, Glob, Grep, LS, `cat`, `git status`, `git log` | Proceed silently; logged |
| 🟡 Ask human | Edit, Write, package installs, `git commit`, `git push` to a non-main branch | Phone notification, wait for the tap, resume |
| 🔴 Always-deny | `rm -rf`, `git push --force` to main, `DROP TABLE`, secret-exfiltration patterns | Hard block and immediate alert |

Unclassified tools default to 🟡. No answer before the timeout counts as deny.

## What happens

### 1. Check what this build ships

`status` runs this step and stops.

```bash
test -f "${CLAUDE_PLUGIN_ROOT}/hooks/nightwatch-relay.js" && echo "relay: bundled" || echo "relay: not bundled"
grep -l nightwatch "${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json" ~/.claude/settings.json .claude/settings.json 2>/dev/null || echo "relay: not registered"
env | grep -c '^CCC_NIGHTWATCH_' || true
```

The last line counts configured variables without printing their values. Report exactly what was found. If the relay hook is not bundled or not registered, say so plainly: channel setup and testing below still work, but tool calls will not be relayed. Offer the safe alternatives: run in auto permission mode (the interactive default, which denies risky calls on its own and logs them through the plugin's PermissionDenied logger), or drive the session from a phone with Claude Code's Remote Control. Never claim a relay is active without this check passing.

### 2. Choose the channel

Ask with AskUserQuestion (Codex: plain-text question):

```
question: "Which phone channel should approvals use?"
header: "Channel"
options:
  - label: "🟢 Telegram bot"
    description: "Instant and private. Needs a bot token from @BotFather (a few minutes, once)."
  - label: "Discord webhook"
    description: "Easier setup. Webhook-only mode approves by reaction; inline buttons need a bot."
  - label: "Log-only"
    description: "No phone. Every decision is written to the audit log for the morning."
```

### 3a. Telegram setup

The user creates a bot with @BotFather, then sets the variables in their shell profile or secret manager. Never paste a token into the chat and never echo it.

```bash
export CCC_NIGHTWATCH_TG_TOKEN="<bot token from BotFather>"
export CCC_NIGHTWATCH_TG_CHAT_ID="<your chat id>"
```

To find the chat id, the user sends their bot one message, then:

```bash
curl -s "https://api.telegram.org/bot$CCC_NIGHTWATCH_TG_TOKEN/getUpdates" | grep -o '"chat":{"id":-\{0,1\}[0-9]*' | head -1
```

Test (`setup` and `test` both run this):

```bash
curl -s "https://api.telegram.org/bot$CCC_NIGHTWATCH_TG_TOKEN/sendMessage" \
  -d "chat_id=$CCC_NIGHTWATCH_TG_CHAT_ID" -d "text=Nightwatch online ✅" | grep -o '"ok":[a-z]*'
```

Expect `"ok":true`. On `"ok":false`, check the token and that the user messaged the bot first.

### 3b. Discord setup

Server Settings → Integrations → Webhooks → New Webhook → Copy URL, then in the shell profile:

```bash
export CCC_NIGHTWATCH_DISCORD_URL="<webhook url>"
```

Test:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$CCC_NIGHTWATCH_DISCORD_URL" \
  -H "Content-Type: application/json" -d '{"content":"Nightwatch online ✅"}'
```

Expect `204`. Any other code: re-copy the webhook URL.

Sending a test message posts to the user's channel; run it only after they picked that channel in step 2.

### 4. Launch the unattended run

With the channel tested and step 1 showing the relay registered, start the run with `/ccc-night-mode` (or a `/loop` via `/ccc-loop`). Keep the session in auto permission mode; Nightwatch does not need and never sets `bypassPermissions`.

## Privacy

Relayed messages carry the tool name and an argument summary only: no file contents, secret values or code. Example: `Write file: src/auth/login.ts (42 lines) — allow?`.

## Done when

- Step 1's status lines are reported verbatim (bundled / registered / variable count).
- The chosen channel's test returned `"ok":true` (Telegram) or `204` (Discord), or log-only was chosen.
- The user knows whether tool calls will actually be relayed, and where the audit trail is: `<config dir>/commander/nightwatch.log` and `<config dir>/commander/analytics/permission-gate.jsonl` (the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`).

## Guardrails

- Never print, log or commit a token or webhook URL; check them by count or by test result only.
- Never claim the relay is intercepting calls unless step 1 found it bundled and registered.
- Never set `bypassPermissions`; that needs explicit consent through `/ccc-yolo-setup`.
- Never relay file contents, diffs or secrets to a phone channel.
- Timeouts and unreachable channels deny; they never allow.

## See also

- `/ccc-night-mode` — the overnight build Nightwatch guards.
- `/ccc-yolo-setup` — permission mode and safe allowlists.
- `/ccc-safety` — review permission decisions after the run.
- `/ccc-broadcast` — outbound status to a team channel.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
