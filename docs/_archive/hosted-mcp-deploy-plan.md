# Hosted MCP Deploy Plan — CC Commander v4.1

**Status:** PLAN ONLY — do not execute without completing blocker checklist  
**Author:** CC Commander deploy agent  
**Date:** 2026-05-08  
**App name:** `commander-mcp` (Fly.io)

---

## 1. What It Is

The hosted MCP server is the v4.1 cloud backend for CC Commander's `/ccc-*` plugin skills. It exposes 18 MCP tools (`commander_list_skills`, `commander_get_skill`, `commander_search`, `commander_suggest_for`, `commander_invoke_skill`, `commander_list_agents`, `commander_get_agent`, `commander_invoke_agent`, `commander_status`, `commander_update`, `commander_init`, `commander_notes_pin`, `commander_tasks_push`, `commander_plan_integrate`, `commander_install_skill`, `commander_compatibility_check`, `commander_session_diagnose`, `commander_compose_plan`) via HTTP (Hono framework) with JWT auth, Upstash rate limiting, and Supabase usage tracking.

Free tier: 1,000 calls/mo per user (bumps to 2,000 if 2+ surveys answered, drops to 500 after 3+ skips). Anti-abuse cap enforced server-side.

---

## 2. Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Node.js 22-alpine (Docker) | fly.toml + Dockerfile confirmed |
| Framework | Hono v4.7.5 | Already in src/index.ts |
| Platform | **Fly.io** | fly.toml present, deploy-mcp.yml CI configured |
| Auth | JWT (jsonwebtoken ^9.0.2) | Bearer token on all /v1/* routes |
| Rate limiting | Upstash Redis (@upstash/ratelimit ^2.0.5) | Burst 60 req/min, monthly cap |
| Usage DB | Supabase (@supabase/supabase-js ^2.49.4) | User call counts, schema in db/ |
| Analytics | PostHog (optional) | mcp_error + tool_call events |
| Observability | /metrics endpoint (Prometheus text, auth-gated) | In-process counters, CWE-306 hardened |
| CI/CD | GitHub Actions deploy-mcp.yml | Triggers on push to main in apps/mcp-server-cloud/** |

Cloudflare Workers was NOT chosen — Dockerfile + fly.toml confirm Fly.io as the platform.

---

## 3. Pre-flight Checklist

Must all pass before deploying:

### Code quality
- [ ] `npm run typecheck` — zero TypeScript errors
- [ ] `npm test` — all integration + HTTP + install-skill + compatibility + session-diagnose + compose-plan tests pass
- [ ] `npm run build` — clean `dist/` produced

### Infrastructure (one-time provisioning — BLOCKERS if not done)
- [ ] Supabase project created at https://supabase.com/dashboard
- [ ] Supabase schema applied (schema from `src/db/` — verify path)
- [ ] Upstash Redis instance created at https://console.upstash.com
- [ ] Fly.io app `commander-mcp` created: `fly apps create commander-mcp --org personal`
- [ ] Custom domain `mcp.cc-commander.com` DNS pointed at Fly.io (see section 8)

### Required env vars (5 required, 2 optional)

| Var | Required | Source |
|-----|----------|--------|
| `SUPABASE_URL` | yes | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase dashboard → Settings → API |
| `UPSTASH_REDIS_REST_URL` | yes | Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | yes | Upstash console |
| `JWT_SECRET` | yes | `openssl rand -hex 32` (min 32 chars) |
| `POSTHOG_API_KEY` | no | PostHog project settings |
| `METRICS_AUTH_TOKEN` | no | Any strong random token — gates /metrics endpoint |

> Note: `METRICS_AUTH_TOKEN` is used in `src/index.ts` (CWE-306 fix) but is NOT listed in `src/lib/env.ts` or `.env.example`. If unset, /metrics is publicly readable. Set it.

### 1Password vault (Alfred) — populate before deploy
```
op://Alfred/cc-commander-supabase/url
op://Alfred/cc-commander-supabase/service-role-key
op://Alfred/cc-commander-upstash/url
op://Alfred/cc-commander-upstash/token
op://Alfred/cc-commander-jwt/secret
op://Alfred/cc-commander-posthog/api-key       (optional)
op://Alfred/cc-commander-fly/api-token
op://Alfred/cc-commander-metrics/auth-token    (new — add this)
```

### GitHub Actions secret
- [ ] `FLY_API_TOKEN` set in KevinZai/commander repo secrets (required for deploy-mcp.yml)

---

## 4. Deploy Steps

### One-time app setup
```bash
fly auth login
fly apps create commander-mcp --org personal
```

### Push secrets to Fly.io
```bash
fly secrets set \
  SUPABASE_URL="$(op read op://Alfred/cc-commander-supabase/url)" \
  SUPABASE_SERVICE_ROLE_KEY="$(op read op://Alfred/cc-commander-supabase/service-role-key)" \
  UPSTASH_REDIS_REST_URL="$(op read op://Alfred/cc-commander-upstash/url)" \
  UPSTASH_REDIS_REST_TOKEN="$(op read op://Alfred/cc-commander-upstash/token)" \
  JWT_SECRET="$(op read op://Alfred/cc-commander-jwt/secret)" \
  POSTHOG_API_KEY="$(op read op://Alfred/cc-commander-posthog/api-key)" \
  METRICS_AUTH_TOKEN="$(op read op://Alfred/cc-commander-metrics/auth-token)" \
  --app commander-mcp
```

### Deploy (canary strategy)
```bash
cd apps/mcp-server-cloud
npm ci && npm run typecheck && npm test && npm run build
fly deploy --app commander-mcp --strategy canary --vm-size shared-cpu-1x
```

Watch during canary window (~5 min at 10% traffic):
```bash
fly logs --app commander-mcp | grep -E "ERROR|FATAL"
```

### Health check
```bash
curl https://commander-mcp.fly.dev/health
# Expected: {"status":"ok","version":"...","skills_loaded":...}
```

---

## 5. Rollback Plan

```bash
fly releases --app commander-mcp
fly releases rollback <version> --app commander-mcp
```

ETA: < 90 seconds. fly.toml uses `strategy = "rolling"` — at least 1 machine stays up during swap.

---

## 6. Cost Estimate

| Item | Monthly Cost |
|------|-------------|
| Fly.io shared-cpu-1x (512MB, 1 machine, `min_machines_running = 1`) | ~$1.94 |
| Fly.io bandwidth (estimate 10GB) | ~$1.00 |
| Upstash Redis (10K commands/day free tier) | $0 initially |
| Supabase (500MB DB free tier) | $0 initially |
| Anthropic API (tools are static/catalog — no LLM calls in server) | $0 (server doesn't call Anthropic) |
| PostHog (1M events/mo free) | $0 initially |
| **Total baseline** | **~$3/mo** |

At 1,000 active beta users × 100 calls/mo = 100K calls/mo: Upstash stays in free tier (3M commands/mo free on pay-as-you-go). Scale point: ~10K users.

---

## 7. Anti-Abuse Mitigations

Already implemented in middleware:
- Burst limit: 60 req/min per IP (`@upstash/ratelimit` sliding window)
- Monthly cap: 1,000 calls/user (tracked in Supabase, enforced in ratelimit middleware)
- JWT required on all `/v1/*` routes — unauthenticated requests get 401
- `429` returned with `Retry-After` header on rate limit hit
- `min_machines_running = 1` + `hard_limit = 100` concurrent requests per machine (fly.toml)

Additional to consider pre-GA:
- IP blocklist for known abuse ranges
- `commander_tasks_push` returns `not_configured` until Linear integration ships (safe stub)

---

## 8. Cutover — DNS

Target domain: `mcp.cc-commander.com`

Steps (after successful deploy to `commander-mcp.fly.dev`):
```bash
# Add custom domain to Fly app
fly certs create mcp.cc-commander.com --app commander-mcp

# Get Fly IP for DNS
fly ips list --app commander-mcp

# In DNS registrar (wherever cc-commander.com is hosted):
# Add CNAME: mcp → commander-mcp.fly.dev
# OR A record: mcp → <fly-ipv4>
# AND AAAA record: mcp → <fly-ipv6>
```

Fly handles TLS automatically via `force_https = true` in fly.toml.

CORS origin in `src/index.ts` already allows `https://cc-commander.com`. Add `https://mcp.cc-commander.com` if the MCP server needs to call itself.

---

## 9. Monitoring

| Signal | Where | How |
|--------|-------|-----|
| Health | `/health` (unauthenticated) | Fly health checks every 15s (fly.toml) |
| Metrics | `/metrics` (requires `METRICS_AUTH_TOKEN`) | Prometheus scrape at 10s interval |
| Errors | `fly logs --app commander-mcp` | grep ERROR/FATAL |
| Usage analytics | PostHog `mcp_error` + `tool_call` events | PostHog dashboard |
| SLO target | p95 latency < 500ms, error rate < 1% | Visible in /metrics |

Fly email alerts are automatic for machine crashes. PostHog funnel on `mcp_error` rate is the primary SLI alert.

---

## 10. Post-Deploy QA

```bash
# Smoke test against production
SMOKE_TARGET=https://commander-mcp.fly.dev \
SMOKE_AUTH_TOKEN="$COMMANDER_TOKEN" \
  bash apps/mcp-server-cloud/scripts/smoke-test.sh
# Expected: 6/6 green

# Full 18-tool battery against prod
bash apps/mcp-server-cloud/scripts/test-against-prod.sh \
  --target=https://commander-mcp.fly.dev \
  --auth-token=$COMMANDER_TOKEN
```

Success criteria:
- All 18 tools return valid JSON with no 5xx
- `/health` → 200 with `skills_loaded > 0`
- Rate limit headers present on tool call responses
- Error rate < 0.1% over first 100 calls

---

## 11. Future — Beta to GA Graduation Criteria

| Criterion | Target | How to Measure |
|-----------|--------|---------------|
| Uptime | 99.5% (7-day rolling) | Fly health check history |
| p95 latency | < 500ms | /metrics histogram |
| Error rate | < 0.5% | PostHog mcp_error rate |
| Active users | 100+ beta users with ≥10 calls | Supabase user table |
| OAuth flow | Implemented | CC-311 user provisioning |
| SSE streaming | Full streaming (not just handshake) | Test with MCP inspector |
| Linear integration | `commander_tasks_push` functional | Integration test |

---

## Blockers (Pre-Deploy Punch List)

| # | Blocker | Severity | Notes |
|---|---------|----------|-------|
| 1 | Supabase project not provisioned | HARD | No DB URL or service key yet. Requires manual creation + schema apply. |
| 2 | Upstash Redis not provisioned | HARD | No REST URL or token. Rate limiting will fail at boot. |
| 3 | Fly app `commander-mcp` not created | HARD | `fly auth login` + `fly apps create` required first. |
| 4 | All 7 Alfred vault items missing | HARD | op list shows no cc-commander items. Populate before `fly secrets set`. |
| 5 | `FLY_API_TOKEN` GitHub secret not set | HARD | deploy-mcp.yml will fail without it. |
| 6 | `METRICS_AUTH_TOKEN` not in .env.example or env.ts | MEDIUM | /metrics is publicly readable if unset. Add to .env.example + Alfred vault. |
| 7 | DNS for `mcp.cc-commander.com` not configured | MEDIUM | Can deploy to `commander-mcp.fly.dev` first; DNS swap is post-deploy. |
| 8 | Supabase schema file location unclear | MEDIUM | DEPLOY.md references `db/schema.sql` but that path is not confirmed in repo. Check `src/db/`. |
| 9 | `flyctl` not authenticated on deploy machine | LOW | Run `fly auth login` before any fly commands. |
| 10 | `commander_tasks_push` Linear stub | LOW | Returns `not_configured` — safe for beta but should be tracked as CC-311 follow-up. |
