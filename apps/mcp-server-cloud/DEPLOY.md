# Deploy — CC Commander MCP Cloud

**Target:** Fly.io, app `cc-commander-mcp`, region `iad`.
**Prereqs:** `flyctl`, `op` (1Password CLI), `gh` (optional). You need one person's approval before first deploy.

## 1. Provision infra (one-time)

```bash
# Create the Fly app
fly apps create cc-commander-mcp --org personal

# Create Supabase project (manual — https://supabase.com/dashboard)
# Run the schema from db/schema.sql (not included here — request from Kevin CC-311)

# Create Upstash Redis (manual — https://console.upstash.com)
```

## 2. Populate 1Password vault

Create these items in the **Alfred** vault:

| OP Path | Value |
|---------|-------|
| `op://Alfred/cc-commander-supabase/url` | Supabase project URL |
| `op://Alfred/cc-commander-supabase/service-role-key` | Supabase service_role key |
| `op://Alfred/cc-commander-upstash/url` | Upstash REST URL |
| `op://Alfred/cc-commander-upstash/token` | Upstash REST token |
| `op://Alfred/cc-commander-jwt/secret` | `openssl rand -hex 32` (≥32 chars) |
| `op://Alfred/cc-commander-posthog/api-key` | (optional) PostHog project key |
| `op://Alfred/cc-commander-fly/api-token` | `fly tokens create deploy` |

## 3. Push secrets to Fly.io

```bash
fly secrets set \
  SUPABASE_URL="$(op read op://Alfred/cc-commander-supabase/url)" \
  SUPABASE_SERVICE_ROLE_KEY="$(op read op://Alfred/cc-commander-supabase/service-role-key)" \
  UPSTASH_REDIS_REST_URL="$(op read op://Alfred/cc-commander-upstash/url)" \
  UPSTASH_REDIS_REST_TOKEN="$(op read op://Alfred/cc-commander-upstash/token)" \
  JWT_SECRET="$(op read op://Alfred/cc-commander-jwt/secret)" \
  POSTHOG_API_KEY="$(op read op://Alfred/cc-commander-posthog/api-key)" \
  --app cc-commander-mcp
```

## 4. Pre-deploy checks (must all pass)

```bash
cd apps/mcp-server-cloud
npm ci
npm run typecheck             # zero TS errors
node --import tsx --test tests/integration.test.ts   # all tests pass
npm run build                 # clean dist/
```

## 5. Deploy

```bash
fly deploy --app cc-commander-mcp --strategy canary
```

Canary routes 10% traffic to the new machine for ~5 min. Watch:

```bash
fly logs --app cc-commander-mcp | grep -E "ERROR|FATAL"
```

## 6. Post-deploy smoke test

```bash
./scripts/smoke.sh https://cc-commander-mcp.fly.dev
```

Expected output: 6/6 green.

## 7. Rollback (if needed)

```bash
fly releases --app cc-commander-mcp
fly releases rollback <version> --app cc-commander-mcp
# ETA: < 90s
```

## Blast radius

- **Health:** `/health` is unauthenticated — page OK to expose.
- **Metrics:** `/metrics` is unauthenticated — **protect with Fly.io private network** or add bearer check before exposing to public internet.
- **Tool calls:** All require JWT bearer token. Invalid/expired → 401. Over-cap → 429.
- **Free tier DoS budget:** 60 req/min burst × 1,000 req/mo = worst-case 60K req/day/user.

## Monitoring

- **SLI/SLO:** p95 latency on `/v1/call` < 500ms; error rate < 1%.
- **Alert channels:** Fly email + PostHog event `mcp_error`.
- **Grafana:** scrape `/metrics` at 10s interval.

## TODO(v4.1)

- OAuth flow for per-user license provisioning (currently manual JWT issuance)
- Hosted SSE multiplexer (current SSE returns capabilities once and closes — sufficient for MCP handshake but not streaming)
- Linear integration in `commander_tasks_push` (currently returns `not_configured`)
