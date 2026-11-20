'use strict';

// Codex #302 delta2 MEDIUM 4: a dispatch task can never be parsed as a CLI flag, and --agent reaches Claude Code.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var spawnSync = require('child_process').spawnSync;

// Codex #302 delta3 NM4: this suite must never write the operator's profile (savings ledger, telemetry state).
// The lane and HOME point at a temp dir before any Commander module resolves its paths; children inherit them.
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-dispatch-args-'));
process.env.HOME = tmp;
process.env.USERPROFILE = tmp;
process.env.CCC_CONFIG_DIR = path.join(tmp, 'lane');
var LEDGER = path.join(tmp, 'lane', 'commander', 'savings.json');
test.after(function() { fs.rmSync(tmp, { recursive: true, force: true }); });

var da = require('../lib/dispatch-args');
var dispatcher = require('../dispatcher');
var server = require('../mcp-server/index.js');
var KC = path.join(__dirname, '..', '..', 'bin', 'kc.js');

test('the task after "--" is kept out of the flag list', function() {
  var s = da.splitArgs(['--dispatch', '--agent', 'reviewer', '--', '--help']);
  assert.deepStrictEqual(s.flags, ['--dispatch', '--agent', 'reviewer']);
  assert.strictEqual(s.task, '--help');
  var p = da.parseDispatch(s);
  assert.strictEqual(p.task, '--help');
  assert.strictEqual(p.agent, 'reviewer');
});

test('the legacy positional task is removed from the flag list; a dash-led one must use "--"', function() {
  var s = da.splitArgs(['--dispatch', 'fix the bug', '--agent', 'reviewer', '--json']);
  assert.deepStrictEqual(s.flags, ['--dispatch', '--agent', 'reviewer', '--json']);
  assert.strictEqual(da.parseDispatch(s).task, 'fix the bug');
  var dash = da.splitArgs(['--dispatch', '--update']);
  assert.ok(dash.flags.indexOf('--update') === -1, 'the task value is not a flag');
  assert.match(da.parseDispatch(dash).error, /goes after "--"/);
});

test('an invalid agent name is a usage error', function() {
  assert.ok(da.parseDispatch(da.splitArgs(['--dispatch', '--agent', '$(id)', '--', 't'])).error);
  assert.ok(da.parseDispatch(da.splitArgs(['--dispatch', '--agent', '--', 't'])).error);
});

test('ccc --dispatch with a task of --help does not print the help screen', function() {
  var r = spawnSync(process.execPath, [KC, '--dispatch', '--help'], { encoding: 'utf8', timeout: 15000, env: Object.assign({}, process.env, { CCC_OFFLINE: '1' }) });
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.ok(r.stdout.indexOf('Usage:  ccc') === -1, 'help screen was printed');
  assert.match(r.stderr, /goes after "--"/);
});

test('dispatcher passes --agent to Claude Code', function() {
  var out = dispatcher.dispatch('review it', { agent: 'reviewer', sync: false, bare: true, stream: false });
  assert.match(out.command, / --agent reviewer(\s|$)/);
  assert.throws(function() { dispatcher.dispatch('x', { agent: 'bad name', sync: false }); }, /agent/);
});

test('the MCP dispatch hint puts the task after "--" and keeps --agent', function() {
  var hint = server.HANDLERS.commander_invoke_agent({ name: 'reviewer', task: '--help' });
  assert.deepStrictEqual(hint.dispatch.argv, ['--dispatch', '--agent', 'reviewer', '--', '--help']);
});

test('the savings ledger resolves inside the temp lane, never the operator profile', function() {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  var real = function(p) { return path.join(fs.realpathSync(path.dirname(p)), path.basename(p)); };
  assert.strictEqual(real(require('../lib/lane').statePath('savings.json')), real(LEDGER));
});

test('a dry-run or rejected dispatch records nothing in the savings ledger', function() {
  try { fs.rmSync(LEDGER, { force: true }); } catch (_e) {}
  dispatcher.dispatch('review it', { agent: 'reviewer', sync: false, bare: true, stream: false });
  assert.throws(function() { dispatcher.dispatch('x', { agent: 'bad name', sync: false }); }, /agent/);
  assert.throws(function() { dispatcher.dispatch('x', { agent: 'bad name' }); }, /agent/);
  var over = dispatcher.dispatch('x', { sync: false, costCeiling: 0.000001, model: 'opus', maxTurns: 30 });
  assert.ok(over.error || over.command, 'cost-gated dry run returns');
  assert.strictEqual(fs.existsSync(LEDGER), false, 'no fictional dispatch was recorded');
});
