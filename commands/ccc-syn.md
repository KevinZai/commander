---
description: "Show live agent sessions, event timelines, token usage and cost from a running Synapse observability server, inside the session. Use when the user asks what their agents are doing, which session is busiest, or where tokens went."
---

# /ccc-syn — agent observability from Synapse

**CC Commander** · /ccc-syn · session status, timelines, tokens and cost from your Synapse server.

Synapse is an opt-in, self-hosted observability server; it is absent by default. Its base URL comes from `SYNAPSE_URL` (default `http://localhost:4682`). Never guess another host.

## What happens

1. Check health:

   ```bash
   curl -s --max-time 3 "${SYNAPSE_URL:-http://localhost:4682}/api/health"
   ```

   A JSON body means it is running; show its status line. An empty result or non-zero exit means it is not: say "Synapse is not responding at `<url>`. Start it or set `SYNAPSE_URL`." and stop.

2. Ask with AskUserQuestion (Codex: a plain-text question):

   - 🟢 Live sessions — every active session with status, tokens, cost, duration and tool calls
   - Timeline — recent events: tool calls, messages, errors
   - Tokens and cost — input/output tokens and cost per session or agent, with trend by day
   - Search — filter sessions by agent, time range or keyword

3. Fetch the view from the Synapse API. Use the endpoints listed in the health response or the server's own docs; if the needed endpoint is not discoverable, say so rather than guessing a path. On a non-2xx response, show the status and body.

4. Render from the returned data only:

   ```
   | Agent | Status | Tokens (in / out) | Cost | Duration | Tools |
   |-------|--------|-------------------|------|----------|-------|
   | <name> | <status> | <in> / <out> | $<cost> | <m>m | <n> |
   ```

   For tokens, add a bar per row scaled to the largest value:

   ```
   <name>  [████████░░░░░░░░]  <tokens>  $<cost>
   ```

   Label cost figures as estimates. Omit columns the API does not return.

5. After each view, ask again with AskUserQuestion:

   - 🟢 Refresh — fetch the same view again
   - One agent — details for a session or agent the user names
   - Another view — back to the picker in step 2
   - Done

   For a spend alert threshold, hand off to `/ccc-cost` (Set budget alert).

## Done when

Every number shown came from a Synapse response in this turn, or the not-responding message was shown.

## Guardrails

- Read-only: never call a Synapse endpoint that changes state.
- Never print tokens, keys or message content containing secrets from session data.

## See also

`/ccc-cost` · `/ccc-sessions` · `/ccc-spawn`
