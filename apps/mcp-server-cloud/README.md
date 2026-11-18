# CC Commander MCP Server (Cloud)

Hosted MCP server for CC Commander v4.0 Beta. Serves MCP tools with auth, rate limiting, and feedback gate.

## Endpoints

- `GET /health` — Health check (no auth)
- `GET /v1` — MCP server capabilities
- `POST|GET /mcp` — MCP Streamable HTTP transport, the endpoint MCP clients should use (requires a Bearer token; a `401` carries an RFC 9728 `resource_metadata` challenge)
- `GET /.well-known/oauth-protected-resource` (and `/mcp` suffix) — RFC 9728 protected-resource metadata (no auth). It lists `authorization_servers` only when `OAUTH_ISSUER_URL` is set
- `GET /v1/sse` — legacy SSE transport (requires Bearer token)
- `POST /v1/call` — Tool call (requires Bearer token)
- `POST /v1/events` — opt-in plugin/CLI telemetry (no auth; see below)
- `GET /metrics` — Prometheus counters (Bearer `METRICS_AUTH_TOKEN` when set)

### Telemetry (`POST /v1/events`)

The plugin and CLI post here only when the user opts in (`CCC_TELEMETRY=1` or `"telemetry": true`). The server validates each batch (event-name allowlist, max 50 events, 50 KB, 100 batches/hour per anon device ID), scrubs sensitive property keys, then acknowledges and **discards** the events. There is no telemetry table and nothing is forwarded to a third party; the server has no analytics SDK. Only two process-lifetime counters survive, `commander_telemetry_batches_total` and `commander_telemetry_events_discarded_total` on `/metrics`, plus one log line per batch with those counts (no device ID, no properties). The rate limiter holds the anon device ID in memory for up to one hour.

## Tools

| Tool | Description |
|------|-------------|
| `commander_list_skills` | Browse the Commander skill catalog with pagination and filters. |
| `commander_get_skill` | Fetch full `SKILL.md` content for one skill. |
| `commander_search` | Search Commander skills by natural language query. |
| `commander_suggest_for` | Suggest the best skills for a task description. |
| `commander_invoke_skill` | Return skill instructions with caller-provided context. |
| `commander_list_agents` | List available Commander agents. |
| `commander_get_agent` | Fetch one agent definition. |
| `commander_invoke_agent` | Return agent instructions with a task context. |
| `commander_status` | Report server health, license tier, and usage. |
| `commander_update` | Check for Commander updates. |
| `commander_init` | Generate a project `CLAUDE.md` template. |
| `commander_notes_pin` | Pin a note to Commander's session knowledge store. |
| `commander_tasks_push` | Push a task to Linear when configured. |
| `commander_plan_integrate` | Import an existing plan into session context. |
| `commander_install_skill` | Generate an idempotent shell command to install a skill into Claude, Codex, or Cursor. |
| `commander_compatibility_check` | Check a skill's tools, hooks, and MCP requirements against a target environment. |
| `commander_session_diagnose` | Run `/ccc-doctor`'s eight diagnostics and return structured findings. |
| `commander_compose_plan` | Generate a structured `/ccc-plan`-style implementation plan from a feature description. |

## New Tool Examples

Install a skill into Codex CLI:

```json
{
  "tool": "commander_install_skill",
  "args": {
    "skill_name": "ccc-plan",
    "target_env": "codex-cli",
    "dry_run": true
  }
}
```

Check compatibility for a skill:

```json
{
  "tool": "commander_compatibility_check",
  "args": {
    "skill_name": "guard",
    "target_env": "codex-cli"
  }
}
```

Run selected diagnostics:

```json
{
  "tool": "commander_session_diagnose",
  "args": {
    "categories": ["hook-chain", "critical-files"]
  }
}
```

Compose a plan:

```json
{
  "tool": "commander_compose_plan",
  "args": {
    "feature_description": "Build a billing dashboard with Stripe subscription status and regression tests.",
    "project_context": {
      "stack": "Next.js, Postgres, Stripe",
      "repo_root": "/workspace/app",
      "recent_commits": ["feat: add account settings"]
    }
  }
}
```

## Auth

All `/v1` routes require: `Authorization: Bearer <license-key>`

License key is issued on beta signup at `commanderplugin.com/beta`.

License JWTs are HS256 tokens signed with `JWT_SECRET` whose `sub` is the
`users.user_id`. Mint them with a `kv` claim equal to the user's
`users.key_version`. Rotating `users.license_key` bumps `key_version` in the
database, and the server then rejects every token minted for the old key
(`401 Token revoked`). Tokens without `kv` count as version 1, so existing
tokens keep working until the user's key is first rotated. To revoke a user's
tokens without changing the key, increment `key_version`.

OAuth tokens on `/mcp` resolve through a stored issuer + subject binding
(`oauth_identities`). The first link uses a `sub` equal to `users.user_id`, or
the `email` claim when the issuer also sends `email_verified: true`. See
`PAYWALL.md` §3.

