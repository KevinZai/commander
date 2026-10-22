#!/usr/bin/env bash
# Smoke test for deployed MCP server.
# Usage: ./scripts/smoke.sh [https://commander-mcp.fly.dev] [JWT_TOKEN] [--pre-mcp]
#
# Runs every check, prints a tally, and exits with the number of failures.
# Needs no credentials. With a token (arg 2 or COMMANDER_TOKEN) it adds the
# authenticated /v1/call checks.
# --pre-mcp: smoke a build from before the /mcp transport (CC-1365) existed,
# e.g. after rolling back to rollback/pre-cc1365-20261022. Expects /mcp → 404.

set -u

BASE="${1:-https://commander-mcp.fly.dev}"
TOKEN="${2:-${COMMANDER_TOKEN:-}}"
MODE="current"
for arg in "$@"; do [ "$arg" = "--pre-mcp" ] && MODE="pre-mcp"; done
[ "$TOKEN" = "--pre-mcp" ] && TOKEN="${COMMANDER_TOKEN:-}"

pass=0
fail=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ok()  { echo "  ok    $1"; pass=$((pass + 1)); }
bad() { echo "  FAIL  $1"; fail=$((fail + 1)); }

# req <curl args...> → prints HTTP status; body in $TMP/body, headers in $TMP/hdr
req() {
  curl -sS -m 15 -o "$TMP/body" -D "$TMP/hdr" -w "%{http_code}" "$@" 2>/dev/null || echo 000
}

# expect <name> <status> <curl args...>
expect() {
  local name="$1" want="$2" got
  shift 2
  got=$(req "$@")
  if [ "$got" = "$want" ]; then
    ok "$name (HTTP $got)"
  else
    bad "$name (expected $want, got $got) body: $(head -c 160 "$TMP/body")"
  fi
}

has_header() { grep -qi "^$1" "$TMP/hdr"; }

echo "[smoke] Target: $BASE (mode: $MODE)"

# 1. Health (no auth, 200, status ok)
expect "GET /health" "200" "$BASE/health"
grep -q '"status":"ok"' "$TMP/body" && ok "/health status ok" || bad "/health body: $(head -c 160 "$TMP/body")"

# 2. Discovery (no auth, 200)
expect "GET /v1" "200" "$BASE/v1"

# 3. /v1/call without auth → 401, and no WWW-Authenticate (the /v1 shape predates /mcp)
expect "POST /v1/call (no auth)" "401" -X POST -H "Content-Type: application/json" \
  -d '{"tool":"commander_status"}' "$BASE/v1/call"
has_header "www-authenticate" && bad "/v1 401 must not carry WWW-Authenticate" || ok "/v1 401 shape unchanged"

# 4. /v1/call with bad JSON → 400 with a token, 401 without (auth runs before body parse)
if [ -n "$TOKEN" ]; then
  expect "POST /v1/call (bad JSON)" "400" -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" -d 'not-json' "$BASE/v1/call"
  expect "POST /v1/call (unknown tool)" "400" -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" -d '{"tool":"bogus"}' "$BASE/v1/call"
else
  expect "POST /v1/call (bad JSON, no token)" "401" -X POST -H "Content-Type: application/json" \
    -d 'not-json' "$BASE/v1/call"
  echo "  skip  POST /v1/call (unknown tool) — set COMMANDER_TOKEN to run"
fi

# 5. Metrics: protected by METRICS_AUTH_TOKEN in production → 401 without it
expect "GET /metrics (no auth)" "401" "$BASE/metrics"

if [ "$MODE" = "pre-mcp" ]; then
  # 6. Pre-CC-1365 builds have no /mcp transport
  expect "POST /mcp (absent before CC-1365)" "404" -X POST -H "Content-Type: application/json" -d '{}' "$BASE/mcp"
else
  # 6. OAuth 2.1 protected-resource metadata (RFC 9728), bare and /mcp-suffixed
  expect "GET /.well-known/oauth-protected-resource" "200" "$BASE/.well-known/oauth-protected-resource"
  resource=$(sed -nE 's/.*"resource":"([^"]*)".*/\1/p' "$TMP/body")
  case "$resource" in
    https://*) ok "metadata resource is https ($resource)" ;;
    *) bad "metadata resource must be https (got '${resource}'); set OAUTH_RESOURCE_URL" ;;
  esac
  expect "GET /.well-known/oauth-protected-resource/mcp" "200" "$BASE/.well-known/oauth-protected-resource/mcp"

  # 7. /mcp streamable-HTTP: unauthenticated → 401 with a resource_metadata challenge
  expect "POST /mcp initialize (no auth)" "401" -X POST -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
    "$BASE/mcp"
  grep -qi '^www-authenticate:.*resource_metadata' "$TMP/hdr" \
    && ok "/mcp 401 carries resource_metadata challenge" \
    || bad "/mcp 401 missing resource_metadata challenge"
  expect "POST /mcp (garbage bearer)" "401" -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer not-a-token" -d '{}' "$BASE/mcp"
  expect "GET /mcp SSE (no auth)" "401" -H "Accept: text/event-stream" "$BASE/mcp"
fi

echo
echo "[smoke] $pass passed, $fail failed"
exit $fail
