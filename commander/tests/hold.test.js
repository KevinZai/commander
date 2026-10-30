'use strict';

// CC-2123: `ccc hold set|clear|show --json`, the one writer of fleet-hold.json.
// Each test uses temp lanes; nothing touches the real config dirs.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var hold = require('../lib/hold');
var nextLib = require('../lib/next');

var KC = path.join(__dirname, '..', '..', 'bin', 'kc.js');
var NOW = Date.parse('2026-10-30T12:00:00Z');

function tmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

/** A HOME with two lane config dirs; env selects ai1 through CLAUDE_CONFIG_DIR. */
function lanes() {
  var home = tmp('ccc hold ');
  var ai1 = path.join(home, '.claude-ai1');
  var ai2 = path.join(home, '.claude-ai2');
  return {
    home: home,
    file1: path.join(ai1, 'commander', 'fleet-hold.json'),
    file2: path.join(ai2, 'commander', 'fleet-hold.json'),
    env1: { HOME: home, CLAUDE_CONFIG_DIR: ai1 },
    env2: { HOME: home, CLAUDE_CONFIG_DIR: ai2 },
  };
}

function kc(args, env) {
  return childProcess.spawnSync(process.execPath, [KC].concat(args), { env: Object.assign({ PATH: process.env.PATH }, env), encoding: 'utf8' });
}

test('set holds, set --until defers, clear proceeds; readHold agrees each time', function() {
  var l = lanes();
  var r = hold.set({ reason: 'Kevin pause', env: l.env1, now: NOW });
  assert.deepStrictEqual([r.state, r.action, r.when, r.source, r.lane], ['hold', 'hold', 'now', 'lane', 'ai1']);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(l.file1, 'utf8')), { hold: true, reason: 'Kevin pause', set_at: '2026-10-30T12:00:00.000Z' });
  assert.strictEqual(nextLib.readHold(l.env1, NOW).reason, 'CCC hold: Kevin pause');

  r = hold.set({ until: '2026-10-30T14:00:00-04:00', reason: 'quota', env: l.env1, now: NOW });
  assert.deepStrictEqual([r.state, r.action, r.when], ['defer', 'defer', '2026-10-30T18:00:00.000Z']);
  assert.strictEqual(r.record.hold, false);
  assert.strictEqual(nextLib.readHold(l.env1, NOW).action, 'defer');
  assert.strictEqual(nextLib.readHold(l.env1, Date.parse('2026-10-30T19:00:00Z')), null, 'a passed defer proceeds');

  r = hold.clear({ env: l.env1, now: NOW });
  assert.deepStrictEqual([r.state, r.action, r.when, r.reason], ['clear', 'proceed', 'now', null]);
  assert.strictEqual(nextLib.readHold(l.env1, NOW), null);
  assert.ok(fs.existsSync(l.file1), 'clear writes hold:false, it does not delete');
});

test('show reports none, lane, legacy and invalid sources without writing', function() {
  var l = lanes();
  var r = hold.show({ env: l.env1, now: NOW });
  assert.deepStrictEqual([r.source, r.state, r.record], ['none', 'clear', null]);
  assert.strictEqual(fs.existsSync(path.dirname(l.file1)), false, 'show creates nothing');

  var legacy = path.join(l.home, '.claude', 'commander', 'fleet-hold.json');
  fs.mkdirSync(path.dirname(legacy), { recursive: true });
  fs.writeFileSync(legacy, '{"hold":true,"reason":"old"}');
  r = hold.show({ env: l.env1, now: NOW });
  assert.deepStrictEqual([r.source, r.state, r.file], ['legacy', 'hold', legacy]);

  // clear writes the lane's own file, which then overrides the legacy hold
  hold.clear({ env: l.env1, now: NOW });
  r = hold.show({ env: l.env1, now: NOW });
  assert.deepStrictEqual([r.source, r.state], ['lane', 'clear']);
  assert.strictEqual(nextLib.readHold(l.env1, NOW), null);
  assert.strictEqual(fs.readFileSync(legacy, 'utf8'), '{"hold":true,"reason":"old"}', 'legacy file untouched');

  fs.writeFileSync(l.file1, '{broken');
  assert.strictEqual(hold.show({ env: l.env1, now: NOW }).state, 'invalid');
  fs.writeFileSync(l.file1, '{"hold":"yes"}');
  assert.strictEqual(hold.show({ env: l.env1, now: NOW }).state, 'invalid');
});

test('per-lane isolation: one lane\'s hold never reaches another; CCC_CONFIG_DIR wins', function() {
  var l = lanes();
  hold.set({ reason: 'ai1 only', env: l.env1, now: NOW });
  assert.strictEqual(fs.existsSync(l.file2), false);
  assert.strictEqual(hold.show({ env: l.env2, now: NOW }).state, 'clear');
  assert.strictEqual(nextLib.readHold(l.env2, NOW), null);

  var both = { HOME: l.home, CLAUDE_CONFIG_DIR: path.dirname(path.dirname(l.file1)), CCC_CONFIG_DIR: path.dirname(path.dirname(l.file2)) };
  hold.set({ reason: 'via CCC_CONFIG_DIR', env: both, now: NOW });
  assert.strictEqual(JSON.parse(fs.readFileSync(l.file2, 'utf8')).reason, 'via CCC_CONFIG_DIR');
  assert.strictEqual(JSON.parse(fs.readFileSync(l.file1, 'utf8')).reason, 'ai1 only');
});

