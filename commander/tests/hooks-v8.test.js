// ============================================================================
// CC Commander v8 — hook handlers for the events added after the 23-event set
// ============================================================================
// PermissionDenied, PreModelSwitch, PostModelSwitch, TeammateIdle, CwdChanged,
// DirectoryAdded, FileChanged, plus SessionStart watchPaths. Each test feeds a
// sample stdin event inside an isolated HOME, asserts exit 0, the JSONL/state
// write, and the stdout contract (nothing for side-effect-only events).
// Run: node --test commander/tests/hooks-v8.test.js
// ============================================================================

'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const HOOKS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'hooks');
const HOOKS_JSON = path.join(HOOKS_DIR, 'hooks.json');
const tmpDirs = [];

function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

function runHook(file, input, { home, cwd } = {}) {
  const r = spawnSync(process.execPath, [path.join(HOOKS_DIR, file)], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf-8',
    timeout: 10000,
    cwd: cwd || os.tmpdir(),
    env: { ...process.env, HOME: home, USERPROFILE: home, MCP_DISABLED: '1', CCC_TELEMETRY: '0' },
  });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: r.stderr };
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

const cmd = (f) => `node "\${CLAUDE_PLUGIN_ROOT}/hooks/${f}"`;

describe('hooks.json v8 registrations', () => {
  const cfg = JSON.parse(fs.readFileSync(HOOKS_JSON, 'utf8'));
  const commandsFor = (event) => (cfg.hooks[event] || []).flatMap((g) => g.hooks.map((h) => h.command));

  const expected = {
    PermissionDenied: 'permission-denied-logger.js',
    PreModelSwitch: 'model-switch-logger.js',
    PostModelSwitch: 'model-switch-logger.js',
    TeammateIdle: 'fleet-telemetry.js',
    CwdChanged: 'session-state-sync.js',
    DirectoryAdded: 'session-state-sync.js',
    FileChanged: 'stale-claude-md-nudge.js',
  };
  for (const [event, file] of Object.entries(expected)) {
    it(`${event} runs ${file}`, () => {
      assert.deepEqual(commandsFor(event), [cmd(file)]);
    });
  }

  it('FileChanged watches CLAUDE.md by literal filename', () => {
    assert.equal(cfg.hooks.FileChanged[0].matcher, 'CLAUDE.md');
  });

  it('WorktreeCreate/WorktreeRemove stay unregistered (a command hook would replace git worktree creation)', () => {
    assert.ok(!('WorktreeCreate' in cfg.hooks));
    assert.ok(!('WorktreeRemove' in cfg.hooks));
  });

  it('every handler: quoted shell form, no args/onFailure, timeout <= 15 s', () => {
    for (const [event, groups] of Object.entries(cfg.hooks)) {
      for (const g of groups) {
        for (const h of g.hooks) {
          assert.match(h.command, /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/[\w./-]+\.js"$/, `${event}: ${h.command}`);
          assert.ok(!('args' in h), `${event}: Codex cannot run exec-form args`);
          assert.ok(!('onFailure' in h), `${event}: onFailure is not used`);
          assert.ok(h.timeout >= 1 && h.timeout <= 15, `${event}: timeout ${h.timeout}`);
        }
      }
    }
  });

  it('new v8 handlers time out within 6 s; SessionEnd handlers within the Codex 3 s cap', () => {
    for (const event of Object.keys(expected)) {
      for (const g of cfg.hooks[event]) for (const h of g.hooks) assert.ok(h.timeout <= 6, event);
    }
    for (const g of cfg.hooks.SessionEnd) for (const h of g.hooks) assert.ok(h.timeout <= 3);
  });

  it('slow synchronous lifecycle handlers carry a statusMessage', () => {
    for (const event of ['SessionStart', 'SessionEnd', 'PreCompact', 'PostCompact']) {
      const sync = cfg.hooks[event].flatMap((g) => g.hooks).filter((h) => !h.async && h.timeout >= 3);
      const withStatus = sync.filter((h) => typeof h.statusMessage === 'string' && h.statusMessage);
      assert.ok(withStatus.length >= 1, `${event} needs a statusMessage on its slow handler`);
    }
  });
});

describe('permission-denied-logger.js (PermissionDenied)', () => {
  it('appends a blocked-class row to analytics/permission-gate.jsonl and prints a silent pass-through', () => {
    const home = tempDir('ccc-v8-pd-');
    const r = runHook('permission-denied-logger.js', {
      session_id: 'abc123',
      hook_event_name: 'PermissionDenied',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /tmp/build', description: 'Clean build directory' },
      tool_use_id: 'toolu_01',
      reason: '[Irreversible Local Destruction]',
    }, { home });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
    assert.ok(!('hookSpecificOutput' in out), 'must never request a retry');
    const rows = readJsonl(path.join(home, '.claude', 'commander', 'analytics', 'permission-gate.jsonl'));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sessionId, 'abc123');
    assert.equal(rows[0].toolName, 'Bash');
    assert.match(rows[0].decision, /denied/, 'safety-snapshot classifies /denied/ as blocked');
    assert.equal(rows[0].commandSnippet, 'rm -rf /tmp/build');
    assert.ok(!Number.isNaN(Date.parse(rows[0].timestamp)));
  });

  it('is counted as blocked by lib/safety-snapshot.js', async () => {
    const home = tempDir('ccc-v8-pd-safety-');
    runHook('permission-denied-logger.js', { hook_event_name: 'PermissionDenied', tool_name: 'Write' }, { home });
    const { readSafetyModel } = await import(path.join(__dirname, '..', 'cowork-plugin', 'lib', 'safety-snapshot.js'));
    const model = await readSafetyModel({ baseDir: path.join(home, '.claude', 'commander') });
    assert.equal(model.decisions.blocked, 1, 'PermissionDenied row must count as blocked');
  });

  it('fails open on malformed stdin', () => {
    const home = tempDir('ccc-v8-pd-bad-');
    const r = runHook('permission-denied-logger.js', 'not json', { home });
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).continue, true);
  });
});

