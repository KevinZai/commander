'use strict';

// FLT-675: exit code + stdout/stderr shape for CLI paths that bin/kc.js and bin/*.js
// accept but README.md, CHEATSHEET.md, BIBLE.md, docs/, mintlify-docs/ and guides/ never
// mention. Test-only: every spawn gets a temp HOME and cwd, stdin closed, minimal env,
// so nothing touches the real ~/.claude and nothing reaches the network.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var ROOT = path.join(__dirname, '..', '..');
var KC = path.join(ROOT, 'bin', 'kc.js');
var ESC = String.fromCharCode(27);

function tmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

/** Run a bin script with a throwaway HOME and cwd; stdin is closed (not a TTY). */
function run(script, args, opts) {
  opts = opts || {};
  var home = opts.home || tmp('ccc cli paths ');
  var env = Object.assign({ PATH: process.env.PATH, HOME: home }, opts.env || {});
  var res = childProcess.spawnSync(process.execPath, [script].concat(args || []), {
    env: env, cwd: home, input: '', encoding: 'utf8', timeout: 60000,
  });
  res.home = home;
  return res;
}

test('FLT-675 ccc -h: short help flag prints usage, exit 0', function() {
  var r = run(KC, ['-h']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /Usage:\s+ccc/);
  assert.match(r.stdout, /--tuneup\s+Read-only tuneup diagnostics/);
  assert.strictEqual(r.stderr, '');
});

test('FLT-675 ccc --doctor: flag form prints the full-stack report, exit 0 or 1 by summary', function() {
  var r = run(KC, ['--doctor']);
  // Exit is 1 only when a check fails, and that depends on what the host has installed.
  assert.ok(r.status === 0 || r.status === 1, 'unexpected exit ' + r.status);
  assert.ok(r.stdout.indexOf('ccc --doctor') !== -1, 'report title missing');
  assert.match(r.stdout, /hook-chain/);
  assert.strictEqual(r.stderr, '');
});

test('FLT-675 ccc --tuneup: read-only report titled ccc --tuneup, temp HOME stays settings-free', function() {
  var r = run(KC, ['--tuneup']);
  assert.ok(r.status === 0 || r.status === 1, 'unexpected exit ' + r.status);
  assert.ok(r.stdout.indexOf('ccc --tuneup') !== -1, 'report title missing');
  assert.match(r.stdout, /hook-chain/);
  assert.strictEqual(fs.existsSync(path.join(r.home, '.claude', 'settings.json')), false);
});

test('FLT-675 ccc --template: prints CLAUDE.md.template verbatim, exit 0', function() {
  var r = run(KC, ['--template']);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, fs.readFileSync(path.join(ROOT, 'CLAUDE.md.template'), 'utf8'));
  assert.strictEqual(r.stderr, '');
});

test('FLT-675 ccc --ingest: missing URL prints usage on stderr, exit 1, no network', function() {
  var r = run(KC, ['--ingest']);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(r.stderr, 'Usage: ccc --ingest <github-url>\n');
  var r2 = run(KC, ['--ingest', '--json']);
  assert.strictEqual(r2.status, 1);
  assert.strictEqual(r2.stderr, 'Usage: ccc --ingest <github-url>\n');
});

test('FLT-675 ccc --queue --priority: queues with the given priority, queue-list shows it', function() {
  var home = tmp('ccc cli queue ');
  var r = run(KC, ['--queue', 'write the tests', '--priority', '5'], { home: home });
  assert.strictEqual(r.status, 0);
  var m = r.stdout.match(/^Queued: (task-\d+-[a-z0-9]+) \(priority 5\)\n$/);
  assert.ok(m, 'unexpected output: ' + r.stdout);
  assert.strictEqual(r.stderr, '');
  assert.strictEqual(fs.readdirSync(path.join(home, '.claude', 'commander', 'queue')).length, 1);
  var list = run(KC, ['--queue-list'], { home: home });
  assert.strictEqual(list.status, 0);
  assert.strictEqual(list.stdout, '[5] PENDING  write the tests (' + m[1] + ')\n');
});

test('FLT-675 ccc --daemon --interval --tick-budget --dream: refuses to start when a daemon pid is live, exit 1', function() {
  var home = tmp('ccc cli daemon ');
  var dir = path.join(home, '.claude', 'commander');
  fs.mkdirSync(dir, { recursive: true });
  // The test runner's own pid is alive, so isRunning() reports it and start() is never reached.
  fs.writeFileSync(path.join(dir, 'daemon.pid'), String(process.pid));
  var r = run(KC, ['--daemon', '--interval', '1', '--tick-budget', '1', '--dream', '1'], { home: home });
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stdout, 'Daemon already running (PID ' + process.pid + '). Use --daemon-stop first.\n');
  assert.strictEqual(r.stderr, '');
});

test('FLT-675 ccc --next: flag alias of `next` fails with exit 3 on a lane with no plugin record', function() {
  var r = run(KC, ['--next', '--kind', 'build', '--json']);
  assert.strictEqual(r.status, 3);
  assert.strictEqual(r.stdout, '');
  assert.match(r.stderr, /^ccc next: CC Commander plugin is not installed on this lane/);
});

test('FLT-675 ccc --skills available: lists repo skills not installed in the temp HOME, exit 0', function() {
  var r = run(KC, ['--skills', 'available']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /\nAvailable but not installed \((\d+)\):\n/);
  assert.match(r.stdout, /\n {2}[a-z0-9-]+\n/);
  assert.strictEqual(r.stderr, '');
});

test('FLT-675 ccc --skills <unknown>: unknown subcommand prints usage on stderr, exit 1', function() {
  var r = run(KC, ['--skills', 'bogus']);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(r.stderr,
    'Unknown subcommand: bogus\nUsage: ccc --skills [list|available|install <name>|remove <name>|tier <tier>]\n');
});

test('FLT-675 CCC_SIMPLE=1: bare ccc skips the tmux split and starts the menu engine, exit 0', function() {
  var r = run(KC, [], { env: { CCC_SIMPLE: '1' } });
  assert.strictEqual(r.status, 0);
  assert.ok(r.stdout.indexOf(ESC + '[2J') !== -1, 'menu engine did not clear the screen');
  assert.strictEqual(r.stderr, '');
});

test('FLT-675 CCC_TMUX_SESSION set: bare ccc starts the menu engine inside the split, exit 0', function() {
  var r = run(KC, [], { env: { CCC_TMUX_SESSION: 'flt-675-test' } });
  assert.strictEqual(r.status, 0);
  assert.ok(r.stdout.indexOf(ESC + '[2J') !== -1, 'menu engine did not clear the screen');
  assert.strictEqual(r.stderr, '');
});

test('FLT-675 bin/ccc.js: alias entry point forwards to kc.js (--version)', function() {
  var r = run(path.join(ROOT, 'bin', 'ccc.js'), ['--version']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /^CC Commander v\d+\.\d+\.\d+/);
});

test('FLT-675 bin/count-skills.js: prints a single integer skill count, exit 0', function() {
  var r = run(path.join(ROOT, 'bin', 'count-skills.js'), []);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /^\d+\n$/);
  assert.ok(Number(r.stdout) > 0);
  assert.strictEqual(r.stderr, '');
});

test('FLT-675 bin/doc-sync.js: count check prints DOC SYNC OK, exit 0', function() {
  var r = run(path.join(ROOT, 'bin', 'doc-sync.js'), []);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /^DOC SYNC OK: \d+ skills, \d+ vendors, \d+ adventures, \d+ commands\n$/);
});
