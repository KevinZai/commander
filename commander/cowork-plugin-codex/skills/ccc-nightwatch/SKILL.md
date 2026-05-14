---
name: ccc-nightwatch
description: "Remote YOLO control. Approve/deny tool use from your phone via Telegram/Discord while Claude runs overnight. Auto-classifies risk: reads auto-allow, rm/deploy ask human."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[setup | status | test]"
---

# /ccc-nightwatch — Remote YOLO Control

Run Claude Code autonomously overnight. Approve or deny tool use from your phone via Telegram or Discord. A PreToolUse hook intercepts every tool call, classifies it by risk, and either auto-allows, asks you, or hard-blocks — no sitting at the terminal required.

## What it does

Nightwatch installs a PreToolUse permission hook that intercepts tool calls during `/ccc night` (YOLO mode). Each call is scored against the risk matrix. Low-risk ops (reads, searches) proceed silently. Medium-risk ops (file writes, installs) send a phone notification and wait for your tap. High-risk ops (destructive commands, force pushes) are hard-blocked and alert you immediately. Your response routes back into the session within 2–5 seconds, and Claude continues.

## Triggers

- `/ccc-nightwatch`
- "I want to run Claude Code overnight"
- "approve from phone"
- "remote YOLO"
- "autonomous with safety leash"
- "let it run, I'll check from my phone"

## Risk Classification Matrix

| Risk Level | Examples | Action |
|-----------|----------|--------|
| 🟢 Auto-allow | Read, Glob, Grep, LS, cat, git status, git log | Proceed silently — logged |
| 🟡 Ask human | Edit, Write, Bash (npm/yarn/pnpm install), git commit, git push (non-main) | Push phone notify → await tap → resume |
| 🔴 Always-deny | rm -rf, git push --force to main, DROP TABLE, secret exfil patterns | Hard block + immediate alert |

Unclassified tools default to 🟡 Ask human.

## Architecture

```
Claude Code (YOLO mode)
       |
  [PreToolUse hook]  ← hooks/nightwatch-relay.js
       |
  [Risk Classifier]
       |
  ┌────┴────────────────────┐
  |                          |
🟢 Auto-allow            🟡 Ask human          🔴 Always-deny
  |                          |                       |
proceed silently     [Notifier]               block + alert
  |                   /     \
  |            Telegram    Discord
  |              bot        webhook
  |                \       /
  |            user taps ✅/❌
  |                   |
  └──────────────[Resume session]
                      |
               tool call proceeds
               (or blocked on ❌)
```

## Setup

### Step 1 — Choose your channel

Run `/ccc-nightwatch` and pick your channel:

```
AskUserQuestion:
  question: "Which phone channel?"
  options:
    - Telegram bot (recommended — instant, private)
    - Discord webhook (easier setup)
    - Skip (log-only mode — no phone, just audit trail)
```

### Step 2a — Telegram setup

```bash
# 1. Create bot via @BotFather on Telegram → get token
# 2. Set env var
export CCC_NIGHTWATCH_TG_TOKEN="7123456789:AABBcc..."
export CCC_NIGHTWATCH_TG_CHAT_ID="123456789"   # your personal chat ID

# 3. Test it
curl -s "https://api.telegram.org/bot$CCC_NIGHTWATCH_TG_TOKEN/sendMessage" \
  -d "chat_id=$CCC_NIGHTWATCH_TG_CHAT_ID&text=Nightwatch+online+✅"
```

Get your chat ID: message @userinfobot on Telegram.

### Step 2b — Discord setup

```bash
# 1. Server Settings → Integrations → Webhooks → New Webhook → Copy URL
export CCC_NIGHTWATCH_DISCORD_URL="https://discord.com/api/webhooks/..."

# 2. Test it
curl -s -X POST "$CCC_NIGHTWATCH_DISCORD_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"Nightwatch online ✅"}'
```

### Step 3 — Register the PreToolUse hook

Nightwatch registers its hook automatically on first run. Verify:

```bash
cat ~/.claude/settings.json | grep nightwatch
# → "hooks/nightwatch-relay.js"
```

Then launch autonomous mode:

```bash
/ccc night   # activates YOLO + Nightwatch relay
```

## Concrete Examples

**Example 1 — Long refactor, 12 npm installs**
You kick off a dependency upgrade at 11pm. Nightwatch auto-allows all `Read` and `Glob` calls (silent). 12 `npm install` calls → 12 Telegram taps (all 🟡). 3 `git commit` calls → 3 taps. You approve from bed, Claude finishes by 2am.

**Example 2 — Overnight CI fix loop**
Tests fail. Claude fixes, commits, pushes to a feature branch (🟡 — you approve), CI re-runs. Nightwatch blocks any attempt to `git push --force` to `main` (🔴 — hard deny + alert). By morning, CI is green on the feature branch waiting for your PR merge.

**Example 3 — Mid-stream AskUserQuestion relay**
Claude hits an ambiguous decision mid-codebase migration and calls `AskUserQuestion`. Nightwatch intercepts, formats the question + options as a Telegram message with inline buttons. You tap your choice. Claude resumes with your answer — no terminal required.

## Tools Used

- `Read` — inspect hook config and env vars
- `Bash` — send curl webhooks, verify token setup, test channel connectivity
- `AskUserQuestion` — channel picker and setup confirmation

## Privacy Note

Message content is scrubbed before relay. Nightwatch sends **tool name + argument summary only** — no file contents, no secret values, no code snippets. Example relay: `"Write file: src/auth/login.ts (42 lines) — allow?"` not the file content.

## When NOT to Use

- Short interactive sessions (< 30 min) — just watch the terminal
- Quick single-file fixes — YOLO mode overhead not worth it
- Sessions where you need continuous creative input — Nightwatch is for execution, not ideation

## Limitations

- Requires phone connectivity at relay time (offline = auto-deny on timeout)
- Approval latency: 2–5s per 🟡 call (network round-trip)
- Telegram bot requires a token registered with @BotFather — 2 min one-time setup
- Discord inline buttons (✅/❌) require a bot with interactions enabled; webhook-only mode falls back to reaction-based approval
- Not a substitute for reviewing the session log after — always audit `~/.claude/commander/nightwatch.log`
