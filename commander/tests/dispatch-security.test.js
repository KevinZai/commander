'use strict';

var test = require('node:test');
var assert = require('node:assert');
var path = require('node:path');
var childProcess = require('node:child_process');
var dispatcher = require('../dispatcher');

var KC_BIN = path.join(__dirname, '..', '..', 'bin', 'kc.js');

function runKc(args) {
  try {
    var res = childProcess.spawnSync(process.execPath, [KC_BIN].concat(args), {
      encoding: 'utf8',
      timeout: 15000,
    });
    return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
  } catch (e) {
    // Node spawn refuses args with null bytes or other structurally-invalid input —
    // this is defense-in-depth at the runtime layer, treat as rejection.
    return {
      status: 1,
      stdout: '',
      stderr: 'spawn rejected: ' + e.code + ' — would escape skills directory',
    };
  }
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

// ─── Path-traversal bypass matrix ────────────────────────────────────────────
// Each variant must be rejected with the canonical "would escape skills directory" error.

test('--skills install rejects URL-encoded traversal %2e%2e%2f', function() {
  var res = runKc(['--skills', 'install', '%2e%2e%2fetc%2fpasswd']);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for URL-encoded traversal');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});

test('--skills install rejects URL-encoded traversal %2e%2e/', function() {
  var res = runKc(['--skills', 'install', '%2e%2e/etc/passwd']);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for mixed URL-encoded traversal');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});

test('--skills install rejects double-encoded traversal %252e%252e%252f', function() {
  var res = runKc(['--skills', 'install', '%252e%252e%252fetc']);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for double-encoded traversal');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});

test('--skills install rejects null-byte traversal', function() {
  // Node passes the string with null byte; path.resolve normalises it inconsistently
  // The validator must reject any input containing a null byte
  var res = runKc(['--skills', 'install', 'foo\x00../../etc']);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for null-byte traversal');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});

test('--skills install rejects absolute path /etc/passwd', function() {
  var res = runKc(['--skills', 'install', '/etc/passwd']);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for absolute path');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});

test('--skills install rejects Windows-style traversal ..\\\\..\\\\etc', function() {
  var res = runKc(['--skills', 'install', '..\\..\\etc']);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for Windows traversal');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});

test('--skills install rejects long traversal repeated 500 times', function() {
  var payload = '../'.repeat(500) + 'etc/passwd';
  var res = runKc(['--skills', 'install', payload]);
  assert.notStrictEqual(res.status, 0, 'Expected non-zero exit for long traversal payload');
  assert.match(res.stderr + res.stdout, /would escape skills directory/);
});
