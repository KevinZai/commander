'use strict';

// CC-2093: `ccc checkin --json`, the CCC side of the Fleet check-in gate.
// Fixtures are temp config dirs; the claude CLI is never spawned (cli: false or
// an injected version), except the one CLI test that points CCC_CLAUDE_BIN at a stub.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var checkin = require('../lib/checkin');

var KC = path.join(__dirname, '..', '..', 'bin', 'kc.js');
var PKG_VERSION = require('../../package.json').version;

function tmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function writeJson(file, obj) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj)); }

/** <home>/.claude-<name> with an installed commander plugin at version v (null = none). */
function laneDir(name, v, settings) {
  var home = tmp('ccc checkin ');
  var dir = path.join(home, '.claude-' + name);
  fs.mkdirSync(dir, { recursive: true });
  if (v) {
    var install = path.join(dir, 'plugins', 'cache', 'commander-hub', 'commander', v);
    writeJson(path.join(install, '.claude-plugin', 'plugin.json'), { version: v });
    fs.mkdirSync(path.join(install, 'skills', 'ccc'), { recursive: true });
    fs.writeFileSync(path.join(install, 'skills', 'ccc', 'SKILL.md'), '---\nname: ccc\n---\n');
    writeHooks(install);
    writeJson(path.join(dir, 'plugins', 'installed_plugins.json'), {
      version: 2, plugins: { 'commander@commander-hub': [{ scope: 'user', version: v, installPath: install, gitCommitSha: 'f'.repeat(40) }] },
    });
  }
  writeJson(path.join(dir, 'settings.json'), settings || { enabledPlugins: { 'commander@commander-hub': true } });
  return { home: home, dir: dir, env: { HOME: home, CLAUDE_CONFIG_DIR: dir } };
}

/** A minimal clean hooks dir: one registered ESM handler that uses the lane resolver. */
function writeHooks(install) {
  writeJson(path.join(install, 'hooks', 'hooks.json'), {
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/start.js"' }] }] },
  });
  fs.writeFileSync(path.join(install, 'hooks', 'start.js'), "import { stateDir } from '../lib/lane-state.js';\n");
}

function pluginHooks(l) {
  return path.join(l.dir, 'plugins', 'cache', 'commander-hub', 'commander', '8.1.2', 'hooks');
}

function checkout(version) {
  var root = tmp('ccc checkin co ');
  writeJson(path.join(root, 'package.json'), { version: version });
  return root;
}

test('schema 1 snapshot: keys, types and lane block', function() {
  var l = laneDir('ai4', '8.1.2');
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cliVersion: '2.1.309', now: '2026-10-24T14:00:00Z' });
  assert.deepStrictEqual(Object.keys(r), ['schema', 'generated_at', 'ccc_version', 'ccc_sha', 'plugin_version', 'plugin_sha', 'cli_version', 'drift', 'lane', 'hooks', 'connectors', 'usage', 'usage_reason', 'usage_file', 'health', 'next']);
  assert.strictEqual(r.schema, 1);
  assert.strictEqual(r.generated_at, '2026-10-24T14:00:00.000Z');
  assert.deepStrictEqual([r.ccc_version, r.plugin_version, r.cli_version], ['8.1.2', '8.1.2', '2.1.309']);
  assert.deepStrictEqual(Object.keys(r.lane), ['name', 'account', 'config_dir', 'state_dir', 'source', 'known']);
  assert.deepStrictEqual([r.lane.name, r.lane.account, r.lane.source, r.lane.known], ['ai4', 'ai4', 'CLAUDE_CONFIG_DIR', true]);
  assert.strictEqual(r.health.ok, true);
  assert.deepStrictEqual(r.health.checks.map(function(c) { return c.id + ':' + c.status; }),
    ['plugin_installed:ok', 'plugin_enabled:ok', 'ccc_checkout:ok', 'claude_cli:ok', 'hooks:ok', 'lane:ok']);
  assert.deepStrictEqual(Object.keys(r.hooks), ['status', 'hooks_dir', 'loadable', 'registered', 'unregistered', 'missing', 'legacy_require', 'no_esm_import', 'shared_state_writers']);
  assert.deepStrictEqual([r.hooks.status, r.hooks.registered, r.hooks.unregistered, r.hooks.shared_state_writers], ['ok', 1, [], []]);
  r.health.checks.forEach(function(c) { assert.deepStrictEqual(Object.keys(c), ['id', 'status', 'blocking', 'message']); });
  assert.deepStrictEqual(r.drift, []);
  assert.deepStrictEqual(r.next, []);
  assert.strictEqual(checkin.exitCode(r), 0);
  assert.strictEqual(checkin.summaryLine(r), 'CCC check-in OK: ccc 8.1.2, plugin 8.1.2, claude 2.1.309, lane ai4, 0 warnings');
});

