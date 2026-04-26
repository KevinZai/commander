#!/usr/bin/env bash
# Run the hosted MCP smoke battery against an explicit production target.
#
# Usage:
#   bash scripts/test-against-prod.sh --target=https://commander-mcp.fly.dev --auth-token="$TOKEN"
#   bash scripts/test-against-prod.sh --target=https://commander-mcp.fly.dev --skip-auth-required

set -euo pipefail

TARGET=""
AUTH_TOKEN="${MCP_E2E_AUTH_TOKEN:-${COMMANDER_TOKEN:-}}"
SKIP_AUTH_REQUIRED=0

for arg in "$@"; do
  case "$arg" in
    --target=*)
      TARGET="${arg#*=}"
      ;;
    --auth-token=*)
      AUTH_TOKEN="${arg#*=}"
      ;;
    --skip-auth-required)
      SKIP_AUTH_REQUIRED=1
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

if [ -z "$TARGET" ]; then
  echo "Missing required --target=URL. This script never defaults to a production endpoint." >&2
  exit 2
fi

TARGET="${TARGET%/}"
FIXTURE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/tests/fixtures/sample-inputs.json"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass=0
fail=0
skip=0

ok() {
  echo "  ok    $1"
  pass=$((pass + 1))
}

bad() {
  echo "  FAIL  $1"
  if [ -n "${2:-}" ]; then
    printf '        %.500s\n' "$2"
  fi
  fail=$((fail + 1))
}

skip_case() {
  echo "  skip  $1"
  skip=$((skip + 1))
}

curl_status() {
  local method="$1"
  local path="$2"
  local body_file="$3"
  local data="${4:-}"
  shift 4 || true

  if [ -n "$data" ]; then
    curl -sS --max-time 30 -o "$body_file" -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      "$@" \
      -d "$data" \
      "$TARGET$path"
  else
    curl -sS --max-time 30 -o "$body_file" -w "%{http_code}" -X "$method" \
      "$@" \
      "$TARGET$path"
  fi
}

validate_discovery() {
  node - "$1" "$FIXTURE" <<'NODE'
const fs = require("node:fs");
const [bodyPath, fixturePath] = process.argv.slice(2);
const body = JSON.parse(fs.readFileSync(bodyPath, "utf8"));
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
if (!body || !Array.isArray(body.tools)) throw new Error("discovery body missing tools array");
const discovered = new Set(body.tools.map((tool) => tool && tool.name));
for (const tool of fixture.tools) {
  if (!discovered.has(tool.name)) throw new Error(`discovery missing ${tool.name}`);
}
if (discovered.size < fixture.tools.length) {
  throw new Error(`expected at least ${fixture.tools.length} tools, got ${discovered.size}`);
}
NODE
}

validate_tool_response() {
  node - "$1" "$2" <<'NODE'
const fs = require("node:fs");
const [bodyPath, toolName] = process.argv.slice(2);
const body = JSON.parse(fs.readFileSync(bodyPath, "utf8"));
const shape = {
  commander_list_skills: { arrays: ["skills"], numbers: ["total", "page"] },
  commander_get_skill: { strings: ["name", "content", "githubUrl"] },
  commander_search: { arrays: ["results"], strings: ["query"], numbers: ["total"] },
  commander_suggest_for: { arrays: ["suggestions", "keywords"], strings: ["tip"] },
  commander_invoke_skill: { strings: ["skill", "invocationGuide"] },
  commander_list_agents: { arrays: ["agents"], numbers: ["total"] },
  commander_get_agent: { strings: ["name", "content"] },
  commander_invoke_agent: { strings: ["agent", "invocationGuide"] },
  commander_status: { strings: ["version", "tier"], objects: ["usage"] },
  commander_update: { strings: ["currentVersion", "latestVersion"], booleans: ["upToDate"] },
  commander_init: { arrays: ["files"], strings: ["installCommand"], objects: ["mcpConfig"] },
  commander_notes_pin: { booleans: ["pinned"], strings: ["message"] },
  commander_tasks_push: { strings: ["status", "title", "message"] },
  commander_plan_integrate: { booleans: ["integrated"], numbers: ["taskCount"], arrays: ["tasks"] },
  commander_install_skill: { strings: ["status", "install_path", "command"] },
  commander_compatibility_check: { booleans: ["compatible"], arrays: ["missing_capabilities"], strings: ["notes"] },
  commander_session_diagnose: { arrays: ["findings"], objects: ["summary"] },
  commander_compose_plan: { strings: ["plan_md", "estimated_effort"], arrays: ["recommended_skills", "risks"] },
};
function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
}
function assertFields(result, fields, type, check) {
  for (const field of fields || []) {
    if (!check(result[field])) throw new Error(`${field} must be ${type}`);
  }
}
assertObject(body, "response");
if (body.error !== undefined) throw new Error(`top-level error: ${JSON.stringify(body.error)}`);
if (body.jsonrpc !== "2.0") throw new Error("missing JSON-RPC 2.0 marker");
assertObject(body.result, "result");
if (body.result.error !== undefined) throw new Error(`result error: ${JSON.stringify(body.result.error)}`);
const spec = shape[toolName];
if (!spec) throw new Error(`missing shape validator for ${toolName}`);
assertFields(body.result, spec.strings, "a string", (value) => typeof value === "string");
assertFields(body.result, spec.numbers, "a number", (value) => typeof value === "number");
assertFields(body.result, spec.booleans, "a boolean", (value) => typeof value === "boolean");
assertFields(body.result, spec.arrays, "an array", Array.isArray);
assertFields(body.result, spec.objects, "an object", (value) => value && typeof value === "object" && !Array.isArray(value));
NODE
}

