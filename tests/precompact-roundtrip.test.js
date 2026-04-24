'use strict';
// CC-417: PreCompact → post-compact-recovery round-trip test.
//
// Verifies the contract between pre-compact.js (gates compaction on
// session.status) and post-compact-recovery.js (emits orientation message
// after compaction). All filesystem state lives under a hermetic temp HOME
// so the real ~/.claude/ is never touched.
//
// Run: node --test tests/precompact-roundtrip.test.js

const assert = require('node:assert');
const { test, after, before } = require('node:test');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const REPO_ROOT = join(__dirname, '..');
const PRE_COMPACT = join(REPO_ROOT, 'commander', 'cowork-plugin', 'hooks', 'pre-compact.js');
const POST_COMPACT = join(REPO_ROOT, 'commander', 'cowork-plugin', 'hooks', 'post-compact-recovery.js');

let tempHome;
let sessionsDir;
let activeSessionFile;

function makeEnv(extra = {}) {
  // Strip any inherited HOME mapping so the hook only sees tempHome.
  const env = { ...process.env, HOME: tempHome, ...extra };
  return env;
}

function runHook(scriptPath, stdinJson = '') {
  return spawnSync('node', [scriptPath], {
    input: stdinJson,
    env: makeEnv(),
    encoding: 'utf8',
    timeout: 10_000,
  });
}

function writeSessionState(state) {
  writeFileSync(activeSessionFile, JSON.stringify(state), 'utf8');
}

before(() => {
  tempHome = mkdtempSync(join(tmpdir(), 'ccc-precompact-'));
  sessionsDir = join(tempHome, '.claude', 'commander', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  activeSessionFile = join(sessionsDir, 'active-session.json');
});

after(() => {
  try {
    rmSync(tempHome, { recursive: true, force: true });
  } catch {
    // best effort
  }
});

test('pre-compact allows compaction when session is idle', () => {
  writeSessionState({ status: 'idle', startedAt: new Date().toISOString(), foo: 'bar' });

  const res = runHook(PRE_COMPACT);
  assert.strictEqual(res.status, 0, `pre-compact should exit 0, got ${res.status}: ${res.stderr}`);

  const out = JSON.parse(res.stdout.trim());
  assert.strictEqual(out.continue, true, 'idle session must allow compaction');
  assert.strictEqual(out.stopReason, undefined, 'no stopReason when allowed');
});

test('pre-compact allows compaction when no active-session.json exists', () => {
  // Move the file aside so the hook hits the missing-file branch.
  const stash = join(sessionsDir, 'stash.json');
  if (existsSync(activeSessionFile)) {
    writeFileSync(stash, readFileSync(activeSessionFile));
    rmSync(activeSessionFile);
  }

  const res = runHook(PRE_COMPACT);
  assert.strictEqual(res.status, 0);
  const out = JSON.parse(res.stdout.trim());
  assert.strictEqual(out.continue, true, 'missing session file must fail open');

  // Restore for next tests
  if (existsSync(stash)) {
    writeFileSync(activeSessionFile, readFileSync(stash));
    rmSync(stash);
  }
});

test('pre-compact blocks compaction when session is executing', () => {
  writeSessionState({ status: 'executing', startedAt: new Date().toISOString(), foo: 'bar' });

  const res = runHook(PRE_COMPACT);
  assert.strictEqual(res.status, 0, `pre-compact should exit 0 even when blocking, got ${res.status}: ${res.stderr}`);

  const out = JSON.parse(res.stdout.trim());
  assert.strictEqual(out.continue, false, 'executing session must block');
  assert.ok(typeof out.stopReason === 'string' && out.stopReason.length > 0, 'stopReason must explain block');
  assert.match(out.stopReason, /executing/, 'stopReason should mention the blocking state');
});

test('pre-compact blocks compaction when session is writing or committing', () => {
  for (const status of ['writing', 'committing']) {
    writeSessionState({ status, startedAt: new Date().toISOString() });
    const res = runHook(PRE_COMPACT);
    const out = JSON.parse(res.stdout.trim());
    assert.strictEqual(out.continue, false, `status=${status} must block`);
    assert.match(out.stopReason, new RegExp(status));
  }
});

test('round-trip: idle pre-compact → simulated compact → post-compact recovery preserves state', () => {
  // 1. Set up an idle session with a custom payload.
  const initialState = {
    status: 'idle',
    startedAt: '2026-04-24T12:00:00.000Z',
    foo: 'bar',
    tier: 'free',
    estimatedCost: 1.23,
    activeMode: 'normal',
  };
  writeSessionState(initialState);

  // 2. pre-compact should allow.
  const preRes = runHook(PRE_COMPACT);
  assert.strictEqual(JSON.parse(preRes.stdout.trim()).continue, true);

  // 3. Simulate a compaction: the conversation history gets compressed by the
  //    platform but session state file is preserved on disk. Strip volatile
  //    in-memory transcript references but keep the persisted shape.
  const persisted = JSON.parse(readFileSync(activeSessionFile, 'utf8'));
  delete persisted.transcript; // wasn't there anyway, simulate volatile drop
  writeSessionState(persisted);

  // 4. post-compact-recovery reads SessionStart input on stdin (JSON).
  const stdinPayload = JSON.stringify({ source: 'compact', session_id: 'test-session' });
  const postRes = runHook(POST_COMPACT, stdinPayload);
  assert.strictEqual(postRes.status, 0, `post-compact should exit 0, got ${postRes.status}: ${postRes.stderr}`);

  const postOut = JSON.parse(postRes.stdout.trim());
  assert.strictEqual(postOut.continue, true, 'post-compact must continue');
  assert.ok(typeof postOut.status === 'string', 'post-compact emits a status string');
  assert.match(postOut.status, /CCC: Context compacted/, 'orientation message present');
  assert.match(postOut.status, /tier: free/, 'tier propagated from session file');
  assert.match(postOut.status, /cost so far: \$1\.23/, 'cost propagated');
  assert.match(postOut.status, /mode: normal/, 'activeMode propagated');

  // 5. Assert session state survived on disk.
  const finalState = JSON.parse(readFileSync(activeSessionFile, 'utf8'));
  assert.strictEqual(finalState.status, 'idle', 'status preserved across round-trip');
  assert.strictEqual(finalState.foo, 'bar', 'custom field preserved across round-trip');
  assert.strictEqual(finalState.tier, 'free');
});

test('post-compact-recovery degrades gracefully when session file is missing', () => {
  if (existsSync(activeSessionFile)) rmSync(activeSessionFile);

  const stdinPayload = JSON.stringify({ source: 'startup' });
  const res = runHook(POST_COMPACT, stdinPayload);
  assert.strictEqual(res.status, 0);

  const out = JSON.parse(res.stdout.trim());
  assert.strictEqual(out.continue, true, 'must continue when no session file');
  assert.match(out.status, /session state unavailable/, 'reports unavailable cleanly');
});

test('post-compact-recovery handles empty stdin without crashing', () => {
  // No stdin payload — hook should fail open with continue:true
  const res = runHook(POST_COMPACT, '');
  assert.strictEqual(res.status, 0);
  const out = JSON.parse(res.stdout.trim());
  assert.strictEqual(out.continue, true);
});
