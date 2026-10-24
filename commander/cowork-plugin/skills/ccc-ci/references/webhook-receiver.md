# /ccc-ci push mode — signed webhook receiver

Push mode is optional. The plugin ships no running service: on `/ccc-ci init` the assistant writes the small receiver below into `<config dir>/commander/` (`~/.claude/commander/` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`), and starts it only after the user approves binding the port. Verified events are appended to `<config dir>/commander/ccc-ci-events.jsonl`, which `/ccc-ci status` reads.

```
CI provider (GitHub Actions / Vercel / Railway)
      │  HTTPS POST, HMAC-signed body
      ▼
optional tunnel (cloudflared / ngrok)  ── public URL, approved per run
      ▼
127.0.0.1:<port>  ccc-ci-receiver.mjs
      │  signature check (HMAC-SHA256 ours, HMAC-SHA1 Vercel)
      ├── fail → 401, logged to stderr, dropped
      ▼
<config dir>/commander/ccc-ci-events.jsonl  ──►  /ccc-ci status → steps 3–6
```

## 1. Port check (ask before binding)

Default port `7891`; `--port N` overrides it. Confirm it is free, then ask the push-mode picker in the skill.

```bash
PORT=${PORT:-7891}
lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null && echo "port $PORT is in use; pick another with --port" || echo "port $PORT is free"
```

## 2. Shared secret (never printed)

```bash
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
umask 077
mkdir -p "$CCC_STATE"
test -s "$CCC_STATE/ccc-ci.secret" || openssl rand -hex 32 > "$CCC_STATE/ccc-ci.secret"
ls -l "$CCC_STATE/ccc-ci.secret"   # expect -rw-------
```

`--rotate`: delete nothing; overwrite with `openssl rand -hex 32 > "$CCC_STATE/ccc-ci.secret"` (`CCC_STATE` as defined in the step 2 block), then repeat step 5 for every provider. To store it in GitHub without displaying it (writes a repository secret, so ask first):

```bash
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
gh secret set CCC_SECRET < "$CCC_STATE/ccc-ci.secret"
```

## 3. Receiver file

Write this to `<config dir>/commander/ccc-ci-receiver.mjs`. It binds loopback only, caps bodies at 1 MB, compares signatures in constant time, and accepts only the event names in the skill's Events table.

```js
// ccc-ci-receiver.mjs: loopback-only, HMAC-verified CI event sink
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = path.join(process.env.CCC_CONFIG_DIR || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'commander');
const port = Number(process.env.CCC_CI_PORT || 7891);
const secret = fs.readFileSync(path.join(dir, 'ccc-ci.secret'), 'utf8').trim();
const vercelSecret = process.env.CCC_VERCEL_SECRET || '';
const logFile = path.join(dir, 'ccc-ci-events.jsonl');
const EVENTS = new Set(['push', 'deploy_started', 'deploy_failed', 'deploy_succeeded',
  'test_failed', 'test_succeeded', 'approval_required']);
const VERCEL = { 'deployment.created': 'deploy_started',
  'deployment.succeeded': 'deploy_succeeded', 'deployment.error': 'deploy_failed' };

const hmac = (algo, key, body) => crypto.createHmac(algo, key).update(body).digest('hex');
function same(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

http.createServer((req, res) => {
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  const chunks = [];
  let size = 0;
  req.on('data', (c) => { size += c.length; if (size > 1_000_000) req.destroy(); else chunks.push(c); });
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const ours = same(req.headers['x-ccc-signature'], hmac('sha256', secret, body));
    const vercel = Boolean(vercelSecret) && same(req.headers['x-vercel-signature'], hmac('sha1', vercelSecret, body));
    if (!ours && !vercel) { console.error('ccc-ci: signature mismatch, dropped'); res.writeHead(401).end(); return; }
    let p;
    try { p = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
    const event = vercel ? VERCEL[p.type] : p.event;
    if (!EVENTS.has(event)) { res.writeHead(202).end(); return; }
    const rec = {
      at: new Date().toISOString(), event, source: vercel ? 'vercel' : 'ccc',
      ref: p.ref ?? null, run_url: p.run_url ?? p.payload?.url ?? p.payload?.deployment?.url ?? null,
    };
    fs.appendFileSync(logFile, JSON.stringify(rec) + '\n', { mode: 0o600 });
    console.log(JSON.stringify(rec));
    res.writeHead(204).end();
  });
}).listen(port, '127.0.0.1', () => console.log(`ccc-ci: listening on 127.0.0.1:${port}`));
```

Start it after the picker's yes. As a background Bash command it stops at the background time limit (30 minutes by default); for a long session tell the user to run the same command in their own terminal.

```bash
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
CCC_CI_PORT="$PORT" node "$CCC_STATE/ccc-ci-receiver.mjs"
```

Vercel signs with its own webhook secret: the user exports it as `CCC_VERCEL_SECRET` in the shell that starts the receiver. Never write it into the file.

## 4. Tunnel (only for hosted CI, ask first)

GitHub-hosted runners and Vercel cannot reach `127.0.0.1`. A tunnel makes the receiver public; the signature check is then the only gate. Use whichever the user has installed:

```bash
cloudflared tunnel --url "http://127.0.0.1:$PORT"
ngrok http "$PORT"
```

The quick-tunnel URL changes on every run; update `CCC_WEBHOOK_URL` in the provider each time. Stop the tunnel when the session ends.

## 5. Provider configuration

### GitHub Actions

Add as the last step of the job. Inputs pass through `env`, never interpolated into the script, and the signature covers the exact body that is sent.

```yaml
- name: Notify Commander
  if: always()
  env:
    CCC_WEBHOOK_URL: ${{ secrets.CCC_WEBHOOK_URL }}
    CCC_SECRET: ${{ secrets.CCC_SECRET }}
    JOB_STATUS: ${{ job.status }}
    REF: ${{ github.ref }}
    RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
  run: |
    if [ "$JOB_STATUS" = "success" ]; then EVENT=deploy_succeeded; else EVENT=deploy_failed; fi
    BODY=$(jq -cn --arg e "$EVENT" --arg r "$REF" --arg u "$RUN_URL" '{event:$e,ref:$r,run_url:$u}')
    SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$CCC_SECRET" | awk '{print $NF}')
    curl -fsS -X POST "$CCC_WEBHOOK_URL" -H "Content-Type: application/json" -H "X-CCC-Signature: $SIG" --data "$BODY"
```

For a test job, send `test_succeeded` / `test_failed` instead. Editing a workflow file needs the user's yes; show the diff first.

### Vercel

Dashboard → Settings → Webhooks → Add. URL: the tunnel URL. Events: `deployment.created`, `deployment.succeeded`, `deployment.error`. Copy the webhook secret Vercel shows into `CCC_VERCEL_SECRET` (step 3).

### Railway, Fly.io and others

If the provider offers project webhooks, they must send the GitHub Actions body shape with an `X-CCC-Signature` header; unsigned provider webhooks are rejected by design. Otherwise add the GitHub Actions step above to the workflow that runs the deploy.

## 6. Signed test event (`/ccc-ci test <event>`)

Signs in Node so the secret never reaches a command line:

```bash
node -e '
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto"), http = require("http");
const dir = path.join(process.env.CCC_CONFIG_DIR || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "commander");
const secret = fs.readFileSync(path.join(dir, "ccc-ci.secret"), "utf8").trim();
const body = JSON.stringify({ event: process.argv[1], ref: "refs/heads/ccc-ci-test", run_url: null });
const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
const req = http.request({ host: "127.0.0.1", port: Number(process.env.CCC_CI_PORT || 7891), method: "POST",
  headers: { "content-type": "application/json", "x-ccc-signature": sig } }, (res) => console.log("status", res.statusCode));
req.on("error", (e) => { console.error("receiver not reachable:", e.message); process.exit(1); });
req.end(body);
' deploy_failed
tail -n 1 "${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander/ccc-ci-events.jsonl"
```

Expect `status 204` and a matching last line. `401` means the secret differs from the receiver's; `202` means the event name is not in the Events table.

## 7. Stop

Stop the background receiver and any tunnel when done (stop the background command, or Ctrl-C in the user's terminal). The events file and secret stay until the user removes them.
