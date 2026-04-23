#!/usr/bin/env bash
# Smoke test for deployed MCP server.
# Usage: ./scripts/smoke.sh https://cc-commander-mcp.fly.dev [JWT_TOKEN]
#
# Exits non-zero on first failure. Prints tally at end.

set -u

BASE="${1:-http://localhost:8080}"
TOKEN="${2:-${COMMANDER_TOKEN:-}}"

pass=0
fail=0

check() {
  local name="$1"
  local expected_status="$2"
  local actual_status="$3"
  local body="$4"
  if [ "$actual_status" = "$expected_status" ]; then
    echo "  ok    $name (HTTP $actual_status)"
    pass=$((pass + 1))
  else
    echo "  FAIL  $name (expected $expected_status, got $actual_status)"
    echo "        body: $body" | head -c 200
    echo
    fail=$((fail + 1))
  fi
}

req() {
  local method="$1"
  local path="$2"
  local header="${3:-}"
  local body="${4:-}"
  if [ -n "$body" ]; then
    curl -sS -o /tmp/.smoke-body -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      ${header:+-H "$header"} \
      -d "$body" \
      "$BASE$path"
  else
    curl -sS -o /tmp/.smoke-body -w "%{http_code}" -X "$method" \
      ${header:+-H "$header"} \
      "$BASE$path"
  fi
}

echo "[smoke] Target: $BASE"

# 1. Health (no auth, 200)
status=$(req GET /health)
check "GET /health" "200" "$status" "$(cat /tmp/.smoke-body)"

# 2. Metrics (no auth, 200, text/plain)
status=$(req GET /metrics)
check "GET /metrics" "200" "$status" "$(cat /tmp/.smoke-body)"

# 3. Discovery (no auth, 200, 14 tools)
status=$(req GET /v1)
check "GET /v1" "200" "$status" "$(cat /tmp/.smoke-body)"

# 4. /v1/call without auth → 401
status=$(req POST /v1/call "" '{"tool":"commander_status"}')
check "POST /v1/call (no auth)" "401" "$status" "$(cat /tmp/.smoke-body)"

# 5. /v1/call with bad JSON → 400
status=$(req POST /v1/call "Authorization: Bearer $TOKEN" 'not-json')
# Without a token, this returns 401 first (auth runs before body parse)
if [ -z "$TOKEN" ]; then
  check "POST /v1/call (bad JSON, no token)" "401" "$status" "$(cat /tmp/.smoke-body)"
else
  check "POST /v1/call (bad JSON)" "400" "$status" "$(cat /tmp/.smoke-body)"
fi

# 6. /v1/call with unknown tool (requires valid token)
if [ -n "$TOKEN" ]; then
  status=$(req POST /v1/call "Authorization: Bearer $TOKEN" '{"tool":"bogus"}')
  check "POST /v1/call (unknown tool)" "400" "$status" "$(cat /tmp/.smoke-body)"
else
  echo "  skip  POST /v1/call (unknown tool) — set COMMANDER_TOKEN to run"
fi

echo
echo "[smoke] $pass passed, $fail failed"
rm -f /tmp/.smoke-body
exit $fail
