# CC Commander MCP Server (Cloud)

Hosted MCP server for CC Commander v4.0 Beta. Serves MCP tools with auth, rate limiting, and feedback gate.

## Endpoints

- `GET /health` — Health check (no auth)
- `GET /v1` — MCP server capabilities
- `GET /v1/sse` — SSE transport (requires Bearer token)
- `POST /v1/call` — Tool call (requires Bearer token)

## Auth

All `/v1` routes require: `Authorization: Bearer <license-key>`

License key is issued on beta signup at `cc-commander.com/beta`.

## Rate Limits

- Burst: 60 requests/minute
- Monthly: 1,000 calls (free tier), 2,000 if 2+ surveys answered, 500 if 3+ skips

## Local Dev

```bash
cp .env.example .env.local
# Fill in real values from 1Password vault
npm install
npm run dev
```

## Deploy

Production deploys run on Fly.io app `commander-mcp` in `iad` from `.github/workflows/deploy-mcp.yml`.

Prereqs:

- Fly CLI: `brew install flyctl`
- Access to the `commander-mcp` Fly app
- `FLY_API_TOKEN` configured as a GitHub Actions secret
- Runtime secrets set with `fly secrets set`

First-time app setup:

```bash
fly auth login
fly launch --no-deploy --name commander-mcp --region iad
```

Set or update runtime secrets:

```bash
fly secrets set \
  SUPABASE_URL="$(op read op://Alfred/cc-commander-supabase/url)" \
  SUPABASE_SERVICE_ROLE_KEY="$(op read op://Alfred/cc-commander-supabase/service-role-key)" \
  UPSTASH_REDIS_REST_URL="$(op read op://Alfred/cc-commander-upstash/url)" \
  UPSTASH_REDIS_REST_TOKEN="$(op read op://Alfred/cc-commander-upstash/token)" \
  JWT_SECRET="$(op read op://Alfred/cc-commander-jwt/secret)" \
  POSTHOG_API_KEY="$(op read op://Alfred/cc-commander-posthog/api-key)" \
  --app commander-mcp
```

Check deployed secret names without printing values:

```bash
fly secrets list --app commander-mcp
```

Deploy:

```bash
fly deploy --app commander-mcp --vm-size shared-cpu-1x
```

Smoke test locally or against production:

```bash
SMOKE_TARGET=http://localhost:8080 \
SMOKE_AUTH_TOKEN="$COMMANDER_TOKEN" \
  bash apps/mcp-server-cloud/scripts/smoke-test.sh

SMOKE_TARGET=https://commander-mcp.fly.dev \
SMOKE_AUTH_TOKEN="$COMMANDER_TOKEN" \
  bash apps/mcp-server-cloud/scripts/smoke-test.sh
```

Rollback:

```bash
fly releases --app commander-mcp
fly releases rollback <version> --app commander-mcp
```

## 1Password Vault Items (Kevin: populate these in Alfred vault — CC-311)

| OP Path | What It Is |
|---------|-----------|
| `op://Alfred/cc-commander-supabase/url` | Supabase project URL |
| `op://Alfred/cc-commander-supabase/service-role-key` | Supabase service role key |
| `op://Alfred/cc-commander-upstash/url` | Upstash Redis REST URL |
| `op://Alfred/cc-commander-upstash/token` | Upstash Redis REST token |
| `op://Alfred/cc-commander-jwt/secret` | JWT signing secret (min 32 chars) |
| `op://Alfred/cc-commander-posthog/api-key` | PostHog project API key |
| `op://Alfred/cc-commander-fly/api-token` | Fly.io deploy token |
