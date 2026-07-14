---
name: ccc-relay-smbops
description: "Ops relay for small businesses — pushes CC Commander build, deploy, CI, task, and cost signals to your team's chat/email so non-devs see what shipped. Read-only, no secrets."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[setup | status | test | digest]"
---

# /ccc-relay-smbops — Small-Business Ops Relay

> Placeholders like ~~chat and ~~email refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Turn "did the deploy work?", "is the site up?", and "did the overnight run finish?" into pushed status updates. `ccc-relay-smbops` watches the operational signals a CC Commander session already produces — builds, deploys, CI results, task completions, cost/budget alerts — and relays a plain-language summary to the channels a small business actually reads (`~~chat`, `~~email`). No dashboards to open, no terminal to babysit.

This is the *outbound status* counterpart to `/ccc-nightwatch` (which relays *approval requests* to your phone). Nightwatch asks "can I do this?"; relay-smbops tells "here's what happened."

## What it does

The skill maps CC Commander lifecycle events to a small set of business-legible messages and forwards them through whatever `~~chat` or `~~email` connector is enabled via `/ccc-connect`. Each relay is a short, scrubbed summary — event type, human outcome, and a link if one exists — never file contents, diffs, or secret values. Signals are classified by audience so engineers, owners, and clients each get the right altitude.

## Triggers

- `/ccc-relay-smbops`
- "tell the team when the deploy finishes"
- "send me a status when the build is done"
- "relay ops updates to Slack"
- "let the client know when it's live"
- "small business status updates"

## Signal → Audience Matrix

| Signal | Example | Default audience | Channel |
|--------|---------|------------------|---------|
| 🟢 Ship | Deploy succeeded, site live | Owner + team | `~~chat` |
| 🧪 CI | Tests green / red on a branch | Team | `~~chat` |
| ✅ Task done | Overnight run / feature complete | Owner | `~~chat` or `~~email` |
| 💰 Cost | Budget threshold crossed (80% / 100%) | Owner | `~~email` |
| 🔴 Incident | Deploy failed, error spike | Team (immediate) | `~~chat` |
| 🗒️ Digest | End-of-day rollup of the above | Owner | `~~email` |

Unclassified signals default to the 🗒️ digest (batched, low-noise).

## Architecture

```
CC Commander session
       |
  [lifecycle signals]  ← Stop / TaskCompleted / deploy / CI hooks
       |
  [Audience Classifier]
       |
  ┌────┴───────────────┐
  |                     |
immediate            digest (batched)
  |                     |
[Scrubber] — strips file contents, diffs, secrets
  |                     |
  └──────── ~~chat / ~~email connector ────────┘
              (Slack · Teams · Discord · Gmail)
```

## Setup

### Step 1 — Choose your audience + channel

Run `/ccc-relay-smbops setup` and pick where updates go:

```
AskUserQuestion:
  question: "Where should ops updates land?"
  options:
    - Team chat (~~chat — Slack / Teams / Discord)
    - Email digest (~~email — Gmail / Outlook)
    - Both (chat for incidents, email for the daily digest)
    - Log-only (no push — just an audit trail)
```

### Step 2 — Connect a channel

Relay is tool-agnostic. Enable a `~~chat` and/or `~~email` connector once via `/ccc-connect`; relay-smbops uses whatever is configured there. No channel-specific credentials live in this skill.

### Step 3 — Pick a noise level

```
AskUserQuestion:
  question: "How chatty should the relay be?"
  options:
    - Quiet (incidents + daily digest only)
    - Normal (ships, CI failures, task completions, cost alerts)
    - Verbose (every signal, real-time)
```

### Step 4 — Verify

```bash
/ccc-relay-smbops test   # sends one sample message to each connected channel
/ccc-relay-smbops status # shows audience map, noise level, and last 5 relays
```

## Concrete Examples

**Example 1 — Solo founder, overnight build**
You kick off an overnight feature build and go to bed. At 2am the run finishes. Relay sends one `~~email`: "✅ Checkout flow shipped — 6 files, tests green, deployed to staging. Review: <link>." No terminal, no dashboard.

**Example 2 — Two-person team, deploy visibility**
A teammate pushes a fix. CI goes red. Relay posts to `~~chat` immediately: "🔴 CI failed on `fix/cart-total` — 2 tests. <link>." When it goes green and deploys, a follow-up: "🟢 Live in production." Nobody had to ask.

**Example 3 — Client-facing digest**
At 6pm relay compiles the day into one `~~email` digest for the business owner: 3 ships, 1 incident (resolved), CI 94% green, spend $4.10 of $10 budget. Business-legible, no jargon, forwardable to a client as-is.

## Tools Used

- `Read` — inspect relay config (audience map, noise level) and recent relay log
- `Bash` — read lifecycle signals, format payloads, invoke the connected channel
- `AskUserQuestion` — audience/channel picker and noise-level selection

## Privacy Note

Every relay is scrubbed before it leaves the session. Relay sends **event type + human-readable outcome + optional link only** — never file contents, diffs, code snippets, env vars, or secret values. Example relay: `"Deploy failed on main — build step, see CI log <link>"` not the log body.

## When NOT to Use

- Solo sessions where you're already watching the terminal — the relay overhead isn't worth it
- Highly regulated contexts where any outbound relay must route through an approved DLP gateway first
- One-off scripts with no team audience — there's no one to notify

## Limitations

- Requires a `~~chat` or `~~email` connector enabled via `/ccc-connect`; log-only mode works with none
- Relay reflects only signals the session actually emits — it does not poll external infra on its own
- Digest batching means non-incident updates can lag up to the digest window
- Audience routing is a default heuristic; per-signal overrides are configured in `~/.claude/commander/relay-smbops.json`
- Not a replacement for real monitoring/alerting (`~~monitoring`) — it relays *your session's* outcomes, not production health

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
