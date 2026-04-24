// Regression gate: scripts/bump-version.js must update the NESTED
// plugins[i].version field inside marketplace.json, not just the top-level
// version. Desktop's Plugin UI reads plugins[i].version specifically.
//
// Flagged in post-BLITZ /claude-api skill review 2026-04-24:
// beta.10 -> beta.11 bump via the old script left plugins[0].version at
// the old value and Desktop showed stale version info.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const BUMP = path.join(ROOT, 'scripts', 'bump-version.js');
const MARKETPLACE = path.join(ROOT, '.claude-plugin', 'marketplace.json');

function readManifest() {
  return JSON.parse(fs.readFileSync(MARKETPLACE, 'utf8'));
}

test('bump-version.js updates nested plugins[i].version in marketplace.json', function (t) {
  // Capture current state to restore
  const before = readManifest();
  const originalVersion = before.version;
  assert.ok(
    Array.isArray(before.plugins) && before.plugins.length > 0,
    'marketplace.json must have at least one plugin entry for this test'
  );

  // Use a throwaway version that would be obviously-wrong if it leaks
  const testVersion = '99.99.99-test';

  try {
    const r = spawnSync(process.execPath, [BUMP, testVersion], {
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.strictEqual(r.status, 0, 'bump-version.js should exit 0. stderr: ' + r.stderr);

    const after = readManifest();
    assert.strictEqual(after.version, testVersion, 'top-level version should update');
    for (let i = 0; i < after.plugins.length; i++) {
      assert.strictEqual(
        after.plugins[i].version,
        testVersion,
        'plugins[' + i + '].version should also update'
      );
    }

    // stdout should mention the nested update (telemetry sanity)
    assert.match(
      r.stdout,
      /plugins\[\d+\]/,
      'output should report plugins[i] update'
    );
  } finally {
    // Restore — set every version back
    spawnSync(process.execPath, [BUMP, originalVersion], {
      encoding: 'utf8',
      timeout: 10000,
    });
    const restored = readManifest();
    assert.strictEqual(restored.version, originalVersion, 'restore guard');
  }
});