test('bad input exits 2 and never writes or replaces the file', function() {
  var l = lanes();
  hold.set({ reason: 'keep me', env: l.env1, now: NOW });
  var before = fs.readFileSync(l.file1, 'utf8');
  var bad = [
    { until: 'tomorrow' },
    { until: '2026-10-31T10:00:00' }, // no zone
    { until: '2026-13-45T10:00:00Z' },
    { until: '2027-02-30T12:00:00Z' }, // Date.parse would roll this to March 2
    { until: '2028-02-30T12:00:00Z' },
    { until: '2027-04-31T12:00:00Z' },
    { until: '2027-01-01T24:00:00Z' },
    { until: '2027-01-01T10:60:00Z' },
    { until: '2027-01-01T10:00:61Z' },
    { until: '2027-01-01T10:00:00+24:00' },
    { until: '2026-10-30T11:00:00Z' }, // past
    { reason: 'x'.repeat(hold.MAX_REASON + 1) },
  ];
  bad.forEach(function(opts) {
    assert.throws(function() { hold.set(Object.assign({ env: l.env1, now: NOW }, opts)); }, function(e) { return e.exitCode === 2; }, JSON.stringify(opts).slice(0, 60));
    assert.strictEqual(fs.readFileSync(l.file1, 'utf8'), before);
  });
  // leap day is valid in 2028, not in 2027
  assert.strictEqual(hold.set({ until: '2028-02-29T12:00:00Z', env: lanes().env1, now: NOW }).when, '2028-02-29T12:00:00.000Z');
  assert.throws(function() { hold.set({ until: '2027-02-29T12:00:00Z', env: l.env1, now: NOW }); }, function(e) { return e.exitCode === 2; });
  assert.strictEqual(fs.readFileSync(l.file1, 'utf8'), before);
  var fresh = lanes();
  assert.throws(function() { hold.set({ until: 'nope', env: fresh.env1, now: NOW }); });
  assert.strictEqual(fs.existsSync(fresh.file1), false, 'a rejected set on a fresh lane leaves no file');
  assert.deepStrictEqual(fs.readdirSync(path.dirname(l.file1)), ['fleet-hold.json'], 'no temp files left behind');
});

test('parseArgs rejects unknown subcommands and arguments before any write', function() {
  var e2 = function(e) { return e.exitCode === 2; };
  assert.throws(function() { hold.parseArgs(['hold']); }, e2);
  assert.throws(function() { hold.parseArgs(['hold', 'drop']); }, e2);
  assert.throws(function() { hold.parseArgs(['hold', 'set', '--until']); }, e2);
  assert.throws(function() { hold.parseArgs(['hold', 'set', '--until', '--json']); }, e2);
  assert.throws(function() { hold.parseArgs(['hold', 'set', '--until=2026-11-01T00:00:00Z']); }, e2);
  assert.throws(function() { hold.parseArgs(['hold', 'clear', '--reason', 'x']); }, e2);
  assert.deepStrictEqual(hold.parseArgs(['hold', 'set', '--reason', 'r', '--until', 'u', '--json']), { sub: 'set', json: true, reason: 'r', until: 'u' });
});

test('CLI: ccc hold set/show/clear --json, and exit 2 with nothing written on bad input', function() {
  var l = lanes();
  var until = new Date(Date.now() + 3600e3).toISOString();
  var out = kc(['hold', 'set', '--until', until, '--reason', 'deploy window', '--json'], l.env1);
  assert.strictEqual(out.status, 0, out.stderr);
  var r = JSON.parse(out.stdout);
  assert.deepStrictEqual([r.schema, r.lane, r.state, r.when, r.reason], [1, 'ai1', 'defer', until, 'CCC defer: deploy window']);

  out = kc(['hold', 'show', '--json'], l.env1);
  assert.strictEqual(JSON.parse(out.stdout).state, 'defer');
  out = kc(['hold', 'show'], l.env1);
  assert.match(out.stdout, /^ccc hold \[ai1\]: defer until /);

  out = kc(['hold', 'set', '--until', '2001-01-01T00:00:00Z', '--json'], l.env1);
  assert.strictEqual(out.status, 2);
  assert.match(out.stderr, /^ccc hold: --until is in the past/);
  assert.strictEqual(JSON.parse(fs.readFileSync(l.file1, 'utf8')).until, until);

  out = kc(['hold', 'clear', '--json'], l.env1);
  assert.strictEqual(out.status, 0, out.stderr);
  assert.strictEqual(JSON.parse(out.stdout).state, 'clear');

  out = kc(['hold', 'bogus'], l.env2);
  assert.strictEqual(out.status, 2);
  assert.strictEqual(fs.existsSync(l.file2), false);
});
