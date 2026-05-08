---
name: ccc-ci
description: "[C:channel] — CI/CD webhook channel. Receive GitHub Actions, Vercel, Railway deploy events in your session. Auto-triggers /ccc-doctor on failures."
model: sonnet
effort: medium
allowed-tools:
  - Bash
  - Read
  - Agent
argument-hint: "[init | status | stop | test <event>]"
---

# /ccc-ci — CI/CD Webhook Channel

Bridges your CI/CD pipeline to your active Claude Code session. Deploy events arrive in real time; failures trigger automatic diagnosis; successes get celebrated.

## What it does

`/ccc-ci` runs a lightweight HTTP receiver on `localhost:7891` that accepts signed webhook payloads from GitHub Actions, Vercel, Railway, and Fly.io. Each inbound event is classified, routed to a handler, and surfaced in chat — so you see deploy failures, test results, and approval gates without leaving your session. On failure, CCC automatically loads `/ccc-doctor`, reads the CI log, classifies the error, and proposes a concrete fix. On success, it drafts a celebration tweet you can post with one click.

## Setup

```bash
# 1. Start the local receiver (default port 7891)
/ccc-ci init

# 2. (Optional) pick a different port
/ccc-ci init --port 8321

# 3. Expose publicly if your CI provider can't reach localhost
/ccc-ci init --tunnel   # wraps with ngrok or cloudflared
```

`init` prints a webhook URL, copies it to clipboard, and emits ready-to-paste configs for each supported provider.

### GitHub Actions — paste into your workflow YAML

```yaml
- name: Notify CCC
  if: always()
  run: |
    curl -s -X POST ${{ secrets.CCC_WEBHOOK_URL }} \
      -H "X-CCC-Signature: $(echo -n '${{ toJSON(github.event) }}' | openssl dgst -sha256 -hmac '${{ secrets.CCC_SECRET }}' | awk '{print $2}')" \
      -H "Content-Type: application/json" \
      -d '{"event":"${{ job.status == 'success' && 'deploy_succeeded' || 'deploy_failed' }}","ref":"${{ github.ref }}","run_url":"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}'
```

### Vercel — Dashboard → Settings → Webhooks → Add

Point to the URL printed by `/ccc-ci init`. Select: `deployment.created`, `deployment.succeeded`, `deployment.error`.

### Fly.io — `fly webhooks create`

```bash
fly webhooks create --app myapp \
  --url "$(pbpaste)" \
  --events instance_state_change
```

## Supported Events

| Event | Trigger |
|---|---|
| `push` | New commit pushed to any branch |
| `deploy_started` | Deploy job kicked off |
| `deploy_failed` | Deploy exited non-zero |
| `deploy_succeeded` | Deploy completed and healthy |
| `test_failed` | Test suite reported failures |
| `test_succeeded` | All tests green |
| `approval_required` | Manual prod gate waiting |

## Auto-actions per event

### `deploy_failed`
1. Load `/ccc-doctor` in the current session
2. Read the error log URL from the payload
3. Classify: dependency error / OOM / config drift / timeout / unknown
4. Propose targeted fix command in chat (copy-paste ready)

### `test_failed`
1. Spawn a debugger agent with the error output
2. Generate a ranked hypothesis list (most likely root cause first)
3. Suggest the minimal reproduction command

### `deploy_succeeded`
1. Print deploy stats: duration, provider, environment, URL
2. Draft a celebration tweet: "Just shipped X to production in Ys. 🚀 #buildinpublic"

### `approval_required`
1. Forward notification to `/ccc-nightwatch` so you're alerted even if your session is idle
2. Print the approval URL and the command to approve via CLI

## Architecture

```
GitHub Actions / Vercel / Fly.io / Railway
            │  (HTTPS POST, HMAC-signed)
            ▼
   localhost:7891  ◄── /ccc-ci init (Node http.Server)
            │
   signature check (HMAC-SHA256)
            │  pass               │  fail
            ▼                     ▼
   event classifier          drop + warn
    push | deploy_* | test_*
            │
   session bus (stdout pipe to Claude Code session)
            │
   skill router
   ├── deploy_failed  → /ccc-doctor + fix proposal
   ├── test_failed    → debugger agent
   ├── deploy_succeeded → celebration + tweet draft
   └── approval_required → /ccc-nightwatch relay
```

## Examples

**1 — PR fails CI on TypeScript error**
GitHub Actions calls the webhook with `test_failed` and the log URL. CCC fetches the log, extracts the TS error, and posts: "TS2339 on `src/auth.ts:42` — property `user` does not exist on type `Session`. Fix: add `user?: User` to the `Session` interface."

**2 — Vercel deploy preview ready**
`deploy_succeeded` arrives with preview URL. CCC posts: "Preview live → https://my-app-abc123.vercel.app — running Lighthouse... Score: Performance 94, A11y 100, SEO 91."

**3 — Fly.io deploy crashes**
`deploy_failed` arrives with instance logs. CCC reads the log, finds `OOMKilled`, and posts: "Memory limit hit (256MB). Fix: increase `[[vm]] memory_mb = 512` in fly.toml, then `fly deploy`."

## Security

- **Signature validation:** every request is verified with HMAC-SHA256 against a shared secret generated at `init` time and stored in `~/.claude/commander/ccc-ci.secret`.
- **Loopback only by default:** the receiver binds `127.0.0.1:7891` — not reachable from the internet unless `--tunnel` is passed.
- **Tunnel exposure:** `--tunnel` launches `ngrok http 7891` or `cloudflared tunnel --url http://localhost:7891`. The tunnel URL is rotated each `init` run; update your webhook config accordingly.
- **Secret rotation:** run `/ccc-ci init --rotate` to generate a new secret and print updated webhook configs.

## When NOT to use

- Solo dev with fully manual deploys and no CI configured
- Monorepo where CI runs are owned by another team — webhook noise without context
- Air-gapped environments where `localhost:7891` can never receive external webhooks

## Tools used

| Tool | Why |
|---|---|
| `Bash` | Start the HTTP receiver, validate HMAC, curl CI log URLs |
| `Read` | Parse `.github/workflows/`, `fly.toml`, `vercel.json` for CI context |
| `Agent` | Spawn debugger sub-agent on `test_failed` with error payload |