## Database

The schema is one ordered migration chain in
[`supabase/migrations/`](../../supabase/migrations) at the repository root:

| Order | File | Purpose |
|---|---|---|
| 1 | `20260417000000_beta_v4.sql` | Original beta tables (history, unchanged) |
| 2 | `20261118000000_reconcile_hosted_schema.sql` | Converges every earlier setup on one end state |

The end state: text `user_id` keys; `users`, `usage_counters`, `surveys`,
`feedback`, `agent_messages`, `stripe_events`, `oauth_identities`, `creators`
and `creator_clicks`; the `creators_public` view; and the
`get_effective_cap(text)`, `increment_usage(text, text)` and
`increment_creator_clicks(text)` RPCs. Only `service_role` can read or write
billing, identity and quota data. A `users_guard` trigger keeps
`anon`/`authenticated` off every `users` column except `last_seen_at`. The
same trigger pins `tier = 'founders'` while `founders_granted_at` is set, and
bumps `key_version` when an issued license key changes.

- **New database:** `supabase link --project-ref <ref>`, then `supabase db push`.
- **Database built from the chain (beta_v4):** `supabase db push` applies the
  reconcile migration.
- **Database built from `src/db/schema.sql`** (with or without
  `src/db/migrations/002_paywall_tiers.sql` and `src/db/creators-schema.sql`):
  run `supabase/migrations/20261118000000_reconcile_hosted_schema.sql` once in
  the SQL Editor. Then record the chain as applied with
  `supabase migration repair --status applied 20260417000000 20261118000000`.
  `beta_v4` cannot run on that database's uuid keys. The reconcile file
  converts them to text.

The reconcile migration is idempotent. Apply it **before** deploying a server
build that includes it. The Stripe webhook needs `stripe_events` and the new
`users` billing columns, and answers non-2xx (Stripe retries) until they exist.
Without `users.key_version`, license-token revocation is not enforced; the
server logs an error and falls back to the legacy lookup.

`src/db/schema.sql`, `src/db/migrations/002_paywall_tiers.sql` and
`src/db/creators-schema.sql` are legacy snapshots kept for databases that
already applied them. Do not build new databases from them.

To verify the chain locally (disposable Postgres 15+ only):

```bash
CCC_SQL_TEST_DISPOSABLE=1 PGHOST=<socket dir> PGPORT=<port> PGUSER=postgres \
  supabase/tests/verify-migrations.sh
```

The script builds a clean install and an upgrade from the legacy snapshot,
then asserts role privileges, quota RPCs, founders pinning, key rotation and
the creators view on both.

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

## Testing

```bash
npm test
npm run test:e2e
bash scripts/test-against-prod.sh --target=https://commander-mcp.fly.dev
```

- `npm test` runs the unit and integration suite.
- `npm run test:e2e` starts a local HTTP server, waits for `/health`, and runs the 18-tool smoke battery from `tests/fixtures/sample-inputs.json`. Tool calls are skipped unless `MCP_E2E_AUTH_TOKEN` or `COMMANDER_TOKEN` plus the required auth backend env vars are present.
- `bash scripts/test-against-prod.sh --target=https://commander-mcp.fly.dev --auth-token=$TOKEN` runs the same 18-tool battery against an explicit target. Use `--skip-auth-required` for unauthenticated health and discovery probing only.

## Deploy

Production deploys run on Fly.io app `commander-mcp` in `iad` from `.github/workflows/deploy.yml`, the single deploy path. It runs `node apps/mcp-server-cloud/scripts/bundle-catalog.mjs` before `flyctl deploy`; see [DEPLOY.md](DEPLOY.md) for the bundling step and the two migrations to apply first.

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
  SUPABASE_URL="$(op read op://<vault>/cc-commander-supabase/url)" \
  SUPABASE_SERVICE_ROLE_KEY="$(op read op://<vault>/cc-commander-supabase/service-role-key)" \
  UPSTASH_REDIS_REST_URL="$(op read op://<vault>/cc-commander-upstash/url)" \
  UPSTASH_REDIS_REST_TOKEN="$(op read op://<vault>/cc-commander-upstash/token)" \
  JWT_SECRET="$(op read op://<vault>/cc-commander-jwt/secret)" \
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
| `op://<vault>/cc-commander-supabase/url` | Supabase project URL |
| `op://<vault>/cc-commander-supabase/service-role-key` | Supabase service role key |
| `op://<vault>/cc-commander-upstash/url` | Upstash Redis REST URL |
| `op://<vault>/cc-commander-upstash/token` | Upstash Redis REST token |
| `op://<vault>/cc-commander-jwt/secret` | JWT signing secret (min 32 chars) |
| `op://<vault>/cc-commander-fly/api-token` | Fly.io deploy token |
