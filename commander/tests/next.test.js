'use strict';

// CC-2090: `ccc next --json`, Fleet's machine-readable "what next", driven by
// the #188 routing registry. Lanes are temp config dirs whose installed plugin
// cache is a symlink-free copy of just the skills a test needs.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var nextLib = require('../lib/next');

var KC = path.join(__dirname, '..', '..', 'bin', 'kc.js');
var REGISTRY = path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'lib', 'ccc-routes.json');

function tmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function writeJson(file, obj) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj)); }

/** A lane with commander 8.1.2 installed, holding the given skills (ccc always). */
function laneWith(skills, opts) {
  opts = opts || {};
  var home = tmp('ccc next ');
  var dir = path.join(home, '.claude-ai4');
  var install = path.join(dir, 'plugins', 'cache', 'commander-hub', 'commander', '8.1.2');
  writeJson(path.join(install, '.claude-plugin', 'plugin.json'), { version: '8.1.2' });
  ['ccc'].concat(skills).forEach(function(s) {
    fs.mkdirSync(path.join(install, 'skills', s), { recursive: true });
    fs.writeFileSync(path.join(install, 'skills', s, 'SKILL.md'), 'x');
  });
  if (opts.registry !== false) {
    fs.mkdirSync(path.join(install, 'hooks', 'lib'), { recursive: true });
    fs.copyFileSync(REGISTRY, path.join(install, 'hooks', 'lib', 'ccc-routes.json'));
  }
  writeJson(path.join(dir, 'plugins', 'installed_plugins.json'), { version: 2, plugins: { 'commander@commander-hub': [{ scope: 'user', version: '8.1.2', installPath: install }] } });
  return { home: home, dir: dir, env: { HOME: home, CLAUDE_CONFIG_DIR: dir } };
}

var CONTRACT_KEYS = ['schema', 'action', 'when', 'skill', 'reason', 'version', 'source', 'tier', 'score', 'route_source', 'candidates'];

test('registry match: a security audit job routes to /ccc-security with stable keys', async function() {
  var l = laneWith(['ccc-security', 'ccc-build', 'ccc-review']);
  var r = await nextLib.next({ job: { kind: 'code', tags: ['security'], title: 'audit the auth flow for OWASP issues' }, env: l.env });
  assert.deepStrictEqual(Object.keys(r), CONTRACT_KEYS);
  assert.deepStrictEqual([r.schema, r.action, r.when, r.skill, r.version, r.source, r.route_source], [1, 'proceed', 'now', '/ccc-security', '8.1.2', 'ccc-next', 'installed']);
  assert.notStrictEqual(r.tier, 'low');
  assert.ok(r.score >= 0.55);
  assert.strictEqual(r.candidates[0].skill, '/ccc-security');
});

test('a registry match whose skill is not installed falls back to the tag/kind map', async function() {
  var l = laneWith(['ccc-build']);
  var r = await nextLib.next({ job: { kind: 'code', tags: [], title: 'audit the auth flow for OWASP issues' }, env: l.env });
  assert.strictEqual(r.skill, '/ccc-build');
  assert.strictEqual(r.tier, 'low');
  assert.match(r.reason, /kind code -> \/ccc-build$/);
});

test('fallbacks: tag beats kind, unknown kind goes to the hub', async function() {
  var l = laneWith(['ccc-build', 'ccc-plan']);
  assert.strictEqual((await nextLib.next({ job: { kind: 'code', tags: ['Planning'] }, env: l.env })).skill, '/ccc-plan');
  var hub = await nextLib.next({ job: { kind: 'mystery' }, env: l.env });
  assert.strictEqual(hub.skill, '/ccc');
  assert.match(hub.reason, /hub -> \/ccc$/);
  assert.deepStrictEqual(hub.candidates, []);
});

test('without an installed registry the checkout registry is used and reported', async function() {
  var l = laneWith(['ccc-security'], { registry: false });
  var r = await nextLib.next({ job: { title: 'audit the auth flow for OWASP issues', tags: ['security'] }, env: l.env });
  assert.strictEqual(r.route_source, 'checkout');
  assert.strictEqual(r.skill, '/ccc-security');
});

test('fleet-hold.json in the lane state dir holds or defers; a past defer is ignored', async function() {
  var l = laneWith([]);
  var hold = path.join(l.dir, 'commander', 'fleet-hold.json');
  writeJson(hold, { hold: true, reason: 'Kevin pause' });
  var r = await nextLib.next({ job: {}, env: l.env });
  assert.deepStrictEqual([r.action, r.when, r.reason], ['hold', 'now', 'CCC hold: Kevin pause']);
  writeJson(hold, { until: '2026-10-24T20:00:00Z', reason: 'quota' });
  r = await nextLib.next({ job: {}, env: l.env, now: '2026-10-24T15:00:00Z' });
  assert.deepStrictEqual([r.action, r.when], ['defer', '2026-10-24T20:00:00.000Z']);
  r = await nextLib.next({ job: {}, env: l.env, now: '2026-10-24T21:00:00Z' });
  assert.strictEqual(r.action, 'proceed');
});

