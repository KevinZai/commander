#!/usr/bin/env bash
set -euo pipefail

TARGET="${SMOKE_TARGET:-http://localhost:8080}"
TARGET="${TARGET%/}"
TOKEN="${SMOKE_AUTH_TOKEN:-${COMMANDER_TOKEN:-}}"
TMP_DIR="${TMPDIR:-/tmp}"
BODY_FILE="$(mktemp "$TMP_DIR/commander-mcp-smoke.XXXXXX")"

cleanup() {
  rm -f "$BODY_FILE"
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  shift 3 || true

  local args=(-sS -o "$BODY_FILE" -w "%{http_code}" -X "$method")
  if [ "$#" -gt 0 ]; then
    args+=("$@")
  fi
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi
  args+=("${TARGET}${path}")

  curl "${args[@]}"
}

expect_json() {
  local name="$1"
  local status="$2"
  local js="$3"

  [ "$status" = "200" ] || fail "$name returned HTTP $status: $(head -c 400 "$BODY_FILE")"

  node --input-type=module -e "
    let raw = '';
    for await (const chunk of process.stdin) raw += chunk;
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      process.exit(10);
    }
    const ok = (${js})(body);
    if (!ok) process.exit(11);
  " < "$BODY_FILE" || fail "$name returned unexpected JSON: $(head -c 400 "$BODY_FILE")"

  echo "ok: $name"
}

echo "Smoke target: $TARGET"

status="$(request GET /health "")"
expect_json "GET /health" "$status" "(body) => body.status === 'ok' && typeof body.version === 'string'"

status="$(request GET /v1 "")"
expect_json "GET /v1" "$status" "(body) => body.name === 'CC Commander' && Array.isArray(body.tools) && body.tools.length > 0"

if [ -z "$TOKEN" ]; then
  fail "SMOKE_AUTH_TOKEN or COMMANDER_TOKEN is required for authenticated tool-call smoke tests"
fi

auth_header="Authorization: Bearer $TOKEN"

status="$(request POST /v1/call '{\"tool\":\"commander_list_skills\",\"args\":{\"pageSize\":3}}' -H "$auth_header")"
expect_json "POST /v1/call commander_list_skills" "$status" "(body) => body.result && Array.isArray(body.result.skills) && typeof body.result.total === 'number'"

status="$(request POST /v1/call '{\"tool\":\"commander_search\",\"args\":{\"query\":\"deploy\",\"limit\":3}}' -H "$auth_header")"
expect_json "POST /v1/call commander_search" "$status" "(body) => body.result && Array.isArray(body.result.results) && typeof body.result.total === 'number'"

echo "Smoke test passed"
