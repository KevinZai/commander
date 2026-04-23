#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');

var MANIFESTS = {
  'package.json': path.join(ROOT, 'package.json'),
  'commander/cowork-plugin/.claude-plugin/plugin.json': path.join(ROOT, 'commander', 'cowork-plugin', '.claude-plugin', 'plugin.json'),
  '.claude-plugin/marketplace.json': path.join(ROOT, '.claude-plugin', 'marketplace.json'),
  'apps/mcp-server-cloud/package.json': path.join(ROOT, 'apps', 'mcp-server-cloud', 'package.json'),
};

function readVersion(filePath) {
  try {
    var obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // marketplace.json nests version under plugins[0]
    if (obj.plugins && Array.isArray(obj.plugins) && obj.plugins[0]) {
      return obj.plugins[0].version || null;
    }
    return obj.version || null;
  } catch (err) {
    return null;
  }
}

// Read root version first (SSoT)
var rootVersion = readVersion(MANIFESTS['package.json']);
if (!rootVersion) {
  process.stderr.write('ERROR: Could not read version from package.json\n');
  process.exit(1);
}

var drifted = [];
var results = [];

for (var label in MANIFESTS) {
  var v = readVersion(MANIFESTS[label]);
  var ok = v === rootVersion;
  results.push({ label: label, version: v, ok: ok });
  if (!ok) drifted.push({ label: label, version: v });
}

var isCheck = process.argv.includes('--check');

if (isCheck) {
  if (drifted.length === 0) {
    process.stdout.write('PASS: All 4 manifests at ' + rootVersion + '\n');
    process.exit(0);
  } else {
    process.stderr.write('FAIL: Version drift detected (root is ' + rootVersion + ')\n');
    drifted.forEach(function(d) {
      process.stderr.write('  ' + d.label + ': ' + (d.version || 'UNREADABLE') + '\n');
    });
    process.exit(1);
  }
}

// Default: human-readable table
process.stdout.write('\nCC Commander — Version Parity Report\n\n');
process.stdout.write('  Root version (SSoT): ' + rootVersion + '\n\n');
results.forEach(function(r) {
  var status = r.ok ? 'OK  ' : 'DRIFT';
  process.stdout.write('  [' + status + ']  ' + r.label + ': ' + (r.version || 'UNREADABLE') + '\n');
});
process.stdout.write('\n');
if (drifted.length > 0) {
  process.stdout.write('Run: node scripts/bump-version.js ' + rootVersion + '  (to sync all)\n\n');
  process.exit(1);
}
process.exit(0);
