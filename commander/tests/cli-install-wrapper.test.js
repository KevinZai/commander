'use strict';

// FLT-725 (FLT-675 follow-up): exit-code tests for bin/cli.js, the thin wrapper that runs
// `bash install.sh <args>` from the package root. Test-only, no product change:
//  - Stub: bin/cli.js is copied byte for byte into a temp package next to a stub install.sh,
//    so exit-code propagation, argv pass-through and cwd are checked without the real installer.
//  - Real installer: only its existing read-only flags (--help, --dry-run --force, an unknown
//    flag) run, with HOME and CLAUDE_CONFIG_DIR in a temp dir that must stay empty.
// Out of scope (need network or daemon fixtures): positive paths for `ccc --ingest <url>`
// and a real `ccc --daemon` start.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var ROOT = path.join(__dirname, '..', '..');
var CLI = path.join(ROOT, 'bin', 'cli.js');

var made = [];
function tmp(prefix) { var d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); made.push(d); return d; }
test.after(function() { made.forEach(function(d) { fs.rmSync(d, { recursive: true, force: true }); }); });

/** Every path under dir, relative and sorted (a snapshot to prove nothing was written). */
function tree(dir) {
  var out = [];
  (function walk(d) {
    fs.readdirSync(d).forEach(function(n) {
      var p = path.join(d, n);
      out.push(path.relative(dir, p));
      if (fs.lstatSync(p).isDirectory()) walk(p);
    });
  })(dir);
  return out.sort();
}

/** Run a cli.js with a throwaway HOME (and CLAUDE_CONFIG_DIR inside it); stdin closed. */
function run(cli, args, extraEnv) {
  var home = tmp('ccc cli wrapper home ');
  var env = Object.assign({
    PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
    CC_NO_ANIMATION: '1', CC_NO_COLOR: '1', TERM: 'dumb',
  }, extraEnv || {});
  var res = childProcess.spawnSync(process.execPath, [cli].concat(args || []), {
    env: env, cwd: home, input: '', encoding: 'utf8', timeout: 60000,
  });
  res.home = home;
  return res;
}

/** A temp package: bin/cli.js (exact copy of the real one) + a stub install.sh. */
function stubPackage(stubBody) {
  var pkg = fs.realpathSync(tmp('ccc cli wrapper pkg '));
  fs.mkdirSync(path.join(pkg, 'bin'));
  fs.copyFileSync(CLI, path.join(pkg, 'bin', 'cli.js'));
  fs.writeFileSync(path.join(pkg, 'install.sh'), '#!/bin/bash\n' + stubBody + '\n');
  return pkg;
}

var ECHO_STUB = [
  'printf "STUB argc=%s\\n" "$#"',
  'for a in "$@"; do printf "STUB arg=[%s]\\n" "$a"; done',
  'printf "STUB cwd=%s\\n" "$(pwd -P)"',
  'printf "STUB stderr line\\n" >&2',
  'exit "${STUB_EXIT:-0}"',
].join('\n');

test('FLT-725 stub: the copied wrapper is the real bin/cli.js', function() {
  var pkg = stubPackage(ECHO_STUB);
  assert.strictEqual(fs.readFileSync(path.join(pkg, 'bin', 'cli.js'), 'utf8'), fs.readFileSync(CLI, 'utf8'));
});

test('FLT-725 stub: exit 0, argv passed through unchanged, cwd is the package root', function() {
  var pkg = stubPackage(ECHO_STUB);
  var r = run(path.join(pkg, 'bin', 'cli.js'), ['--mode=essentials', 'two words', '--force']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout, [
    'STUB argc=3', 'STUB arg=[--mode=essentials]', 'STUB arg=[two words]', 'STUB arg=[--force]',
    'STUB cwd=' + pkg, '',
  ].join('\n'));
  assert.strictEqual(r.stderr, 'STUB stderr line\n');
});

test('FLT-725 stub: no args runs install.sh with no args', function() {
  var pkg = stubPackage(ECHO_STUB);
  var r = run(path.join(pkg, 'bin', 'cli.js'), []);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /^STUB argc=0\n/);
});

test('FLT-725 stub: a non-zero install.sh exit code is propagated as is', function() {
  var pkg = stubPackage(ECHO_STUB);
  [1, 3, 42, 255].forEach(function(code) {
    var r = run(path.join(pkg, 'bin', 'cli.js'), [], { STUB_EXIT: String(code) });
    assert.strictEqual(r.status, code, 'stub exit ' + code);
  });
});

test('FLT-725 stub: install.sh killed by a signal makes the wrapper exit 1', function() {
  var pkg = stubPackage('kill -TERM $$');
  var r = run(path.join(pkg, 'bin', 'cli.js'), []);
  assert.strictEqual(r.signal, null);
  assert.strictEqual(r.status, 1);
});

test('FLT-725 stub: a missing install.sh exits non-zero (bash cannot open it)', function() {
  var pkg = stubPackage(ECHO_STUB);
  fs.unlinkSync(path.join(pkg, 'install.sh'));
  var r = run(path.join(pkg, 'bin', 'cli.js'), []);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /install\.sh/);
});

test('FLT-725 real install.sh --help: usage, exit 0, temp HOME untouched', function() {
  var r = run(CLI, ['--help']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Usage: \.\/install\.sh \[flags\]/);
  assert.match(r.stdout, /--dry-run\s+Preview what would be installed/);
  assert.deepStrictEqual(tree(r.home), []);
});

test('FLT-725 real install.sh --dry-run --force: preview only, exit 0, temp HOME untouched', function() {
  var r = run(CLI, ['--dry-run', '--force']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /DRY RUN/);
  assert.match(r.stdout, /Nothing will be changed/);
  assert.match(r.stdout, /Run without --dry-run to install\./);
  assert.deepStrictEqual(tree(r.home), []);
});

test('FLT-725 real install.sh unknown flag: exit 1 propagated, temp HOME untouched', function() {
  var r = run(CLI, ['--no-such-flag']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout + r.stderr, /Unknown flag: --no-such-flag/);
  assert.deepStrictEqual(tree(r.home), []);
});
