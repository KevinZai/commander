# Deploy — CC Commander MCP Cloud

**Target:** Fly.io, app `commander-mcp` (matches `fly.toml`), region `iad`. Public hosts: `https://commander-mcp.fly.dev` and `https://mcp.commanderplugin.com` (same machine).
**Prereqs:** `flyctl`, `op` (1Password CLI), `gh` (optional). You need one person's approval before first deploy.

## 1. Provision infra (one-time)

```bash
# Create the Fly app
fly apps create commander-mcp --org personal

# Create Supabase project (manual — https://supabase.com/dashboard)
# Run the schema from db/schema.sql (kept out of the public tree — request it from the maintainer)

# Create Upstash Redis (manual — https://console.upstash.com)
```

## 2. Populate 1Password vault

Create these items in your 1Password vault (replace `<vault>` with its name):

| OP Path | Value |
|---------|-------|
| `op://<vault>/cc-commander-supabase/url` | Supabase project URL |
| `op://<vault>/cc-commander-supabase/service-role-key` | Supabase service_role key |
| `op://<vault>/cc-commander-upstash/url` | Upstash REST URL |
| `op://<vault>/cc-commander-upstash/token` | Upstash REST token |
| `op://<vault>/cc-commander-jwt/secret` | `openssl rand -hex 32` (≥32 chars) |
| `op://<vault>/cc-commander-posthog/api-key` | (optional) PostHog project key |
| `op://<vault>/cc-commander-fly/api-token` | `fly tokens create deploy` |

## 3. Push secrets to Fly.io

```bash
fly secrets set \
  SUPABASE_URL="$(op read op://<vault>/cc-commander-supabase/url)" \
  SUPABASE_SERVICE_ROLE_KEY="$(op read op://<vault>/cc-commander-supabase/service-role-key)" \
  UPSTASH_REDIS_REST_URL="$(op read op://<vault>/cc-commander-upstash/url)" \
  UPSTASH_REDIS_REST_TOKEN="$(op read op://<vault>/cc-commander-upstash/token)" \
  JWT_SECRET="$(op read op://<vault>/cc-commander-jwt/secret)" \
  POSTHOG_API_KEY="$(op read op://<vault>/cc-commander-posthog/api-key)" \
  METRICS_AUTH_TOKEN="$(op read op://<vault>/cc-commander-metrics/token)" \
  --app commander-mcp
```

`OAUTH_RESOURCE_URL` is public and non-secret, so it lives in `fly.toml` `[env]`
(not in `fly secrets`): `https://mcp.commanderplugin.com/mcp`. It is the canonical
/mcp resource for RFC 9728 metadata, the origin of the `WWW-Authenticate`
`resource_metadata` challenge, and the default OAuth `aud`. Without it they derive
from the request's public origin (X-Forwarded-Proto aware), so each host would
advertise itself.

A Fly secret with the same name **overrides** `[env]`. An earlier version of this
runbook set `OAUTH_RESOURCE_URL=https://commander-mcp.fly.dev/mcp` as a secret,
and production still advertises that resource. Check before relying on `fly.toml`:

```bash
fly secrets list --app commander-mcp | grep OAUTH_RESOURCE_URL   # names/digests only
curl -s https://mcp.commanderplugin.com/.well-known/oauth-protected-resource
```

If the secret is listed, the `fly.toml` value only takes effect after
`fly secrets unset OAUTH_RESOURCE_URL --app commander-mcp`, which restarts the
machines (a release). That is a prod change: Kevin approves and runs it, then
smoke (§6). Expected after: `"resource":"https://mcp.commanderplugin.com/mcp"` and a
`resource_metadata="https://mcp.commanderplugin.com/.well-known/oauth-protected-resource"`
challenge on an unauthenticated `POST /mcp`. If an OAuth issuer is configured later,
its tokens must carry `aud=https://mcp.commanderplugin.com/mcp` (or set `OAUTH_AUDIENCE`).

`fly secrets set` restarts the machines, which is a release: smoke afterwards (§6). OAuth issuer, Stripe and paywall variables are listed in `PAYWALL.md` and stay unset until monetization is armed.

