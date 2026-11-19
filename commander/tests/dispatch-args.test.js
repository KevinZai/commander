'use strict';

// Codex #302 delta2 MEDIUM 4: a dispatch task can never be parsed as a CLI flag, and --agent reaches Claude Code.

var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var spawnSync = require('child_process').spawnSync;

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
