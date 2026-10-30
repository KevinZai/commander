# /ccc-broadcast — config shape and message formats

Reference for SKILL.md `setup` and `digest`.

## Config: `<config dir>/commander/broadcast.json`

The config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`.

```json
{
  "channels": ["chat"],
  "chatTarget": "#team-ops",
  "emailTo": "owner@example.com",
  "noise": "normal",
  "confirm": true,
  "digestWindowHours": 24,
  "dailyBudgetUsd": 10,
  "audiences": { "ci": "team", "cost": "owner" },
  "opsChannel": null,
  "lastDigestAt": null,
  "recent": []
}
```

- `channels`: any of `chat`, `email`; empty means log-only.
- `noise`: `quiet` | `normal` | `verbose`.
- `confirm`: `true` asks before each send; `false` means "Send automatically".
- `audiences`: per-signal override of the default audience (`ship`, `ci`, `task`, `cost`, `incident`, `digest`).
- `opsChannel`: `null`, or `{ "channel": "chat" | "email", "target": "#ops" }` to send every signal to that one channel (the routing default `lib/broadcast-route.js` applies). It needs its `channel` listed in `channels`; otherwise relays stay log-only. The channel must already exist; setup never creates one.
- `recent`: last 20 relays, `{at, signal, channel, summary, key, ok, messageId}`. `key` is the dedup key (signal + scope + summary, where scope is the repo plus the event id); `ok` is `true` only when the connector returned `messageId`.
- No credentials ever go in this file; the router refuses a config with a token, secret, password, webhook or API-key field.

## Message formats

One line per event: emoji, event, human outcome, optional link.

- Ship: `🟢 Checkout flow is live in production. <link>`
- CI red: `🔴 CI failed on fix/cart-total (2 tests). <link>`
- CI green: `🧪 CI green on main.`
- Task: `✅ Overnight run finished: checkout flow built, tests green, deployed to staging. Review: <link>`
- Cost: `💰 Estimated spend reached 80% of today's budget ($8.00 of $10.00).`
- Incident: `🔴 Deploy failed on main at the build step. See the CI log: <link>` (link to the log; never paste its body)

## Digest

```
📊 Today: 3 ships, 1 incident (resolved), CI 94% green, estimated spend $4.10 of $10.
- 🟢 Checkout flow live
- 🟢 Pricing page copy updated
- 🟢 Search fix deployed
- 🔴 Morning deploy failed, fixed by 11:20
```

Written for a business owner: no jargon, forwardable to a client as-is.

## Examples

- Solo founder, overnight build: the run finishes at 2am; one email arrives with the task line above. No terminal, no dashboard.
- Two-person team: CI goes red on a teammate's branch and the chat gets the CI-red line at once; when it goes green and deploys, the ship line follows.
- Client-facing digest: at the end of the digest window the owner gets the digest block by email.
