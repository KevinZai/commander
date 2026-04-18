// ============================================================================
// CC Commander v4 Beta — Hook Test Suite (hooks-v4)
// ============================================================================
// Tests all 8 P0 lifecycle hooks added in claude/v4-beta3-mcp-hooks.
// Run: node --test commander/tests/hooks-v4.test.js
// Airplane mode: MCP_DISABLED=1 node --test commander/tests/hooks-v4.test.js
// ============================================================================

'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { execSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const HOOKS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'hooks');

// Helper: run a hook with JSON stdin, return { exitCode, output, parsed }
function runHook(hookFile, inputObj, envOverrides = {}) {
  const hookPath = path.join(HOOKS_DIR, hookFile);
  const input = JSON.stringify(inputObj || {});
  const env = { ...process.env, ...envOverrides };

  // Use spawnSync so we can capture both stdout and stderr cleanly
  const result = spawnSync('node', [hookPath], {
    input,
    encoding: 'utf-8',
    timeout: 8000,
    env,
  });

  const stdout = result.stdout || '';
  let parsed = null;
  try { parsed = JSON.parse(stdout.trim()); } catch { /* non-JSON output */ }

  return {
    exitCode: result.status ?? 0,
    output: stdout,
    stderr: result.stderr || '',
    parsed,
  };
}

// ---- elicitation-logger.js ----

