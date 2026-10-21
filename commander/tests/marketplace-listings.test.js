'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const pkg = require(path.join(root, 'package.json'));
const mcp = require(path.join(root, 'commander/cowork-plugin/.mcp.json'));
const base = path.join(root, 'commander/adapters/marketplaces');
const platforms = ['cursor', 'windsurf', 'cline', 'continue'];

for (const p of platforms) {
  const file = path.join(base, p, 'listing.json');
  const raw = fs.readFileSync(file, 'utf8');
  const d = JSON.parse(raw);

  test(`${p}: required fields and status`, () => {
    assert.strictEqual(d.platform, p);
    assert.strictEqual(d.status, 'prepared-not-submitted');
    for (const f of ['name', 'slug', 'description', 'categories', 'license', 'author', 'repository']) {
      assert.ok(d.listing[f], `missing listing.${f}`);
    }
    assert.strictEqual(d.listing.license, pkg.license);
    assert.ok(Array.isArray(d.listing.categories) && d.listing.categories.length > 0);
    assert.match(d.disclosure, /affiliate/i);
    assert.strictEqual(d.submissionUrlVerified, false);
  });

  test(`${p}: version is sourced from package.json, not hardcoded`, () => {
    assert.strictEqual(d.listing.version, 'from package.json');
    assert.ok(!raw.includes(pkg.version), 'listing must not hardcode the package version');
  });

  test(`${p}: install uses only the credential-free MCP bundle`, () => {
    assert.strictEqual(d.install.requiresCredentials, false);
    const names = Object.keys(d.install.mcpServers);
    assert.ok(names.length > 0);
    for (const n of names) {
      assert.ok(mcp.mcpServers[n], `${n} not in cowork-plugin .mcp.json`);
      assert.strictEqual(d.install.mcpServers[n].command, mcp.mcpServers[n].command);
      assert.deepStrictEqual(d.install.mcpServers[n].args, mcp.mcpServers[n].args);
      assert.ok(!d.install.mcpServers[n].env, 'no env/credentials allowed');
    }
  });

  test(`${p}: no secrets or personal paths`, () => {
    assert.ok(!/\/Users\/|\/home\/|C:\\\\Users|\/Volumes\//.test(raw), 'personal path');
    assert.ok(!/(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|api[_-]?key|token|secret|password)/i.test(raw), 'secret-like text');
    assert.ok(!/ref=|aff=|utm_/i.test(raw), 'affiliate link params not allowed');
  });
}

test('credential-free bundle has no env entries', () => {
  for (const s of Object.values(mcp.mcpServers)) assert.ok(!s.env);
});
