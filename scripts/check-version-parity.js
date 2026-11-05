#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');

// Each entry: { path, extract } — extract(obj) returns the version string
// (or null) to compare against the root SSoT. Most manifests have a plain
// top-level `version`; marketplace.json-shaped files carry TWO independent
// version fields (top-level = the marketplace's own version, plugins[i]
// = the published version Desktop's Plugin UI actually reads) — both are
// checked separately since bump-version.js writes both and either can drift.
var MANIFESTS = {
  'package.json': {
    path: path.join(ROOT, 'package.json'),
    extract: function (obj) { return obj.version || null; },
  },
  // The root lockfile carries the version TWICE and bump-version.js used to write
  // neither, so it silently shipped a release behind (caught at 7.3.1). Both fields
  // are checked because npm reads packages[""] and humans read the top-level one.
  'package-lock.json': {
    path: path.join(ROOT, 'package-lock.json'),
    extract: function (obj) { return obj.version || null; },
  },
  'package-lock.json (packages[""])': {
    path: path.join(ROOT, 'package-lock.json'),
    extract: function (obj) { return (obj.packages && obj.packages[''] && obj.packages[''].version) || null; },
  },
  'commander/cowork-plugin/.claude-plugin/plugin.json': {
    path: path.join(ROOT, 'commander', 'cowork-plugin', '.claude-plugin', 'plugin.json'),
    extract: function (obj) { return obj.version || null; },
  },
  '.claude-plugin/marketplace.json (top-level)': {
    path: path.join(ROOT, '.claude-plugin', 'marketplace.json'),
    extract: function (obj) { return obj.version || null; },
  },
  '.claude-plugin/marketplace.json (plugins[commander])': {
    path: path.join(ROOT, '.claude-plugin', 'marketplace.json'),
    extract: function (obj) {
      var p = Array.isArray(obj.plugins) ? obj.plugins.find(function (x) { return x && x.name === 'commander'; }) : null;
      return p ? (p.version || null) : null;
    },
  },
  '.agents/plugins/marketplace.json (top-level)': {
    path: path.join(ROOT, '.agents', 'plugins', 'marketplace.json'),
    extract: function (obj) { return obj.version || null; },
  },
  '.agents/plugins/marketplace.json (plugins[commander])': {
    path: path.join(ROOT, '.agents', 'plugins', 'marketplace.json'),
    extract: function (obj) {
      var p = Array.isArray(obj.plugins) ? obj.plugins.find(function (x) { return x && x.name === 'commander'; }) : null;
      return p ? (p.version || null) : null;
    },
  },
  'commander/contract.json': {
    path: path.join(ROOT, 'commander', 'contract.json'),
    extract: function (obj) { return obj.version || null; },
  },
  'commander/cowork-plugin-codex/.codex-plugin/plugin.json (generated)': {
    path: path.join(ROOT, 'commander', 'cowork-plugin-codex', '.codex-plugin', 'plugin.json'),
    extract: function (obj) { return obj.version || null; },
  },
};

// apps/mcp-server-cloud versions independently of the plugin: any change under
// it auto-deploys to Fly (deploy-mcp.yml / deploy.yml path triggers), so a
// plugin release may ship without bumping it (CC-2126, 8.1.6). Its manifests
// must agree with EACH OTHER (bump-version.js still writes all three) and may
// lag root but never run ahead of it.
var CLOUD_MANIFESTS = {
  'apps/mcp-server-cloud/package.json': {
    path: path.join(ROOT, 'apps', 'mcp-server-cloud', 'package.json'),
    extract: function (obj) { return obj.version || null; },
  },
  'apps/mcp-server-cloud/package-lock.json': {
    path: path.join(ROOT, 'apps', 'mcp-server-cloud', 'package-lock.json'),
    extract: function (obj) { return obj.version || null; },
  },
  'apps/mcp-server-cloud/package-lock.json (packages[""])': {
    path: path.join(ROOT, 'apps', 'mcp-server-cloud', 'package-lock.json'),
    extract: function (obj) { return (obj.packages && obj.packages[''] && obj.packages[''].version) || null; },
  },
};

// Numeric x.y.z compare; prerelease suffixes are ignored (cloud never ships one).
function semverCompare(a, b) {
  var pa = String(a).split('-')[0].split('.').map(Number);
  var pb = String(b).split('-')[0].split('.').map(Number);
  for (var i = 0; i < 3; i++) {
    var d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function readVersion(entry) {
  try {
    var obj = JSON.parse(fs.readFileSync(entry.path, 'utf8'));
    return entry.extract(obj);
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

var cloudVersion = readVersion(CLOUD_MANIFESTS['apps/mcp-server-cloud/package.json']);
for (var cloudLabel in CLOUD_MANIFESTS) {
  var cv = readVersion(CLOUD_MANIFESTS[cloudLabel]);
  var cloudOk = !!cv && cv === cloudVersion && semverCompare(cv, rootVersion) <= 0;
  results.push({ label: cloudLabel + ' (independent, <= root)', version: cv, ok: cloudOk });
  if (!cloudOk) drifted.push({ label: cloudLabel + ' (must match cloud package.json ' + cloudVersion + ' and be <= root)', version: cv });
}

var isCheck = process.argv.includes('--check');

if (isCheck) {
  if (drifted.length === 0) {
    var cloudCount = Object.keys(CLOUD_MANIFESTS).length;
    process.stdout.write('PASS: All ' + (results.length - cloudCount) + ' manifests at ' + rootVersion +
      '; ' + cloudCount + ' mcp-server-cloud manifests at ' + cloudVersion + ' (independent, <= root)\n');
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
