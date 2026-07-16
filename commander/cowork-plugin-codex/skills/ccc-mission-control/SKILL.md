---
name: ccc-mission-control
description: "Agent mission control: live dashboard, delegation flow, snapshots, and plain-English status."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
argument-hint: "[open | snapshot | status | suggestions | stop]"
---

# /ccc-mission-control — Mission Control

One board that answers "**who's working on what?**" without reading a single log line. Every CC Commander session already journals its agent runs, tasks, and delegations to `~/.claude/commander/` (`subagent-runs.jsonl`, `agent-runs.jsonl`, `tasks.jsonl`, `mission-control/events.jsonl`). Mission control turns those logs into a picture a non-coder can read: agent roster, task board, delegation flow, and a plain-English summary.

> 🔒 Privacy: everything runs locally by default — the live dashboard binds to 127.0.0.1 and no data leaves your machine. The one exception is the optional 📤 snapshot artifact: publishing uploads the snapshot (agent names, task subjects, timings) to your private claude.ai artifact URL — it starts private to your account, but treat it as leaving the machine. The skill always asks before publishing, and never publishes automatically.

## How it routes

On `/ccc-mission-control` with no argument, open a click-first picker:

```
AskUserQuestion:
  question: "Mission control — how do you want to see your agents?"
  options:
    - 🖥️ Open live dashboard — auto-refreshing panel that sits beside your chat
    - 🛰️ Publish snapshot artifact — a living status page you can keep or share
    - 🗣️ Plain-English status — narrate it right here, zero jargon
    - 💡 Review & promote suggestions — triage the ideas agents have surfaced
    - ⏹️ Stop dashboard — shut the local server down
```

Explicit sub-commands skip the picker: `/ccc-mission-control open`, `/ccc-mission-control snapshot`, `/ccc-mission-control status`, `/ccc-mission-control suggestions`, `/ccc-mission-control stop`.

**Zero-state:** if the logs are empty or missing, say so plainly and point forward — "No agents yet — spawn one with `/ccc-spawn` (or fan out with `/ccc-fleet`) and this board lights up." Never render an error for an empty board.

### 🖥️ Open live dashboard ("sits on the left side" mode)

1. **Check whether the dashboard is already up:**
   ```bash
   curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4690/
   ```
2. **If not `200`, start it** — run `node dashboard/server.js` as a **background task** from the CC Commander repo root. Finding that root:
   - Working inside the CCC repo → use the current checkout.
   - Installed via marketplace → the plugin lives in the marketplace cache; the repo checkout is at `${CODEX_PLUGIN_ROOT}/../..` — verify `dashboard/server.js` exists there before launching.
   - No `dashboard/server.js` anywhere → **fall back to snapshot mode** (next section) instead of failing.
3. **Open the Browser pane** at `http://127.0.0.1:4690/mission-control.html` (`preview_start {url}`). The panel docks beside the chat and keeps itself fresh while you keep working.

### 🛰️ Publish snapshot artifact

**LIVING PATTERN:** always render to the same file path, such as `scratchpad/mission-control-live.html`, then republish that same path with the Artifact tool. Same path means the same URL, so each republish updates one living status page instead of creating a trail of stale copies.

Build the model and render the self-contained HTML file with the plugin's own library (no dashboard needed):

```bash
mkdir -p scratchpad
node --input-type=module -e "
import { readModel, buildSnapshotHtml } from '${CODEX_PLUGIN_ROOT}/lib/mission-control-snapshot.js';
import { writeFile } from 'node:fs/promises';
const html = buildSnapshotHtml(await readModel({}));
await writeFile(process.argv[1], html);
" scratchpad/mission-control-live.html
```

Then publish that same file with the **Artifact** tool using favicon `🎛️` and stable title **"Commander Mission Control"**.

**Confirm before publishing:** before the first Artifact publish, use `AskUserQuestion` to tell the user that agent names, task subjects, and timings will leave the machine for their private claude.ai artifact URL. Publish only after an explicit confirmation. Never publish automatically.

**🔄 Refresh snapshot:** rebuild the model → rewrite `scratchpad/mission-control-live.html` → republish that same file. The URL stays the same. Ask for explicit confirmation before every republish. If new session IDs appeared since the last published snapshot, call them out in the confirmation so the user knows new session data will be uploaded.

**📱 Check from your phone:** open the published URL there and revisit it after each refresh.

The artifact is a snapshot that updates on republish, not a self-refreshing page; strict CSP forbids live fetch.

The page is strict-CSP-safe: inline CSS, inline data, no scripts, no external URLs.

> **Honest note on surfaces:** artifact publishing is verified in Claude Code Desktop; Cowork support varies by build. If the Artifact tool isn't available, fall back to sending the HTML file to the user (SendUserFile) — it renders standalone in any browser.

### 🗣️ Plain-English status

