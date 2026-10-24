'use strict';

// CC-2094: lane = CCC_CONFIG_DIR > CLAUDE_CONFIG_DIR > ~/.claude, and each
// lane's writable state lives in <config dir>/commander. Every fixture is a
// temp dir; no real config dir is read or written.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var lane = require('../lib/lane');

var STATE_JS = path.join(__dirname, '..', 'state.js');

function tmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

test('env precedence: CCC_CONFIG_DIR > CLAUDE_CONFIG_DIR > HOME/.claude', function() {
  var cases = [
    [{ HOME: '/h' }, 'pri', 'primary', '/h/.claude', 'default'],
    [{ HOME: '/h', CLAUDE_CONFIG_DIR: '/h/.claude-ai3' }, 'ai3', 'ai3', '/h/.claude-ai3', 'CLAUDE_CONFIG_DIR'],
    [{ HOME: '/h', CLAUDE_CONFIG_DIR: '/h/.claude-ai3', CCC_CONFIG_DIR: '/h/.claude-ai1' }, 'ai1', 'ai1', '/h/.claude-ai1', 'CCC_CONFIG_DIR'],
    [{ HOME: '/h', CLAUDE_CONFIG_DIR: '/h/.claude-guestnetworks' }, 'ai5', 'guestnetworks', '/h/.claude-guestnetworks', 'CLAUDE_CONFIG_DIR'],
    [{ HOME: '/h', CLAUDE_CONFIG_DIR: '/h/.claude' }, 'pri', 'primary', '/h/.claude', 'CLAUDE_CONFIG_DIR'],
    [{ HOME: '/h', CLAUDE_CONFIG_DIR: '/h/.claude-ai2/' }, 'ai2', 'ai2', '/h/.claude-ai2', 'CLAUDE_CONFIG_DIR'],
  ];
  cases.forEach(function(c) {
    var r = lane.resolveLane(c[0]);
    assert.deepStrictEqual(
      [r.lane, r.account, r.configDir, r.source, r.known],
      [c[1], c[2], path.resolve(c[3]), c[4], true],
      JSON.stringify(c[0])
    );
    assert.strictEqual(r.stateDir, path.join(path.resolve(c[3]), 'commander'));
  });
});

test('paths with spaces resolve and keep the space in the state dir', function() {
  var r = lane.resolveLane({ HOME: '/h', CLAUDE_CONFIG_DIR: '/Volumes/Extreme Pro/cfg/.claude-ai4' });
  assert.strictEqual(r.lane, 'ai4');
  assert.strictEqual(r.stateDir, path.resolve('/Volumes/Extreme Pro/cfg/.claude-ai4/commander'));
});

test('unknown dir names are lane "custom" and flagged unknown; odd suffixes are sanitized and capped', function() {
  var r = lane.resolveLane({ HOME: '/h', CLAUDE_CONFIG_DIR: '/opt/claude-config' });
  assert.strictEqual(r.lane, 'custom');
  assert.strictEqual(r.account, null);
  assert.strictEqual(r.known, false);
  assert.strictEqual(r.stateDir, path.resolve('/opt/claude-config/commander'));
  assert.strictEqual(lane.resolveLane({ CLAUDE_CONFIG_DIR: '/h/.claude-a$b;c' }).lane, 'abc');
  assert.strictEqual(lane.resolveLane({ CLAUDE_CONFIG_DIR: '/h/.claude-' + 'x'.repeat(40) }).lane, 'x'.repeat(16));
  assert.strictEqual(lane.resolveLane({ CLAUDE_CONFIG_DIR: '/h/.claude-$$$' }).known, false);
});

