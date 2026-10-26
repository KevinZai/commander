'use strict';

// CC-2084: `ccc doctor --instances` audits every Claude config dir in a home.
// Every fixture home is a temp dir; nothing real is read or written.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var instances = require('../lib/instances');

var KC = path.join(__dirname, '..', '..', 'bin', 'kc.js');
var PKG_VERSION = require('../../package.json').version;
var ID = 'commander@commander-hub';

function tmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function writeJson(file, obj) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj)); }

/** Add a config dir to home. opts: {version, enabled, hooks, staleCopy, symlinkSkill}. */
function addInstance(home, name, opts) {
  opts = opts || {};
  var dir = path.join(home, name);
  fs.mkdirSync(path.join(dir, 'projects'), { recursive: true });
  if (opts.version) {
    var install = path.join(dir, 'plugins', 'cache', 'commander-hub', 'commander', opts.version);
    writeJson(path.join(install, '.claude-plugin', 'plugin.json'), { version: opts.version });
    fs.mkdirSync(path.join(install, 'skills', 'ccc'), { recursive: true });
    fs.writeFileSync(path.join(install, 'skills', 'ccc', 'SKILL.md'), 'x');
    if (opts.hooks !== false) writeJson(path.join(install, 'hooks', 'hooks.json'), { hooks: {} });
    writeJson(path.join(dir, 'plugins', 'installed_plugins.json'), { version: 2, plugins: { 'commander@commander-hub': [{ scope: 'user', version: opts.version, installPath: install }] } });
  }
  var ep = {};
  if (opts.enabled !== undefined) ep[ID] = opts.enabled;
  writeJson(path.join(dir, 'settings.json'), { enabledPlugins: ep });
  if (opts.staleCopy) fs.mkdirSync(path.join(dir, 'skills', 'ccc-plan'), { recursive: true });
  if (opts.symlinkSkill) {
    fs.mkdirSync(path.join(dir, 'skills'), { recursive: true });
    fs.symlinkSync(tmp('ccc inst target '), path.join(dir, 'skills', 'ccc-review'));
  }
  return dir;
}

function root(version) {
  var r = tmp('ccc inst root ');
  writeJson(path.join(r, 'package.json'), { version: version });
  return r;
}

test('finds .claude and .claude-* instances (with spaces in HOME) and skips look-alikes', function() {
  var home = tmp('ccc inst home with space ');
  addInstance(home, '.claude', { version: '8.1.2', enabled: true });
  addInstance(home, '.claude-ai1', { version: '8.1.2', enabled: true });
  fs.mkdirSync(path.join(home, '.claude-mem'));
  fs.writeFileSync(path.join(home, '.claude-mem', 'settings.json'), '{}');
  fs.mkdirSync(path.join(home, '.claudeX', 'projects'), { recursive: true });
  assert.deepStrictEqual(instances.listInstanceDirs(home).map(function(d) { return path.basename(d); }), ['.claude', '.claude-ai1']);
  assert.throws(function() { instances.listInstanceDirs(path.join(home, 'missing')); }, /ENOENT/);
  var bad = instances.auditInstances({ home: path.join(home, 'missing'), root: root('8.1.2') });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.error.split(': ').pop(), 'ENOENT');
  assert.match(instances.renderTable(bad), /ERROR: cannot read/);
});

test('healthy instance is ok; each gap kind is reported', function() {
  var home = tmp('ccc inst gaps ');
  addInstance(home, '.claude-ai1', { version: '8.1.2', enabled: true });
  addInstance(home, '.claude-ai2', { version: '8.1.1', enabled: true });
  addInstance(home, '.claude-ai3', { version: '8.1.2', enabled: false });
  addInstance(home, '.claude-ai4', { version: '8.1.2', enabled: true, hooks: false, staleCopy: true, symlinkSkill: true });
  addInstance(home, '.claude-guestnetworks', {});
  var r = instances.auditInstances({ home: home, root: root('8.1.2') });
  assert.strictEqual(r.schema, 1);
  assert.strictEqual(r.latest, '8.1.2');
  assert.strictEqual(r.ok, false);
  var by = {};
  r.instances.forEach(function(i) { by[path.basename(i.config_dir)] = i; });
  assert.deepStrictEqual(by['.claude-ai1'].gaps, []);
  assert.strictEqual(by['.claude-ai1'].status, 'ok');
  assert.deepStrictEqual(by['.claude-ai2'].gaps, ['plugin 8.1.1 behind 8.1.2']);
  assert.deepStrictEqual(by['.claude-ai3'].gaps, ['plugin disabled']);
  assert.deepStrictEqual(by['.claude-ai4'].gaps, ['plugin hooks.json missing', '1 stale local ccc skill copy']);
  assert.deepStrictEqual(by['.claude-ai4'].stale_skills, ['ccc-plan'], 'symlinked skills are not stale copies');
  assert.strictEqual(by['.claude-guestnetworks'].lane, 'ai5');
  assert.deepStrictEqual(by['.claude-guestnetworks'].gaps, ['plugin not installed']);
});

test('renderTable prints one row per instance with ~ paths and a summary', function() {
  var home = tmp('ccc inst table ');
  addInstance(home, '.claude', { version: '8.1.2', enabled: true });
  addInstance(home, '.claude-ai2', {});
  var table = instances.renderTable(instances.auditInstances({ home: home, root: root('8.1.2') }));
  assert.match(table, /^\| Lane \| Config dir \|/);
  assert.match(table, /\| pri \| `~\/\.claude` \| 8\.1\.2 \| yes \| yes \| - \| ok \|/);
  assert.match(table, /\| ai2 \| `~\/\.claude-ai2` \| none \|.*GAP: plugin not installed \|/);
  assert.match(table, /latest 8\.1\.2 · 2 instances · 1 with gaps$/);
});

