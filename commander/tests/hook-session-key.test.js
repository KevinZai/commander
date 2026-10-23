// Session keying + PreToolUse deny contract for the budget/guard hooks.
// Claude Code passes session_id on stdin and sets no CLAUDE_SESSION_ID env var
// (code.claude.com/docs/en/hooks#common-input-fields), so per-session state
// must key on the payload. A guard that refuses one tool call must deny it
// (permissionDecision) rather than halt the turn with continue:false.
'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const HOOKS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'hooks');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-session-key-test-'));
const SESSIONS = path.join(HOME, '.claude', 'commander', 'sessions');
after(() => fs.rmSync(HOME, { recursive: true, force: true }));

function runHook(file, input, env = {}) {
  const baseEnv = { ...process.env, HOME, USERPROFILE: HOME, MCP_DISABLED: '1', ...env };
  delete baseEnv.CLAUDE_SESSION_ID;
  if (env.CLAUDE_SESSION_ID) baseEnv.CLAUDE_SESSION_ID = env.CLAUDE_SESSION_ID;
  const r = spawnSync('node', [path.join(HOOKS_DIR, file)], {
    input: JSON.stringify(input), encoding: 'utf-8', timeout: 8000, env: baseEnv,
  });
  let parsed = null;
  try { parsed = JSON.parse((r.stdout || '').trim()); } catch { /* non-JSON */ }
  return { exitCode: r.status ?? 0, parsed };
}

function readCost(key) {
  return JSON.parse(fs.readFileSync(path.join(SESSIONS, `active-cost-${key}.json`), 'utf8'));
}

describe('budget hooks key state on stdin session_id', () => {
  it('cost-tracker keeps a separate counter per session', () => {
    runHook('cost-tracker.js', { session_id: 'sess-a', tool_name: 'Bash' });
    runHook('cost-tracker.js', { session_id: 'sess-a', tool_name: 'Bash' });
    runHook('cost-tracker.js', { session_id: 'sess-b', tool_name: 'Bash' });
    assert.equal(readCost('sess-a').toolCalls, 2);
    assert.equal(readCost('sess-b').toolCalls, 1);
    assert.ok(!fs.existsSync(path.join(SESSIONS, 'active-cost-default.json')), 'no shared default counter');
  });

  it('session-save clears only the ending session\'s counter', () => {
    runHook('session-save.js', { session_id: 'sess-a', hook_event_name: 'SessionEnd' });
    assert.ok(!fs.existsSync(path.join(SESSIONS, 'active-cost-sess-a.json')), 'ended session cleared');
    assert.equal(readCost('sess-b').toolCalls, 1, 'other session untouched');
  });

  it('cost-ceiling-enforcer reads the calling session\'s counter', () => {
    fs.writeFileSync(path.join(HOME, '.claude', 'commander', 'config.json'), JSON.stringify({ costCeiling: 1.0 }));
    fs.writeFileSync(path.join(SESSIONS, 'active-cost-hot.json'), JSON.stringify({ toolCalls: 200, estimatedCost: 2.0 }));
    const cold = runHook('cost-ceiling-enforcer.js', { session_id: 'sess-b', tool_name: 'Bash' });
    assert.equal(cold.parsed?.continue, true);
    assert.equal(cold.parsed?.systemMessage, undefined, 'under-budget session gets no warning');
    const hot = runHook('cost-ceiling-enforcer.js', { session_id: 'hot', tool_name: 'Bash' });
    assert.match(hot.parsed?.systemMessage || '', /ceiling/, 'over-budget session is warned');
  });

  it('falls back to env CLAUDE_SESSION_ID when stdin has no session_id', () => {
    runHook('cost-tracker.js', { tool_name: 'Bash' }, { CLAUDE_SESSION_ID: 'env-sess' });
    assert.equal(readCost('env-sess').toolCalls, 1);
  });
});

describe('PreToolUse guards deny the call instead of halting the turn', () => {
  it('config-protection denies an edit to a protected config with a reason', () => {
    const r = runHook('config-protection.js', {
      hook_event_name: 'PreToolUse', tool_name: 'Edit',
      tool_input: { file_path: '/tmp/project/.eslintrc.json', old_string: 'a', new_string: 'b' },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.parsed?.continue, true, 'turn continues');
    assert.equal(r.parsed?.hookSpecificOutput?.hookEventName, 'PreToolUse');
    assert.equal(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
    assert.match(r.parsed?.hookSpecificOutput?.permissionDecisionReason || '', /CONFIG GUARD/);
  });

  it('config-protection allows an ordinary source edit', () => {
    const r = runHook('config-protection.js', {
      hook_event_name: 'PreToolUse', tool_name: 'Edit',
      tool_input: { file_path: '/tmp/project/src/index.js', old_string: 'a', new_string: 'b' },
    });
    assert.equal(r.parsed?.continue, true);
    assert.notEqual(r.parsed?.hookSpecificOutput?.permissionDecision, 'deny');
  });
});
