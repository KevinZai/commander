#!/usr/bin/env node
'use strict';

// One release gate list for every entry point (CC-2068 G3): the tag workflow
// (.github/workflows/release.yml), `prepublishOnly`, and the manual release
// checklist (RELEASE-CHECKLIST.md) all run this script, so they cannot drift.
//
// Usage:
//   node scripts/release-gate.js                 run every gate
//   node scripts/release-gate.js --tag v8.1.6    also require tag == package.json == top CHANGELOG entry (G2)
//   node scripts/release-gate.js --skip-tests    skip test:ci, smoke and the full suite (logged as SKIP)
//   node scripts/release-gate.js --require-plugin-validate   fail when the `claude` CLI is missing
//   node scripts/release-gate.js --list          print gate ids and commands, run nothing
//
// The lint ceiling lives in package.json's `lint` script (G4); this script and
// ci.yml call `npm run lint`, so there is one number.

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var ROOT = path.join(__dirname, '..');

// Each gate: { id, cmd, args, tests? }. `tests: true` marks suite gates that --skip-tests drops.
var GATES = [
  { id: 'version-parity', cmd: 'node', args: ['scripts/check-version-parity.js', '--check'] },
  { id: 'product-contract', cmd: 'node', args: ['scripts/check-product-contract.js', '--check'] },
  { id: 'audit-counts', cmd: 'node', args: ['scripts/audit-counts.js', '--check'] },
  { id: 'registry', cmd: 'node', args: ['scripts/build-from-registry.js', '--check'] },
  { id: 'frontmatter', cmd: 'node', args: ['scripts/audit-frontmatter.js', '--check'] },
  { id: 'fable-contract', cmd: 'node', args: ['scripts/add-fable-contract.js', '--check'] },
  { id: 'doc-sync', cmd: 'node', args: ['bin/doc-sync.js'] },
  { id: 'skill-doc-sync', cmd: 'node', args: ['commander/cowork-plugin/skills/ccc-doc-sync/sync.js', '--check'] },
  { id: 'compat', cmd: 'node', args: ['scripts/check-compat.js'] },
  { id: 'changelog-version', cmd: 'node', args: ['scripts/generate-changelog.js', '--check-version'] },
  { id: 'routes', cmd: 'node', args: ['scripts/build-routes.js', '--check'] },
  { id: 'route-eval', cmd: 'node', args: ['scripts/route-eval.js'] },
  { id: 'parity', cmd: 'node', args: ['scripts/check-parity.js'] },
  { id: 'lint', cmd: 'npm', args: ['run', '--silent', 'lint'] },
  { id: 'codex-mirror', cmd: 'node', args: ['--test', 'commander/tests/codex-mirror-drift.test.js'] },
  { id: 'plugin-validate', cmd: 'claude', args: ['plugin', 'validate', './commander/cowork-plugin', '--strict'], optionalBinary: true },
  { id: 'test-ci', cmd: 'npm', args: ['run', '--silent', 'test:ci'], tests: true },
  { id: 'smoke', cmd: 'bash', args: ['tests/smoke.sh'], tests: true },
  // G9: the full suite gates the release. It is a superset of test:ci's test files.
  { id: 'full-suite', cmd: 'npm', args: ['test', '--silent'], tests: true },
];

function parseArgs(argv) {
  var opts = { tag: null, skipTests: false, requirePluginValidate: false, list: false };
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    if (a === '--tag') {
      opts.tag = argv[++i];
      if (!opts.tag) throw new Error('--tag needs a value, e.g. --tag v8.1.6');
    } else if (a === '--skip-tests') opts.skipTests = true;
    else if (a === '--require-plugin-validate') opts.requirePluginValidate = true;
    else if (a === '--list') opts.list = true;
    else throw new Error('unknown argument: ' + a);
  }
  return opts;
}

// G2: the pushed tag, package.json and the top CHANGELOG entry name one version.
function checkTag(tag, root) {
  var tagVersion = String(tag).replace(/^refs\/tags\//, '').replace(/^v/, '');
  var pkgVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  var changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  // The FIRST `## [...]` heading must be the version: a leftover [Unreleased] section fails here.
  var m = changelog.match(/^## \[v?([^\]]+)\]/m);
  var top = m ? m[1] : null;
  var problems = [];
  if (tagVersion !== pkgVersion) problems.push('tag ' + tag + ' != package.json ' + pkgVersion);
  if (top !== pkgVersion) problems.push('top CHANGELOG entry ' + top + ' != package.json ' + pkgVersion);
  return { ok: problems.length === 0, problems: problems, tagVersion: tagVersion, pkgVersion: pkgVersion, top: top };
}

function hasBinary(name) {
  var r = childProcess.spawnSync(process.platform === 'win32' ? 'where' : 'command', ['-v', name], { shell: true, stdio: 'ignore' });
  return r.status === 0;
}

function run(opts, root) {
  var results = [];
  if (opts.tag) {
    var t = checkTag(opts.tag, root);
    results.push({ id: 'tag-version', status: t.ok ? 'PASS' : 'FAIL', detail: t.ok ? 'tag = package.json = CHANGELOG = ' + t.pkgVersion : t.problems.join('; ') });
  }
  GATES.forEach(function (g) {
    if (g.tests && opts.skipTests) {
      results.push({ id: g.id, status: 'SKIP', detail: '--skip-tests' });
      return;
    }
    if (g.optionalBinary && !hasBinary(g.cmd)) {
      results.push({ id: g.id, status: opts.requirePluginValidate ? 'FAIL' : 'SKIP', detail: '`' + g.cmd + '` CLI not on PATH; run it locally (RELEASE-CHECKLIST.md)' });
      return;
    }
    process.stdout.write('\n== ' + g.id + ': ' + g.cmd + ' ' + g.args.join(' ') + '\n');
    var r = childProcess.spawnSync(g.cmd, g.args, { cwd: root, stdio: 'inherit', env: process.env });
    results.push({ id: g.id, status: r.status === 0 ? 'PASS' : 'FAIL', detail: r.error ? r.error.message : 'exit ' + r.status });
  });
  return results;
}

function main() {
  var opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error('release-gate: ' + err.message);
    process.exit(2);
  }
  if (opts.list) {
    if (opts.tag) console.log('tag-version\t(tag == package.json == top CHANGELOG entry)');
    GATES.forEach(function (g) { console.log(g.id + '\t' + g.cmd + ' ' + g.args.join(' ')); });
    return;
  }
  var results = run(opts, ROOT);
  console.log('\nRelease gate summary');
  results.forEach(function (r) { console.log('  ' + r.status.padEnd(4) + '  ' + r.id + '  (' + r.detail + ')'); });
  var failed = results.filter(function (r) { return r.status === 'FAIL'; });
  console.log(failed.length ? '\nNO-GO: ' + failed.map(function (r) { return r.id; }).join(', ') : '\nGO: every gate passed or was skipped as logged');
  process.exit(failed.length ? 1 : 0);
}

if (require.main === module) main();

module.exports = { GATES: GATES, checkTag: checkTag, parseArgs: parseArgs };
