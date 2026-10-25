// ============================================================================
// CC Commander v4 Beta — Hook Test Suite (hooks-v4)
// ============================================================================
// Tests all 8 P0 lifecycle hooks added in claude/v4-beta3-mcp-hooks.
// Run: node --test commander/tests/hooks-v4.test.js
// Airplane mode: MCP_DISABLED=1 node --test commander/tests/hooks-v4.test.js
// ============================================================================

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const HOOKS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'hooks');

// Isolated HOME for every runHook() call by default — several hooks here
// (subagent-start-tracker.js, elicitation-logger.js, elicitation-result-
// handler.js) append to real ~/.claude/commander/*.jsonl files when HOME
// isn't overridden. Without this, every test run pollutes the user's live
// telemetry with fake "builder"/"researcher" rows (found 2026-07-17: 3,780
// of 3,964 subagent-runs.jsonl rows were test fixtures dating to 05-28).
// A call site can still opt into a specific HOME via envOverrides — it wins
// because it's spread last.
const DEFAULT_TEST_HOME = fs.mkdtempSync(
  path.join(os.tmpdir(), 'ccc-hooks-v4-test-home-')
);
after(() => {
  fs.rmSync(DEFAULT_TEST_HOME, { recursive: true, force: true });
});

// Helper: run a hook with JSON stdin, return { exitCode, output, parsed }
function runHook(hookFile, inputObj, envOverrides = {}) {
  const hookPath = path.join(HOOKS_DIR, hookFile);
  const input = JSON.stringify(inputObj || {});
  const env = {
    ...process.env,
    HOME: DEFAULT_TEST_HOME,
    USERPROFILE: DEFAULT_TEST_HOME,
    ...envOverrides,
  };

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

// ---- elicitation-logger.js / elicitation-result-handler.js ----
// Payloads are the documented samples from code.claude.com/docs/en/hooks
// (Elicitation input, ElicitationResult input), plus elicitation_id where the
// docs list it as optional.

const ELICIT_COMMON = {
  session_id: 'abc123',
  transcript_path: '/Users/x/.claude/projects/p/00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl',
  cwd: '/Users/x',
};
const ELICIT_FORM = {
  ...ELICIT_COMMON,
  hook_event_name: 'Elicitation',
  mcp_server_name: 'my-mcp-server',
  message: 'Please provide your credentials',
  mode: 'form',
  requested_schema: { type: 'object', properties: { username: { type: 'string', title: 'Username' } } },
};
const ELICIT_URL = {
  ...ELICIT_COMMON,
  hook_event_name: 'Elicitation',
  mcp_server_name: 'my-mcp-server',
  message: 'Please authenticate',
  mode: 'url',
  url: 'https://auth.example.com/login',
  elicitation_id: 'elic-42',
};
const ELICIT_RESULT = {
  ...ELICIT_COMMON,
  hook_event_name: 'ElicitationResult',
  mcp_server_name: 'my-mcp-server',
  action: 'accept',
  content: { username: 'alice' },
  mode: 'form',
};

function elicitationRows(hookFile, payload) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-elicit-home-'));
  try {
    const r = runHook(hookFile, payload, { HOME: home, USERPROFILE: home });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
    const log = path.join(home, '.claude', 'commander', 'elicitation.jsonl');
    return fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

function assertNoEmptyFields(row) {
  for (const [k, v] of Object.entries(row)) {
    assert.ok(v !== null && v !== undefined && v !== 'unknown' && v !== '', `field ${k} is ${JSON.stringify(v)}`);
  }
}

describe('elicitation-logger.js', () => {
  it('logs the documented form-mode fields, none null or unknown', () => {
    const [row] = elicitationRows('elicitation-logger.js', ELICIT_FORM);
    assert.equal(row.event, 'Elicitation');
    assert.equal(row.mcp_server_name, 'my-mcp-server');
    assert.equal(row.mode, 'form');
    assert.equal(row.session_id, 'abc123');
    assertNoEmptyFields(row);
  });

  it('logs elicitation_id and url mode; never logs message, url or schema', () => {
    const [row] = elicitationRows('elicitation-logger.js', ELICIT_URL);
    assert.equal(row.elicitation_id, 'elic-42');
    assert.equal(row.mode, 'url');
    assertNoEmptyFields(row);
    const text = JSON.stringify(row);
    assert.ok(!text.includes('authenticate') && !text.includes('auth.example.com') && !text.includes('requested_schema'), text);
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
      env: { ...process.env, HOME: DEFAULT_TEST_HOME, USERPROFILE: DEFAULT_TEST_HOME },
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('elicitation-logger.js', ELICIT_FORM, { MCP_DISABLED: '1' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
  });
});

describe('elicitation-result-handler.js', () => {
  it('logs the documented accept result, none null or unknown, content not logged', () => {
    const [row] = elicitationRows('elicitation-result-handler.js', ELICIT_RESULT);
    assert.equal(row.event, 'ElicitationResult');
    assert.equal(row.action, 'accept');
    assert.equal(row.mcp_server_name, 'my-mcp-server');
    assert.equal(row.mode, 'form');
    assertNoEmptyFields(row);
    assert.ok(!JSON.stringify(row).includes('alice'), 'content must not be logged');
  });

  for (const action of ['decline', 'cancel']) {
    it(`logs action ${action} with elicitation_id`, () => {
      const [row] = elicitationRows('elicitation-result-handler.js', {
        ...ELICIT_RESULT, action, content: undefined, elicitation_id: 'elic-7',
      });
      assert.equal(row.action, action);
      assert.equal(row.elicitation_id, 'elic-7');
      assertNoEmptyFields(row);
    });
  }

  it('returns continue:true on malformed input', () => {
    const hookPath = path.join(HOOKS_DIR, 'elicitation-result-handler.js');
    const result = spawnSync('node', [hookPath], {
      input: '{{bad json}}',
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, HOME: DEFAULT_TEST_HOME, USERPROFILE: DEFAULT_TEST_HOME },
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('elicitation-result-handler.js', ELICIT_RESULT, { MCP_DISABLED: '1' });
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
    if (r.parsed?.systemMessage) {
      assert.ok(r.parsed.systemMessage.includes('compact') || r.parsed.systemMessage.includes('CCC'));
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
      CLAUDE_MODEL: 'claude-opus-4-8',
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
      env: { ...process.env, HOME: DEFAULT_TEST_HOME, USERPROFILE: DEFAULT_TEST_HOME },
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
    // State is keyed by CLAUDE_SESSION_ID (defaults to 'default')
    fs.writeFileSync(path.join(sessionsDir, 'active-cost-default.json'), JSON.stringify({
      toolCalls: 10,
      estimatedCost: 0.10,
    }));

    const r = runHook('cost-ceiling-enforcer.js', { tool_name: 'Bash' }, { HOME: tmpHome, CLAUDE_SESSION_ID: '' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);

    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  // Over-budget session fixture: 200 calls == 2.00 budget units.
  function overBudgetHome(config) {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const configDir = path.join(tmpHome, '.claude', 'commander');
    fs.mkdirSync(path.join(configDir, 'sessions'), { recursive: true });
    if (config) fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(config));
    const costFile = path.join(configDir, 'sessions', 'active-cost-default.json');
    fs.writeFileSync(costFile, JSON.stringify({ toolCalls: 200, estimatedCost: 2.00 }));
    return { tmpHome, costFile, configFile: path.join(configDir, 'config.json') };
  }

  it('is off by default: an over-budget session with no ceiling configured is never warned or blocked', () => {
    const { tmpHome, costFile } = overBudgetHome(null);
    // 2,000 calls: past the old 1,000-call default as well.
    fs.writeFileSync(costFile, JSON.stringify({ toolCalls: 2000, estimatedCost: 20.00 }));
    for (let i = 0; i < 3; i++) {
      const r = runHook('cost-ceiling-enforcer.js', { tool_name: 'Write' }, { HOME: tmpHome, CLAUDE_SESSION_ID: '' });
      assert.equal(r.exitCode, 0);
      assert.equal(r.parsed?.continue, true);
      assert.equal(r.parsed?.systemMessage, undefined, 'no warning when the ceiling is off');
      assert.equal(r.parsed?.hookSpecificOutput, undefined, 'no deny when the ceiling is off');
    }
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('config costCeiling: warns on first crossing, then denies with a readable reason (warn-then-block)', () => {
    const { tmpHome, costFile, configFile } = overBudgetHome({ costCeiling: 1.00 });

    // 1st crossing → visible warning, call allowed through
    const warn = runHook('cost-ceiling-enforcer.js', { tool_name: 'Write' }, { HOME: tmpHome, CLAUDE_SESSION_ID: '' });
    assert.equal(warn.exitCode, 0);
    assert.equal(warn.parsed?.continue, true, 'first crossing should warn, not block');
    assert.ok(warn.parsed?.systemMessage?.includes('ceiling'), 'warning should mention the ceiling');
    assert.ok(warn.parsed.systemMessage.includes(configFile), 'warning names the config file actually read');
    const afterWarn = JSON.parse(fs.readFileSync(costFile, 'utf8'));
    assert.ok(afterWarn.ceilingWarnedAt, 'warning timestamp should be persisted');

    // 2nd call → PreToolUse deny with a reason; the turn itself continues
    const r = runHook('cost-ceiling-enforcer.js', { tool_name: 'Write' }, { HOME: tmpHome, CLAUDE_SESSION_ID: '' });
    assert.equal(r.exitCode, 0, 'process should exit 0 even when blocking');
    assert.equal(r.parsed?.continue, true, 'never halts the whole turn with continue:false');
    assert.equal(r.parsed?.stopReason, undefined);
    const hso = r.parsed?.hookSpecificOutput;
    assert.equal(hso?.hookEventName, 'PreToolUse');
    assert.equal(hso?.permissionDecision, 'deny');
    assert.match(hso.permissionDecisionReason, /tool-call budget ceiling: 200 calls >= 100-call limit/);
    assert.ok(hso.permissionDecisionReason.includes('CCC_COST_OVERRIDE=1'), 'reason says how to continue');
    assert.ok(hso.permissionDecisionReason.includes(configFile), 'reason names the config file actually read');
    assert.equal(r.parsed.systemMessage, hso.permissionDecisionReason, 'user sees the same reason');

    // CCC_COST_OVERRIDE=1 → always allowed
    const override = runHook('cost-ceiling-enforcer.js', { tool_name: 'Write' }, { HOME: tmpHome, CLAUDE_SESSION_ID: '', CCC_COST_OVERRIDE: '1' });
    assert.equal(override.exitCode, 0);
    assert.equal(override.parsed?.continue, true, 'override env must bypass the ceiling');
    assert.equal(override.parsed?.hookSpecificOutput, undefined);

    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('CCC_COST_CEILING=<n> enables it without config; 0 or off disables a configured ceiling', () => {
    const { tmpHome } = overBudgetHome(null);
    const env = { HOME: tmpHome, CLAUDE_SESSION_ID: '', CCC_COST_CEILING: '1.5' };
    const warn = runHook('cost-ceiling-enforcer.js', { tool_name: 'Write' }, env);
    assert.match(warn.parsed?.systemMessage || '', /150-call limit/);
    const deny = runHook('cost-ceiling-enforcer.js', { tool_name: 'Write' }, env);
    assert.equal(deny.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
    assert.ok(deny.parsed.hookSpecificOutput.permissionDecisionReason.includes('CCC_COST_CEILING'));
    fs.rmSync(tmpHome, { recursive: true, force: true });

    for (const off of ['0', 'off']) {
      const cfg = overBudgetHome({ costCeiling: 1.00 });
      for (let i = 0; i < 2; i++) {
        const r = runHook('cost-ceiling-enforcer.js', { tool_name: 'Write' }, { HOME: cfg.tmpHome, CLAUDE_SESSION_ID: '', CCC_COST_CEILING: off });
        assert.equal(r.parsed?.systemMessage, undefined, `CCC_COST_CEILING=${off} turns it off`);
        assert.equal(r.parsed?.hookSpecificOutput, undefined);
      }
      fs.rmSync(cfg.tmpHome, { recursive: true, force: true });
    }
  });

  it('names the lane config file, not ~/.claude, when a lane runs', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const laneDir = path.join(tmpHome, '.claude-ai3', 'commander');
    fs.mkdirSync(path.join(laneDir, 'sessions'), { recursive: true });
    fs.writeFileSync(path.join(laneDir, 'config.json'), JSON.stringify({ costCeiling: 1.00 }));
    fs.writeFileSync(path.join(laneDir, 'sessions', 'active-cost-default.json'), JSON.stringify({ toolCalls: 200, estimatedCost: 2.00 }));
    const env = { HOME: tmpHome, CLAUDE_CONFIG_DIR: path.join(tmpHome, '.claude-ai3'), CLAUDE_SESSION_ID: '' };
    const warn = runHook('cost-ceiling-enforcer.js', { tool_name: 'Write' }, env);
    assert.ok(warn.parsed?.systemMessage?.includes(path.join(laneDir, 'config.json')), warn.parsed?.systemMessage);
    assert.ok(!warn.parsed.systemMessage.includes('~/.claude/commander'), 'no hard-coded primary-lane path');
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
    if (r.parsed?.systemMessage) {
      assert.ok(r.parsed.systemMessage.includes('5%') || r.parsed.systemMessage.includes('CRITICAL'));
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
    assert.ok(!r.parsed?.systemMessage || r.parsed.suppressOutput === true);
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
      env: { ...process.env, HOME: tmpDir, USERPROFILE: tmpDir },
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
      env: { ...process.env, HOME: tmpDir, USERPROFILE: tmpDir },
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
      env: { ...process.env, HOME: tmpDir },  // isolate once-per-day marker writes
      cwd: tmpDir,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
    // Should emit a nudge systemMessage
    if (parsed.systemMessage) {
      assert.ok(parsed.systemMessage.includes('CLAUDE.md') || parsed.systemMessage.includes('/ccc-adopt'));
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
      env: { ...process.env, CC_NUDGE_DISABLE: '1', HOME: tmpDir },
      cwd: tmpDir,
    });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.continue, true);
    assert.ok(!parsed.status && !parsed.systemMessage, 'should not emit nudge when disabled');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns continue:true on malformed input', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'));
    const result = spawnSync('node', [path.join(HOOKS_DIR, 'stale-claude-md-nudge.js')], {
      input: 'NOT JSON',
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, HOME: tmpDir, USERPROFILE: tmpDir },
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
    assert.notEqual(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
  });

  it('returns continue:true for non-scanned tool (Read)', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.js' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
    assert.notEqual(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
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
    assert.equal(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
    assert.ok(typeof r.parsed?.hookSpecificOutput?.permissionDecisionReason === 'string');
    assert.ok(r.parsed.hookSpecificOutput.permissionDecisionReason.includes('AWS') || r.parsed.hookSpecificOutput.permissionDecisionReason.includes('secret'));
  });

  it('blocks Bash command with Stripe live key', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Bash',
      // Build fake Stripe-like key at runtime to avoid GitHub secret scanner false positive
      tool_input: { command: 'curl -H "Authorization: Bearer ' + ['sk', 'live', 'F'.repeat(24)].join('_') + '" https://api.stripe.com' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
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
    assert.equal(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
  });

  it('blocks Write with GitHub PAT', () => {
    // ghp_ + 36 chars = valid GitHub PAT format
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/deploy.sh',
        // Built at runtime to avoid CI secret-scan false positive
        content: 'export GH_TOKEN=' + ['ghp', 'A'.repeat(36)].join('_') + '\n',
      },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
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
    assert.notEqual(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
  });

  it('an allowlisted placeholder elsewhere in the input does not exempt a real key', () => {
    const realKey = 'sk-ant-api03-' + 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLM';
    for (const content of [
      `STRIPE_KEY=REPLACE_ME\nANTHROPIC_API_KEY=${realKey}\n`,
      `const testKey = "sk_test_example";\nconst key = "${realKey}";\n`,
    ]) {
      const r = runHook('secret-leak-guard.js', { tool_name: 'Write', tool_input: { file_path: '/tmp/.env', content } });
      assert.equal(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny', content);
    }
  });

  it('scans PowerShell commands like Bash', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'PowerShell',
      tool_input: { command: '$env:GH_TOKEN = "' + ['ghp', 'A'.repeat(36)].join('_') + '"' },
    });
    assert.equal(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
  });

  it('allows full git commit SHAs that contain ac + 32 hex (not a Twilio SID)', () => {
    const sha = '3f' + 'ac' + '0123456789abcdef0123456789abcdef' + '1234';
    assert.equal(sha.length, 40);
    for (const command of [`git show ${sha}`, `git push origin ${sha}:refs/heads/x`, `echo NEW HEAD: ${sha}`]) {
      const r = runHook('secret-leak-guard.js', { tool_name: 'Bash', tool_input: { command } });
      assert.equal(r.exitCode, 0);
      assert.equal(r.parsed?.continue, true, command);
      assert.notEqual(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny', command);
    }
    const digest = 'ac' + 'f'.repeat(62);
    const r = runHook('secret-leak-guard.js', { tool_name: 'Write', tool_input: { file_path: '/tmp/x', content: `sha256: ${digest}\n` } });
    assert.equal(r.parsed?.continue, true, 'sha256 digest allowed');
    assert.notEqual(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny', 'sha256 digest allowed');
  });

  it('still blocks a real-shaped Twilio Account SID, even next to a SHA', () => {
    const sid = 'AC' + '0123456789abcdef0123456789abcdef';
    const sha = 'ac' + '0123456789abcdef0123456789abcdef' + '123456';
    for (const command of [`curl -u ${sid}:x https://api.twilio.com`, `git show ${sha} && echo ${sid}`]) {
      const r = runHook('secret-leak-guard.js', { tool_name: 'Bash', tool_input: { command } });
      assert.equal(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny', command);
      assert.match(r.parsed?.hookSpecificOutput?.permissionDecisionReason || '', /Twilio/);
    }
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
    assert.notEqual(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
  });

  it('does not make network calls (MCP_DISABLED=1)', () => {
    const r = runHook('secret-leak-guard.js', {
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    }, { MCP_DISABLED: '1' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true);
    assert.notEqual(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
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