describe('model-switch-logger.js (PreModelSwitch / PostModelSwitch)', () => {
  const base = {
    session_id: 's1',
    from_model: 'claude-sonnet-5-5',
    to_model: 'claude-opus-5-5',
    requested_model: 'opus',
    source: 'command',
  };

  it('PreModelSwitch: logs the switch and never decides (switch stays allowed)', () => {
    const home = tempDir('ccc-v8-pre-');
    const r = runHook('model-switch-logger.js', { ...base, hook_event_name: 'PreModelSwitch' }, { home });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
    assert.ok(!('hookSpecificOutput' in out), 'no permissionDecision');
    assert.ok(!('decision' in out), 'no top-level block');
    const rows = readJsonl(path.join(home, '.claude', 'commander', 'model-switches.jsonl'));
    assert.deepEqual(
      { event: rows[0].event, from: rows[0].from, to: rows[0].to, requested: rows[0].requested, source: rows[0].source },
      { event: 'PreModelSwitch', from: 'claude-sonnet-5-5', to: 'claude-opus-5-5', requested: 'opus', source: 'command' }
    );
  });

  it('PostModelSwitch: logs and emits one line of routing-tier additionalContext', () => {
    const home = tempDir('ccc-v8-post-');
    const r = runHook('model-switch-logger.js', { ...base, hook_event_name: 'PostModelSwitch', source: 'auto', requested_model: null }, { home });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, 'PostModelSwitch');
    const ctx = out.hookSpecificOutput.additionalContext;
    assert.ok(!ctx.includes('\n'), 'one line');
    for (const tier of ['fable', 'opus', 'sonnet', 'haiku']) assert.ok(ctx.includes(tier), tier);
    assert.ok(ctx.includes('claude-opus-5-5'));
    const rows = readJsonl(path.join(home, '.claude', 'commander', 'model-switches.jsonl'));
    assert.equal(rows[0].event, 'PostModelSwitch');
    assert.equal(rows[0].requested, null);
  });
});

describe('fleet-telemetry.js (TeammateIdle)', () => {
  it('appends a fleet row, prints nothing, exits 0', () => {
    const home = tempDir('ccc-v8-tm-');
    const r = runHook('fleet-telemetry.js', {
      session_id: 'abc123',
      hook_event_name: 'TeammateIdle',
      teammate_name: 'researcher',
      team_name: 'session-a1b2c3d4',
      agent_id: 'agent-7',
    }, { home });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '', 'never returns continue:false (or anything)');
    const rows = readJsonl(path.join(home, '.claude', 'commander', 'fleet', 'teammates.jsonl'));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, 'teammate_idle');
    assert.equal(rows[0].teammate, 'researcher');
    assert.equal(rows[0].agentId, 'agent-7');
  });
});

