---
name: ccc-hermes
description: "Bridge Claude Code to OpenClaw Hermes Gateway (port 18789). Hermes channels become CC triggers; CC skills become Hermes-callable. Optional."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# /ccc-hermes — Hermes ↔ Claude Code Bridge

Turns Claude Code into a Hermes frontend and Hermes into a Claude Code extension. Messages flow both ways: a Telegram DM can wake a Claude Code session, and a long-running Opus task can stream progress back to your Discord. Only loads if the OpenClaw Gateway (Hermes) is running locally on port 18789.

## What it does

Two-way MCP bridge between **Claude Code** (single-session deep reasoning) and **Hermes / OpenClaw Gateway** (multi-channel, multi-agent fleet across Discord, Slack, Telegram, WhatsApp, BlueBubbles, WebChat). Inbound: Hermes routes a channel message to a Claude Code session and returns the reply to the originating channel. Outbound: Claude Code calls Hermes-exposed actions (send-to-Discord, query-agent, dispatch-paperclip-task) as MCP tools. Includes auto-escalation — when a Hermes agent (typically GPT-5.5 or Sonnet) hits a hard problem, it forwards the task to Claude Code Opus and streams the answer back.

## Activation triggers

- "connect to hermes" / "bridge to openclaw"
- "I want to use my Telegram with Claude Code"
- "send progress to my Discord while you build"
- "let Hermes hand off hard tasks to me"
- "wire up the gateway"

## Detection logic

Always probe before activating. Bail gracefully if Hermes is not present — this skill is opt-in by environment, not by config.

```bash
# Single non-blocking probe (2s timeout)
curl -fsS --max-time 2 http://localhost:18789/health 2>/dev/null \
  | jq -e '.status == "ok"' >/dev/null && echo "hermes:up" || echo "hermes:down"
```

Decision table:

| Probe result | Action |
|--------------|--------|
| `hermes:up` | Continue — render bridge status, list available channels |
| `hermes:down` | Print: "Hermes Gateway not detected at :18789. Install OpenClaw via `npm i -g openclaw` and run `openclaw gateway start`. Skipping bridge." Then exit. |
| Connection refused | Same as `hermes:down` |
| Port bound but `/health` 4xx/5xx | Print version mismatch warning + exit |

Never restart the gateway from this skill. Restarts are Kevin-approved only (see `~/clawd/CLAUDE.md` Critical Rules).

## Architecture

```
                       ┌──────────────────────┐
   Discord  ─────┐     │                      │     ┌─── Claude Code
   Slack    ─────┤     │   Hermes Gateway     │     │    (Opus 5)
   Telegram ─────┼─────│   :18789             │─────┤
   WhatsApp ─────┤     │                      │     │    .mcp.json
   WebChat  ─────┘     │   • 36 agents        │     │    └── ccc-hermes
                       │   • channel router   │           bridge MCP
                       │   • model routing    │
                       │   • Paperclip queue  │
                       └──────────┬───────────┘
                                  │
                          MCP bridge (stdio)
                                  │
                       ┌──────────▼───────────┐
                       │ Auto-escalator       │
                       │ score(task) > 0.7?   │
                       │   → Claude Code Opus │
                       │ else                 │
                       │   → Hermes agent     │
                       └──────────────────────┘
```

Inbound flow: `User → Discord channel → Hermes binds channel→agent → MCP forwards to Claude Code session → reply → Hermes posts to Discord`.

Outbound flow: `Claude Code calls hermes.send(channel, msg) → Hermes posts → user sees update in their channel`.

## Setup

### Prerequisites

- OpenClaw installed globally: `npm i -g openclaw`
- Gateway running: `openclaw gateway status` shows green
- Hermes secret set: `op item get "Hermes Bridge Token" --vault Alfred --field token` (or `HERMES_BRIDGE_TOKEN` env var)

### Wire up the MCP server

Add to your project `.mcp.json` (or `~/.claude/mcp.json` for user-scope):

```json
{
  "mcpServers": {
    "hermes-bridge": {
      "command": "openclaw",
      "args": ["bridge", "--mode", "mcp", "--port", "18789"],
      "env": {
        "HERMES_BRIDGE_TOKEN": "${HERMES_BRIDGE_TOKEN}"
      }
    }
  }
}
```

