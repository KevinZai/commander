'use strict';

// The hosted MCP's canonical OAuth resource (RFC 9728 metadata, the
// WWW-Authenticate resource_metadata origin, default `aud`) is the public
// custom domain, pinned in fly.toml [env]. It is non-secret, so it must not be
// documented as a `fly secrets set` (a secret would silently override [env]).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const APP = path.resolve(__dirname, '..', '..', 'apps', 'mcp-server-cloud');
const CANONICAL = 'https://mcp.commanderplugin.com/mcp';

function flyEnv() {
  const toml = fs.readFileSync(path.join(APP, 'fly.toml'), 'utf8');
  const section = toml.match(/^\[env\]\n([\s\S]*?)(?=^\[|(?![\s\S]))/m);
  assert.ok(section, 'fly.toml has an [env] section');
  const env = {};
  for (const line of section[1].split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"([^"]*)"\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

test('fly.toml [env] pins OAUTH_RESOURCE_URL to the custom domain /mcp', () => {
  assert.strictEqual(flyEnv().OAUTH_RESOURCE_URL, CANONICAL);
});

test('DEPLOY.md does not tell operators to set OAUTH_RESOURCE_URL as a Fly secret', () => {
  const deploy = fs.readFileSync(path.join(APP, 'DEPLOY.md'), 'utf8');
  assert.doesNotMatch(deploy, /fly secrets set[^\n]*OAUTH_RESOURCE_URL/);
  assert.ok(deploy.includes(CANONICAL));
});

test('.env.example and PAYWALL.md agree on the production value', () => {
  assert.ok(fs.readFileSync(path.join(APP, '.env.example'), 'utf8').includes(CANONICAL));
  assert.ok(fs.readFileSync(path.join(APP, 'PAYWALL.md'), 'utf8').includes(CANONICAL));
});
