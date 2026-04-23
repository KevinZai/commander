#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');

var version = process.argv[2];
if (!version) {
  process.stderr.write('Usage: node scripts/bump-version.js <version>\n');
  process.stderr.write('Example: node scripts/bump-version.js 4.0.1\n');
  process.exit(1);
}

// Basic semver/pre-release sanity check
if (!/^\d+\.\d+\.\d+/.test(version)) {
  process.stderr.write('ERROR: version must start with X.Y.Z (got: ' + version + ')\n');
  process.exit(1);
}

var MANIFESTS = [
  path.join(ROOT, 'package.json'),
  path.join(ROOT, 'commander', 'cowork-plugin', '.claude-plugin', 'plugin.json'),
  path.join(ROOT, '.claude-plugin', 'marketplace.json'),
  path.join(ROOT, 'apps', 'mcp-server-cloud', 'package.json'),
];

// Also update the lockfile version field (top-level + packages[""] entry)
var LOCKFILE = path.join(ROOT, 'apps', 'mcp-server-cloud', 'package-lock.json');

var errors = [];
var updated = [];

for (var manifestPath of MANIFESTS) {
  try {
    var raw = fs.readFileSync(manifestPath, 'utf8');
    var obj = JSON.parse(raw);
    var prev = obj.version;
    obj.version = version;
    fs.writeFileSync(manifestPath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
    updated.push(manifestPath.replace(ROOT + '/', '') + ' (' + prev + ' -> ' + version + ')');
  } catch (err) {
    errors.push(manifestPath.replace(ROOT + '/', '') + ': ' + err.message);
  }
}

// Update package-lock.json (has version in two places)
try {
  var lockRaw = fs.readFileSync(LOCKFILE, 'utf8');
  var lock = JSON.parse(lockRaw);
  var lockPrev = lock.version;
  lock.version = version;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = version;
  }
  fs.writeFileSync(LOCKFILE, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  updated.push('apps/mcp-server-cloud/package-lock.json (' + lockPrev + ' -> ' + version + ')');
} catch (err) {
  errors.push('apps/mcp-server-cloud/package-lock.json: ' + err.message);
}

if (errors.length > 0) {
  process.stderr.write('ERRORS:\n');
  errors.forEach(function(e) { process.stderr.write('  ' + e + '\n'); });
  process.exit(1);
}

process.stdout.write('Bumped to ' + version + ':\n');
updated.forEach(function(u) { process.stdout.write('  ' + u + '\n'); });
process.exit(0);
