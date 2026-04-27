# CC Commander MCP Server (Cloud)

Hosted MCP server for CC Commander v4.0 Beta. Serves MCP tools with auth, rate limiting, and feedback gate.

## Endpoints

- `GET /health` — Health check (no auth)
- `GET /v1` — MCP server capabilities
- `GET /v1/sse` — SSE transport (requires Bearer token)
- `POST /v1/call` — Tool call (requires Bearer token)

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
