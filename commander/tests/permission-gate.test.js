// ============================================================================
// CC Commander — permission-gate.js Test Suite
// ============================================================================
// Tests the PermissionRequest hook for Codex Desktop autofix gate.
// Run: node --test commander/tests/permission-gate.test.js
// ============================================================================

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK_PATH = path.join(
  __dirname, '..', 'cowork-plugin', 'hooks', 'permission-gate.js'
);

/**
 * Run the permission-gate hook with a given JSON payload via stdin.
 * Returns { exitCode, parsed, stdout, stderr }
 */
function runGate(payload, envOverrides = {}) {
  const input = payload === null ? '' : JSON.stringify(payload);
  const env = {
    ...process.env,
    HOME: process.env.HOME || '/tmp',
    ...envOverrides,
  };

  const result = spawnSync('node', [HOOK_PATH], {
    input,
    encoding: 'utf-8',
    timeout: 8000,
    env,
  });

  const stdout = (result.stdout || '').trim();
  let parsed = null;
  try { parsed = JSON.parse(stdout); } catch { /* non-JSON */ }

  return {
    exitCode: result.status ?? 0,
    stdout,
    stderr: result.stderr || '',
    parsed,
  };
}

// ============================================================================
// Case 1: Approve normal read-only tool call (Read)
// ============================================================================
describe('permission-gate: approve normal read-only operations', () => {
  it('auto-approves Read tool (continue: true, exit 0)', () => {
    const r = runGate({
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/foo.txt' },
      session_id: 'test-session-001',
    });
    assert.equal(r.exitCode, 0, `Expected exit 0, got ${r.exitCode}. stderr: ${r.stderr}`);
    assert.ok(r.parsed, 'Should output valid JSON');
    assert.equal(r.parsed.continue, true, 'Should approve read-only tool');
  });

  it('auto-approves Glob tool', () => {
    const r = runGate({
      tool_name: 'Glob',
      tool_input: { pattern: '**/*.js' },
      session_id: 'test-session-002',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('auto-approves Grep tool', () => {
    const r = runGate({
      tool_name: 'Grep',
      tool_input: { pattern: 'TODO', path: '/tmp' },
      session_id: 'test-session-003',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('auto-approves WebSearch tool', () => {
    const r = runGate({
      tool_name: 'WebSearch',
      tool_input: { query: 'codex desktop api' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ============================================================================
// Case 2: Reject /ccc-review autofix write without explicit flag
// ============================================================================
describe('permission-gate: reject autofix write without CCC_AUTOFIX_APPROVED', () => {
  it('blocks Write tool during /ccc-review autofix phase (exit 1)', () => {
    const r = runGate(
      {
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/foo.js', content: 'fixed' },
        session_id: 'test-session-004',
        context: { skill: '/ccc-review', phase: 'autofix' },
      },
      { CCC_AUTOFIX_APPROVED: '' }  // unset the flag
    );
    assert.equal(r.exitCode, 1, `Expected exit 1 for autofix block, got ${r.exitCode}`);
    assert.ok(r.parsed, 'Should output valid JSON');
    assert.equal(r.parsed.continue, false, 'Should reject autofix write');
    assert.ok(
      r.parsed.stopReason?.includes('autofix'),
      `stopReason should mention autofix. Got: ${r.parsed.stopReason}`
    );
  });

  it('blocks Edit tool during /ccc-review autofix phase', () => {
    const r = runGate(
      {
        tool_name: 'Edit',
        tool_input: { file_path: '/tmp/bar.js', old_string: 'x', new_string: 'y' },
        context: { skill: '/ccc-review', phase: 'autofix' },
      },
      { CCC_AUTOFIX_APPROVED: '' }
    );
    assert.equal(r.exitCode, 1);
    assert.equal(r.parsed?.continue, false);
  });

  it('approves Write tool during /ccc-review autofix when CCC_AUTOFIX_APPROVED=1', () => {
    const r = runGate(
      {
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/foo.js', content: 'fixed' },
        context: { skill: '/ccc-review', phase: 'autofix' },
      },
      { CCC_AUTOFIX_APPROVED: '1' }
    );
    assert.equal(r.exitCode, 0, 'Should approve when flag is set');
    assert.equal(r.parsed?.continue, true);
  });

  it('approves Write tool outside /ccc-review context (no skill context)', () => {
    const r = runGate(
      {
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/foo.js', content: 'new content' },
        context: { skill: '/ccc-build', phase: 'scaffold' },
      },
      { CCC_AUTOFIX_APPROVED: '' }
    );
    // Write outside /ccc-review should pass through
    assert.equal(r.exitCode, 0, 'Non-autofix Write should be approved');
    assert.equal(r.parsed?.continue, true);
  });
});

// ============================================================================
// Case 3: Malformed payload → fail open
// ============================================================================
describe('permission-gate: malformed payload → fail open', () => {
  it('returns continue:true on non-JSON stdin', () => {
    const result = spawnSync('node', [HOOK_PATH], {
      input: 'this is not json!!!',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0, 'Malformed input should not crash (exit 0)');
    const parsed = JSON.parse((result.stdout || '').trim());
    assert.equal(parsed.continue, true, 'Should fail open on malformed JSON');
  });

  it('returns continue:true on partial/truncated JSON', () => {
    const result = spawnSync('node', [HOOK_PATH], {
      input: '{"tool_name": "Write", "tool_inp',  // truncated
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse((result.stdout || '').trim());
    assert.equal(parsed.continue, true);
  });
});

// ============================================================================
// Case 4: Missing payload (empty stdin) → fail open
// ============================================================================
describe('permission-gate: missing payload → fail open', () => {
  it('returns continue:true on empty stdin', () => {
    const result = spawnSync('node', [HOOK_PATH], {
      input: '',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0, 'Empty input should not crash');
    const parsed = JSON.parse((result.stdout || '').trim());
    assert.equal(parsed.continue, true, 'Should fail open on empty input');
  });

  it('returns continue:true on null-valued object', () => {
    const r = runGate(null);
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ============================================================================
// Case 5: Dangerous operation → always reject
// ============================================================================
describe('permission-gate: dangerous operations → always reject', () => {
  it('blocks Bash rm -rf command (exit 1)', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /tmp/project' },
      session_id: 'test-session-dangerous-001',
    });
    assert.equal(r.exitCode, 1, `Expected exit 1 for dangerous command, got ${r.exitCode}`);
    assert.equal(r.parsed?.continue, false);
    assert.ok(
      r.parsed?.stopReason?.includes('dangerous') || r.parsed?.stopReason?.includes('Dangerous'),
      `stopReason should indicate danger. Got: ${r.parsed?.stopReason}`
    );
  });

  it('blocks git reset --hard', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'git reset --hard HEAD~3' },
    });
    assert.equal(r.exitCode, 1);
    assert.equal(r.parsed?.continue, false);
  });

  it('blocks git push --force', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'git push --force origin main' },
    });
    assert.equal(r.exitCode, 1);
    assert.equal(r.parsed?.continue, false);
  });

  it('approves safe Bash commands (ls, echo)', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'ls -la /tmp && echo hello' },
    });
    assert.equal(r.exitCode, 0, 'Safe bash should be approved');
    assert.equal(r.parsed?.continue, true);
  });

  it('approves npm test (not dangerous)', () => {
    const r = runGate({
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ============================================================================
// Case 6: Output always valid JSON
// ============================================================================
describe('permission-gate: always outputs valid JSON', () => {
  const payloads = [
    { tool_name: 'Read', tool_input: {} },
    { tool_name: 'Write', tool_input: {}, context: { skill: '/ccc-review', phase: 'autofix' } },
    { tool_name: 'Bash', tool_input: { command: 'rm -rf /tmp' } },
    {},
    { tool_name: '', tool_input: null },
  ];

  payloads.forEach((payload, i) => {
    it(`produces valid JSON for payload variant ${i + 1}`, () => {
      const r = runGate(payload, { CCC_AUTOFIX_APPROVED: '' });
      assert.ok(r.parsed !== null, `Payload ${i + 1} should produce parseable JSON. Got: ${r.stdout}`);
      assert.ok(
        typeof r.parsed.continue === 'boolean',
        `continue field must be boolean. Got: ${JSON.stringify(r.parsed)}`
      );
    });
  });
});