For non-coders, or when a panel is overkill. Read the JSONL logs (or run `readModel` from the snapshot library and use its `summary`), then narrate — caveman-simple, no jargon:

If `awaitingPermission` is non-empty, say that **first**. Name each waiting session and tell the user to switch to that session to approve.

> **Right now:** 2 helpers working — *reviewer* has been at it 12 minutes, *builder* just started. **Earlier today:** 3 helpers finished fine, 1 hit a problem (*auditor* — timed out). **Tasks:** 2 in progress, 4 done, 1 waiting. **Hand-offs:** your main session delegated work to *reviewer* 12 minutes ago.

Rules: never say "subagent", "JSONL", "session_id", or token counts unless asked. Say "helper", "hand-off", "finished", "hit a problem".

### 💡 Review & promote suggestions

Agents can drop a proactive "you might want to do X" idea into `~/.claude/commander/mission-control/suggestions.jsonl` (see `lib/suggestions.js`). This flow triages that queue.

1. **Read the queue:** run `readModel({})` from the snapshot library (or read `model.suggestions` off the live dashboard's `/api/suggestions`) and pull `model.suggestions`, newest `status: "new"` first.
2. **Zero-state:** if there are no `new` suggestions, say so plainly — "Nothing waiting for review right now." — and stop.
3. **Triage in batches of up to 4** with a click-first picker per item:
   ```
   AskUserQuestion:
     question: "<idea text> — from <from>. <evidence, if any>."
     options:
       - ✅ Promote — create a tracked ticket for this
       - ⏭️ Skip for now — leave it as "new", ask again later
       - 🗑️ Dismiss — this isn't worth tracking
   ```
4. **On promote:** create the ticket with whatever tracker the session already has access to — the Linear MCP if it's connected, otherwise a `curl` GraphQL call against `$LINEAR_API_KEY` if the user has that configured. Use the suggestion's `proposed_ticket.title`/`project`/`priority` as the starting draft, but confirm the title with the user before creating anything (never publish external tickets silently). If no tracker is available, say so and offer to just dismiss or leave it as `new`.

   Once the ticket exists, append the status line with a `node -e` one-liner against the shared writer lib (never write the JSONL by hand):
   ```bash
   node -e "
   import('${CODEX_PLUGIN_ROOT}/lib/suggestions.js').then(({ appendStatus }) =>
     appendStatus({ id: '<suggestion-id>', status: 'promoted', promoted_ticket: { id: '<ticket-id>', title: '<ticket-title>', url: '<ticket-url>' }, by: 'mission-control' }, {})
   );
   "
   ```
5. **On dismiss:** append the same way with `status: 'dismissed'`:
   ```bash
   node -e "
   import('${CODEX_PLUGIN_ROOT}/lib/suggestions.js').then(({ appendStatus }) =>
     appendStatus({ id: '<suggestion-id>', status: 'dismissed', by: 'mission-control' }, {})
   );
   "
   ```
6. **On skip:** do nothing — it stays `status: "new"` and resurfaces next time this flow runs.
7. **Report back** a one-line tally: how many promoted, dismissed, and skipped.

Both the live dashboard and the published snapshot show the same queue (a 💡 Suggestions panel — status chips new/promoted/dismissed on the dashboard, a plain list with status badges on the snapshot) so you can review from either surface; this flow is for triaging it conversationally instead of clicking through the panel.

### ⏹️ Stop dashboard

Find the server and stop it politely — SIGTERM, never `-9` first, and only the dashboard process:

```bash
pgrep -f 'node .*dashboard/server\.js'
kill <pid>
```

Confirm to the user what was stopped (or that nothing was running).

## When you'd reach for it

- "What are my agents doing right now?" — before interrupting anything.
- After `/ccc-fleet` or `/ccc-spawn` kicked off parallel work and you want one board instead of scrollback.
- A non-coder (or future you) needs a status they can actually read — snapshot it.
- End of day: publish a snapshot as the durable "what happened" record.

## When NOT to use

- Mid-`/ccc-fleet` run when you want the fleet-specific tree — that's `/ccc-fleet-viz`.
- You want *advice* on what to do next — that's `/ccc-suggest`; mission control only reports.
- Nothing has ever run on this machine — there's nothing to show yet (spawn first).

## Limitations

- The board only sees work journaled by the plugin's hooks — agents run without CC Commander installed leave no trace here.
- The live dashboard needs a repo checkout with `dashboard/` present; marketplace-cache installs without it get snapshot mode (fully offline, still complete).
- The living artifact updates when you republish the same file; open the live dashboard for continuous updates.
- `agent-runs.jsonl` rotates at 10MB; the board reads the current file, so ancient history ages out.

## Related

- `/ccc-spawn` — put new work on the board (isolated sessions)
- `/ccc-fleet` — parallel agent fan-out (mission control watches it)
- `/ccc-relay` — chained spec → build → review sessions
- `/ccc-suggest` — the "what next" advisor that reads the same signals

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