test('readable() prefers the lane copy, falls back to legacy, never moves files', function() {
  var home = tmp('ccc lane home ');
  var env = { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai3') };
  var legacy = path.join(home, '.claude', 'commander');
  fs.mkdirSync(legacy, { recursive: true });
  // fresh lane, no legacy file -> lane path
  assert.strictEqual(lane.readable('state.json', env), path.join(home, '.claude-ai3', 'commander', 'state.json'));
  fs.writeFileSync(path.join(legacy, 'state.json'), '{"legacy":true}');
  assert.strictEqual(lane.readable('state.json', env), path.join(legacy, 'state.json'));
  fs.mkdirSync(path.join(home, '.claude-ai3', 'commander'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude-ai3', 'commander', 'state.json'), '{"lane":true}');
  assert.strictEqual(lane.readable('state.json', env), path.join(home, '.claude-ai3', 'commander', 'state.json'));
  assert.ok(fs.existsSync(path.join(legacy, 'state.json')), 'legacy file untouched');
});

function runStateWriter(env, marker, n) {
  var script = [
    'var st = require(' + JSON.stringify(STATE_JS) + ');',
    'for (var i = 0; i < ' + n + '; i++) {',
    '  var s = st.loadState(); s.lanes = (s.lanes || []).concat(' + JSON.stringify(marker) + '); st.saveState(s);',
    '}',
  ].join('\n');
  return childProcess.spawn(process.execPath, ['-e', script], { env: env, stdio: 'ignore' });
}

test('two lanes writing state concurrently do not clobber each other', async function() {
  var home = tmp('ccc lane race ');
  var base = Object.assign({}, process.env, { HOME: home });
  delete base.CCC_CONFIG_DIR;
  var envA = Object.assign({}, base, { CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai1') });
  var envB = Object.assign({}, base, { CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai2') });
  var done = function(child) { return new Promise(function(res) { child.on('exit', res); }); };
  var codes = await Promise.all([done(runStateWriter(envA, 'A', 40)), done(runStateWriter(envB, 'B', 40))]);
  assert.deepStrictEqual(codes, [0, 0]);
  var a = JSON.parse(fs.readFileSync(path.join(home, '.claude-ai1', 'commander', 'state.json'), 'utf8'));
  var b = JSON.parse(fs.readFileSync(path.join(home, '.claude-ai2', 'commander', 'state.json'), 'utf8'));
  assert.deepStrictEqual(a.lanes, Array(40).fill('A'));
  assert.deepStrictEqual(b.lanes, Array(40).fill('B'));
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'commander', 'state.json')), 'shared legacy state not written');
});

test('state.js reads a legacy state.json for a fresh lane, then writes the lane copy', function() {
  var home = tmp('ccc lane legacy ');
  fs.mkdirSync(path.join(home, '.claude', 'commander'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'commander', 'state.json'), JSON.stringify({ version: 1, user: { name: 'legacy' } }));
  var env = Object.assign({}, process.env, { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai4') });
  delete env.CCC_CONFIG_DIR;
  var script = 'var st = require(' + JSON.stringify(STATE_JS) + '); var s = st.loadState(); process.stdout.write(s.user.name); st.saveState(s);';
  var r = childProcess.spawnSync(process.execPath, ['-e', script], { env: env, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout, 'legacy');
  var laneState = JSON.parse(fs.readFileSync(path.join(home, '.claude-ai4', 'commander', 'state.json'), 'utf8'));
  assert.strictEqual(laneState.user.name, 'legacy');
  var legacyState = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'commander', 'state.json'), 'utf8'));
  assert.strictEqual(legacyState.updatedAt, undefined, 'legacy copy not rewritten');
});

test('legacy sessions stay readable and updatable from a fresh lane; writes land in the lane', function() {
  var home = tmp('ccc lane sess ');
  var legacySessions = path.join(home, '.claude', 'commander', 'sessions');
  fs.mkdirSync(legacySessions, { recursive: true });
  fs.writeFileSync(path.join(legacySessions, 'old1.json'), JSON.stringify({ id: 'old1', task: 't', startTime: new Date().toISOString() }));
  fs.writeFileSync(path.join(home, '.claude', 'commander', 'state.json'), JSON.stringify({ version: 1, user: { sessionsCompleted: 0 }, activeSession: 'old1' }));
  var env = Object.assign({}, process.env, { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai2') });
  delete env.CCC_CONFIG_DIR;
  var script = [
    'var st = require(' + JSON.stringify(STATE_JS) + ');',
    'var a = st.getActiveSession();',
    'var c = st.completeSession("old1", "done");',
    'process.stdout.write(JSON.stringify([a && a.id, c && c.status, st.listSessions().length]));',
  ].join('\n');
  var r = childProcess.spawnSync(process.execPath, ['-e', script], { env: env, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(JSON.parse(r.stdout), ['old1', 'completed', 1]);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(home, '.claude-ai2', 'commander', 'sessions', 'old1.json'), 'utf8')).status, 'completed');
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(legacySessions, 'old1.json'), 'utf8')).status, undefined, 'legacy session untouched');
});

test('listSessions merges lane and legacy sessions, lane copy wins', function() {
  var home = tmp('ccc lane merge ');
  var legacySessions = path.join(home, '.claude', 'commander', 'sessions');
  var laneSessions = path.join(home, '.claude-ai1', 'commander', 'sessions');
  fs.mkdirSync(legacySessions, { recursive: true });
  fs.mkdirSync(laneSessions, { recursive: true });
  fs.writeFileSync(path.join(legacySessions, 'a.json'), JSON.stringify({ id: 'a', v: 'legacy' }));
  fs.writeFileSync(path.join(legacySessions, 'b.json'), JSON.stringify({ id: 'b', v: 'legacy' }));
  fs.writeFileSync(path.join(laneSessions, 'b.json'), JSON.stringify({ id: 'b', v: 'lane' }));
  fs.writeFileSync(path.join(laneSessions, 'c.json'), JSON.stringify({ id: 'c', v: 'lane' }));
  var env = Object.assign({}, process.env, { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai1') });
  delete env.CCC_CONFIG_DIR;
  var script = 'var st = require(' + JSON.stringify(STATE_JS) + '); process.stdout.write(JSON.stringify(st.listSessions(10).map(function(s){return s.id+":"+s.v;}).sort()));';
  var r = childProcess.spawnSync(process.execPath, ['-e', script], { env: env, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(JSON.parse(r.stdout), ['a:legacy', 'b:lane', 'c:lane']);
});

test('VS Code extension reads the lane state.json first, legacy otherwise', function() {
  var home = tmp('ccc lane vscode ');
  fs.mkdirSync(path.join(home, '.claude', 'commander'), { recursive: true });
  var ext = path.join(__dirname, '..', '..', 'extensions', 'vscode', 'extension.js');
  var script = [
    'var Module = require("module"); var load = Module._load;',
    'Module._load = function(r) { if (r === "vscode") return { TreeItem: function() {} }; return load.apply(this, arguments); };',
    'process.stdout.write(require(' + JSON.stringify(ext) + ').stateFile());',
  ].join('\n');
  var env = Object.assign({}, process.env, { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude-ai2') });
  delete env.CCC_CONFIG_DIR;
  var run = function() { return childProcess.spawnSync(process.execPath, ['-e', script], { env: env, encoding: 'utf8' }); };
  assert.strictEqual(run().stdout, path.join(home, '.claude', 'commander', 'state.json'));
  fs.mkdirSync(path.join(home, '.claude-ai2', 'commander'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude-ai2', 'commander', 'state.json'), '{}');
  assert.strictEqual(run().stdout, path.join(home, '.claude-ai2', 'commander', 'state.json'));
});
