---
description: "List, search, create, comment on and close Paperclip issues from Claude Code through its REST API. Use when your team tracks agent work in a Paperclip instance."
---

# /ccc-paperclip — Paperclip issues from Claude Code

**CC Commander** · /ccc-paperclip · reads and updates issues in a Paperclip instance you run.

Paperclip is an optional third-party task tracker. This command needs two values from the user's environment; it never guesses them:

| Variable | Meaning |
|---|---|
| `PAPERCLIP_API_URL` | Base URL of the instance, without a trailing slash |
| `PAPERCLIP_COMPANY_ID` | Company id (list them with `GET $PAPERCLIP_API_URL/api/companies`) |

A local instance in trusted mode needs no auth. For any other mode, add the instance's auth header from the user's secret store; never paste a token into the command text or a file.

## What happens

1. Check the configuration and reachability:

   ```bash
   test -n "$PAPERCLIP_API_URL" && test -n "$PAPERCLIP_COMPANY_ID" || echo "missing PAPERCLIP_API_URL or PAPERCLIP_COMPANY_ID"
   curl -sf "$PAPERCLIP_API_URL/api/companies" > /dev/null && echo reachable || echo unreachable
   ```

   If either check fails, report which one and stop.

2. Run the operation `$ARGUMENTS` asks for.

   List issues assigned to an agent that are in progress:

   ```bash
   curl -s "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues?assigneeId=<agent-uuid>&stateType=started" | python3 -m json.tool
   ```

   Search issues:

   ```bash
   curl -s "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues?query=<url-encoded+terms>" | python3 -m json.tool
   ```

   Create an issue:

   ```bash
   curl -s -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
     -H "Content-Type: application/json" \
     -d '{"title": "<title>", "description": "<body>"}'
   ```

   Update status (for example, close it):

   ```bash
   curl -s -X PATCH "$PAPERCLIP_API_URL/api/issues/<issue-id>" \
     -H "Content-Type: application/json" \
     -d '{"status": "done"}'
   ```

   Add a comment:

   ```bash
   curl -s -X POST "$PAPERCLIP_API_URL/api/issues/<issue-id>/comments" \
     -H "Content-Type: application/json" \
     -d '{"body": "Completed: <summary>"}'
   ```

   Agent UUIDs for `assigneeId` come from the user's Paperclip instance; ask for them if they are not in the request.

3. Before any create, update or comment, show the exact request and ask with AskUserQuestion:

   - 🟢 Send it — performs the one request shown.
   - Edit first — the user changes the title, body or status.
   - Cancel — nothing is written.

4. Verify a write by reading the issue back:

   ```bash
   curl -s "$PAPERCLIP_API_URL/api/issues/<issue-id>" | python3 -m json.tool
   ```

   Report the returned status or comment, not the intended one.

## Done when

Reads: the JSON result is summarized with issue ids and states. Writes: the read-back in step 4 shows the change.

## Guardrails

- Every create, update and comment is a tracker write and needs the user's approval at the moment of sending.
- Never print or store an auth token; never hardcode an instance URL, company id or agent id in a shipped file.
- If the API returns an error, report the status code and body; do not retry with altered data.

## See also

`/ccc-orchestrate` · `/ccc-peers` · `/ccc-openclaw`
