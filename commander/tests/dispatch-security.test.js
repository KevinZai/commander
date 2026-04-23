'use strict';

var test = require('node:test');
var assert = require('node:assert');
var path = require('node:path');
var childProcess = require('node:child_process');
var dispatcher = require('../dispatcher');

var KC_BIN = path.join(__dirname, '..', '..', 'bin', 'kc.js');

function runKc(args) {
  var res = childProcess.spawnSync(process.execPath, [KC_BIN].concat(args), {
    encoding: 'utf8',
    timeout: 15000,
  });
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

test('generateSessionName produces safe slugs', function() {
  var name = dispatcher.generateSessionName('Test `$(evil)` task');
  assert.ok(!name.includes('`'), 'Should not contain backticks');
  assert.ok(!name.includes('$'), 'Should not contain dollar signs');
  assert.ok(name.startsWith('kc-'));
});

test('generateSessionName strips shell metacharacters', function() {
  var name = dispatcher.generateSessionName('Build API; rm -rf /');
  assert.ok(!name.includes(';'), 'Should not contain semicolons');
});

test('generateSessionName truncates long input', function() {
  var long = 'A'.repeat(200);
  var name = dispatcher.generateSessionName(long);
  assert.ok(name.length <= 50, 'Name should be <= 50 chars, got ' + name.length);
});

test('generateSessionName handles empty input', function() {
  var name = dispatcher.generateSessionName('');
  assert.ok(name.startsWith('kc-'));
  assert.ok(name.length >= 3);
});

test('dispatch rejects non-existent --cwd', function() {
  assert.throws(function() {
    dispatcher.dispatch('noop', { cwd: '/nonexistent/path/should/not/exist/xyz', stream: false, bare: true });
  }, /must be an existing directory/);
});

test('dispatch rejects --cwd that is not a directory', function() {
  assert.throws(function() {
    dispatcher.dispatch('noop', { cwd: '/etc/passwd', stream: false, bare: true });
  }, /must be an existing directory/);
});

test('--skills install rejects path-traversal via ../../etc', function() {
  var res = runKc(['--skills', 'install', '../../etc']);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for traversal');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});

test('--skills install rejects path-traversal via ../..', function() {
  var res = runKc(['--skills', 'install', '../..']);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for traversal');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});

test('--skills install rejects traversal via foo/../../bar', function() {
  var res = runKc(['--skills', 'install', 'foo/../../bar']);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for traversal');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});