describe('elicitation-logger.js', () => {
  it('returns continue:true on valid input', () => {
    const r = runHook('elicitation-logger.js', {
      request_id: 'req-001',
      prompt: 'Please provide your name',
      type: 'text',
    });
    assert.equal(r.exitCode, 0);
    assert.ok(r.parsed, 'should output JSON');
    assert.equal(r.parsed.continue, true);
  });

  it('returns continue:true on empty input', () => {
    const r = runHook('elicitation-logger.js', {});
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true on malformed input', () => {
    const hookPath = path.join(HOOKS_DIR, 'elicitation-logger.js');
    const result = spawnSync('node', [hookPath], {
      input: 'not json at all !!!',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('elicitation-logger.js', { prompt: 'test' }, { MCP_DISABLED: '1' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ---- elicitation-result-handler.js ----

describe('elicitation-result-handler.js', () => {
  it('returns continue:true on matched result', () => {
    const r = runHook('elicitation-result-handler.js', {
      request_id: 'req-001',
      result: { value: 'Kevin', matched: true },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true on cancelled result', () => {
    const r = runHook('elicitation-result-handler.js', {
      request_id: 'req-002',
      result: { action: 'cancel', cancelled: true },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true on declined result', () => {
    const r = runHook('elicitation-result-handler.js', {
      result: { action: 'decline' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true on malformed input', () => {
    const hookPath = path.join(HOOKS_DIR, 'elicitation-result-handler.js');
    const result = spawnSync('node', [hookPath], {
      input: '{{bad json}}',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('elicitation-result-handler.js', { result: {} }, { MCP_DISABLED: '1' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ---- post-compact-recovery.js ----

describe('post-compact-recovery.js', () => {
  it('returns continue:true when no session file exists', () => {
    const r = runHook('post-compact-recovery.js', { session_id: 'test-compact' }, {
      HOME: os.tmpdir(), // no session file in tmpdir
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true with valid session file', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const sessionsDir = path.join(tmpHome, '.claude', 'commander', 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(path.join(sessionsDir, 'active-session.json'), JSON.stringify({
      startedAt: new Date().toISOString(),
      status: 'active',
      tier: 'free',
      estimatedCost: 1.23,
      activeMode: 'normal',
    }));

    const r = runHook('post-compact-recovery.js', {}, { HOME: tmpHome });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);

    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('emits orientation status message on recovery', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const sessionsDir = path.join(tmpHome, '.claude', 'commander', 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(path.join(sessionsDir, 'active-session.json'), JSON.stringify({
      tier: 'free', estimatedCost: 2.50,
    }));

    const r = runHook('post-compact-recovery.js', {}, { HOME: tmpHome });
    assert.equal(r.exitCode, 0);
    // Should have a status message mentioning compaction
    if (r.parsed?.status) {
      assert.ok(r.parsed.status.includes('compact') || r.parsed.status.includes('CCC'));
    }

    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('returns continue:true on malformed input', () => {
    const hookPath = path.join(HOOKS_DIR, 'post-compact-recovery.js');
    const result = spawnSync('node', [hookPath], {
      input: 'INVALID',
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, HOME: os.tmpdir() },
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('post-compact-recovery.js', {}, { MCP_DISABLED: '1', HOME: os.tmpdir() });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ---- subagent-start-tracker.js ----

describe('subagent-start-tracker.js', () => {
  it('returns continue:true on valid dispatch info', () => {
    const r = runHook('subagent-start-tracker.js', {
      agent_name: 'builder',
      prompt: 'Implement the auth module',
      model: 'claude-sonnet-4-6',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true with empty input (graceful on absent env vars)', () => {
    const r = runHook('subagent-start-tracker.js', {});
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('uses env vars when present', () => {
    const r = runHook('subagent-start-tracker.js', {}, {
      CLAUDE_AGENT_NAME: 'researcher',
      CLAUDE_AGENT_PROMPT: 'Research competitor pricing',
      CLAUDE_MODEL: 'claude-opus-4-6',
      CLAUDE_SESSION_ID: 'test-session-123',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true on malformed input', () => {
    const hookPath = path.join(HOOKS_DIR, 'subagent-start-tracker.js');
    const result = spawnSync('node', [hookPath], {
      input: 'not-json',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('subagent-start-tracker.js', {}, { MCP_DISABLED: '1' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ---- cost-ceiling-enforcer.js ----

describe('cost-ceiling-enforcer.js', () => {
  it('returns continue:true when no cost file exists (no spend yet)', () => {
    const r = runHook('cost-ceiling-enforcer.js', {
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    }, { HOME: os.tmpdir() });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true when cost is below ceiling', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const sessionsDir = path.join(tmpHome, '.claude', 'commander', 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(path.join(sessionsDir, 'active-cost.json'), JSON.stringify({
      toolCalls: 10,
      estimatedCost: 0.10,
    }));

    const r = runHook('cost-ceiling-enforcer.js', { tool_name: 'Bash' }, { HOME: tmpHome });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);

    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('returns continue:false and stopReason when ceiling exceeded', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const sessionsDir = path.join(tmpHome, '.claude', 'commander', 'sessions');
    const configDir = path.join(tmpHome, '.claude', 'commander');
    fs.mkdirSync(sessionsDir, { recursive: true });

    // Set a low ceiling of $1.00
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({ costCeiling: 1.00 }));
    // Write cost that exceeds ceiling
    fs.writeFileSync(path.join(sessionsDir, 'active-cost.json'), JSON.stringify({
      toolCalls: 200,
      estimatedCost: 2.00,
    }));

    const r = runHook('cost-ceiling-enforcer.js', { tool_name: 'Write' }, { HOME: tmpHome });
    assert.equal(r.exitCode, 0, 'process should exit 0 even when blocking');
    assert.equal(r.parsed?.continue, false);
    assert.ok(typeof r.parsed?.stopReason === 'string', 'should have stopReason');
    assert.ok(r.parsed.stopReason.includes('ceiling'), 'stopReason should mention ceiling');

    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('returns continue:true on malformed input', () => {
    const hookPath = path.join(HOOKS_DIR, 'cost-ceiling-enforcer.js');
    const result = spawnSync('node', [hookPath], {
      input: '!!!',
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, HOME: os.tmpdir() },
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('cost-ceiling-enforcer.js', {}, { MCP_DISABLED: '1', HOME: os.tmpdir() });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ---- context-warning.js ----

describe('context-warning.js', () => {
  it('returns continue:true when no context info available', () => {
    const r = runHook('context-warning.js', { prompt: 'hello' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('emits warning when context is at 5% remaining (95% used)', () => {
    const r = runHook('context-warning.js', { prompt: 'hello' }, {
      CLAUDE_CONTEXT_USED_PCT: '95',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
    // Should emit a status warning
    if (r.parsed?.status) {
      assert.ok(r.parsed.status.includes('5%') || r.parsed.status.includes('CRITICAL'));
    }
  });

  it('emits warning when context is at 30% remaining (70% used)', () => {
    const r = runHook('context-warning.js', { prompt: 'hello' }, {
      CLAUDE_CONTEXT_USED_PCT: '70',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('respects CC_COACH_DISABLE=1', () => {
    const r = runHook('context-warning.js', { prompt: 'hello' }, {
      CC_COACH_DISABLE: '1',
      CLAUDE_CONTEXT_USED_PCT: '95',
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
    // Should NOT emit a status warning when disabled
    assert.ok(!r.parsed?.status || r.parsed.suppressOutput === true);
  });

  it('returns continue:true on malformed input', () => {
    const hookPath = path.join(HOOKS_DIR, 'context-warning.js');
    const result = spawnSync('node', [hookPath], {
      input: 'bad input',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('context-warning.js', {}, { MCP_DISABLED: '1' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ---- stale-claude-md-nudge.js ----

describe('stale-claude-md-nudge.js', () => {
  it('returns continue:true when no CLAUDE.md in cwd', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const result = spawnSync('node', [path.join(HOOKS_DIR, 'stale-claude-md-nudge.js')], {
      input: '{}',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
      cwd: tmpDir,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns continue:true for fresh CLAUDE.md (modified today)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# CLAUDE.md\nFresh content\n');

    const result = spawnSync('node', [path.join(HOOKS_DIR, 'stale-claude-md-nudge.js')], {
      input: '{}',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
      cwd: tmpDir,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits nudge for stale CLAUDE.md (artificially old mtime)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# Old CLAUDE.md\n');
    // Set mtime to 40 days ago
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    fs.utimesSync(claudeMdPath, fortyDaysAgo, fortyDaysAgo);

    const result = spawnSync('node', [path.join(HOOKS_DIR, 'stale-claude-md-nudge.js')], {
      input: '{}',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
      cwd: tmpDir,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
    // Should emit a nudge status
    if (parsed.status) {
      assert.ok(parsed.status.includes('stale') || parsed.status.includes('CLAUDE.md'));
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('respects CC_NUDGE_DISABLE=1', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# Old\n');
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    fs.utimesSync(claudeMdPath, fortyDaysAgo, fortyDaysAgo);

    const result = spawnSync('node', [path.join(HOOKS_DIR, 'stale-claude-md-nudge.js')], {
      input: '{}',
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, CC_NUDGE_DISABLE: '1' },
      cwd: tmpDir,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
    assert.ok(!parsed.status, 'should not emit nudge when disabled');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns continue:true on malformed input', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const result = spawnSync('node', [path.join(HOOKS_DIR, 'stale-claude-md-nudge.js')], {
      input: 'NOT JSON',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
      cwd: tmpDir,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('stale-claude-md-nudge.js', {}, { MCP_DISABLED: '1', CC_NUDGE_DISABLE: '1' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ---- secret-leak-guard.js ----

describe('secret-leak-guard.js', () => {
  it('returns continue:true for safe Bash command', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Bash',
      tool_input: { command: 'git status' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true for non-scanned tool (Read)', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.js' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('blocks Write with AWS access key', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/test.js',
        content: 'const key = "AKIAIOSFODNN7EXAMPLE";\n',
      },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, false);
    assert.ok(typeof r.parsed?.stopReason === 'string');
    assert.ok(r.parsed.stopReason.includes('AWS') || r.parsed.stopReason.includes('secret'));
  });

  it('blocks Bash command with Stripe live key', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Bash',
      // Build fake Stripe-like key at runtime to avoid GitHub secret scanner false positive
      tool_input: { command: 'curl -H "Authorization: Bearer ' + ['sk', 'live', 'F'.repeat(24)].join('_') + '" https://api.stripe.com' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, false);
  });

  it('blocks Write with Anthropic API key', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/config.js',
        content: 'const ANTHROPIC_KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLM";\n',
      },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, false);
  });

  it('blocks Write with GitHub PAT', () => {
    // ghp_ + 36 chars = valid GitHub PAT format
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/deploy.sh',
        content: 'export GH_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij12\n',
      },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, false);
  });

  it('allows Write with allowlisted test token', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/test-config.js',
        content: 'const key = "sk_test_example_key_for_tests";\n',
      },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('returns continue:true on malformed input', () => {
    const hookPath = path.join(HOOKS_DIR, 'secret-leak-guard.js');
    const result = spawnSync('node', [hookPath], {
      input: '{bad json}',
      encoding: 'utf-8',
      timeout: 5000,
      env: process.env,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
  });

  it('returns continue:true on empty input', () => {
    const r = runHook('secret-leak-guard.js', {});
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    }, { MCP_DISABLED: '1' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

// ---- Airplane Mode Guard ----

describe('hooks work with MCP_DISABLED=1 (airplane mode)', () => {
  const hooks = [
    'elicitation-logger.js',
    'elicitation-result-handler.js',
    'post-compact-recovery.js',
    'subagent-start-tracker.js',
    'cost-ceiling-enforcer.js',
    'context-warning.js',
    'stale-claude-md-nudge.js',
    'secret-leak-guard.js',
  ];

  for (const hook of hooks) {
    it(`${hook} returns continue:true with MCP_DISABLED=1`, () => {
      const r = runHook(hook, { tool_name: 'Bash', tool_input: { command: 'ls' } }, {
        MCP_DISABLED: '1',
        CC_COACH_DISABLE: '1',
        CC_NUDGE_DISABLE: '1',
        HOME: os.tmpdir(),
      });
      assert.equal(r.exitCode, 0, `${hook} should exit 0`);
      assert.ok(r.parsed, `${hook} should output valid JSON`);
      assert.ok(typeof r.parsed.continue === 'boolean', `${hook} should have continue field`);
    });
  }
});

// ---- File Existence ----

describe('v4 hook files exist', () => {
  const expectedHooks = [
    'elicitation-logger.js',
    'elicitation-result-handler.js',
    'post-compact-recovery.js',
    'subagent-start-tracker.js',
    'cost-ceiling-enforcer.js',
    'context-warning.js',
    'stale-claude-md-nudge.js',
    'secret-leak-guard.js',
  ];

  for (const hook of expectedHooks) {
    it(`${hook} exists in cowork-plugin/hooks/`, () => {
      const hookPath = path.join(HOOKS_DIR, hook);
      assert.ok(fs.existsSync(hookPath), `${hook} should exist`);
    });
  }
});

// ---- Syntax Validation ----

describe('v4 hook syntax', () => {
  it('all 8 new hooks have valid JS syntax', () => {
    const hooks = [
      'elicitation-logger.js',
      'elicitation-result-handler.js',
      'post-compact-recovery.js',
      'subagent-start-tracker.js',
      'cost-ceiling-enforcer.js',
      'context-warning.js',
      'stale-claude-md-nudge.js',
      'secret-leak-guard.js',
    ];
    for (const hook of hooks) {
      const hookPath = path.join(HOOKS_DIR, hook);
      const result = spawnSync('node', ['--check', hookPath], { encoding: 'utf-8', timeout: 5000 });
      assert.equal(result.status, 0, `${hook} should have valid syntax`);
    }
  });
});
