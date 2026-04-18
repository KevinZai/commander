# CC Commander MCP Server (Cloud)

Hosted MCP server for CC Commander v4.0 Beta. Serves 14 tools with auth, rate limiting, and feedback gate.

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

```bash
# First time only:
fly apps create cc-commander-mcp --org personal

# Set secrets (from 1Password):
fly secrets set SUPABASE_URL=$(op read op://Alfred/cc-commander-supabase/url)
fly secrets set SUPABASE_SERVICE_ROLE_KEY=$(op read op://Alfred/cc-commander-supabase/service-role-key)
fly secrets set UPSTASH_REDIS_REST_URL=$(op read op://Alfred/cc-commander-upstash/url)
fly secrets set UPSTASH_REDIS_REST_TOKEN=$(op read op://Alfred/cc-commander-upstash/token)
fly secrets set JWT_SECRET=$(op read op://Alfred/cc-commander-jwt/secret)

# Deploy:
fly deploy --app cc-commander-mcp --strategy canary
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
