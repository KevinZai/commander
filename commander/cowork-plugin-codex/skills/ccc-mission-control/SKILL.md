---
name: ccc-mission-control
description: "Agent mission control: who is working on what, as a local live dashboard, a plain-English status, suggestion triage, or a private snapshot page whose task board updates in place. Use when the user asks what agents are doing, wants a status board, or types $ccc-mission-control."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
  - Artifact
  - ArtifactData
argument-hint: "[open | snapshot | sync | status | suggestions | stop]"
model: sonnet
effort: medium
---

# $ccc-mission-control — who is working on what

**CC Commander** · $ccc-mission-control · agent roster, task board, hand-offs and suggestions from local logs.

Sources, all under `<config dir>/commander/` (`~/.claude/commander/` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`): `subagent-runs.jsonl`, `agent-runs.jsonl`, `tasks.jsonl`, `mission-control/events.jsonl`, `mission-control/suggestions.jsonl`. Everything is read locally; only the snapshot page leaves the machine, after consent.

## When to use / when not to

- Use before interrupting running work, after `$ccc-fleet` or `$ccc-spawn` fan-out, or for a status a non-coder can read.
- Use `$ccc-fleet-viz` for one fleet run's tree, `$ccc-suggest` for advice, `$ccc-console` for the compact all-tabs view.

## What happens

### 1. Pick the view

With no argument, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Plain-English status — narrate it here; nothing leaves the machine
- Open the live dashboard — a local page beside the chat at 127.0.0.1
- Publish or refresh the snapshot page — a private claude.ai page; asks before uploading
- Review suggestions — triage the ideas agents surfaced

Arguments skip the picker: `status` (step 2), `open` (step 3), `snapshot` (step 4), `sync` (step 5), `suggestions` (step 6), `stop` (step 7).

If every log is missing or empty, say "No agents yet. Spawn one with `$ccc-spawn` (or fan out with `$ccc-fleet`) and this board lights up." and stop. That is not an error.

### 2. Plain-English status

```bash
node --input-type=module -e "
const { readModel } = await import('${CLAUDE_PLUGIN_ROOT}/lib/mission-control-snapshot.js');
const m = await readModel({});
console.log(JSON.stringify({ summary: m.summary, awaiting: m.awaitingPermission, agents: m.agents.slice(0, 8), tasks: m.tasks.length }));
"
```

If `awaiting` is non-empty, lead with it: name each waiting session and tell the user to switch to it to approve. Then narrate in plain words ("helper", "hand-off", "finished", "hit a problem"), never "subagent", "JSONL", "session_id" or token counts unless asked. Fill every value from the output; never echo placeholders.

### 3. Live local dashboard

1. `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4690/` — `200` means it is up; skip to item 3.
2. Otherwise start `node dashboard/server.js` as a background task from the CC Commander repo root: the current checkout when working in the repo, or `${CLAUDE_PLUGIN_ROOT}/../..` when that directory contains `dashboard/server.js`. If no `dashboard/server.js` exists, say so and offer step 4 instead.
3. Open `http://127.0.0.1:4690/mission-control.html` in the Browser pane when this session has one; otherwise give the user the URL. The server binds to 127.0.0.1 only, and the page refreshes itself.

### 4. Publish the snapshot page (consent-gated)

The page is the console's Overview tab with a live task board: the rest of the page is a snapshot, and the task board reads rows from the artifact's shared `db` store, so task changes reach viewers without republishing.

1. First publish this session: ask with AskUserQuestion.
   - Question: "Publish Mission Control as a private claude.ai page? Agent names, task subjects and timings leave this machine, and task rows are kept in the page's private data store."
   - 🟢 Publish — create or update the private page
   - Narrate here instead — nothing uploads
   - Cancel
   Publish only on an explicit yes. Running `$ccc-mission-control` again later in this session is the refresh consent.
2. Build the page and the task rows:
   ```bash
   mkdir -p "<scratchpad>"
   if [ -f "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" ]; then
     node "${CLAUDE_PLUGIN_ROOT}/scripts/build-console.mjs" \
       --surface artifact --tab overview --db --out <scratchpad>/mission-control-live.html \
       --emit-rows <scratchpad>/mission-control-tasks.json
   else
     node commander/cowork-plugin/scripts/build-console.mjs \
       --surface artifact --tab overview --db --out <scratchpad>/mission-control-live.html \
       --emit-rows <scratchpad>/mission-control-tasks.json
   fi
   ```
   stderr ends with `wrote N task rows` and `wrote …/mission-control-live.html`. The page ships the current board as its resting frame, so it reads correctly even where the store is unavailable.
3. Publish with the Artifact tool, always with the same capabilities (viewers read, only editors and the owner write):
   ```json
   {"db": {"rules": [{"path": "", "read": "view", "write": "admin"}]}}
   ```
   - Already published from this path in this session: publish the same `file_path` with those `capabilities`; omit `icon`.
   - Otherwise: `action: "list"`, find "Commander Mission Control", `action: "read"` its `url`, then publish `file_path` with that `url` and the `capabilities`. If none exists, publish `file_path`, the `capabilities`, `icon: "dashboard"` and `description: "Which agents ran, what they are working on, and the hand-offs between them."`.
   - On Codex or without the Artifact tool: give the user the HTML file path; the baked board is complete without the store.
4. Seed the task rows: step 5.
5. Reply with the page title, the URL, and one line from the summary.

### 5. Sync the task board (no republish)

Use this after step 4, and on `$ccc-mission-control sync` whenever tasks changed but the rest of the snapshot can wait.

1. Rebuild the rows (same command as step 4.2; the page file is rewritten but not republished).
2. Read `<scratchpad>/mission-control-tasks.json`: `{ "collection": "tasks", "rows": [{ "doc_id", "data" }] }`, newest first, at most 50.
3. `ArtifactData` `action: "list"`, `collection: "tasks"`, `query: {"limit": 1000}` on the page's `url`, to learn each existing document's `version`.
4. `ArtifactData` `action: "batch"` with up to 50 `writes` per call: `{"op": "set", "collection": "tasks", "doc_id", "data", "if_version"}` for every row (`if_version` only when that `doc_id` already exists), then `{"op": "delete", …, "if_version"}` for listed documents whose id is not in the new rows. If a pinned write fails, re-list and redo that batch once.
5. Verify with one more `list` of `tasks`: the count equals the row count. Report "Task board synced: N tasks" and say open viewers update on their own.

### 6. Review suggestions

1. Read the queue: `readModel({})` as in step 2, then `model.suggestions`, newest `status: "new"` first. None: say "Nothing waiting for review right now." and stop.
2. For each, up to four per round, ask with AskUserQuestion: "<idea> — from <from>. <evidence>."
   - 🟢 Skip for now — leave it as new
   - Promote — create a tracked ticket
   - Dismiss — not worth tracking
3. Promote: use the tracker this session already has (the Linear connector if connected, otherwise `$LINEAR_API_KEY` with the Linear GraphQL API). Draft from `proposed_ticket`, confirm the title with the user, then create it. No tracker: say so and offer skip or dismiss.
4. Record the outcome through the shared writer, never by editing the JSONL:
   ```bash
   node --input-type=module -e "
   const { appendStatus } = await import('${CLAUDE_PLUGIN_ROOT}/lib/suggestions.js');
   await appendStatus({ id: '<suggestion-id>', status: 'promoted', promoted_ticket: { id: '<ticket-id>', title: '<title>', url: '<url>' }, by: 'mission-control' }, {});
   "
   ```
   For a dismissal use `status: 'dismissed'` without `promoted_ticket`. Skip writes nothing.
5. Report the tally: promoted, dismissed, skipped.

### 7. Stop the dashboard

`pgrep -f 'node .*dashboard/server\.js'`, then `kill <pid>` (SIGTERM, never `-9` first, only that process). Confirm what stopped, or that nothing was running.

## Done when

- Status: every number came from the step 2 output in this turn.
- Dashboard: the step 3 curl returns `200`.
- Publish: the Artifact tool returned a URL, and step 5's verification list matched the row count.
- Suggestions: each promoted or dismissed id has a new status line in `mission-control/suggestions.jsonl`.

## Guardrails

- Never publish without the step 4 consent, and never on a schedule or as a side effect.
- Never create a ticket without confirming its title with the user.
- Keep the path `<scratchpad>/mission-control-live.html`; a new path is a new URL.
- The published page cannot send prompts into the session, and viewers cannot change tasks on it; only this skill writes the rows.
- The board only sees work journaled by Commander's hooks. On Codex the agent roster can be thin.

## See also

- `$ccc-console` — the same Overview with the other tabs, inline
- `$ccc-fleet-viz` — one fleet run as a tree
- `$ccc-spawn`, `$ccc-fleet` — put work on the board
- `$ccc-suggest` — what to do next

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