test('drift: shim checkout older than the plugin warns but does not block', function() {
  var l = laneDir('ai1', '8.1.2');
  var r = checkin.buildCheckin({ root: checkout('8.1.1'), env: l.env, cwd: l.home, cliVersion: '2.1.309' });
  assert.strictEqual(r.health.ok, true);
  assert.strictEqual(r.drift[0].kind, 'checkout_behind_plugin');
  assert.strictEqual(r.health.checks.filter(function(c) { return c.id === 'ccc_checkout'; })[0].status, 'warn');
  assert.strictEqual(r.next.length, 1);
  assert.match(checkin.summaryLine(r), /, 1 warning \(ccc_checkout\)$/);
});

test('missing plugin blocks with exit 3', function() {
  var l = laneDir('ai2', null);
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.strictEqual(r.health.ok, false);
  assert.strictEqual(r.plugin_version, null);
  assert.strictEqual(checkin.exitCode(r), 3);
  assert.match(checkin.summaryLine(r), /^CCC check-in BLOCKED: .*plugin missing/);
  assert.deepStrictEqual(r.next, ['claude plugin install commander@commander-hub']);
});

test('plugin disabled in settings.json blocks with exit 1', function() {
  var l = laneDir('ai3', '8.1.2', { enabledPlugins: { 'commander@commander-hub': false } });
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.strictEqual(r.health.ok, false);
  assert.strictEqual(checkin.exitCode(r), 1);
});

test('unknown lane warns and reports lane "custom"', function() {
  var home = tmp('ccc checkin custom ');
  var dir = path.join(home, 'my-claude');
  fs.mkdirSync(dir);
  writeJson(path.join(dir, 'settings.json'), { enabledPlugins: { 'commander@commander-hub': true } });
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: { HOME: home, CCC_CONFIG_DIR: dir }, cwd: home, cli: false });
  assert.strictEqual(r.lane.name, 'custom');
  assert.strictEqual(r.lane.known, false);
  assert.strictEqual(r.lane.source, 'CCC_CONFIG_DIR');
  assert.strictEqual(r.health.checks.filter(function(c) { return c.id === 'lane'; })[0].status, 'warn');
});

test('claude CLI below the 2.1.304 floor is drift with a claude update next step', function() {
  var l = laneDir('ai4', '8.1.2');
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cliVersion: '2.1.303' });
  assert.strictEqual(r.health.ok, true);
  assert.deepStrictEqual(r.drift.map(function(d) { return d.kind; }), ['cli_below_floor']);
  assert.deepStrictEqual(r.next, ['claude update']);
  var missing = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cliVersion: null });
  assert.strictEqual(missing.health.checks.filter(function(c) { return c.id === 'claude_cli'; })[0].status, 'warn');
});

