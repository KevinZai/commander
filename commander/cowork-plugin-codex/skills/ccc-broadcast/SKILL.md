---
name: ccc-broadcast
description: "Relay build, deploy, CI, task and cost outcomes as short scrubbed summaries to a connected team chat or email, so non-developers see what shipped. Use when the user wants the team, owner or a client told when a deploy, build or run finishes, or types $ccc-broadcast."
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[setup | status | test | digest]"
model: sonnet
effort: low
disable-model-invocation: true
---

# $ccc-broadcast — tell the team what shipped

**CC Commander** · $ccc-broadcast · plain-language status updates in the chat or inbox a team already reads, with no file contents, diffs or secrets.

`~~chat` and `~~email` mean whatever connector the user enabled through `$ccc-connect` (Slack, Teams or Discord; Gmail or Outlook); see [CONNECTORS.md](../../CONNECTORS.md). Connectors are opt-in and absent by default; log-only mode needs none. This is the outbound counterpart to `$ccc-nightwatch`: nightwatch asks "may I do this?", broadcast reports "here is what happened".

Configuration lives in `<config dir>/commander/broadcast.json` (`~/.claude/commander/broadcast.json` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`; until the lane has its own copy, read the `~/.claude/commander/broadcast.json` copy; setup writes to the lane) (shape in [references/messages.md](references/messages.md)). Connector send tools are not pre-approved by this skill, so each send also passes the session's permission check.

Codex: ask pickers as plain-text questions; send through the connector Codex has configured, or stay log-only.

## When to use / when not to

- Use when someone other than the person at the terminal needs to know a deploy, CI run, overnight task or budget threshold happened.
- Do not use for solo sessions you are already watching, one-off scripts with no audience, regulated contexts where outbound messages must pass an approved DLP gateway first, or production monitoring (`~~monitoring` owns live health; broadcast reports only what the session produced).

## Signal → audience

| Signal | Example | Default audience | Channel |
|---|---|---|---|
| 🟢 Ship | Deploy succeeded, site live | Owner + team | `~~chat` |
| 🧪 CI | Tests green or red on a branch | Team | `~~chat` |
| ✅ Task done | Overnight run or feature complete | Owner | `~~chat` or `~~email` |
| 💰 Cost | Budget threshold crossed (80% / 100%) | Owner | `~~email` |
| 🔴 Incident | Deploy failed, error spike | Team, immediately | `~~chat` |
| 📊 Digest | Rollup of the above | Owner | `~~email` |

Unclassified signals go to the digest. Per-signal overrides live in the config's `audiences` map.

## What happens

Route on the argument: `setup`, `status`, `test`, `digest`. No argument: `status` when the config exists, otherwise `setup`.

### setup

1. Detect connectors: check the session's tool list for a chat or email send tool, then run `claude mcp list 2>/dev/null | grep -iE 'slack|teams|discord|gmail|outlook'`.
2. Ask with AskUserQuestion, question "Where should status updates land?", recommended first and marked 🟢 (Team chat when a chat connector exists, Log-only when none does):
   - Team chat (`~~chat`) — ships, CI and incidents in the team channel.
   - Email digest (`~~email`) — one rollup to the owner per digest window.
   - Both — chat for incidents and ships, email for the digest.
   - Log-only — no push; relays are recorded in the config's `recent` list only.
   If the pick needs a connector that is not connected, suggest `$ccc-connect` and save the choice as log-only until it is.
3. Ask, question "How chatty should it be?":
   - 🟢 Normal — ships, CI failures, task completions, cost alerts.
   - Quiet — incidents and the digest only.
   - Verbose — every signal as it happens.
4. Ask, question "Confirm each message before it is sent?":
   - 🟢 Confirm each message — a preview picker before every send.
   - Send automatically — unattended runs send without asking; the user can switch back with `setup`.
5. Ask in chat for the channel name or recipient address and the daily budget (optional). Write `<config dir>/commander/broadcast.json`, then `chmod 600` it.

### status

Read the config and print: channels, noise level, confirmation mode, audience overrides, digest window, and the last five entries of `recent`. Missing config: "Broadcast is not set up. Run `$ccc-broadcast setup`." and stop.

### test

Compose one sample message ("🧪 Broadcast test from CC Commander — no action needed."), run the scrub check below, show the preview, and ask: 🟢 Send the sample · Cancel. Send it to each configured channel with the connector's send tool and record the result.

### digest (also the immediate relay path)

1. Gather signals since `lastDigestAt` (default: the last 24 hours), in one Bash call, silent on failure:

   ```bash
   git log --since="${SINCE:-24 hours ago}" --pretty='%h %s' 2>/dev/null | head -20
   gh run list --limit 10 --json name,conclusion,headBranch,url,updatedAt 2>/dev/null
   CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
   tail -n 50 "$CCC_STATE/ccc-ci-events.jsonl" 2>/dev/null
   cat "$CCC_STATE/last-test-result.json" 2>/dev/null
   tail -n 200 "$CCC_STATE/mission-control/metrics.jsonl" 2>/dev/null
   ```

   Add outcomes from the current session (a deploy URL that returned 200, a finished task) when they are known.
2. Classify each signal with the table above and drop what the noise level excludes. Cost figures from `metrics.jsonl` are estimates; label them so.
3. Compose one message per audience using the formats in [references/messages.md](references/messages.md): event type, human outcome, optional link. Business-legible, no jargon.
4. Scrub. Never include file contents, diffs, code, log bodies, environment values or customer data. Then run the check on every payload and block the send on any match:

   ```bash
   printf '%s' "$MSG" | grep -nEi '(api[_-]?key|secret|token|password|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[abp]-|AKIA[0-9A-Z]{16})'
   ```

   Any output means rewrite the message without that content and run the check again.
5. Confirm. In "Confirm each message" mode ask: 🟢 Send · Edit the text first · Log only. In "Send automatically" mode, send without asking.
6. Send with the connected chat or email tool. Append `{at, signal, channel, summary, ok, messageId}` to `recent` (keep the last 20) and set `lastDigestAt`.

### Unattended relays

The skill relays only when it runs. For a recurring digest, run `/loop` with `$ccc-broadcast digest` in a session that has the connector. A Routine (`/schedule`) runs in a cloud session that sees the repository and its connectors but not local `<config dir>/commander/` files, so its digest covers git and CI only. Unattended sends require "Send automatically" in the config; otherwise the run records log-only entries for review.

## Done when

Run before reporting, and report the actual result:

- setup: `jq . "$CCC_STATE/broadcast.json"` parses and `ls -l "$CCC_STATE/broadcast.json" | cut -c1-10` prints `-rw-------`.
- test or digest: the scrub check printed nothing for every payload, and each send returned a message id or ok from the connector; quote it. A send with no confirmation is reported as not delivered.
- `recent` gained one entry per message, with `ok` matching the connector result.

## Guardrails

- Never send without the user's choice in this conversation: the preview picker, or "Send automatically" chosen during `setup`.
- Never put file contents, diffs, code, log bodies, environment values, secrets or customer data in a payload; a payload that fails the scrub check is not sent.
- Never store connector credentials in `broadcast.json`; connectors own their own auth through `$ccc-connect`.
- Never poll external infrastructure or claim production health; relay only signals the session and its logs produced.
- Never message an audience or channel the user did not name during `setup`.

## See also

- `$ccc-nightwatch` — approval requests relayed to your phone
- `$ccc-connect` — enable a `~~chat` or `~~email` connector
- `$ccc-ci` — CI status and the event log broadcast reads
- `$ccc-usage` — the cost estimates behind budget alerts

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
