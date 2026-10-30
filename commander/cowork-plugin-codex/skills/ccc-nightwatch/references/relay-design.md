# Nightwatch relay design

Reference for `/ccc-nightwatch`. Describes how the permission relay classifies, routes and resumes tool calls. The relay hook (`hooks/nightwatch-relay.js`) is the design target; check whether the installed build ships it before promising it to the user (see SKILL.md step 1).

## Hook placement

| Event | Role in the relay | Output used |
|---|---|---|
| `PreToolUse` | Classify every call. 🔴 matches are denied before any prompt exists | `hookSpecificOutput.permissionDecision: "deny"` + `permissionDecisionReason` |
| `PermissionRequest` | A 🟡 call that would show a permission prompt is relayed to the phone; the tap becomes the decision | `hookSpecificOutput.decision: {behavior}` (allow or deny) |
| `PermissionDenied` | Auto mode denied a call; logged so the morning audit sees it | side-effect log only (the plugin's permission-denied logger already does this) |

Command hooks default to a 600-second timeout. The relay sets its own wait shorter than that and treats no answer as deny. Since Claude Code 2.1.287, PreToolUse and PermissionRequest hooks block when matching fails, so a broken classifier fails closed.

## Architecture

```
Claude Code (auto permission mode)
       |
  [PreToolUse hook]  ← hooks/nightwatch-relay.js
       |
  [Risk classifier]
       |
  ┌────┴───────────────────────────────────────┐
  |                         |                    |
🟢 auto-allow          🟡 ask human          🔴 always-deny
  |                         |                    |
proceed, log      [PermissionRequest → notifier]  block + alert
  |                    /          \
  |              Telegram        Discord
  |                bot           webhook / bot
  |                    \          /
  |               user taps ✅ / ❌
  |                         |
  └──────────────── [resume session]
                            |
                 tool call proceeds (or is denied on ❌ / timeout)
```

## Risk matrix (full)

| Risk | Examples | Action |
|---|---|---|
| 🟢 Auto-allow | Read, Glob, Grep, LS, `cat`, `git status`, `git log` | Proceed silently; logged |
| 🟡 Ask human | Edit, Write, Bash package installs (`npm`/`yarn`/`pnpm install`), `git commit`, `git push` to a non-main branch | Phone notification, wait for the tap, resume |
| 🔴 Always-deny | `rm -rf`, `git push --force` to main, `DROP TABLE`, secret-exfiltration patterns | Hard block and immediate alert |

Unclassified tools default to 🟡.

## Worked examples

- **Long refactor with many installs.** A dependency upgrade starts at 11pm. Reads and globs pass silently. Each `npm install` and each `git commit` is one tap. The user approves from bed and the run finishes by 2am.
- **Overnight CI fix loop.** Tests fail; Claude fixes, commits and pushes to a feature branch (🟡, approved); CI reruns. An attempt to `git push --force` to `main` is hard-denied with an alert (🔴). By morning CI is green on the feature branch, waiting for the user's merge.
- **Mid-run question relay.** Claude hits an ambiguous decision and calls AskUserQuestion. The relay formats the question and options as a message with inline buttons; the tap returns as the answer and the session resumes.

## Message scrubbing

The relay sends the tool name and an argument summary only: no file contents, secret values or code. Example: `Write file: src/auth/login.ts (42 lines) — allow?`.

## Limitations

- Needs phone connectivity at relay time; offline means deny on timeout.
- Approval latency is about 2–5 seconds per 🟡 call (network round trip).
- Telegram needs a bot token from @BotFather (a few minutes, once).
- Discord inline ✅/❌ buttons need a bot with interactions enabled; webhook-only mode falls back to reaction-based approval.
- It does not replace reviewing the session afterwards: audit `<config dir>/commander/nightwatch.log` and `<config dir>/commander/analytics/permission-gate.jsonl` (the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`).