test('ccc checkin --json via the CLI: stub claude binary, JSON on stdout, exit 0; writes nothing', function() {
  var l = laneDir('ai4', PKG_VERSION);
  var stub = path.join(l.home, 'claude-stub');
  fs.writeFileSync(stub, '#!/bin/sh\necho "2.1.309 (Claude Code)"\n', { mode: 0o755 });
  var before = fs.readdirSync(l.dir).sort();
  var env = Object.assign({}, process.env, l.env, { CCC_CLAUDE_BIN: stub });
  delete env.CCC_CONFIG_DIR;
  var r = childProcess.spawnSync(process.execPath, [KC, 'checkin', '--json'], { cwd: l.home, env: env, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  var out = JSON.parse(r.stdout);
  assert.strictEqual(out.schema, 1);
  assert.strictEqual(out.cli_version, '2.1.309');
  assert.strictEqual(out.lane.name, 'ai4');
  assert.deepStrictEqual(fs.readdirSync(l.dir).sort(), before, 'check-in is read-only');
  var line = childProcess.spawnSync(process.execPath, [KC, 'checkin', '--no-cli'], { cwd: l.home, env: env, encoding: 'utf8' });
  assert.strictEqual(line.status, 0);
  var lines = line.stdout.trim().split('\n');
  assert.strictEqual(lines.length, 2);
  assert.match(lines[0], /^CCC check-in OK: ccc \S+, plugin \S+, claude \?, lane ai4, 0 warnings$/);
  assert.strictEqual(lines[1], 'usage ai4: none (missing ' + path.join(l.home, '.commander', 'lane-usage.json') + ')');
});

test('ccc checkin exits 3 when the lane has no plugin', function() {
  var l = laneDir('ai2', null);
  var env = Object.assign({}, process.env, l.env);
  delete env.CCC_CONFIG_DIR;
  var r = childProcess.spawnSync(process.execPath, [KC, 'checkin', '--json', '--no-cli'], { cwd: l.home, env: env, encoding: 'utf8' });
  assert.strictEqual(r.status, 3);
  assert.strictEqual(JSON.parse(r.stdout).health.ok, false);
});

test('enablement: missing entry and unreadable settings block; project settings override user settings', function() {
  var l = laneDir('ai1', '8.1.2', { enabledPlugins: {} });
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.strictEqual(checkin.exitCode(r), 1);
  assert.match(r.health.checks[1].message, /not enabled in any settings file/);

  fs.writeFileSync(path.join(l.dir, 'settings.json'), '{broken');
  r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.match(r.health.checks[1].message, /^unreadable settings: /);
  assert.strictEqual(r.health.ok, false);

  writeJson(path.join(l.dir, 'settings.json'), { enabledPlugins: { 'commander@commander-hub': true } });
  var project = tmp('ccc checkin proj ');
  writeJson(path.join(project, '.claude', 'settings.json'), { enabledPlugins: { 'commander@commander-hub': false } });
  r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: project, cli: false });
  assert.strictEqual(r.health.ok, false, 'project disable wins over user enable');
  writeJson(path.join(project, '.claude', 'settings.local.json'), { enabledPlugins: { 'commander@commander-hub': true } });
  r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: project, cli: false });
  assert.strictEqual(r.health.ok, true, 'local settings win over project settings');
  assert.match(r.health.checks[1].message, /settings\.local\.json$/);
});

test('a cache dir without a readable manifest or the ccc skill blocks with exit 3', function() {
  var l = laneDir('ai4', '8.1.2');
  var install = path.join(l.dir, 'plugins', 'cache', 'commander-hub', 'commander', '8.1.2');
  fs.rmSync(path.join(install, 'skills'), { recursive: true });
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.strictEqual(checkin.exitCode(r), 3);
  assert.match(r.health.checks[0].message, /has no readable/);
  fs.mkdirSync(path.join(install, 'skills', 'ccc', 'SKILL.md'), { recursive: true });
  r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.strictEqual(checkin.exitCode(r), 3, 'SKILL.md that is a directory is not usable');
  fs.rmSync(path.join(install, 'skills', 'ccc', 'SKILL.md'), { recursive: true });
  fs.writeFileSync(path.join(install, 'skills', 'ccc', 'SKILL.md'), 'x');
  fs.writeFileSync(path.join(install, '.claude-plugin', 'plugin.json'), '{bad');
  r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.strictEqual(checkin.exitCode(r), 3);
});

test('a commander install from another marketplace is checked under its own key', function() {
  var l = laneDir('ai1', '8.1.2', { enabledPlugins: { 'commander@other-hub': true } });
  var rec = JSON.parse(fs.readFileSync(path.join(l.dir, 'plugins', 'installed_plugins.json'), 'utf8'));
  rec.plugins = { 'commander@other-hub': rec.plugins['commander@commander-hub'] };
  writeJson(path.join(l.dir, 'plugins', 'installed_plugins.json'), rec);
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.strictEqual(r.health.ok, true);
  assert.strictEqual(r.health.checks[0].message, 'commander@other-hub 8.1.2');
});

