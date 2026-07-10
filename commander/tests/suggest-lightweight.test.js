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
  'suggest-lightweight.js'
);

// Per-test tmp dir (process-unique)
const TMP_BASE = path.join(os.tmpdir(), 'ccc-suggest-lightweight-test-' + process.pid);

function tmpHome(suffix = '') {
  return path.join(TMP_BASE, suffix || 'default');
}

function stateFile(home) {
  return path.join(home, '.claude', 'commander', 'project-state.json');
}

function lastSuggestionFile(home) {
  return path.join(home, '.claude', 'commander', 'last-suggestion.json');
}

function writeState(home, state) {
  const dir = path.join(home, '.claude', 'commander');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(stateFile(home), JSON.stringify(state, null, 2));
}

function writeLastSuggestion(home, data) {
  const dir = path.join(home, '.claude', 'commander');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(lastSuggestionFile(home), JSON.stringify(data, null, 2));
}

function runHook(home, envOverrides = {}) {
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    CCC_SUGGEST_MODE: undefined,         // clear to test defaults cleanly
    CCC_SUGGEST_DISABLE: undefined,
    CCC_SUGGEST_MIN_CONFIDENCE: undefined,
    ...envOverrides,
  };

  // Remove undefined keys (env must be string-only)
  for (const k of Object.keys(env)) {
    if (env[k] === undefined) delete env[k];
  }

  const result = spawnSync('node', [HOOK_PATH], {
    encoding: 'utf-8',
    timeout: 4000,
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

// High-confidence state: branch ahead, tests green → confidence 0.9 → /ccc-ship
const HIGH_CONFIDENCE_STATE = {
  timestamp: new Date().toISOString(),
  branch: 'feature/cool-thing',
  aheadMain: 3,
  behindMain: 0,
  testsStatus: 'green',
  openTodos: 0,
  securityAlerts: 0,
  lintErrors: 0,
  ciStatus: 'passing',
  blockers: [],
};

// Low-confidence state: everything calm, no actionable signals
const LOW_CONFIDENCE_STATE = {
  timestamp: new Date().toISOString(),
  branch: 'main',
  aheadMain: 0,
  behindMain: 0,
  testsStatus: 'unknown',
  openTodos: 0,
  securityAlerts: 0,
  lintErrors: 0,
  ciStatus: 'unknown',
  blockers: [],
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

before(() => {
  fs.mkdirSync(TMP_BASE, { recursive: true });
});

after(() => {
  try {
    fs.rmSync(TMP_BASE, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('suggest-lightweight hook', () => {
  // 1. Default mode `smart` with high-confidence state → renders suggestions
  it('smart mode: high-confidence state renders 💡 Try next:', () => {
    const home = tmpHome('t1');
    writeState(home, HIGH_CONFIDENCE_STATE);

    const result = runHook(home, { CCC_SUGGEST_MODE: 'smart' });

    assert.equal(result.exitCode, 0, 'hook should exit 0');
    assert.ok(result.parsed, 'stdout should be valid JSON');
    assert.equal(result.parsed.continue, true);
    assert.equal(result.parsed.suppressOutput, false, 'should NOT suppress on high confidence');
    assert.ok(
      typeof result.parsed.systemMessage === 'string' &&
        result.parsed.systemMessage.startsWith('💡 Try next:'),
      `status should start with "💡 Try next:" — got: ${JSON.stringify(result.parsed.systemMessage)}`
    );
    // Should include /ccc-ship suggestion
    assert.ok(
      result.parsed.systemMessage.includes('/ccc-ship'),
      'should suggest /ccc-ship for branch-ahead+tests-green state'
    );
  });

  // 2. Default mode `smart` with low-confidence state → renders nothing
  it('smart mode: low-confidence state renders nothing (suppressOutput true)', () => {
    const home = tmpHome('t2');
    writeState(home, LOW_CONFIDENCE_STATE);

    const result = runHook(home, { CCC_SUGGEST_MODE: 'smart' });

    assert.equal(result.exitCode, 0);
    assert.ok(result.parsed);
    assert.equal(result.parsed.continue, true);
    assert.equal(result.parsed.suppressOutput, true, 'should suppress on low confidence');
  });

  // 3. Mode `always` renders when state exists
  it('always mode: renders even with low-confidence state (if suggestions exist)', () => {
    const home = tmpHome('t3');
    // Use a state that has AT LEAST one actionable signal so suggestions[] is non-empty
    writeState(home, {
      ...LOW_CONFIDENCE_STATE,
      aheadMain: 5,
      testsStatus: 'green',
    });

    const result = runHook(home, { CCC_SUGGEST_MODE: 'always' });

    assert.equal(result.exitCode, 0);
    assert.ok(result.parsed);
    assert.equal(result.parsed.continue, true);
    // always mode: suppressOutput depends on whether suggestions were generated
    // With aheadMain=5 + tests=green we get confidence=0.9 → suggestions → renders
    assert.equal(result.parsed.suppressOutput, false);
  });

  // 4. Mode `off` always silent
  it('off mode: always silent (suppressOutput true)', () => {
    const home = tmpHome('t4');
    writeState(home, HIGH_CONFIDENCE_STATE);

    const result = runHook(home, { CCC_SUGGEST_MODE: 'off' });

    assert.equal(result.exitCode, 0);
    assert.ok(result.parsed);
    assert.equal(result.parsed.continue, true);
    assert.equal(result.parsed.suppressOutput, true);
  });

  // 5. Mode `every-3`: renders on turn 3, 6, 9 — not on 1, 2, 4, 5
  it('every-3 mode: renders only on turn multiples of 3', () => {
    const home = tmpHome('t5');
    writeState(home, HIGH_CONFIDENCE_STATE);

    // Turn 1 — should NOT render (1 % 3 !== 0)
    const r1 = runHook(home, { CCC_SUGGEST_MODE: 'every-3' });
    assert.equal(r1.parsed.suppressOutput, true, 'turn 1 should suppress');

    // Turn 2 — should NOT render
    const r2 = runHook(home, { CCC_SUGGEST_MODE: 'every-3' });
    assert.equal(r2.parsed.suppressOutput, true, 'turn 2 should suppress');

    // Turn 3 — should render (3 % 3 === 0)
    const r3 = runHook(home, { CCC_SUGGEST_MODE: 'every-3' });
    assert.equal(r3.parsed.suppressOutput, false, 'turn 3 should render');
    assert.ok(r3.parsed.systemMessage && r3.parsed.systemMessage.startsWith('💡 Try next:'));
  });

  // 6. Legacy CCC_SUGGEST_DISABLE=1 → silent
  it('CCC_SUGGEST_DISABLE=1 legacy alias → always silent', () => {
    const home = tmpHome('t6');
    writeState(home, HIGH_CONFIDENCE_STATE);

    const result = runHook(home, { CCC_SUGGEST_DISABLE: '1' });

    assert.equal(result.exitCode, 0);
    assert.ok(result.parsed);
    assert.equal(result.parsed.continue, true);
    assert.equal(result.parsed.suppressOutput, true);
  });

  // 7. Idempotency: same hash within 60s → skip
  it('idempotency: re-run within 60s with same hash → suppressOutput true', () => {
    const home = tmpHome('t7');
    writeState(home, HIGH_CONFIDENCE_STATE);

    // First run — should render
    const r1 = runHook(home, { CCC_SUGGEST_MODE: 'always' });
    assert.equal(r1.parsed.suppressOutput, false, 'first run should render');

    // Second run immediately (same 60s window, same mtime) — idempotency kicks in
    const r2 = runHook(home, { CCC_SUGGEST_MODE: 'always' });
    assert.equal(r2.parsed.suppressOutput, true, 'second run in same window should suppress');
  });

  // 8. Missing project-state.json → graceful no-op
  it('missing project-state.json → graceful no-op, no crash', () => {
    const home = tmpHome('t8');
    // Ensure no state file exists
    fs.mkdirSync(path.join(home, '.claude', 'commander'), { recursive: true });

    const result = runHook(home, { CCC_SUGGEST_MODE: 'smart' });

    assert.equal(result.exitCode, 0, 'should exit 0 even without state file');
    assert.ok(result.parsed, 'should output valid JSON');
    assert.equal(result.parsed.continue, true);
    assert.equal(result.parsed.suppressOutput, true);
  });

  // 9. Hook completes within 2s timeout
  it('hook completes well within 2s hard timeout', () => {
    const home = tmpHome('t9');
    writeState(home, HIGH_CONFIDENCE_STATE);

    const start = Date.now();
    const result = runHook(home, { CCC_SUGGEST_MODE: 'smart' });
    const elapsed = Date.now() - start;

    assert.equal(result.exitCode, 0);
    assert.ok(elapsed < 2000, `hook took ${elapsed}ms — should be well under 2000ms`);
  });

  // 10. High threshold CCC_SUGGEST_MIN_CONFIDENCE=0.95 → narrows triggering
  it('CCC_SUGGEST_MIN_CONFIDENCE=0.95 narrows to only highest-confidence signals', () => {
    const home = tmpHome('t10');

    // State with confidence ~0.85 (branch behind main — threshold trigger at 0.85)
    writeState(home, {
      ...LOW_CONFIDENCE_STATE,
      behindMain: 2,
      aheadMain: 0,
    });

    const result = runHook(home, {
      CCC_SUGGEST_MODE: 'smart',
      CCC_SUGGEST_MIN_CONFIDENCE: '0.95',
    });

    // confidence would be 0.85 → below 0.95 threshold → suppress
    assert.equal(result.parsed.suppressOutput, true, 'should suppress when confidence < 0.95');

    // Now with high-confidence state (0.9) — still below 0.95
    const home2 = tmpHome('t10b');
    writeState(home2, HIGH_CONFIDENCE_STATE); // confidence = 0.9

    const result2 = runHook(home2, {
      CCC_SUGGEST_MODE: 'smart',
      CCC_SUGGEST_MIN_CONFIDENCE: '0.95',
    });

    assert.equal(result2.parsed.suppressOutput, true, 'confidence 0.9 < 0.95 threshold → suppress');
  });

  // 11a. Level 1 (passive): logs the suggestion but renders nothing
  it('recommendedLevel 1: computes suggestion but stays silent (log-only)', () => {
    const home = tmpHome('t11a');
    writeState(home, { ...HIGH_CONFIDENCE_STATE, recommendedLevel: 1 });

    const result = runHook(home, { CCC_SUGGEST_MODE: 'smart' });

    assert.equal(result.exitCode, 0);
    assert.equal(result.parsed.suppressOutput, true, 'L1 must render nothing');
    // ...but the suggestion must be recorded for /ccc-suggest to pick up
    const last = JSON.parse(fs.readFileSync(lastSuggestionFile(home), 'utf8'));
    assert.equal(last.rendered, false);
    assert.ok(Array.isArray(last.suggestions) && last.suggestions.length > 0,
      'L1 should still record suggestions');
  });

  // 11b. Level 3 (assertive): boxed recommendation card
  it('recommendedLevel 3: renders the boxed 🎯 card with confidence + why', () => {
    const home = tmpHome('t11b');
    writeState(home, { ...HIGH_CONFIDENCE_STATE, recommendedLevel: 3 });

    const result = runHook(home, { CCC_SUGGEST_MODE: 'smart' });

    assert.equal(result.exitCode, 0);
    assert.equal(result.parsed.suppressOutput, false, 'L3 must render');
    const msg = result.parsed.systemMessage;
    assert.ok(msg.includes('CC Commander Suggests'), `expected boxed card header, got: ${JSON.stringify(msg)}`);
    assert.ok(msg.includes('confidence'), 'card must state confidence');
    assert.ok(msg.includes('Why:'), 'card must state the reasoning');
  });

  // 11. Output format: exactly matches expected pattern
  it('output format: matches 💡 Try next:\\n  /skill — reason pattern', () => {
    const home = tmpHome('t11');
    writeState(home, HIGH_CONFIDENCE_STATE);

    const result = runHook(home, { CCC_SUGGEST_MODE: 'smart' });

    assert.equal(result.parsed.suppressOutput, false);
    const status = result.parsed.systemMessage;

    // Must start with the header
    assert.ok(status.startsWith('💡 Try next:'), `header check failed: ${JSON.stringify(status)}`);

    // Each subsequent line must start with two spaces + /skill — reason
    const lines = status.split('\n').filter(Boolean);
    assert.ok(lines.length >= 2, 'should have header + at least 1 suggestion');

    for (const line of lines.slice(1)) {
      assert.ok(
        /^  \/\S+ — .+/.test(line),
        `line does not match "  /skill — reason" format: ${JSON.stringify(line)}`
      );
    }
  });
});
