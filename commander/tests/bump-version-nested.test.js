// Regression gate: scripts/bump-version.js must update the NESTED
// plugins[i].version field inside marketplace.json, not just the top-level
// version. Desktop's Plugin UI reads plugins[i].version specifically.
//
// Flagged in post-BLITZ /claude-api skill review 2026-04-24:
// beta.10 -> beta.11 bump via the old script left plugins[0].version at
// the old value and Desktop showed stale version info.
//
// #209: this test used to bump the REAL manifests to 99.99.99-test and
// restore them in `finally`. `node --test` runs files in parallel, so other
// tests reading the same manifests (version-parity, manifest-schema, ...)
// could see the bumped or half-restored files and flake. It now runs the
// script against a temp copy via BUMP_VERSION_ROOT and never writes to the
// checkout.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const BUMP = path.join(ROOT, 'scripts', 'bump-version.js');

// Every file bump-version.js reads/writes (MANIFESTS + LOCKFILES there).
const BUMPED_FILES = [
  'package.json',
  path.join('commander', 'cowork-plugin', '.claude-plugin', 'plugin.json'),
  path.join('.claude-plugin', 'marketplace.json'),
  path.join('.agents', 'plugins', 'marketplace.json'),
  path.join('commander', 'contract.json'),
  path.join('commander', 'cowork-plugin-codex', '.codex-plugin', 'plugin.json'),
  path.join('apps', 'mcp-server-cloud', 'package.json'),
  'package-lock.json',
  path.join('apps', 'mcp-server-cloud', 'package-lock.json'),
];

const MARKETPLACE_REL = path.join('.claude-plugin', 'marketplace.json');

function makeTempRoot() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-bump-version-'));
  for (const rel of BUMPED_FILES) {
    const dest = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), dest);
  }
  return tmp;
}

function snapshotReal() {
  const snap = {};
  for (const rel of BUMPED_FILES) snap[rel] = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return snap;
}

test('bump-version.js updates nested plugins[i].version in marketplace.json (temp copy)', function (t) {
  const tmp = makeTempRoot();
  t.after(function () {
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  const realBefore = snapshotReal();

  const before = JSON.parse(fs.readFileSync(path.join(tmp, MARKETPLACE_REL), 'utf8'));
  assert.ok(
    Array.isArray(before.plugins) && before.plugins.length > 0,
    'marketplace.json must have at least one plugin entry for this test'
  );

  // Use a throwaway version that would be obviously-wrong if it leaks
  const testVersion = '99.99.99-test';

  const r = spawnSync(process.execPath, [BUMP, testVersion], {
    encoding: 'utf8',
    timeout: 10000,
    env: Object.assign({}, process.env, { BUMP_VERSION_ROOT: tmp }),
  });
  assert.strictEqual(r.status, 0, 'bump-version.js should exit 0. stderr: ' + r.stderr);

  const after = JSON.parse(fs.readFileSync(path.join(tmp, MARKETPLACE_REL), 'utf8'));
  assert.strictEqual(after.version, testVersion, 'top-level version should update');
  for (let i = 0; i < after.plugins.length; i++) {
    assert.strictEqual(
      after.plugins[i].version,
      testVersion,
      'plugins[' + i + '].version should also update'
    );
  }

  // Every other manifest in the temp root got bumped too.
  for (const rel of BUMPED_FILES) {
    const obj = JSON.parse(fs.readFileSync(path.join(tmp, rel), 'utf8'));
    assert.strictEqual(obj.version, testVersion, rel + ' version should update');
  }

  // stdout should mention the nested update (telemetry sanity)
  assert.match(r.stdout, /plugins\[\d+\]/, 'output should report plugins[i] update');

  // The real checkout must be byte-for-byte untouched.
  const realAfter = snapshotReal();
  for (const rel of BUMPED_FILES) {
    assert.strictEqual(realAfter[rel], realBefore[rel], 'real ' + rel + ' must not be modified');
    assert.ok(!fs.existsSync(path.join(ROOT, rel + '.bump-tmp')), 'no stray .bump-tmp for ' + rel);
  }
});
