// Regression gate: .mcp.json must only bundle servers that work without
// user-supplied credentials. Any server requiring API keys, OAuth, or
// remote endpoints belongs in /ccc-connect opt-in flow, not the bundled
// .mcp.json. Silent MCP failures on install day = bounce risk (R1/R5/R8).
//
// Flagged in BLITZ review synthesis 2026-04-23 (post-beta.10 hardening).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const MCP_JSON = path.join(
  __dirname,
  '..',
  '..',
  'commander',
  'cowork-plugin',
  '.mcp.json'
);

// Credential-free allowlist. Adding a new MCP to .mcp.json requires adding it
// here AND verifying it needs no env vars / credentials / remote auth to boot.
const ALLOWED_BUNDLED_SERVERS = new Set([
  'context7',
  'sequential-thinking',
]);

test('.mcp.json contains only credential-free servers', function () {
  const raw = fs.readFileSync(MCP_JSON, 'utf8');
  const config = JSON.parse(raw);
  assert.ok(config.mcpServers, '.mcp.json must have mcpServers object');

  const actual = Object.keys(config.mcpServers);
  for (const name of actual) {
    assert.ok(
      ALLOWED_BUNDLED_SERVERS.has(name),
      'Server "' + name + '" is bundled in .mcp.json but not in the credential-free allowlist. ' +
      'If it requires API keys/OAuth/remote auth, move it to /ccc-connect opt-in. ' +
      'If it truly needs no credentials, add it to ALLOWED_BUNDLED_SERVERS in this test.'
    );
  }
});

test('.mcp.json bundled servers have no required env vars', function () {
  const raw = fs.readFileSync(MCP_JSON, 'utf8');
  const config = JSON.parse(raw);

  for (const [name, def] of Object.entries(config.mcpServers)) {
    // HTTP endpoints imply remote auth — forbidden in bundle
    assert.notStrictEqual(
      def.type,
      'http',
      'Bundled MCP "' + name + '" is type=http (remote endpoint). Move to opt-in via /ccc-connect.'
    );
    assert.notStrictEqual(
      def.type,
      'sse',
      'Bundled MCP "' + name + '" is type=sse (remote stream). Move to opt-in via /ccc-connect.'
    );
    // stdio servers may declare env: {} but must not require any key
    if (def.env) {
      for (const [envKey, envVal] of Object.entries(def.env)) {
        const looksLikeKeyRef = typeof envVal === 'string' && envVal.includes('${');
        assert.strictEqual(
          looksLikeKeyRef,
          false,
          'Bundled MCP "' + name + '" env var "' + envKey + '" references ${...} — requires credentials. Move to opt-in.'
        );
      }
    }
  }
});

test('.mcp.json is valid JSON and has at least one bundled server', function () {
  const raw = fs.readFileSync(MCP_JSON, 'utf8');
  const config = JSON.parse(raw);
  const count = Object.keys(config.mcpServers).length;
  assert.ok(count >= 1, '.mcp.json should ship at least one bundled server for zero-config value');
  assert.ok(count <= ALLOWED_BUNDLED_SERVERS.size, 'Bundled count exceeds allowlist size');
});
