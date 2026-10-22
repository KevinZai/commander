# Hermes bridge — architecture and escalation contract

Reference for `../SKILL.md`. The gateway, its channel bindings and its agents belong to the user's own Hermes installation; this file describes only the contract the bridge exposes to Claude Code.

## Flow

```
chat channels (Discord, Slack, Telegram, WhatsApp, WebChat, ...)
        │
        ▼
Hermes gateway (local loopback)  ── channel router · model routing · task queue
        │
        │  MCP bridge (stdio, `openclaw bridge --mode mcp`)
        ▼
Claude Code session  ── tools: hermes.send · hermes.list_channels · hermes.escalate · hermes.subscribe
```

- **Inbound:** a user message in a bound channel → the gateway routes it to a Claude Code session through the bridge → the reply returns to the originating channel.
- **Outbound:** Claude Code calls `hermes.send(channel, msg)` → the gateway posts it → the user sees it in that channel. Posts made from Claude Code are tagged `via=ccc-hermes`.
- **Escalation:** a gateway agent that hits a hard problem calls `hermes.escalate({ task, context, complexity_score })`; the bridge wakes a Claude Code session, which works the task and streams the resolution back to the originating channel.

## Escalation scoring (0.0–1.0)

The gateway scores each task; at 0.7 or above it escalates to Claude Code by default. Claude Code runs the escalated task on the session's selected model; when the user has not chosen one, route by Commander's tiers (`opus` for implementation and review, `fable` for architecture, migrations and security boundaries).

| Signal | Weight | Handling |
|--------|--------|----------|
| File scan only | 0.1 | stays in the gateway |
| Single-file edit | 0.3 | stays in the gateway |
| Multi-file refactor | 0.7 | → Claude Code |
| Architectural decision | 0.9 | → Claude Code, plus `/ccc-debate` for a second view |
| Security or auth boundary | 0.85 | → Claude Code, plus the security-auditor agent |
| Schema migration | 0.85 | → Claude Code |
| Production deploy gate | 0.9 | → Claude Code, plus `/ccc-deploy-check` |

Per-task override: `hermes.escalate({ force: "opus" | "hermes" })` (values defined by the bridge API).

## Usage patterns

1. **Progress to a channel while building.** "While you scaffold the Stripe integration, post progress to #builds." After each completed step, call `hermes.send(channel="#builds", msg=...)`.
2. **Channel to deep reasoning.** A message such as "refactor the auth flow in `apps/api/src/auth.ts` to use JWT cookies" scores high (multi-file, security boundary), is routed to Claude Code, and the answer is posted back to the same channel.
3. **Gateway agent hand-off.** A gateway worker stuck on an architectural decision calls `hermes.escalate`; Claude Code resolves it and streams the result back.

## Limits

- **Loopback only.** The gateway binds to 127.0.0.1. Reaching it from another machine needs a TLS reverse proxy the user controls; never expose the gateway port publicly.
- **Session correlation.** Each Claude Code session needs a unique id in the `X-CC-Session` header. The bridge generates one if absent, but cross-session memory needs the same id.
- **Auth model.** One shared bridge token; anyone holding it has full agent access. Keep it in the user's secret manager and reference it as an environment variable.
- **Restart blast radius.** Restarting the gateway drops every in-flight bridge call.
- **Codex workers.** `codex exec` is read-only by default. A write task routed to a Codex worker needs `--sandbox workspace-write` inside an isolated worktree, or escalation to Claude Code. Commander routes only to Anthropic models and the Codex CLI.