// CC-2102: hook health for Fleet's dispatch gate.

test('hooks: unregistered files and shared-state writers warn but do not block', function() {
  var l = laneDir('ai1', '8.1.2');
  fs.writeFileSync(path.join(pluginHooks(l), 'stray.js'), "import x from 'y';\n");
  fs.writeFileSync(path.join(pluginHooks(l), 'start.js'), "import { join } from 'node:path';\nconst D = join(process.env.HOME, '.claude', 'commander');\n");
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cliVersion: '2.1.309' });
  assert.strictEqual(r.hooks.status, 'warn');
  assert.deepStrictEqual(r.hooks.unregistered, ['stray.js']);
  assert.deepStrictEqual(r.hooks.shared_state_writers, ['start.js']);
  var c = r.health.checks.filter(function(x) { return x.id === 'hooks'; })[0];
  assert.deepStrictEqual([c.status, c.blocking], ['warn', false]);
  assert.match(c.message, /unregistered: stray\.js/);
  assert.match(c.message, /1 hook\(s\) write the shared/);
  assert.strictEqual(r.health.ok, true);
  assert.strictEqual(checkin.exitCode(r), 0);
  assert.match(checkin.summaryLine(r), /1 warning \(hooks\)$/);
});

test('hooks: a hook chain that cannot load blocks with exit 1', function() {
  var l = laneDir('ai2', '8.1.2');
  fs.writeFileSync(path.join(pluginHooks(l), 'hooks.json'), '{not json');
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cliVersion: '2.1.309' });
  assert.strictEqual(r.hooks.status, 'fail');
  assert.strictEqual(r.hooks.loadable, false);
  var c = r.health.checks.filter(function(x) { return x.id === 'hooks'; })[0];
  assert.deepStrictEqual([c.status, c.blocking], ['fail', true]);
  assert.strictEqual(r.health.ok, false);
  assert.strictEqual(checkin.exitCode(r), 1);
  assert.ok(r.next.indexOf('claude plugin install commander@commander-hub') >= 0);
});

test('hooks: a registered handler missing on disk blocks', function() {
  var l = laneDir('ai3', '8.1.2');
  fs.renameSync(path.join(pluginHooks(l), 'start.js'), path.join(pluginHooks(l), 'start.js.off'));
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.deepStrictEqual(r.hooks.missing, ['start.js']);
  assert.strictEqual(checkin.exitCode(r), 1);
});

test('hooks: skipped (null) when no plugin is installed; exit stays 3', function() {
  var l = laneDir('ai4', null);
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  assert.strictEqual(r.hooks, null);
  assert.strictEqual(r.health.checks.filter(function(x) { return x.id === 'hooks'; })[0].status, 'skip');
  assert.strictEqual(checkin.exitCode(r), 3);
});

test('hooks: checkin and doctor agree on the shipped hooks', function() {
  var diag = require('../cowork-plugin/skills/ccc-doctor/lib/diagnostics');
  var l = laneDir('ai1', '8.1.2');
  fs.rmSync(pluginHooks(l), { recursive: true, force: true });
  fs.cpSync(path.join(__dirname, '..', 'cowork-plugin', 'hooks'), pluginHooks(l), { recursive: true });
  var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
  var report = diag.hookChainReport(path.join(__dirname, '..', 'cowork-plugin', 'hooks'));
  assert.strictEqual(r.hooks.status, 'ok');
  assert.strictEqual(r.hooks.registered, report.registered.length);
  assert.deepStrictEqual(r.hooks.shared_state_writers, []);
});

test('hooks: a malformed hooks.json shape is a blocking failure, not a crash', function() {
  [{ hooks: { SessionStart: {} } }, { hooks: [] }, { hooks: { SessionStart: [{ hooks: 'x' }] } }, { hooks: { SessionStart: [null] } },
    { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 42 }] }] } },
    { hooks: { SessionStart: [{ hooks: [{ type: 'command' }] }] } },
    { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: '  ' }] }] } },
    { hooks: { SessionStart: [{ hooks: [{ command: 'node x.js' }] }] } },
    { hooks: { SessionStart: [{ matcher: 'x' }] } }].forEach(function(manifest) {
    var l = laneDir('ai2', '8.1.2');
    writeJson(path.join(pluginHooks(l), 'hooks.json'), manifest);
    var r = checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false });
    assert.strictEqual(r.hooks.loadable, false, JSON.stringify(manifest));
    assert.strictEqual(checkin.exitCode(r), 1);
  });
});