test('legacy ~/.claude/commander/fleet-hold.json is honoured for a lane without its own', async function() {
  var l = laneWith([]);
  writeJson(path.join(l.home, '.claude', 'commander', 'fleet-hold.json'), { hold: true });
  assert.strictEqual((await nextLib.next({ job: {}, env: l.env })).action, 'hold');
});

test('bad input exits 2, no plugin exits 3', async function() {
  assert.throws(function() { nextLib.parseJobJson('nope'); }, function(e) { return e.exitCode === 2; });
  assert.throws(function() { nextLib.parseJobJson('[1]'); }, function(e) { return e.exitCode === 2; });
  assert.throws(function() { nextLib.parseJobJson('x'.repeat(70000)); }, function(e) { return e.exitCode === 2 && /too large/.test(e.message); });
  var empty = tmp('ccc next none ');
  await assert.rejects(nextLib.next({ job: {}, env: { HOME: empty, CLAUDE_CONFIG_DIR: path.join(empty, '.claude-ai1') } }), function(e) { return e.exitCode === 3; });
});

test('jobFromArgs reads --kind/--tags/--title and ignores missing values', function() {
  assert.deepStrictEqual(nextLib.jobFromArgs(['next', '--kind', 'code', '--tags', 'a,b', '--title', 'x']), { kind: 'code', tags: ['a', 'b'], title: 'x' });
  assert.strictEqual(nextLib.jobFromArgs(['next', '--json']), null);
});

function runCli(l, input, extra) {
  var env = Object.assign({}, process.env, l ? l.env : {});
  delete env.CCC_CONFIG_DIR;
  return childProcess.spawnSync(process.execPath, [KC, 'next', '--json'].concat(extra || []), { input: input, env: env, encoding: 'utf8' });
}

test('CLI: stdin job -> one JSON line, exit 0; bad JSON exit 2; no plugin exit 3', function() {
  var l = laneWith(['ccc-build']);
  var r = runCli(l, '{"kind":"code"}');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout.trim().split('\n').length, 1);
  assert.strictEqual(JSON.parse(r.stdout).skill, '/ccc-build');
  assert.strictEqual(runCli(l, '{oops').status, 2);
  var none = tmp('ccc next cli none ');
  var r3 = runCli({ env: { HOME: none, CLAUDE_CONFIG_DIR: path.join(none, '.claude-ai2') } }, '{}');
  assert.strictEqual(r3.status, 3);
  assert.match(r3.stderr, /not installed/);
});

test('a project-scoped install is used when ccc next runs inside that project', function() {
  var l = laneWith(['ccc-build']);
  var recFile = path.join(l.dir, 'plugins', 'installed_plugins.json');
  var rec = JSON.parse(fs.readFileSync(recFile, 'utf8'));
  var project = fs.realpathSync(tmp('ccc next proj '));
  rec.plugins['commander@commander-hub'][0].scope = 'project';
  rec.plugins['commander@commander-hub'][0].projectPath = project;
  writeJson(recFile, rec);
  var env = Object.assign({}, process.env, l.env);
  delete env.CCC_CONFIG_DIR;
  var r = childProcess.spawnSync(process.execPath, [KC, 'next', '--json'], { input: '{"kind":"code"}', env: env, cwd: project, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(JSON.parse(r.stdout).skill, '/ccc-build');
});

test('a corrupt fleet-hold.json fails closed as a hold', async function() {
  var l = laneWith([]);
  fs.mkdirSync(path.join(l.dir, 'commander'), { recursive: true });
  fs.writeFileSync(path.join(l.dir, 'commander', 'fleet-hold.json'), '{broken');
  var r = await nextLib.next({ job: {}, env: l.env });
  assert.strictEqual(r.action, 'hold');
  assert.match(r.reason, /unreadable fleet-hold\.json/);
  for (const bad of ['42', '[]', '{"hold":"true"}', '{"until":"not-a-date"}', '{"until":5}']) {
    fs.writeFileSync(path.join(l.dir, 'commander', 'fleet-hold.json'), bad);
    assert.strictEqual((await nextLib.next({ job: {}, env: l.env })).action, 'hold', bad);
  }
  fs.writeFileSync(path.join(l.dir, 'commander', 'fleet-hold.json'), '{"hold":false,"until":"2000-01-01T00:00:00Z"}');
  assert.strictEqual((await nextLib.next({ job: {}, env: l.env })).action, 'proceed', 'valid expired deferral proceeds');
});

test('prototype keys as kind or tag fall back to the hub', async function() {
  var l = laneWith(['ccc-build']);
  assert.strictEqual((await nextLib.next({ job: { kind: 'constructor', tags: ['__proto__', 'toString'] }, env: l.env })).skill, '/ccc');
});
