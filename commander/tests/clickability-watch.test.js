'use strict';

const { describe, it, before, after } = require('node:test');
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
  'clickability-watch.js'
);

const TMP_HOME = path.join(os.tmpdir(), 'ccc-clickability-test-' + process.pid);
const VIOLATIONS_FILE = path.join(TMP_HOME, '.claude', 'commander', 'clickability-violations.jsonl');

function runHook(envOverrides = {}) {
  const env = {
    ...process.env,
    HOME: TMP_HOME,
    USERPROFILE: TMP_HOME,
    ...envOverrides,
  };
  return spawnSync(process.execPath, [HOOK_PATH], {
    env,
    timeout: 3000,
    encoding: 'utf8',
  });
}

function readViolations() {
  try {
    const raw = fs.readFileSync(VIOLATIONS_FILE, 'utf8');
    return raw.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

function clearViolations() {
  try { fs.unlinkSync(VIOLATIONS_FILE); } catch { /* ok */ }
}

before(() => {
  fs.mkdirSync(path.join(TMP_HOME, '.claude', 'commander'), { recursive: true });
});

after(() => {
  try { fs.rmSync(TMP_HOME, { recursive: true, force: true }); } catch { /* ok */ }
});

describe('clickability-watch hook', () => {
  it('detects "Reply A" pattern and logs violation', () => {
    clearViolations();
    const result = runHook({
      CLAUDE_LAST_ASSISTANT_MESSAGE: 'You can proceed. Reply A for yes or Reply B for no.',
      CLAUDE_SESSION_ID: 'test-session-1',
    });

    assert.strictEqual(result.status, 0, `Hook exited with non-zero status: ${result.stderr}`);

    const out = JSON.parse(result.stdout.trim());
    assert.strictEqual(out.continue, true);

    const violations = readViolations();
    assert.ok(violations.length >= 1, 'Expected at least one violation logged');
    assert.ok(violations[0].pattern, 'Violation should have a pattern field');
    assert.ok(violations[0].snippet, 'Violation should have a snippet field');
    assert.ok(violations[0].ts, 'Violation should have a timestamp');
    assert.strictEqual(violations[0].session, 'test-session-1');
  });

  it('detects "Type 1/2/3" pattern and logs violation', () => {
    clearViolations();
    const result = runHook({
      CLAUDE_LAST_ASSISTANT_MESSAGE: 'Choose your option. Type 1 to proceed, Type 2 to cancel.',
      CLAUDE_SESSION_ID: 'test-session-2',
    });

    assert.strictEqual(result.status, 0);

    const violations = readViolations();
    assert.ok(violations.length >= 1, 'Expected at least one violation for Type 1/2/3 pattern');
    assert.match(violations[0].pattern, /Type 1\/2\/3/i);
  });

  it('does NOT log violation when AskUserQuestion is present in the same message', () => {
    clearViolations();
    const result = runHook({
      CLAUDE_LAST_ASSISTANT_MESSAGE:
        'AskUserQuestion was called with options A and B. Reply A for yes.',
      CLAUDE_SESSION_ID: 'test-session-3',
    });

    assert.strictEqual(result.status, 0);

    const violations = readViolations();
    assert.strictEqual(violations.length, 0, 'No violation should be logged when AskUserQuestion is present');
  });

  it('is silent and does not log when CCC_CLICKABILITY_WATCH_DISABLE=1', () => {
    clearViolations();
    const result = runHook({
      CLAUDE_LAST_ASSISTANT_MESSAGE: 'Reply A or Reply B to choose.',
      CCC_CLICKABILITY_WATCH_DISABLE: '1',
    });

    assert.strictEqual(result.status, 0);

    const violations = readViolations();
    assert.strictEqual(violations.length, 0, 'No violations should be logged when hook is disabled');
  });

  it('gracefully no-ops when no message is available', () => {
    clearViolations();
    // No CLAUDE_LAST_ASSISTANT_MESSAGE, no session JSONL in TMP_HOME
    const result = runHook({
      CLAUDE_SESSION_ID: 'test-session-5',
    });

    assert.strictEqual(result.status, 0, `Hook crashed: ${result.stderr}`);

    const out = JSON.parse(result.stdout.trim());
    assert.strictEqual(out.continue, true);

    const violations = readViolations();
    assert.strictEqual(violations.length, 0, 'No violations logged when no message available');
  });
});