// CC-2122: the usage block for the resolved lane, read from Fleet's usage file.
// Every fixture is a temp HOME; the real ~/.commander is never read.

var NOW = '2026-10-27T04:00:00Z';

function usageFixture(lane, content) {
  var l = laneDir(lane, '8.1.2');
  var file = path.join(l.home, 'usage', 'lane usage.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (content !== undefined) fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  l.env.CCC_LANE_USAGE_FILE = file;
  l.file = file;
  return l;
}

function run(l) {
  return checkin.buildCheckin({ root: checkout('8.1.2'), env: l.env, cwd: l.home, cli: false, now: NOW });
}

var WINDOWS = [
  { id: 'session', kind: 'session', label: '5-hour', percent: 16, resetsAt: '2026-10-27T06:59:00Z' },
  { id: 'weekly:fable', kind: 'weekly_scoped', percent: 21.5, resets_at: '2026-10-30T00:59:00Z' },
  { id: 'weekly', kind: 'weekly', percent: 9 },
];

test('usage: the resolved lane\'s block, normalized windows, exit code unchanged', function() {
  var l = usageFixture('ai4', { ai4: { fetchedAt: '2026-10-27T03:57:00.123456Z', windows: WINDOWS }, ai1: { fetchedAt: NOW, windows: [] } });
  var r = run(l);
  assert.deepStrictEqual(r.usage, {
    lane: 'ai4',
    fetched_at: '2026-10-27T03:57:00.123456Z',
    age_seconds: 179,
    stale: false,
    five_hour: 16,
    seven_day: 21.5,
    windows: [
      { id: 'session', kind: 'session', percent: 16, resets_at: '2026-10-27T06:59:00Z' },
      { id: 'weekly:fable', kind: 'weekly_scoped', percent: 21.5, resets_at: '2026-10-30T00:59:00Z' },
      { id: 'weekly', kind: 'weekly', percent: 9, resets_at: null },
    ],
  });
  assert.strictEqual(r.usage_reason, null);
  assert.strictEqual(r.usage_file, l.file);
  assert.strictEqual(checkin.exitCode(r), 0);
  assert.ok(!r.health.checks.some(function(c) { return c.id === 'usage'; }), 'usage is informational, not a check');
  assert.strictEqual(checkin.usageLine(r), 'usage ai4: 5h 16%, 7d 21% (fetched 2m ago)');
});

test('usage: a reading older than 30 minutes keeps its numbers and sets stale', function() {
  var l = usageFixture('ai4', { ai4: { fetchedAt: '2026-10-27T03:29:00Z', windows: WINDOWS } });
  var r = run(l);
  assert.strictEqual(r.usage.stale, true);
  assert.strictEqual(r.usage.age_seconds, 31 * 60);
  assert.deepStrictEqual([r.usage.five_hour, r.usage.seven_day], [16, 21.5]);
  assert.strictEqual(checkin.usageLine(r), 'usage ai4: 5h 16%, 7d 21% (STALE, fetched 31m ago)');
  // Exactly 30 minutes is still fresh; a missing or unparseable fetchedAt is stale.
  writeJson(l.file, { ai4: { fetchedAt: '2026-10-27T03:30:00Z', windows: WINDOWS } });
  assert.strictEqual(run(l).usage.stale, false);
  writeJson(l.file, { ai4: { fetchedAt: 'yesterday', windows: WINDOWS } });
  assert.deepStrictEqual([run(l).usage.stale, run(l).usage.age_seconds], [true, null]);
  writeJson(l.file, { ai4: { windows: WINDOWS } });
  assert.strictEqual(run(l).usage.stale, true);
});

test('usage: missing file is usage null with reason "missing"', function() {
  var l = usageFixture('ai4');
  var r = run(l);
  assert.deepStrictEqual([r.usage, r.usage_reason, r.usage_file], [null, 'missing', l.file]);
  assert.strictEqual(checkin.exitCode(r), 0);
  assert.strictEqual(checkin.usageLine(r), 'usage ai4: none (missing ' + l.file + ')');
});

test('usage: malformed file or lane entry is usage null with reason "malformed"; check-in never crashes', function() {
  ['{"ai4": ', '[]', 'null', '42', JSON.stringify({ ai4: 'x' }), JSON.stringify({ ai4: { fetchedAt: NOW } }), JSON.stringify({ ai4: { fetchedAt: NOW, windows: {} } })]
    .forEach(function(text) {
      var r = run(usageFixture('ai4', text));
      assert.deepStrictEqual([r.usage, r.usage_reason], [null, 'malformed'], text);
      assert.strictEqual(checkin.exitCode(r), 0);
    });
  // Junk window entries are dropped or nulled, not fatal.
  var r = run(usageFixture('ai4', { ai4: { fetchedAt: NOW, windows: [null, 'x', { id: 'session', percent: 'high' }, { id: 'weekly', percent: 50 }] } }));
  assert.deepStrictEqual([r.usage.five_hour, r.usage.seven_day, r.usage.windows.length], [null, 50, 2]);
  assert.strictEqual(checkin.usageLine(r), 'usage ai4: 5h ?, 7d 50% (fetched 0s ago)');
});

test('usage: lane absent from the file is usage null with reason "lane_absent"', function() {
  var r = run(usageFixture('ai2', { ai4: { fetchedAt: NOW, windows: WINDOWS } }));
  assert.deepStrictEqual([r.usage, r.usage_reason], [null, 'lane_absent']);
  assert.strictEqual(checkin.usageLine(r), 'usage ai2: none (lane_absent ' + r.usage_file + ')');
});

test('usage: the lane is the resolved one (CCC_CONFIG_DIR wins; guestnetworks reads ai5)', function() {
  var l = usageFixture('ai1', { ai3: { fetchedAt: NOW, windows: [{ id: 'session', percent: 33 }] }, ai5: { fetchedAt: NOW, windows: [{ id: 'session', percent: 55 }] } });
  l.env.CCC_CONFIG_DIR = path.join(l.home, '.claude-ai3');
  assert.strictEqual(run(l).usage.five_hour, 33);
  delete l.env.CCC_CONFIG_DIR;
  l.env.CLAUDE_CONFIG_DIR = path.join(l.home, '.claude-guestnetworks');
  assert.deepStrictEqual([run(l).usage.lane, run(l).usage.five_hour], ['ai5', 55]);
});

test('usage: CCC_LANE_USAGE_FILE unset reads <HOME>/.commander/lane-usage.json', function() {
  var l = laneDir('ai4', '8.1.2');
  var file = path.join(l.home, '.commander', 'lane-usage.json');
  assert.strictEqual(l.env.CCC_LANE_USAGE_FILE, undefined);
  assert.deepStrictEqual([run(l).usage, run(l).usage_reason, run(l).usage_file], [null, 'missing', file]);
  writeJson(file, { ai4: { fetchedAt: NOW, windows: WINDOWS } });
  var r = run(l);
  assert.deepStrictEqual([r.usage_file, r.usage.five_hour, r.usage.seven_day, r.usage.stale], [file, 16, 21.5, false]);
});

test('usage: ccc checkin --json via the CLI carries the block', function() {
  var l = usageFixture('ai4', { ai4: { fetchedAt: new Date().toISOString(), windows: WINDOWS } });
  var env = Object.assign({}, process.env, l.env);
  delete env.CCC_CONFIG_DIR;
  var r = childProcess.spawnSync(process.execPath, [KC, 'checkin', '--json', '--no-cli'], { cwd: l.home, env: env, encoding: 'utf8' });
  var out = JSON.parse(r.stdout);
  assert.deepStrictEqual([out.usage.lane, out.usage.five_hour, out.usage.seven_day, out.usage.stale, out.usage_reason], ['ai4', 16, 21.5, false, null]);
  var human = childProcess.spawnSync(process.execPath, [KC, 'checkin', '--no-cli'], { cwd: l.home, env: env, encoding: 'utf8' });
  assert.match(human.stdout.trim().split('\n')[1], /^usage ai4: 5h 16%, 7d 21% \(fetched \d+s ago\)$/);
});