## 4. Pre-deploy checks (must all pass)

```bash
cd apps/mcp-server-cloud
npm ci
npm run typecheck             # zero TS errors
npm test                      # full app suite
npm run build                 # clean dist/
```

## 5. Deploy

Deploys run from GitHub Actions; a push to `main` that touches `apps/mcp-server-cloud/**` deploys automatically. Before merging, tag the current production commit so rollback has a target:

```bash
git tag rollback/<name> <current-prod-sha> && git push origin refs/tags/rollback/<name>
```

Two workflows deploy to the same app (they share the `deploy-commander-production` concurrency group):

| Workflow | Triggers | Deploy step |
|---|---|---|
| `deploy-mcp.yml` (Deploy MCP Cloud) | push to `main` under `apps/mcp-server-cloud/**`; `workflow_dispatch` with `deploy=true` | `flyctl deploy --remote-only` after typecheck, tests and build |
| `deploy.yml` (Deploy (v4 Beta)) | push to `main` under `apps/mcp-server-cloud/**`, `site/**`, `supabase/**`; `workflow_dispatch` | `flyctl deploy --strategy canary`, then the `site` Vercel job |

`deploy.yml` runs its `deploy-mcp` job only when the push changed `apps/mcp-server-cloud/**` (or on manual dispatch), so `site/**`-only merges no longer redeploy the MCP app. A push that touches the app is deployed by both workflows, one after the other. The `deploy-site` job fails until the Vercel IDs are configured; that failure does not affect the MCP deploy.

Watch logs during a release:

```bash
fly logs --app commander-mcp | grep -E "ERROR|FATAL"
```

## 6. Post-deploy smoke test

```bash
./scripts/smoke.sh https://commander-mcp.fly.dev            # no credentials needed
./scripts/smoke.sh https://commander-mcp.fly.dev "$TOKEN"   # adds authenticated /v1/call checks
```

Expected output without a token: `14 passed, 0 failed` (one skip). The smoke covers `/health`, `/v1`, `/v1/call` auth, `/metrics` (401: protected by `METRICS_AUTH_TOKEN`), the OAuth protected-resource metadata (must advertise `https`), and the `/mcp` streamable-HTTP 401 challenge. Exit status is the failure count.

## 7. Rollback (if needed)

Redeploy the rollback tag through the same workflow (no local Fly login needed):

```bash
gh workflow run deploy-mcp.yml -R KevinZai/commander --ref rollback/<name> -f deploy=true
./scripts/smoke.sh https://commander-mcp.fly.dev --pre-mcp   # if the tag predates /mcp (CC-1365)
```

With a Fly token, a previous image can be redeployed directly:

```bash
fly releases --app commander-mcp --image
fly deploy --app commander-mcp --image registry.fly.io/commander-mcp:<deployment-tag>
```

To revert only a secret change: `fly secrets unset <NAME> --app commander-mcp`.

## Blast radius

- **Health:** `/health` is unauthenticated — page OK to expose.
- **Metrics:** `/metrics` requires `METRICS_AUTH_TOKEN` as a bearer token when that secret is set (it is in production; unauthenticated requests get 401).
- **MCP:** `/mcp` requires a bearer token (a license JWT; OAuth tokens once `OAUTH_ISSUER_URL` is set). Unauthenticated → 401 with a `resource_metadata` challenge.
- **Tool calls:** All require JWT bearer token. Invalid/expired → 401. Over-cap → 429.
- **Free tier DoS budget:** 60 req/min burst × 1,000 req/mo = worst-case 60K req/day/user.

## Monitoring

- **SLI/SLO:** p95 latency on `/v1/call` < 500ms; error rate < 1%.
- **Alert channels:** Fly email + PostHog event `mcp_error`.
- **Grafana:** scrape `/metrics` at 10s interval with `Authorization: Bearer $METRICS_AUTH_TOKEN`.

## TODO(v4.1)

- OAuth flow for per-user license provisioning (currently manual JWT issuance)
- Hosted SSE multiplexer (current SSE returns capabilities once and closes — sufficient for MCP handshake but not streaming)
- Linear integration in `commander_tasks_push` (currently returns `not_configured`)
