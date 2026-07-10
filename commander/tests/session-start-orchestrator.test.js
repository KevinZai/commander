'use strict';

// CC-414 — orchestrator scaffold tests
// Hermetic: uses mkdtempSync HOME, never mutates real ~/.claude

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const ORCH_PATH = path.join(
  __dirname, '..', 'cowork-plugin', 'hooks', 'orchestrator', 'session-start-orchestrator.js'
);

function mkHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-orch-test-'));
  // Pre-create ~/.claude so child handlers don't try to walk into uncreated dirs in odd ways
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  return home;
}

function runOrch({ home, cwd, input = {}, env = {}, nodeArgs = [] } = {}) {
  const r = spawnSync('node', [...nodeArgs, ORCH_PATH], {
    input: JSON.stringify(input),
    encoding: 'utf-8',
    timeout: 15000,
    cwd: cwd || home,
    env: {
      ...process.env,
      HOME: home,
      CCC_ORCH_TIMING: '1',
      ...env,
    },
  });
  let parsed = null;
  const lines = (r.stdout || '').trim().split('\n').filter(Boolean);
  if (lines.length) {
    try { parsed = JSON.parse(lines[lines.length - 1]); } catch {}
  }
  return { exitCode: r.status, stdout: r.stdout || '', stderr: r.stderr || '', parsed };
}

test('orchestrator boots and writes valid JSON', () => {
  const home = mkHome();
  const r = runOrch({ home });
  assert.equal(r.exitCode, 0, 'should exit 0');
  assert.ok(r.parsed, 'should produce parseable JSON: ' + r.stdout);
  assert.equal(r.parsed.continue, true);
});

test('orchestrator merges status from multiple handlers', () => {
  const home = mkHome();
  // Make a stale CLAUDE.md so stale-claude-md-nudge contributes a status
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-orch-cwd-'));
  const claudeMd = path.join(cwd, 'CLAUDE.md');
  fs.writeFileSync(claudeMd, '# stale\n');
  const oldTime = Date.now() - (45 * 24 * 60 * 60 * 1000); // 45 days ago
  fs.utimesSync(claudeMd, oldTime / 1000, oldTime / 1000);

  const r = runOrch({ home, cwd });
  assert.equal(r.exitCode, 0);
  assert.ok(r.parsed, 'should produce JSON');
  assert.equal(r.parsed.continue, true);
  // Either systemMessage combines messages or short-circuits — both are valid merges.
  if (r.parsed.systemMessage) {
    assert.equal(typeof r.parsed.systemMessage, 'string');
  }
  // No undocumented top-level keys may survive the merge (hook output contract)
  assert.ok(!('status' in r.parsed), 'merged output must not contain legacy status key');
});

test('orchestrator logs elapsed time to stderr when CCC_ORCH_TIMING=1', () => {
  const home = mkHome();
  const r = runOrch({ home });
  assert.equal(r.exitCode, 0);
  assert.match(r.stderr, /\[orchestrator\] session-start total=\d+ms/);
});

test('orchestrator writes single-line JSON output', () => {
  const home = mkHome();
  const r = runOrch({ home });
  const lines = r.stdout.trim().split('\n').filter(Boolean);
  assert.equal(lines.length, 1, 'expected exactly 1 stdout line, got: ' + r.stdout);
});

