---
name: ccc-hermes
description: "Optional bridge between Claude Code and a local Hermes agent gateway: chat channels can wake a Claude Code session, and Claude Code can post progress or accept escalations over MCP. Use when the user runs a Hermes gateway and wants channel triggers, progress posts or hand-offs."
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - AskUserQuestion
argument-hint: "[status | wire | send]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# /ccc-hermes — channels in, progress out

**CC Commander** · /ccc-hermes · connects a Claude Code session to the user's own Hermes gateway (part of the third-party OpenClaw agent runtime) through an MCP bridge.

## When to use / when not to

- Use when the user already runs a Hermes gateway locally and asks to "connect to hermes", "wire up the gateway", "send progress to my Discord while you build", "use my Telegram with Claude Code", or "let the gateway hand off hard tasks".
- Do not use without a running gateway (this skill is opt-in by environment and exits cleanly when none is found), on a single machine with no chat surface (it only adds latency), in cloud sessions (the gateway is loopback-only), for cross-organization work (one shared token, no tenancy), or for event streams above about 10 requests per second (use a task queue).

Architecture, escalation scoring and limits: [references/architecture.md](references/architecture.md).

## What happens

1. **Read the gateway location from the environment.** The user's gateway port comes from their own setup (`openclaw gateway status` reports it); this skill never assumes one.

   ```bash
   [ -n "$HERMES_GATEWAY_PORT" ] && echo "port:set" || echo "port:unset"
   [ -n "$HERMES_BRIDGE_TOKEN" ] && echo "token:set" || echo "token:unset"
   ```

   If the port is unset, ask the user to export `HERMES_GATEWAY_PORT` from their gateway's status output and stop. Never print the token; report only set or unset.

2. **Probe before anything else** (2 s, non-blocking):

   ```bash
   curl -fsS --max-time 2 "http://127.0.0.1:${HERMES_GATEWAY_PORT}/health" 2>/dev/null \
     | jq -e '.status == "ok"' >/dev/null && echo "hermes:up" || echo "hermes:down"
   ```

   | Result | Action |
   |---|---|
   | `hermes:up` | Continue: render bridge status and list channels once the bridge is wired. |
   | `hermes:down` or connection refused | Say "Hermes gateway not detected on 127.0.0.1. Install and start it per its own docs (`npm i -g openclaw`, then `openclaw gateway start`). Skipping the bridge." and stop. |
   | Port answers but `/health` returns 4xx/5xx | Warn about a probable version mismatch and stop. |

3. **Check the existing wiring.**

   ```bash
   claude mcp get hermes-bridge 2>/dev/null || echo "bridge:absent"
   ```

   If it is already connected, skip to step 6.

4. **Pick the scope** with the wiring picker (see Decision points).

5. **Wire the bridge.** The token is referenced, never written.
   - **Project scope:** Read `.mcp.json` if present, then Edit it (or Write it when absent) to add this entry, preserving every other server. Claude Code expands `${VAR}` from the environment at launch:

     ```json
     {
       "mcpServers": {
         "hermes-bridge": {
           "command": "openclaw",
           "args": ["bridge", "--mode", "mcp", "--port", "${HERMES_GATEWAY_PORT}"],
           "env": { "HERMES_BRIDGE_TOKEN": "${HERMES_BRIDGE_TOKEN}" }
         }
       }
     }
     ```

   - **User scope:** show this command for the user to run in their own terminal (the token expands there, outside the transcript):

     ```bash
     claude mcp add hermes-bridge -s user -e HERMES_BRIDGE_TOKEN="$HERMES_BRIDGE_TOKEN" -- openclaw bridge --mode mcp --port "$HERMES_GATEWAY_PORT"
     ```

   The token itself lives in the user's secret manager and reaches the shell as `HERMES_BRIDGE_TOKEN`; this skill never reads it from a vault.

6. **Verify.**

   ```bash
   openclaw gateway status
   claude mcp get hermes-bridge
   ```

   A project-scope server shows "Pending approval" until the user approves it; tell them to approve it in `/mcp`, then run `/mcp reconnect all` (or restart the session). The bridge then exposes `hermes.send`, `hermes.list_channels`, `hermes.escalate` and `hermes.subscribe`. Call `hermes.list_channels` once and report the channel names.

7. **Use it.** For progress posts, call `hermes.send(channel, msg)` after each completed step, only to channels the user named in this conversation, with the first post per channel confirmed by the send picker. For inbound and escalated tasks, work them on the session's selected model and return the result through the same channel. Bridge tool calls go through normal permission prompts.

## Decision points

`AskUserQuestion`, single select; in Codex or any surface without it, ask the same options as one plain-text question.

- **Wiring scope** (header "Bridge"): 🟢 **Project `.mcp.json`** (this repo only; token by reference; visible to collaborators once committed) · **User scope** (every project; the user runs one command) · **Status only** (no change) · **Cancel**.
- **Send** (header "Post", first post to each channel): 🟢 **Send** (posts the shown message) · **Edit message** · **Skip this channel**.

## Done when

- The probe result was reported as observed (`hermes:up` or the stop message).
- When wiring ran: `claude mcp get hermes-bridge` shows the server, `.mcp.json` (project scope) parses with `node -e 'JSON.parse(require("fs").readFileSync(".mcp.json","utf8"))'`, and the user was told how to approve and reload.
- When sending: each post reported the channel and the bridge's response.

## Guardrails

- Posting to a channel is an external message: send only to channels the user named in this conversation, and confirm the first post per channel.
- Editing `.mcp.json` changes project configuration: only after the wiring picker.
- Never start, stop or restart the gateway from this skill; gateway lifecycle belongs to the user, and a restart drops every in-flight bridge call.
- Never read or edit the gateway's own configuration files; this skill touches only the project `.mcp.json`.
- Never write, echo or log the bridge token; reference `${HERMES_BRIDGE_TOKEN}` only.
- Never expose the gateway port beyond loopback; remote access needs a TLS reverse proxy the user controls.

## See also

- `/ccc-connect` — wire other opt-in MCP servers.
- `/ccc-relay` — chain work across Claude Code sessions without a gateway.
- `/ccc-mission-control` — watch agent activity from Desktop.

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