Reload Claude Code. The bridge surfaces these MCP tools: `hermes.send`, `hermes.list_channels`, `hermes.escalate`, `hermes.subscribe`.

### Verify

```bash
openclaw gateway status              # gateway green
claude mcp list | grep hermes-bridge # MCP connected
```

## Usage examples

### 1. Stream progress to Discord while Claude Code builds

> "While you scaffold the Stripe integration, send progress updates to my #builds Discord channel."

Bridge calls `hermes.send(channel="#builds", msg=...)` after each completed step. Channel is bound to the `Alfred` agent in `openclaw.json`, but Claude Code's posts are tagged `via=ccc-hermes`.

### 2. Telegram → Claude Code Opus for deep reasoning

User DMs the Hermes Telegram bot: "Refactor the auth flow in `apps/api/src/auth.ts` to use JWT cookies." Hermes scores complexity (multi-file, security boundary, irreversible) → routes to Claude Code Opus via the bridge → Opus replies → Hermes posts back to Telegram.

### 3. Auto-escalation: GPT-5.5 → Claude Code

Hermes worker (Tank, Sentinel, Codex) hits a hard architectural decision. It calls `hermes.escalate({ task, context, complexity_score })`. The bridge wakes a Claude Code session, runs the task on Opus, and streams the resolution back to the originating channel.

## Auto-escalation logic

Complexity scoring (0.0–1.0). Anything ≥ 0.7 escalates to Claude Code Opus by default.

| Signal | Weight | Notes |
|--------|--------|-------|
| File scan only | 0.1 | Stays in Hermes (cheap models fine) |
| Single-file edit | 0.3 | Hermes Sonnet/Codex |
| Multi-file refactor | 0.7 | → Claude Code |
| Architectural decision | 0.9 | → Claude Code Opus + dialectic-review |
| Security/auth boundary | 0.85 | → Claude Code Opus + security-auditor |
| Schema migration | 0.85 | → Claude Code Opus |
| Production deploy gate | 0.9 | → Claude Code + deploy-check skill |

Override per-task via `hermes.escalate({ force: "opus" | "hermes" })`.

## Tools used

- **Bash** — `curl` health probe, `openclaw gateway status`, `op` vault reads
- **Read** — inspect `.mcp.json`, `~/.openclaw/openclaw.json` (read-only — never edit)
- **Edit/Write** — only against project `.mcp.json` (never `~/.openclaw/*`)
- **MCP tools (when bridge active)** — `hermes.send`, `hermes.list_channels`, `hermes.escalate`, `hermes.subscribe`

## When NOT to use

- Single-machine workflow with no chat surface — adds latency for nothing
- Cloud Claude Code on a remote box — Hermes is local-loopback only
- Cross-org collaboration — Hermes is a personal AI platform, not multi-tenant
- High-frequency event streams (>10 req/sec) — use Paperclip task queue instead

## Limitations

- **Loopback only:** Hermes binds 127.0.0.1:18789. To reach it from elsewhere on your network, terminate TLS via the Caddy reverse proxy (see `~/clawd/tools/caddy/Caddyfile`). Never expose :18789 publicly.
- **Session correlation:** Each Claude Code session needs a unique ID propagated via the `X-CC-Session` header. The bridge generates one if absent, but cross-session memory requires the same ID.
- **Auth model:** Single shared bridge token. No per-user scoping yet — anyone with the token has full agent access.
- **Anthropic MAX disabled-billing edge case:** If the MAX account is `disabled_billing`, escalations to Opus fall back per ClaudeSwap chains. The bridge surfaces a `degraded` status but continues.
- **Restart blast radius:** Restarting the gateway drops all in-flight bridge calls. Do not restart without Kevin's explicit approval.
- **Codex sandbox:** Codex `exec` is read-only by default. If Hermes routes a write task to a Codex worker, either pass `-s workspace-write` (inside an isolated worktree only) or escalate to Claude Code. There is no third-party fallback — Commander routes to Anthropic models and the Codex CLI only.

See `~/clawd/CLAUDE.md` and `~/clawd/shared/INTER-AGENT-PROTOCOL.md` for the full Hermes architecture and channel-to-agent binding table.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
