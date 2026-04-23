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
  'apps/mcp-server-cloud/package.json': path.join(ROOT, 'apps', 'mcp-server-cloud', 'package.json'),
};

test('all 4 version manifests exist', function() {
  for (var label in MANIFESTS) {
    assert.ok(
      fs.existsSync(MANIFESTS[label]),
      'Manifest file missing: ' + label + ' at ' + MANIFESTS[label]
    );
  }
});

test('all 4 version manifests agree with root package.json', function() {
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

test('check-version-parity.js --check exits 0 when in sync', function() {
  var result = cp.spawnSync(process.execPath, [CHECK_SCRIPT, '--check'], { encoding: 'utf8' });
  assert.strictEqual(
    result.status,
    0,
    'check-version-parity.js --check should exit 0. stdout: ' + result.stdout + ' stderr: ' + result.stderr
  );
  assert.ok(result.stdout.includes('PASS'), 'Output should contain PASS');
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
