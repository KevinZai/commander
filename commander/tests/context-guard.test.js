'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK_PATH = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'context-guard.js'
);

const TMP_HOME = path.join(os.tmpdir(), 'ccc-context-guard-test-' + process.pid);
const STATE_FILE = path.join(TMP_HOME, '.claude', 'commander', 'state.json');

function runHook(envOverrides = {}) {
  const env = {
    ...process.env,
    HOME: TMP_HOME,
    USERPROFILE: TMP_HOME,
    CLAUDE_SESSION_ID: 'test-session',
    ...envOverrides,
  };

  const result = spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify({}),
    encoding: 'utf-8',
    timeout: 6000,
    env,
  });

  let parsed = null;
  try {
    parsed = JSON.parse((result.stdout || '').trim());
  } catch {
    // non-JSON
  }

  return {
    exitCode: result.status ?? 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    parsed,
  };
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

before(() => {
  fs.mkdirSync(path.join(TMP_HOME, '.claude', 'commander'), { recursive: true });
  fs.mkdirSync(path.join(TMP_HOME, '.claude', 'sessions'), { recursive: true });
});

after(() => {
  fs.rmSync(TMP_HOME, { recursive: true, force: true });
});

beforeEach(() => {
  // Reset state between tests
  const stateDir = path.join(TMP_HOME, '.claude', 'commander');
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
  // Clean up any auto-save files
  const sessionsDir = path.join(TMP_HOME, '.claude', 'sessions');
  if (fs.existsSync(sessionsDir)) {
    for (const f of fs.readdirSync(sessionsDir)) {
      if (f.startsWith('auto-')) {
        fs.unlinkSync(path.join(sessionsDir, f));
      }
    }
  }
});

describe('context-guard.js — no-op cases', () => {
  it('no-ops when CC_CONTEXT_GUARD_DISABLE=1', () => {
    const r = runHook({ CC_CONTEXT_GUARD_DISABLE: '1', CLAUDE_CONTEXT_USED_PCT: '90' });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed, 'should output JSON');
    assert.equal(r.parsed.continue, true);
    assert.ok(!r.parsed.status, 'should not have status message when disabled');
  });

  it('no-ops when context env var is absent', () => {
    const r = runHook({
      CLAUDE_CONTEXT_USED_PCT: '',
      CLAUDE_CONTEXT_PERCENT: '',
    });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed);
    assert.equal(r.parsed.continue, true);
    assert.ok(!r.parsed.status, 'should not emit status when no context metric available');
  });

  it('no-ops at 50% usage (below all thresholds)', () => {
    const r = runHook({ CLAUDE_CONTEXT_USED_PCT: '50' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.ok(!r.parsed.status);
  });

  it('no-ops at 69% usage (just below 70% threshold)', () => {
    const r = runHook({ CLAUDE_CONTEXT_USED_PCT: '69' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed.continue, true);
    assert.ok(!r.parsed.status);
  });
});

describe('context-guard.js — threshold firing', () => {
  it('fires at 70% with nudge message', () => {
    const r = runHook({ CLAUDE_CONTEXT_USED_PCT: '70' });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed);
    assert.equal(r.parsed.continue, true);
    assert.ok(r.parsed.status, 'should emit status at 70%');
    assert.ok(r.parsed.status.includes('70%'), 'status should mention 70%');
    assert.ok(r.parsed.status.includes('/save-session'), 'should mention /save-session');
  });

  it('fires at 85% with strong warning', () => {
    const r = runHook({ CLAUDE_CONTEXT_USED_PCT: '85' });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed);
    assert.equal(r.parsed.continue, true);
    assert.ok(r.parsed.status, 'should emit status at 85%');
    assert.ok(r.parsed.status.includes('85%'), 'status should mention 85%');
    assert.ok(r.parsed.status.includes('/save-session'), 'should mention /save-session');
  });

  it('fires at 95% and writes auto-save file', () => {
    const r = runHook({ CLAUDE_CONTEXT_USED_PCT: '95' });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed);
    assert.equal(r.parsed.continue, true);
    assert.ok(r.parsed.status, 'should emit status at 95%');
    assert.ok(r.parsed.status.includes('95%'), 'status should mention 95%');

    // Verify auto-save file was created
    const sessionsDir = path.join(TMP_HOME, '.claude', 'sessions');
    const autoFiles = fs.readdirSync(sessionsDir).filter(f => f.startsWith('auto-'));
    assert.ok(autoFiles.length > 0, 'should write auto-save file at 95%');

    const saved = JSON.parse(fs.readFileSync(path.join(sessionsDir, autoFiles[0]), 'utf8'));
    assert.ok(saved.ts, 'auto-save should have timestamp');
    assert.ok(saved.contextUsedPct, 'auto-save should record context %');
    assert.ok(saved.note, 'auto-save should have note');
  });
});

