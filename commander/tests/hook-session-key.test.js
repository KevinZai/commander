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

// CC-1360 F14: SessionEnd runs session-save and session-end in parallel.
// session-save archives the session's live record and unlinks it, so
// session-end must find the session in either file, whichever hook runs first.
// Codex audit #25/#31: records are keyed by session id, cleanup is owner-only,
// and session-end finds the archive by name (no directory scan).
describe('SessionEnd hooks are order-independent', () => {
  const KNOWLEDGE = path.join(HOME, '.claude', 'commander', 'knowledge');
  const active = (key) => path.join(SESSIONS, `active-session-${key}.json`);
  const knowledge = (key) => path.join(KNOWLEDGE, `session-${key}.json`);
  const seed = (key, startedAt) => {
    fs.mkdirSync(SESSIONS, { recursive: true });
    fs.writeFileSync(active(key), JSON.stringify({ sessionId: key, startedAt, status: 'active' }));
  };
  const archives = () => fs.readdirSync(SESSIONS).filter((n) => /^\d{4}-\d{2}-\d{2}-[0-9a-f]+\.json$/.test(n))
    .map((n) => JSON.parse(fs.readFileSync(path.join(SESSIONS, n), 'utf8')));

  it('session-end after session-save still writes the knowledge record', () => {
    seed('f14-save-first', '2026-10-26T10:00:00.000Z');
    runHook('session-save.js', { session_id: 'f14-save-first', hook_event_name: 'SessionEnd' });
    assert.ok(!fs.existsSync(active('f14-save-first')), 'session-save removed the live record');
    runHook('session-end.js', { session_id: 'f14-save-first', hook_event_name: 'SessionEnd' });
    const rec = JSON.parse(fs.readFileSync(knowledge('f14-save-first'), 'utf8'));
    assert.equal(rec.startedAt, '2026-10-26T10:00:00.000Z');
    assert.ok(!fs.existsSync(active('f14-save-first')), 'session-end does not recreate the live record');
  });

  it('session-end before session-save writes the record and leaves the archive to session-save', () => {
    seed('f14-end-first', '2026-10-26T11:00:00.000Z');
    runHook('session-end.js', { session_id: 'f14-end-first', hook_event_name: 'SessionEnd' });
    runHook('session-save.js', { session_id: 'f14-end-first', hook_event_name: 'SessionEnd' });
    const rec = JSON.parse(fs.readFileSync(knowledge('f14-end-first'), 'utf8'));
    assert.equal(rec.startedAt, '2026-10-26T11:00:00.000Z');
    assert.ok(archives().some((a) => a.sessionId === 'f14-end-first' && a.status === 'complete'));
    assert.ok(!fs.existsSync(active('f14-end-first')));
  });

  it('finds its archive among many from the same day without scanning them', () => {
    fs.mkdirSync(SESSIONS, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 300; i++) {
      fs.writeFileSync(path.join(SESSIONS, `${today}-ffff${String(i).padStart(4, '0')}.json`), JSON.stringify({ sessionId: `filler-${i}`, status: 'complete' }));
    }
    seed('f14-busy-day', '2026-10-26T12:00:00.000Z');
    runHook('session-save.js', { session_id: 'f14-busy-day', hook_event_name: 'SessionEnd' });
    const t0 = Date.now();
    runHook('session-end.js', { session_id: 'f14-busy-day', hook_event_name: 'SessionEnd' });
    assert.ok(Date.now() - t0 < 3000, 'session-end stays inside its 3 s timeout');
    const rec = JSON.parse(fs.readFileSync(knowledge('f14-busy-day'), 'utf8'));
    assert.equal(rec.startedAt, '2026-10-26T12:00:00.000Z');
  });

  it("does not adopt another session's archive", () => {
    runHook('session-end.js', { session_id: 'f14-stranger', hook_event_name: 'SessionEnd' });
    assert.ok(!fs.existsSync(knowledge('f14-stranger')));
  });

  it("one session's SessionEnd never archives or removes a parallel session's live record", () => {
    seed('par-a', '2026-10-26T13:00:00.000Z');
    seed('par-b', '2026-10-26T13:05:00.000Z');
    runHook('session-save.js', { session_id: 'par-a', hook_event_name: 'SessionEnd' });
    runHook('session-end.js', { session_id: 'par-a', hook_event_name: 'SessionEnd' });
    assert.ok(fs.existsSync(active('par-b')), "B's live record survives A's SessionEnd");
    assert.equal(JSON.parse(fs.readFileSync(active('par-b'), 'utf8')).startedAt, '2026-10-26T13:05:00.000Z');
    assert.ok(!archives().some((a) => a.sessionId === 'par-a' && a.startedAt === '2026-10-26T13:05:00.000Z'), "A's archive holds A's data");
    assert.equal(JSON.parse(fs.readFileSync(knowledge('par-a'), 'utf8')).startedAt, '2026-10-26T13:00:00.000Z');
  });

  it('a live record owned by another session id is neither archived nor removed', () => {
    fs.mkdirSync(SESSIONS, { recursive: true });
    fs.writeFileSync(active('own-x'), JSON.stringify({ sessionId: 'someone-else', startedAt: '2026-10-26T14:00:00.000Z' }));
    runHook('session-save.js', { session_id: 'own-x', hook_event_name: 'SessionEnd' });
    assert.ok(fs.existsSync(active('own-x')), 'foreign record left in place');
  });
});

describe('SessionStart and CwdChanged keep one live record per session', () => {
  it('two sessions starting in parallel each get their own record; CwdChanged edits only its own', async () => {
    const { pathToFileURL } = require('node:url');
    const mod = await import(pathToFileURL(path.join(HOOKS_DIR, '_archive', 'session-start.js')).href);
    await mod.run({ home: HOME, input: { session_id: 'ss-a', cwd: '/tmp/a' } });
    await mod.run({ home: HOME, input: { session_id: 'ss-b', cwd: '/tmp/b' } });
    const read = (k) => JSON.parse(fs.readFileSync(path.join(SESSIONS, `active-session-${k}.json`), 'utf8'));
    assert.equal(read('ss-a').sessionId, 'ss-a');
    assert.equal(read('ss-a').cwd, '/tmp/a');
    assert.equal(read('ss-b').cwd, '/tmp/b');
    runHook('session-state-sync.js', { session_id: 'ss-a', hook_event_name: 'CwdChanged', old_cwd: '/tmp/a', new_cwd: '/tmp/a2' });
    assert.equal(read('ss-a').cwd, '/tmp/a2');
    assert.equal(read('ss-b').cwd, '/tmp/b', "B's record untouched");
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