describe('session-state-sync.js (CwdChanged / DirectoryAdded)', () => {
  it('CwdChanged updates cwd in sessions/active-session.json, keeps prior fields, prints nothing', () => {
    const home = tempDir('ccc-v8-cwd-');
    const sessions = path.join(home, '.claude', 'commander', 'sessions');
    fs.mkdirSync(sessions, { recursive: true });
    fs.writeFileSync(path.join(sessions, 'active-session.json'), JSON.stringify({ startedAt: '2026-10-13T00:00:00.000Z', status: 'active' }));
    const r = runHook('session-state-sync.js', {
      hook_event_name: 'CwdChanged',
      cwd: '/work/project/src',
      old_cwd: '/work/project',
      new_cwd: '/work/project/src',
    }, { home });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
    const state = JSON.parse(fs.readFileSync(path.join(sessions, 'active-session.json'), 'utf8'));
    assert.equal(state.cwd, '/work/project/src');
    assert.equal(state.previousCwd, '/work/project');
    assert.equal(state.startedAt, '2026-10-13T00:00:00.000Z');
    assert.equal(state.status, 'active');
  });

  it('DirectoryAdded records the directory once (deduped), prints nothing', () => {
    const home = tempDir('ccc-v8-dir-');
    const ev = { hook_event_name: 'DirectoryAdded', cwd: '/work/project', directory: '/work/other', source: 'slash_command' };
    assert.equal(runHook('session-state-sync.js', ev, { home }).status, 0);
    const r = runHook('session-state-sync.js', ev, { home });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
    const state = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'commander', 'sessions', 'active-session.json'), 'utf8'));
    assert.equal(state.directories.length, 1);
    assert.equal(state.directories[0].path, '/work/other');
    assert.equal(state.directories[0].source, 'slash_command');
  });

  it('ignores relative paths and unrelated events without writing', () => {
    const home = tempDir('ccc-v8-noop-');
    assert.equal(runHook('session-state-sync.js', { hook_event_name: 'CwdChanged', new_cwd: 'relative' }, { home }).stdout, '');
    assert.equal(runHook('session-state-sync.js', { hook_event_name: 'Stop' }, { home }).stdout, '');
    assert.ok(!fs.existsSync(path.join(home, '.claude', 'commander', 'sessions', 'active-session.json')));
  });
});

describe('stale-claude-md-nudge.js (FileChanged) + SessionStart watchPaths', () => {
  it('FileChanged on a fresh CLAUDE.md prints nothing', () => {
    const home = tempDir('ccc-v8-fc-home-');
    const proj = tempDir('ccc-v8-fc-proj-');
    fs.writeFileSync(path.join(proj, 'CLAUDE.md'), '# x\n');
    const r = runHook('stale-claude-md-nudge.js', {
      hook_event_name: 'FileChanged', cwd: proj, file_path: path.join(proj, 'CLAUDE.md'), event: 'change',
    }, { home, cwd: proj });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
  });

  it('FileChanged unlink in a code repo re-runs the nudge for that directory (systemMessage only)', () => {
    const home = tempDir('ccc-v8-fc2-home-');
    const proj = tempDir('ccc-v8-fc2-proj-');
    fs.mkdirSync(path.join(proj, '.git'));
    fs.writeFileSync(path.join(proj, 'package.json'), '{}');
    const r = runHook('stale-claude-md-nudge.js', {
      hook_event_name: 'FileChanged', cwd: os.tmpdir(), file_path: path.join(proj, 'CLAUDE.md'), event: 'unlink',
    }, { home });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepEqual(Object.keys(out), ['systemMessage']);
    assert.match(out.systemMessage, /ccc-adopt/);
  });

  it('FileChanged for a non-CLAUDE.md file is ignored', () => {
    const home = tempDir('ccc-v8-fc3-');
    const r = runHook('stale-claude-md-nudge.js', { hook_event_name: 'FileChanged', file_path: '/work/.envrc', event: 'change' }, { home });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  });

  it('SessionStart orchestrator returns watchPaths for the CLAUDE.md it locates', () => {
    const home = tempDir('ccc-v8-ss-home-');
    const proj = fs.realpathSync(tempDir('ccc-v8-ss-proj-'));
    fs.writeFileSync(path.join(proj, 'CLAUDE.md'), '# x\n');
    const r = runHook(path.join('orchestrator', 'session-start-orchestrator.js'), {
      hook_event_name: 'SessionStart', session_id: 'ss', cwd: proj, source: 'startup',
    }, { home, cwd: proj });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.split('\n').filter(Boolean).pop());
    assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.deepEqual(out.hookSpecificOutput.watchPaths, [path.join(proj, 'CLAUDE.md')]);
  });

  it('SessionStart orchestrator omits watchPaths when there is no CLAUDE.md', () => {
    const home = tempDir('ccc-v8-ss2-home-');
    const proj = fs.realpathSync(tempDir('ccc-v8-ss2-proj-'));
    const r = runHook(path.join('orchestrator', 'session-start-orchestrator.js'), { hook_event_name: 'SessionStart' }, { home, cwd: proj });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.split('\n').filter(Boolean).pop());
    assert.ok(!(out.hookSpecificOutput && out.hookSpecificOutput.watchPaths));
  });
});
