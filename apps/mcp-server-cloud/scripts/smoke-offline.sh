#!/usr/bin/env bash
# Offline smoke for the hosted content bundle.
#
# 1. Bundle the catalog into data/ and verify the manifest.
# 2. Build dist/ with tsc.
# 3. Copy dist/ + data/ into a temp dir with no repo checkout around it (the
#    same layout as the Fly image), stub fetch to throw, and assert that the
#    registry loads from the bundle and a SKILL.md body and an agent body are
#    served byte-for-byte from data/.
#
# Needs no network, database or secrets (dummy env values only).
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

node scripts/bundle-catalog.mjs
node scripts/bundle-catalog.mjs --verify data
npx tsc

WORK="$(mktemp -d "${TMPDIR:-/tmp}/ccc-smoke-offline.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
cp -R dist data package.json "$WORK/"
ln -s "$APP_DIR/node_modules" "$WORK/node_modules"

cat > "$WORK/no-network.mjs" <<'JS'
globalThis.fetch = async () => {
  throw new Error("network disabled by smoke-offline");
};
JS

cat > "$WORK/check.mjs" <<'JS'
import { readFileSync } from "node:fs";

function fail(message) {
  console.error(`smoke-offline: FAIL ${message}`);
  process.exit(1);
}

const { resolveContentRoot } = await import("./dist/lib/content-root.js");
const resolved = resolveContentRoot();
if (!resolved || resolved.mode !== "bundle") fail(`expected bundle mode, got ${JSON.stringify(resolved)}`);

const manifest = JSON.parse(readFileSync("data/manifest.json", "utf8"));
const { initRegistry, getSkills, getAgents } = await import("./dist/lib/registry.js");
await initRegistry();
const skills = getSkills();
if (skills.length !== manifest.counts.registry_skills) {
  fail(`registry has ${skills.length} skills, manifest says ${manifest.counts.registry_skills}`);
}
if (skills.some((s) => !s.description || s.description.startsWith("name:"))) fail("bad skill description");

const { getSkill } = await import("./dist/tools/get-skill.js");
const skill = await getSkill({ name: "ccc-build" });
if (typeof skill.content !== "string" || skill.content !== readFileSync(`data/${skill.path}`, "utf8")) {
  fail("ccc-build body was not served from the bundle");
}

const { getAgent } = await import("./dist/tools/get-agent.js");
const agent = await getAgent({ name: "builder" });
if (typeof agent.content !== "string" || !agent.content.startsWith("---")) fail("builder agent body missing");
if (getAgents().length !== manifest.counts.agents) fail("agent count differs from manifest");

console.log(
  `smoke-offline: ok — ${skills.length} skills, ${getAgents().length} agents, ` +
    `ccc-build body ${skill.content.length} bytes, served from ${resolved.root}`
);
process.exit(0);
JS

cd "$WORK"
env -u CCC_CONTENT_ROOT \
  SUPABASE_URL="https://offline.invalid" \
  SUPABASE_SERVICE_ROLE_KEY="offline-smoke" \
  UPSTASH_REDIS_REST_URL="https://offline.invalid" \
  UPSTASH_REDIS_REST_TOKEN="offline-smoke" \
  JWT_SECRET="offline-smoke-secret-at-least-32-characters" \
  NODE_ENV="production" \
  LOG_LEVEL="warn" \
  node --import ./no-network.mjs check.mjs