test('ccc doctor --instances --json --home <dir>: JSON, exit 1 on gaps, nothing written', function() {
  var home = tmp('ccc inst cli ');
  addInstance(home, '.claude-ai1', { version: PKG_VERSION, enabled: true });
  addInstance(home, '.claude-ai2', {});
  var snapshot = function() { return childProcess.execFileSync('find', [home], { encoding: 'utf8' }).split('\n').sort().join('\n'); };
  var before = snapshot();
  var r = childProcess.spawnSync(process.execPath, [KC, 'doctor', '--instances', '--json', '--home', home], { encoding: 'utf8' });
  assert.strictEqual(r.status, 1, r.stderr);
  var out = JSON.parse(r.stdout);
  assert.strictEqual(out.instances.length, 2);
  assert.strictEqual(snapshot(), before, 'audit is read-only');
  fs.rmSync(path.join(home, '.claude-ai2'), { recursive: true });
  var ok = childProcess.spawnSync(process.execPath, [KC, '--doctor', '--instances', '--home', home], { encoding: 'utf8' });
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /1 instances · 0 with gaps/);
});

test('a commander install from another marketplace is checked under its own key', function() {
  var home = tmp('ccc inst mkt ');
  var dir = addInstance(home, '.claude-ai1', { version: '8.1.2' });
  var recFile = path.join(dir, 'plugins', 'installed_plugins.json');
  var rec = JSON.parse(fs.readFileSync(recFile, 'utf8'));
  rec.plugins = { 'commander@other-hub': rec.plugins[ID] };
  writeJson(recFile, rec);
  writeJson(path.join(dir, 'settings.json'), { enabledPlugins: { 'commander@other-hub': true } });
  var r = instances.auditInstances({ home: home, root: root('8.1.2') });
  assert.deepStrictEqual(r.instances[0].gaps, []);
  assert.strictEqual(r.ok, true);
});

test('an instance dir that cannot be read is reported as a gap, not skipped', { skip: process.getuid && process.getuid() === 0 }, function() {
  var home = tmp('ccc inst eacces ');
  addInstance(home, '.claude-ai1', { version: '8.1.2', enabled: true });
  var locked = path.join(home, '.claude-ai2');
  fs.mkdirSync(path.join(locked, 'projects'), { recursive: true });
  fs.chmodSync(locked, 0o000);
  try {
    var r = instances.auditInstances({ home: home, root: root('8.1.2') });
    var lockedRow = r.instances.filter(function(i) { return i.config_dir === locked; })[0];
    assert.ok(lockedRow, 'unreadable dir listed');
    assert.deepStrictEqual(lockedRow.gaps, ['config dir unreadable: EACCES']);
    assert.strictEqual(r.ok, false);
  } finally {
    fs.chmodSync(locked, 0o755);
  }
});

test('an unreadable skills dir is a gap, a missing one is clean', { skip: process.getuid && process.getuid() === 0 }, function() {
  var home = tmp('ccc inst skills ');
  var dir = addInstance(home, '.claude-ai1', { version: '8.1.2', enabled: true });
  assert.deepStrictEqual(instances.staleSkillCopies(dir), { copies: [], error: null });
  fs.mkdirSync(path.join(dir, 'skills'));
  fs.chmodSync(path.join(dir, 'skills'), 0o000);
  try {
    var r = instances.auditInstances({ home: home, root: root('8.1.2') });
    assert.deepStrictEqual(r.instances[0].gaps, ['skills dir unreadable: EACCES']);
  } finally {
    fs.chmodSync(path.join(dir, 'skills'), 0o755);
  }
});

// CC-2115 (AUDIT M1): a real ~/.claude-ai5 and the guestnetworks -> ai5 alias
// used to give two "ai5" rows. The alias names the lane's config dir, so the
// plain dir is reported as shadowed, not audited as a second ai5.
test('one row per lane: an aliased dir shadows a plain dir with the same lane name', function() {
  var home = tmp('ccc inst dup ');
  addInstance(home, '.claude-ai5', {});
  addInstance(home, '.claude-guestnetworks', { version: '8.1.2', enabled: true });
  var r = instances.auditInstances({ home: home, root: root('8.1.2') });
  var ai5 = r.instances.filter(function(i) { return i.lane === 'ai5'; });
  assert.strictEqual(ai5.length, 1, JSON.stringify(r.instances));
  assert.strictEqual(path.basename(ai5[0].config_dir), '.claude-guestnetworks');
  assert.deepStrictEqual(r.shadowed, [{ lane: 'ai5', config_dir: path.join(home, '.claude-ai5'), by: path.join(home, '.claude-guestnetworks') }]);
  assert.strictEqual(r.ok, true, 'a shadowed leftover dir is not a gap');
  var table = instances.renderTable(r);
  assert.strictEqual((table.match(/^\| ai5 \|/gm) || []).length, 1, table);
  assert.match(table, /`~\/\.claude-ai5` not audited: lane ai5 is `~\/\.claude-guestnetworks`/);
  assert.match(table, /1 instances · 0 with gaps/);
});

test('aliases come from <home>/.commander/config.json lanes.aliases', function() {
  var home = tmp('ccc inst alias cfg ');
  addInstance(home, '.claude-mywifi', {});
  addInstance(home, '.claude-guestnetworks', {});
  writeJson(path.join(home, '.commander', 'config.json'), { lanes: { aliases: { mywifi: 'mw', guestnetworks: 'guestnetworks' } } });
  var r = instances.auditInstances({ home: home, root: root('8.1.2') });
  assert.deepStrictEqual(r.instances.map(function(i) { return i.lane; }).sort(), ['guestnetworks', 'mw']);
  assert.deepStrictEqual(r.shadowed, []);
});
