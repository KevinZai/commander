---
description: "Open, inspect or start CloudCLI web sessions so Claude Code is reachable from a browser or phone. Use when the user asks for web or mobile access to a running session."
---

# /ccc-cloudcli — reach sessions from browser

**CC Commander** · /ccc-cloudcli · bridge to a self-hosted CloudCLI web UI for browser and mobile access.

CloudCLI is an opt-in, self-hosted web UI; it is absent by default. The base URL comes from `CLOUDCLI_URL` (default `http://localhost:4681`). A remote URL, if the user exposes one, comes from `CLOUDCLI_PUBLIC_URL`; never guess a hostname.

## What happens

1. Check that CloudCLI answers:

   ```bash
   curl -s --max-time 2 "${CLOUDCLI_URL:-http://localhost:4681}/api/health"
   ```

   A JSON or `ok` body means it is running. An empty result or a non-zero exit means it is not: say "CloudCLI is not responding at `<url>`. Start it or set `CLOUDCLI_URL` to its address." and stop.

2. Ask with AskUserQuestion (Codex: a plain-text question):

   - 🟢 Open in browser — opens the web UI on this machine
   - Show connection info — prints the local and remote URLs and where auth lives
   - List web sessions — reads active sessions from the CloudCLI API
   - Create a web session — starts a new session through the API

3. Run the chosen action.

   - **Open in browser:** `open "${CLOUDCLI_PUBLIC_URL:-${CLOUDCLI_URL:-http://localhost:4681}}"` on macOS, `xdg-open` on Linux. Report the URL that was opened.
   - **Show connection info:**

     ```
     CloudCLI web terminal
     Local:  <CLOUDCLI_URL>
     Remote: <CLOUDCLI_PUBLIC_URL, or "not configured">
     Auth:   token-based; see the CloudCLI instance's own config
     Mobile: open the remote URL on a device that can reach it
     ```

     Never print the token itself.
   - **List or create web sessions:** use the session endpoints documented by the running CloudCLI instance. If its API does not document them, say so instead of guessing a path. Report the HTTP status and the session ids returned.

4. After each action, ask with AskUserQuestion:

   - 🟢 Open in browser
   - Check active sessions
   - Done

## Done when

The chosen action returned a result you can show: the opened URL, the connection block, or the session list or new session id with its HTTP status.

## Guardrails

- Never print auth tokens or credentials; point to where they are configured.
- Never invent a hostname, port or API path; use the environment values or ask.
- Creating a session starts a process on the user's machine; do it only when the user picked that option.

## See also

`/ccc-mobile` · `/ccc-session` · `/ccc-resume-session`