describe('context-guard.js — idempotency', () => {
  it('does not double-fire at same threshold in one session', () => {
    // First run at 70% — should fire
    const r1 = runHook({ CLAUDE_CONTEXT_USED_PCT: '70', CLAUDE_SESSION_ID: 'idem-session' });
    assert.ok(r1.parsed.status, 'first run should fire');

    // Second run at 70% same session — should NOT fire
    const r2 = runHook({ CLAUDE_CONTEXT_USED_PCT: '70', CLAUDE_SESSION_ID: 'idem-session' });
    assert.ok(!r2.parsed.status, 'second run at same threshold should not fire again');
  });

  it('allows firing at higher threshold after 70% already fired', () => {
    // Fire 70%
    runHook({ CLAUDE_CONTEXT_USED_PCT: '70', CLAUDE_SESSION_ID: 'escalate-session' });

    // Now at 85% — should fire the 85% threshold (not repeat 70%)
    const r = runHook({ CLAUDE_CONTEXT_USED_PCT: '85', CLAUDE_SESSION_ID: 'escalate-session' });
    assert.ok(r.parsed.status, '85% should still fire even though 70% already fired');
    assert.ok(r.parsed.status.includes('85%'), 'status should reference 85%');
  });

  it('tracks state per session — different sessions fire independently', () => {
    // Fire in session A
    const r1 = runHook({ CLAUDE_CONTEXT_USED_PCT: '70', CLAUDE_SESSION_ID: 'session-a' });
    assert.ok(r1.parsed.status, 'session A should fire');

    // Session B at same level — should also fire
    const r2 = runHook({ CLAUDE_CONTEXT_USED_PCT: '70', CLAUDE_SESSION_ID: 'session-b' });
    assert.ok(r2.parsed.status, 'session B should fire independently');
  });
});

describe('context-guard.js — custom threshold', () => {
  it('fires at custom threshold (CC_CONTEXT_GUARD_THRESHOLD=60)', () => {
    const r = runHook({
      CLAUDE_CONTEXT_USED_PCT: '62',
      CC_CONTEXT_GUARD_THRESHOLD: '60',
    });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed);
    assert.equal(r.parsed.continue, true);
    assert.ok(r.parsed.status, 'should fire at custom 60% threshold');
    assert.ok(r.parsed.status.includes('60'), 'status should mention custom threshold');
  });

  it('does not fire below custom threshold', () => {
    const r = runHook({
      CLAUDE_CONTEXT_USED_PCT: '55',
      CC_CONTEXT_GUARD_THRESHOLD: '60',
    });
    assert.equal(r.exitCode, 0);
    assert.ok(!r.parsed.status, 'should not fire at 55% when threshold is 60%');
  });
});

describe('context-guard.js — state file', () => {
  it('writes valid JSON state file after firing', () => {
    runHook({ CLAUDE_CONTEXT_USED_PCT: '70', CLAUDE_SESSION_ID: 'state-test-session' });
    assert.ok(fs.existsSync(STATE_FILE), 'state file should be created');
    const state = readState();
    assert.ok(state['state-test-session'], 'session key should exist in state');
    assert.equal(state['state-test-session']['context_70'], true, 'context_70 should be marked fired');
  });

  it('always returns continue:true even on state write error', () => {
    // Pass invalid HOME to force a write error
    const r = runHook({
      CLAUDE_CONTEXT_USED_PCT: '85',
      HOME: '/dev/null/no-such-path',
      USERPROFILE: '/dev/null/no-such-path',
    });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed);
    assert.equal(r.parsed.continue, true);
  });
});
