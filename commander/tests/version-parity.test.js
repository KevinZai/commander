'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..', '..');
var CHECK_SCRIPT = path.join(ROOT, 'scripts', 'check-version-parity.js');

function readVersion(filePath) {
  var obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (obj.plugins && Array.isArray(obj.plugins) && obj.plugins[0]) {
    return obj.plugins[0].version;
  }
  return obj.version;
}

var MANIFESTS = {
  'package.json': path.join(ROOT, 'package.json'),
  'plugin.json': path.join(ROOT, 'commander', 'cowork-plugin', '.claude-plugin', 'plugin.json'),
  'marketplace.json': path.join(ROOT, '.claude-plugin', 'marketplace.json'),
};

// apps/mcp-server-cloud versions independently (a bump auto-deploys to Fly;
// CC-2126): it must match its own lockfile and never run ahead of root.
var CLOUD_PACKAGE = path.join(ROOT, 'apps', 'mcp-server-cloud', 'package.json');
var CLOUD_LOCK = path.join(ROOT, 'apps', 'mcp-server-cloud', 'package-lock.json');

// v7.3.0 W12: check-version-parity.js expanded from 4 to 9 checked surfaces
// (marketplace.json's top-level version was previously unchecked alongside
// its plugins[] nesting; .agents/plugins/marketplace.json, contract.json,
// and the generated codex manifest were not covered at all).
var EXPANDED_MANIFESTS = {
  '.agents/plugins/marketplace.json': path.join(ROOT, '.agents', 'plugins', 'marketplace.json'),
  'commander/contract.json': path.join(ROOT, 'commander', 'contract.json'),
  'commander/cowork-plugin-codex/.codex-plugin/plugin.json': path.join(ROOT, 'commander', 'cowork-plugin-codex', '.codex-plugin', 'plugin.json'),
};

test('the 3 root-parity original manifests and the mcp-server-cloud package exist', function() {
  assert.ok(fs.existsSync(CLOUD_PACKAGE), 'Manifest file missing: apps/mcp-server-cloud/package.json');
  for (var label in MANIFESTS) {
    assert.ok(
      fs.existsSync(MANIFESTS[label]),
      'Manifest file missing: ' + label + ' at ' + MANIFESTS[label]
    );
  }
});

test('the 3 root-parity original manifests agree with root package.json', function() {
  var rootVersion = readVersion(MANIFESTS['package.json']);
  assert.ok(rootVersion, 'Root package.json must have a version field');

  for (var label in MANIFESTS) {
    var v = readVersion(MANIFESTS[label]);
    assert.strictEqual(
      v,
      rootVersion,
      label + ' has version "' + v + '" but root is "' + rootVersion + '"'
    );
  }
});

test('mcp-server-cloud package.json matches its lockfile and is not ahead of root', function() {
  var rootVersion = readVersion(MANIFESTS['package.json']);
  var cloud = readVersion(CLOUD_PACKAGE);
  var lock = JSON.parse(fs.readFileSync(CLOUD_LOCK, 'utf8'));
  assert.strictEqual(lock.version, cloud, 'cloud lockfile top-level version drifted from cloud package.json');
  assert.strictEqual(lock.packages[''].version, cloud, 'cloud lockfile packages[""] version drifted from cloud package.json');
  var a = cloud.split('-')[0].split('.').map(Number);
  var b = rootVersion.split('-')[0].split('.').map(Number);
  var cmp = (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);
  assert.ok(cmp <= 0, 'mcp-server-cloud ' + cloud + ' must not be ahead of root ' + rootVersion);
});

test('marketplace.json TOP-LEVEL version (not just plugins[0]) agrees with root', function() {
  var rootVersion = readVersion(MANIFESTS['package.json']);
  var raw = JSON.parse(fs.readFileSync(MANIFESTS['marketplace.json'], 'utf8'));
  assert.strictEqual(raw.version, rootVersion, 'marketplace.json top-level version drifted from root');
});

test('the 3 expanded version surfaces (.agents marketplace, contract.json, generated codex manifest) exist and agree with root', function() {
  var rootVersion = readVersion(MANIFESTS['package.json']);
  for (var label in EXPANDED_MANIFESTS) {
    var filePath = EXPANDED_MANIFESTS[label];
    assert.ok(fs.existsSync(filePath), 'Manifest file missing: ' + label + ' at ' + filePath);
    var v = readVersion(filePath);
    assert.strictEqual(v, rootVersion, label + ' has version "' + v + '" but root is "' + rootVersion + '"');
  }
});

test('check-version-parity.js --check exits 0 when in sync', function() {
  var result = cp.spawnSync(process.execPath, [CHECK_SCRIPT, '--check'], { encoding: 'utf8' });
  assert.strictEqual(
    result.status,
    0,
    'check-version-parity.js --check should exit 0. stdout: ' + result.stdout + ' stderr: ' + result.stderr
  );
  assert.ok(result.stdout.includes('PASS'), 'Output should contain PASS');
});

test('check-version-parity.js checks at least 9 surfaces (4 original + 5 expanded: marketplace top-level, .agents marketplace top-level + nested, contract.json, generated codex manifest)', function() {
  var result = cp.spawnSync(process.execPath, [CHECK_SCRIPT], { encoding: 'utf8' });
  var okLines = (result.stdout.match(/^\s*\[OK\s*\]/gm) || []).length;
  assert.ok(okLines >= 9, 'Expected at least 9 [OK] rows, got ' + okLines + '. stdout: ' + result.stdout);
});

test('bump-version.js exists and is readable', function() {
  var bumpScript = path.join(ROOT, 'scripts', 'bump-version.js');
  assert.ok(fs.existsSync(bumpScript), 'bump-version.js must exist');
  var content = fs.readFileSync(bumpScript, 'utf8');
  assert.ok(content.includes('package.json'), 'bump-version.js must reference package.json');
  assert.ok(content.includes('plugin.json'), 'bump-version.js must reference plugin.json');
  assert.ok(content.includes('marketplace.json'), 'bump-version.js must reference marketplace.json');
  assert.ok(content.includes('mcp-server-cloud'), 'bump-version.js must reference mcp-server-cloud');
});

test('bump-version.js rejects missing version arg', function() {
  var bumpScript = path.join(ROOT, 'scripts', 'bump-version.js');
  var result = cp.spawnSync(process.execPath, [bumpScript], { encoding: 'utf8' });
  assert.strictEqual(result.status, 1, 'Should exit 1 with no version arg');
  assert.ok(result.stderr.includes('Usage'), 'Should print Usage message');
});

test('bump-version.js rejects invalid semver', function() {
  var bumpScript = path.join(ROOT, 'scripts', 'bump-version.js');
  var result = cp.spawnSync(process.execPath, [bumpScript, 'not-a-version'], { encoding: 'utf8' });
  assert.strictEqual(result.status, 1, 'Should exit 1 with invalid semver');
  assert.ok(result.stderr.includes('ERROR'), 'Should print ERROR message');
});