// fs write interposer — preloaded into the orchestrator child via --require.
// Logs the resolved target path of every fs write API call to CCC_FS_WRITE_LOG
// before delegating to the real implementation, so the parent test can assert
// no write escapes the sandbox HOME. Deliberately does NOT stat or otherwise
// depend on the real ~/.claude — concurrent Claude Code sessions legitimately
// write there, which made the previous mtime-based assertion flaky.
const FS_WRITE_INTERPOSER = `
'use strict';
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

const LOG = process.env.CCC_FS_WRITE_LOG;
// fd-based logging via captured writeSync: never routes through the wrapped
// path-based APIs, so the logger cannot recurse into its own interposition
// (fs.appendFileSync internally re-enters fs.writeFileSync via property lookup).
const origWriteSync = fs.writeSync.bind(fs);
const logFd = (() => {
  if (!LOG) return -1;
  try { return fs.openSync(LOG, 'a'); } catch { return -1; }
})();

function toPathString(p) {
  try {
    if (typeof p === 'string') return path.resolve(p);
    if (Buffer.isBuffer(p)) return path.resolve(p.toString('utf8'));
    if (p instanceof URL) return path.resolve(fileURLToPath(p));
  } catch {}
  return null;
}

function log(p) {
  if (logFd < 0) return;
  const s = toPathString(p);
  if (!s) return;
  try { origWriteSync(logFd, s + '\\n'); } catch {}
}

function isWriteFlags(flags) {
  if (flags === undefined || flags === null) return false;
  if (typeof flags === 'string') return /[wa+]/.test(flags);
  if (typeof flags === 'number') {
    const c = fs.constants;
    return (flags & (c.O_WRONLY | c.O_RDWR | c.O_CREAT | c.O_APPEND | c.O_TRUNC)) !== 0;
  }
  return true; // unknown flag shape — err on the side of logging
}

function wrapTargetFirst(obj, name) {
  const orig = obj[name];
  if (typeof orig !== 'function') return;
  obj[name] = function (target) {
    log(target);
    return orig.apply(this, arguments);
  };
}

function wrapTargetSecond(obj, name) {
  const orig = obj[name];
  if (typeof orig !== 'function') return;
  obj[name] = function (src, dest) {
    log(dest);
    return orig.apply(this, arguments);
  };
}

function wrapOpen(obj, name) {
  const orig = obj[name];
  if (typeof orig !== 'function') return;
  obj[name] = function (target, flags) {
    if (isWriteFlags(flags)) log(target);
    return orig.apply(this, arguments);
  };
}

const TARGET_FIRST = [
  'writeFile', 'writeFileSync', 'appendFile', 'appendFileSync',
  'mkdir', 'mkdirSync', 'mkdtemp', 'mkdtempSync',
  'rm', 'rmSync', 'rmdir', 'rmdirSync', 'unlink', 'unlinkSync',
  'truncate', 'truncateSync', 'utimes', 'utimesSync', 'lutimes', 'lutimesSync',
  'chmod', 'chmodSync', 'lchmod', 'lchmodSync', 'chown', 'chownSync', 'lchown', 'lchownSync',
  'createWriteStream',
];
// two-arg APIs where the write lands at the SECOND path (rename dest, symlink path, ...)
const TARGET_SECOND = [
  'rename', 'renameSync', 'copyFile', 'copyFileSync', 'cp', 'cpSync',
  'symlink', 'symlinkSync', 'link', 'linkSync',
];

for (const name of TARGET_FIRST) wrapTargetFirst(fs, name);
for (const name of TARGET_SECOND) wrapTargetSecond(fs, name);
wrapOpen(fs, 'open');
wrapOpen(fs, 'openSync');

const fsp = fs.promises;
for (const name of TARGET_FIRST) wrapTargetFirst(fsp, name);
for (const name of TARGET_SECOND) wrapTargetSecond(fsp, name);
wrapOpen(fsp, 'open');

// Refresh named ESM bindings (import { writeFile } from 'node:fs/promises')
// so they resolve to the wrapped implementations.
require('module').syncBuiltinESMExports();
`;

function safeRealpath(p) {
  try { return fs.realpathSync(p); } catch { return p; }
}

test('orchestrator is hermetic — does not write outside provided HOME', () => {
  const home = mkHome();
  const harness = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-orch-harness-'));
  const interposerPath = path.join(harness, 'fs-write-interposer.cjs');
  const writeLog = path.join(harness, 'writes.log');
  fs.writeFileSync(interposerPath, FS_WRITE_INTERPOSER);

  const r = runOrch({
    home,
    nodeArgs: ['--require', interposerPath],
    env: { CCC_FS_WRITE_LOG: writeLog },
  });
  assert.equal(r.exitCode, 0);

  // Positive control: the orchestrator did write, under the isolated HOME
  const isolatedCccDir = path.join(home, '.claude', 'commander');
  assert.ok(fs.existsSync(isolatedCccDir), 'should have created CCC dir under isolated HOME');

  const logged = fs.existsSync(writeLog)
    ? fs.readFileSync(writeLog, 'utf-8').split('\n').filter(Boolean)
    : [];
  // Self-check: if the interposer ever silently breaks, fail loudly instead of false-passing
  assert.ok(logged.length > 0, 'interposer should have captured at least one fs write');

  // Every write the child attempted must resolve inside the sandbox HOME.
  // Compare against both the raw and realpath'd sandbox (macOS /var → /private/var).
  const allowedRoots = [...new Set([home, safeRealpath(home)])];
  const escapes = logged.filter(
    (p) => !allowedRoots.some((root) => p === root || p.startsWith(root + path.sep))
  );
  assert.deepEqual(escapes, [], 'orchestrator attempted writes outside provided HOME: ' + escapes.join(', '));
});

test('orchestrator handler outputs all aggregate (session-start contribution present)', () => {
  const home = mkHome();
  const r = runOrch({ home });
  assert.equal(r.exitCode, 0);
  assert.ok(r.parsed);
  // session-start always writes active-session.json — verify side effect happened
  const activeFile = path.join(home, '.claude', 'commander', 'sessions', 'active-session.json');
  assert.ok(fs.existsSync(activeFile), 'session-start handler should have created active-session.json');
});
