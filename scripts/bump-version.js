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

// ATOMIC TWO-PHASE UPDATE:
// Phase 1 — read + parse + mutate all files into an in-memory plan.
//           Abort before ANY write if any parse/transform fails.
// Phase 2 — write each target to a temp file + rename(). rename() is
//           atomic on the same filesystem, so each manifest either
//           flips to the new version or stays at the old one.
// Best-effort rollback: if a rename fails mid-phase-2, restore files
// that were already renamed from their saved pre-image.

var plan = [];      // { path, beforeBytes, afterBytes, tempPath, summary[] }
var errors = [];

function buildPlan() {
  for (var manifestPath of MANIFESTS) {
    var raw = fs.readFileSync(manifestPath, 'utf8');
    var obj = JSON.parse(raw);
    var prev = obj.version;
    obj.version = version;

    // marketplace.json carries TWO version fields:
    //   - top-level `version` (the marketplace's version)
    //   - `plugins[i].version` (the published version for each plugin entry)
    // Desktop's Plugin UI reads plugins[i].version, NOT the top-level.
    // Must bump both or the Update button shows stale versions.
    var summary = [manifestPath.replace(ROOT + '/', '') + ' (' + prev + ' -> ' + version + ')'];
    if (Array.isArray(obj.plugins)) {
      for (var i = 0; i < obj.plugins.length; i++) {
        var p = obj.plugins[i];
        if (p && typeof p.version === 'string') {
          var pluginPrev = p.version;
          p.version = version;
          summary.push('  plugins[' + i + '](' + (p.name || '?') + '): ' + pluginPrev + ' -> ' + version);
        }
      }
    }

    plan.push({
      path: manifestPath,
      beforeBytes: raw,
      afterBytes: JSON.stringify(obj, null, 2) + '\n',
      tempPath: manifestPath + '.bump-tmp',
      summary: summary,
    });
  }

  // Lockfile has version in two places: top-level + packages[""].version
  var lockRaw = fs.readFileSync(LOCKFILE, 'utf8');
  var lock = JSON.parse(lockRaw);
  var lockPrev = lock.version;
  lock.version = version;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = version;
  }
  plan.push({
    path: LOCKFILE,
    beforeBytes: lockRaw,
    afterBytes: JSON.stringify(lock, null, 2) + '\n',
    tempPath: LOCKFILE + '.bump-tmp',
    summary: ['apps/mcp-server-cloud/package-lock.json (' + lockPrev + ' -> ' + version + ')'],
  });
}

try {
  buildPlan();
} catch (err) {
  process.stderr.write('ABORT (phase 1 — parse/transform failed before any write):\n');
  process.stderr.write('  ' + err.message + '\n');
  process.exit(1);
}

// Phase 2 — write temp files first, then rename atomically.
// Track renamed files so we can roll back on any subsequent failure.
var renamed = [];
try {
  // First, write ALL temp files. If any write fails, nothing has moved yet.
  for (var item of plan) {
    fs.writeFileSync(item.tempPath, item.afterBytes, 'utf8');
  }
  // Then rename each into place. Each rename is atomic on the same fs.
  for (var item2 of plan) {
    fs.renameSync(item2.tempPath, item2.path);
    renamed.push(item2);
  }
} catch (err) {
  errors.push(err.message);
  // Rollback: restore every already-renamed file from the saved pre-image.
  for (var r of renamed) {
    try {
      fs.writeFileSync(r.path, r.beforeBytes, 'utf8');
    } catch (rErr) {
      errors.push('rollback failed for ' + r.path + ': ' + rErr.message);
    }
  }
  // Clean up any stray temp files from items not yet renamed.
  for (var p of plan) {
    if (fs.existsSync(p.tempPath)) {
      try { fs.unlinkSync(p.tempPath); } catch {}
    }
  }
  process.stderr.write('ABORT (phase 2 — write/rename failed; rolled back):\n');
  errors.forEach(function (e) { process.stderr.write('  ' + e + '\n'); });
  process.exit(1);
}

process.stdout.write('Bumped to ' + version + ':\n');
plan.forEach(function (item) {
  item.summary.forEach(function (s) { process.stdout.write('  ' + s + '\n'); });
});
process.exit(0);