encoded_tools() {
  node - "$FIXTURE" <<'NODE'
const fs = require("node:fs");
const fixture = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const tool of fixture.tools) {
  console.log(Buffer.from(JSON.stringify(tool), "utf8").toString("base64"));
}
NODE
}

tool_field() {
  node - "$1" "$2" <<'NODE'
const [encoded, field] = process.argv.slice(2);
const tool = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
const value = tool[field];
if (Array.isArray(value)) console.log(value.join("\n"));
else if (value !== undefined) console.log(String(value));
NODE
}

tool_request_body() {
  node - "$1" <<'NODE'
const encoded = process.argv[2];
const tool = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
process.stdout.write(JSON.stringify({
  jsonrpc: "2.0",
  id: `prod-${tool.name}`,
  method: "tools/call",
  params: {
    name: tool.name,
    arguments: tool.args,
  },
}));
NODE
}

echo "[mcp-prod-smoke] Target: $TARGET"

health_body="$TMP_DIR/health.json"
health_status="$(curl_status GET /health "$health_body")"
if [ "$health_status" = "200" ]; then
  ok "GET /health (HTTP 200)"
else
  bad "GET /health (expected 200, got $health_status)" "$(cat "$health_body")"
fi

discovery_body="$TMP_DIR/discovery.json"
discovery_status="$(curl_status GET /v1 "$discovery_body")"
if [ "$discovery_status" = "200" ]; then
  if validate_discovery "$discovery_body"; then
    ok "GET /v1 discovery includes all fixture tools"
  else
    bad "GET /v1 discovery shape" "$(cat "$discovery_body")"
  fi
else
  bad "GET /v1 (expected 200, got $discovery_status)" "$(cat "$discovery_body")"
fi

if [ "$SKIP_AUTH_REQUIRED" -eq 0 ] && [ -z "$AUTH_TOKEN" ]; then
  bad "auth token" "Provide --auth-token=TOKEN, MCP_E2E_AUTH_TOKEN, COMMANDER_TOKEN, or pass --skip-auth-required."
else
  while IFS= read -r encoded; do
    tool_name="$(tool_field "$encoded" name)"
    if [ "$SKIP_AUTH_REQUIRED" -eq 1 ]; then
      skip_case "$tool_name auth-required call (--skip-auth-required)"
      continue
    fi

    missing_external=""
    while IFS= read -r env_name; do
      [ -z "$env_name" ] && continue
      if [ -z "${!env_name:-}" ]; then
        missing_external="${missing_external}${missing_external:+, }${env_name}"
      fi
    done < <(tool_field "$encoded" externalEnv)

    if [ -n "$missing_external" ]; then
      skip_case "$tool_name external service creds missing: $missing_external"
      continue
    fi

    body_file="$TMP_DIR/${tool_name}.json"
    request_body="$(tool_request_body "$encoded")"
    status="$(curl_status POST /v1/call "$body_file" "$request_body" -H "Authorization: Bearer $AUTH_TOKEN")"
    if [ "$status" != "200" ]; then
      bad "$tool_name /v1/call (expected 200, got $status)" "$(cat "$body_file")"
      continue
    fi
    if validate_tool_response "$body_file" "$tool_name"; then
      ok "$tool_name /v1/call"
    else
      bad "$tool_name response shape" "$(cat "$body_file")"
    fi
  done < <(encoded_tools)
fi

echo
echo "[mcp-prod-smoke] $pass passed, $skip skipped, $fail failed"
exit "$fail"
