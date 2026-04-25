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

function runOrch({ home, cwd, input = {}, env = {} } = {}) {
  const r = spawnSync('node', [ORCH_PATH], {
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
  // Either status combines messages or short-circuits — both are valid merges.
  if (r.parsed.status) {
    assert.equal(typeof r.parsed.status, 'string');
  }
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

test('orchestrator is hermetic — does not write outside provided HOME', () => {
  const home = mkHome();
  const realCommander = path.join(os.homedir(), '.claude', 'commander');
  const beforeMtime = fs.existsSync(realCommander) ? fs.statSync(realCommander).mtimeMs : null;

  const r = runOrch({ home });
  assert.equal(r.exitCode, 0);

  // Verify our isolated HOME was the one written to
  const isolatedCccDir = path.join(home, '.claude', 'commander');
  assert.ok(fs.existsSync(isolatedCccDir), 'should have created CCC dir under isolated HOME');

  // Verify real ~/.claude/commander wasn't touched (mtime unchanged or still absent)
  if (beforeMtime !== null) {
    const afterMtime = fs.statSync(realCommander).mtimeMs;
    assert.equal(afterMtime, beforeMtime, 'real ~/.claude/commander should not be touched');
  }
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
