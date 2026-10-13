---
name: ccc-linear-board
description: "Publish a team's Linear issues as a private Kanban page whose cards update in place from a shared data store, or hand off to /ccc-linear to view, pick or create issues in chat. Use when the user asks for a Linear board page, a sprint board to share, or types /ccc-linear-board."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Artifact
  - ArtifactData
argument-hint: "[team-key | sync | chat]"
model: sonnet
effort: medium
---

# /ccc-linear-board — the board as a page

**CC Commander** · /ccc-linear-board · a read-only Kanban of one Linear team that refreshes without republishing.

The page is [references/board-page.html](references/board-page.html): a fixed template with no issue data in its source. It declares the `db` capability and renders the `issues` collection live; this skill writes those rows with ArtifactData. Viewers only read. Moving an issue happens in Linear, then a sync.

Linear access is opt-in: the Linear connector, or `LINEAR_API_KEY` in the environment. Neither is assumed.

## When to use / when not to

- Use for a board page to keep open or share, and to refresh it.
- Use `/ccc-linear` to view the board in chat, pick a task to work on, or create an issue; this skill never writes to Linear.

## What happens

### 1. Route

`chat` invokes `/ccc-linear` and stops. `sync` goes to step 4 when the page was published before. Otherwise ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Publish or refresh the board page — a private claude.ai page; asks before uploading
- Work in chat — `/ccc-linear` to view, pick or create issues
- Cancel

### 2. Find the team and the access path

- Team key: the argument, else a `CC-`-style key in the project's CLAUDE.md, else ask the user.
- Access: a Linear connector tool for listing issues if one is loaded in this session; else `test -n "$LINEAR_API_KEY" && echo key-set`. Neither: say "Linear isn't connected. Run `/ccc-connect` to add it." and stop. Never print the key.

### 3. Publish the page (consent-gated)

1. First publish this session: ask with AskUserQuestion.
   - Question: "Publish the <team> board as a private claude.ai page? Issue ids, titles, states and projects leave Linear for this page's data store."
   - 🟢 Publish — create or update the private page
   - Work in chat instead — `/ccc-linear`
   - Cancel
   Publish only on an explicit yes. Running `/ccc-linear-board` again later in this session is the refresh consent.
2. Copy the template to the board's fixed path:
   ```bash
   mkdir -p "<scratchpad>"
   cp "${CLAUDE_PLUGIN_ROOT:-commander/cowork-plugin}/skills/ccc-linear-board/references/board-page.html" \
      "<scratchpad>/linear-board-<team-slug>.html"
   sed -i '' 's#<title>Commander Linear Board</title>#<title>Linear Board <TEAM></title>#' "<scratchpad>/linear-board-<team-slug>.html"
   ```
   One page per team: the file name and the page title carry the team key, so two teams never share a URL or a data store.
3. Publish with the Artifact tool and these capabilities (everyone the page is shared with reads; only editors and the owner write):
   ```json
   {"db": {"rules": [{"path": "", "read": "view", "write": "admin"}]}}
   ```
   - Already published from this path in this session: skip the publish; the page does not change between syncs.
   - Otherwise: `action: "list"`, find the artifact titled "Linear Board <TEAM>" (never a board for another team), `action: "read"` its `url`, then `ArtifactData` `action: "get"`, `collection: "meta"`, `doc_id: "board"` on that `url`. Found and its `team` equals `<TEAM>` (or the `meta` row does not exist yet): reuse that `url` and go to step 4 (republish with `file_path`, `url` and the capabilities only if the template changed). Found but `team` differs, or nothing found: publish `file_path` as a new page with the capabilities, `icon: "board"` and `description: "Read-only Kanban of the <TEAM> Linear team, synced from Linear by Claude."`. Never sync one team's issues into a page whose `meta/board` names another team: that page may already be shared with its viewers.
   - On Codex or without the Artifact tool: say the board needs the Artifact tool's data store and offer `/ccc-linear` instead.

### 4. Sync the rows (no republish)

1. Fetch up to 150 issues for the team, newest update first, excluding canceled ones. With the connector, use its list-issues tool. With the key:
   ```bash
   curl -s https://api.linear.app/graphql \
     -H "Authorization: $LINEAR_API_KEY" -H 'Content-Type: application/json' \
     -d '{"query":"query($team:String!){issues(first:150,orderBy:updatedAt,filter:{team:{key:{eq:$team}},state:{type:{neq:\"canceled\"}}}){nodes{identifier title url priority updatedAt state{name type} project{name}}}}","variables":{"team":"<TEAM>"}}'
   ```
   An `errors` array in the response: report its first `message` and stop.
2. Map each issue to one row, `doc_id` = the identifier (for example `CC-12`): `{"identifier", "title", "url", "priority", "updatedAt", "state": state.name, "stateType": state.type, "project": project.name or null}`. Do not add assignees or descriptions.
3. `ArtifactData` `action: "list"`, `collection: "issues"`, `query: {"limit": 1000}` on the page's `url`, to learn existing versions.
4. `ArtifactData` `action: "batch"`, at most 50 writes per call: `set` each row (`if_version` when the doc exists), `delete` listed docs no longer returned (with `if_version`), and `set` `meta/board` (`collection: "meta"`, `doc_id: "board"`) to `{"team": "<TEAM>", "syncedAt": "<ISO now>"}`. A failed pin: re-list and redo that batch once.
5. Verify with one `list` of `issues`: the count equals the rows you wrote.
6. Reply with the URL and "Synced N issues for <TEAM>". Open viewers update on their own.

## Done when

- The Artifact tool returned the page URL (first time), and the step 4.5 list count matches the synced rows.

## Guardrails

- Never publish or sync without the step 3 consent, and never on a schedule this skill set up itself.
- Never write to Linear from this skill: no state changes, comments or assignments. Use `/ccc-linear` with its own confirmation for that.
- Never put issue data into the page source; rows live only in the data store.
- Never print `LINEAR_API_KEY` or pass it anywhere except the Linear API header.
- The page cannot send prompts into the session; its links open Linear in a new tab.

## See also

- `/ccc-linear` — view, pick and create issues in chat
- `/ccc-mission-control` — the agents working those issues
- `/ccc-connect` — connect Linear

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
