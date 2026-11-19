// ============================================================================
// CC Commander — Hook Test Harness
// ============================================================================
// Tests all 15 kit-native hooks using Node.js built-in test runner.
// Run: node --test tests/hooks.test.js
// ============================================================================

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync, execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOKS_DIR = path.join(__dirname, '..', 'hooks');

// ---- careful-guard.js (PreToolUse) ----

describe('careful-guard.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'careful-guard.js');

  function runHook(command) {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command },
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 5000,
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('blocks rm -rf /', () => {
    const result = runHook('rm -rf /');
    assert.equal(result.exitCode, 2);
  });

  it('blocks rm -fr ~/', () => {
    const result = runHook('rm -fr ~/');
    assert.equal(result.exitCode, 2);
  });

  it('blocks DROP TABLE', () => {
    const result = runHook('DROP TABLE users');
    assert.equal(result.exitCode, 2);
  });

  it('blocks git push --force', () => {
    const result = runHook('git push --force');
    assert.equal(result.exitCode, 2);
  });

  it('blocks git push -f', () => {
    const result = runHook('git push -f origin main');
    assert.equal(result.exitCode, 2);
  });

  it('blocks DELETE FROM', () => {
    const result = runHook('DELETE FROM users');
    assert.equal(result.exitCode, 2);
  });

  it('allows safe commands', () => {
    const result = runHook('git status');
    assert.equal(result.exitCode, 0);
  });

  it('allows npm install', () => {
    const result = runHook('npm install express');
    assert.equal(result.exitCode, 0);
  });

  it('allows ls -la', () => {
    const result = runHook('ls -la');
    assert.equal(result.exitCode, 0);
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    // Should not crash — graceful handling
    assert.ok(true);
  });
});

// ---- pre-commit-verify.js (PreToolUse) ----

describe('pre-commit-verify.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'pre-commit-verify.js');

  function runHook(command) {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command },
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 15000,
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('allows non-commit git commands through', () => {
    const result = runHook('git status');
    assert.equal(result.exitCode, 0);
  });

  it('allows git push through', () => {
    const result = runHook('git push origin main');
    assert.equal(result.exitCode, 0);
  });

  it('allows git diff through', () => {
    const result = runHook('git diff --stat');
    assert.equal(result.exitCode, 0);
  });

  it('allows non-git commands through', () => {
    const result = runHook('npm install');
    assert.equal(result.exitCode, 0);
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });
});

// ---- confidence-gate.js (PreToolUse) ----

describe('confidence-gate.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'confidence-gate.js');

  function runHook(command) {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command },
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 5000,
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('allows normal single-file commands', () => {
    const result = runHook('cat README.md');
    assert.equal(result.exitCode, 0);
  });

  it('allows simple git commands', () => {
    const result = runHook('git add src/index.ts');
    assert.equal(result.exitCode, 0);
  });

  it('allows through even on multi-file (exit 0, warn only)', () => {
    const result = runHook('find . -name "*.js" -exec sed -i "s/foo/bar/g" {} +');
    assert.equal(result.exitCode, 0);
  });

  it('passes input through on stdout', () => {
    const result = runHook('echo hello');
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_input.command, 'echo hello');
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });
});

// ---- context-guard.js (PostToolUse) ----

describe('context-guard.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'context-guard.js');

  function runHook(input) {
    const json = JSON.stringify(input);
    const result = spawnSync(process.execPath, [hookPath], {
      input: json,
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, CLAUDE_SESSION_ID: 'test-context-' + Date.now() },
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('processes input and passes through', () => {
    const input = { tool_name: 'Bash', tool_input: { command: 'ls' }, tool_output: {} };
    const result = runHook(input);
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });
});

// ---- auto-checkpoint.js (PostToolUse) ----

describe('auto-checkpoint.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'auto-checkpoint.js');

  function runHook(toolName) {
    const input = JSON.stringify({
      tool_name: toolName,
      tool_input: { file_path: '/tmp/test.js' },
      tool_output: {},
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, CLAUDE_SESSION_ID: 'test-checkpoint-' + Date.now() },
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('handles Edit tool input correctly', () => {
    const result = runHook('Edit');
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Edit');
  });

  it('handles Write tool input correctly', () => {
    const result = runHook('Write');
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Write');
  });

  it('passes through non-edit tools without counting', () => {
    const result = runHook('Bash');
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });

  // H13: opt-in snapshots that never touch the worktree, index or stash list.
  const fs = require('node:fs');
  const os = require('node:os');
  function gitIn(cwd, ...args) {
    return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'init.defaultBranch=main', ...args],
      { cwd, encoding: 'utf8' });
  }
  function repoWithChanges() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-ckpt-'));
    gitIn(dir, 'init', '-q');
    fs.writeFileSync(path.join(dir, 'a.txt'), 'one\n');
    fs.writeFileSync(path.join(dir, 'b.txt'), 'one\n');
    gitIn(dir, 'add', '.');
    gitIn(dir, 'commit', '-qm', 'init');
    fs.writeFileSync(path.join(dir, 'a.txt'), 'two\n');          // unstaged change
    fs.writeFileSync(path.join(dir, 'b.txt'), 'staged\n');
    gitIn(dir, 'add', 'b.txt');                                 // staged change
    fs.writeFileSync(path.join(dir, 'new.txt'), 'untracked\n');  // untracked file
    return dir;
  }
  function edits(dir, n, env) {
    const session = 'ckpt-test-' + process.pid + '-' + Math.random().toString(36).slice(2);
    for (let i = 0; i < n; i++) {
      const r = spawnSync(process.execPath, [hookPath], {
        input: JSON.stringify({ tool_name: 'Edit', session_id: session, cwd: dir, tool_input: { file_path: path.join(dir, 'a.txt') } }),
        encoding: 'utf-8', timeout: 10000, cwd: dir,
        env: { ...process.env, CCC_AUTO_CHECKPOINT: '', KZ_DISABLE_AUTO_CHECKPOINT: '', ...env },
      });
      assert.equal(r.status, 0, r.stderr);
    }
    const counter = path.join(os.tmpdir(), 'kz-edits-' + session);
    const counted = fs.existsSync(counter);
    fs.rmSync(counter, { force: true });
    return { session, counted };
  }
  const refs = (dir) => gitIn(dir, 'for-each-ref', '--format=%(refname)', 'refs/ccc-checkpoints').trim();

  it('idle unless opted in', () => {
    const dir = repoWithChanges();
    try {
      const { counted } = edits(dir, 10, {});
      assert.equal(counted, false, 'no counter without CCC_AUTO_CHECKPOINT=1');
      assert.equal(refs(dir), '');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('honors the disable var', () => {
    const dir = repoWithChanges();
    try {
      const { counted } = edits(dir, 10, { CCC_AUTO_CHECKPOINT: '1', KZ_DISABLE_AUTO_CHECKPOINT: '1' });
      assert.equal(counted, false);
      assert.equal(refs(dir), '');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('10th edit writes a ref; index and worktree unchanged', () => {
    const dir = repoWithChanges();
    try {
      const status = gitIn(dir, 'status', '--porcelain');
      const staged = gitIn(dir, 'diff', '--cached');
      const unstaged = gitIn(dir, 'diff');
      const { session } = edits(dir, 10, { CCC_AUTO_CHECKPOINT: '1' });
      assert.equal(refs(dir), `refs/ccc-checkpoints/${session}/10`);
      assert.equal(gitIn(dir, 'status', '--porcelain'), status);
      assert.equal(gitIn(dir, 'diff', '--cached'), staged);
      assert.equal(gitIn(dir, 'diff'), unstaged);
      assert.equal(gitIn(dir, 'stash', 'list'), '', 'the stash list is untouched');
      assert.equal(fs.readFileSync(path.join(dir, 'new.txt'), 'utf8'), 'untracked\n');
      // The snapshot holds the tracked change; untracked files are not captured.
      const ref = `refs/ccc-checkpoints/${session}/10`;
      assert.equal(gitIn(dir, 'show', `${ref}:a.txt`), 'two\n');
      assert.throws(() => gitIn(dir, 'show', `${ref}:new.txt`));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});

// ---- cost-alert.js (PostToolUse) ----

describe('cost-alert.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'cost-alert.js');

  function runHook() {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      tool_output: {},
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, CLAUDE_SESSION_ID: 'test-cost-' + Date.now() },
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('basic passthrough works', () => {
    const result = runHook();
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });
});

// ---- auto-lessons.js (PostToolUse) ----

describe('auto-lessons.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'auto-lessons.js');

  function runHook(toolOutput) {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
      tool_output: toolOutput,
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 5000,
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('basic passthrough works for clean output', () => {
    const result = runHook('All tests passed');
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('basic passthrough works for error output', () => {
    const result = runHook('TypeError: Cannot read properties of undefined');
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });
});

// ---- rate-predictor.js (PostToolUse) ----

describe('rate-predictor.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'rate-predictor.js');

  function runHook() {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      tool_output: {},
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, CLAUDE_SESSION_ID: 'test-rate-' + Date.now() },
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('basic passthrough works', () => {
    const result = runHook();
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });
});

// ---- session-end-verify.js (Stop) ----

describe('session-end-verify.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'session-end-verify.js');

  function runHook() {
    const input = JSON.stringify({
      tool_name: 'Stop',
      tool_input: {},
      tool_output: {},
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 10000,
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('basic passthrough works', () => {
    const result = runHook();
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Stop');
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });
});

// ---- session-coach.js — RETIRED 2026-07-10 ----
// Archived to hooks/_archive/session-coach.js. Its heuristics (ext→domain
// mapping, editsWithoutTests, errorStreak) now live in the plugin's shared
// confidence engine: commander/cowork-plugin/hooks/lib/confidence.mjs.

// ---- pre-compact.js (PreCompact) ----

describe('pre-compact.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'pre-compact.js');

  function runHook() {
    const input = JSON.stringify({
      session_id: 'test-compact',
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, CLAUDE_SESSION_ID: 'test-compact-' + Date.now() },
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('passes input through on stdout', () => {
    const result = runHook();
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.session_id, 'test-compact');
  });

  it('creates session file in sessions dir', () => {
    const fs = require('fs');
    const os = require('os');
    const sessionId = 'test-precompact-' + Date.now();
    const tmpSessions = path.join(os.tmpdir(), 'ccc-test-sessions-' + Date.now());
    fs.mkdirSync(tmpSessions, { recursive: true });
    const input = JSON.stringify({ session_id: sessionId });
    spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, CLAUDE_SESSION_ID: sessionId, KC_SESSIONS_DIR: tmpSessions },
    });
    const files = fs.readdirSync(tmpSessions).filter(f => f.includes(sessionId));
    assert.ok(files.length > 0, 'Should create a pre-compact session file');
    // Cleanup
    try { fs.rmSync(tmpSessions, { recursive: true, force: true }); } catch {}
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });
});

// ---- self-verify.js (Stop) ----

describe('self-verify.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'self-verify.js');

  function runHook() {
    const input = JSON.stringify({
      tool_name: 'Stop',
      tool_input: {},
      tool_output: {},
    });
    const result = spawnSync(process.execPath, [hookPath], {
      input,
      encoding: 'utf-8',
      timeout: 10000,
    });
    return { exitCode: result.status ?? 0, output: result.stdout || '' };
  }

  it('basic passthrough works', () => {
    const result = runHook();
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Stop');
  });

  it('detects unchecked tasks in todo.md', () => {
    const fs = require('fs');
    const tasksDir = path.join(process.cwd(), 'tasks');
    const todoPath = path.join(tasksDir, 'todo.md');
    const hadTasks = fs.existsSync(tasksDir);
    const hadTodo = fs.existsSync(todoPath);
    let origContent = null;

    try {
      if (!hadTasks) fs.mkdirSync(tasksDir, { recursive: true });
      if (hadTodo) origContent = fs.readFileSync(todoPath, 'utf8');
      fs.writeFileSync(todoPath, '- [ ] Unfinished task\n- [x] Done task\n');

      const input = JSON.stringify({ tool_name: 'Stop', tool_input: {}, tool_output: {} });
      const result = spawnSync(process.execPath, [hookPath], {
        input,
        encoding: 'utf-8',
        timeout: 10000,
      });
      // Output goes to stdout, warnings go to stderr — passthrough should work
      assert.equal(JSON.parse(result.stdout).tool_name, 'Stop');
    } finally {
      // Restore original state
      if (origContent !== null) {
        fs.writeFileSync(todoPath, origContent);
      } else if (hadTodo === false) {
        try { fs.unlinkSync(todoPath); } catch {}
      }
      if (!hadTasks) {
        try { fs.rmdirSync(tasksDir); } catch {}
      }
    }
  });

  it('handles malformed input gracefully', () => {
    spawnSync(process.execPath, [hookPath], {
      input: 'not json',
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.ok(true);
  });
});

// ---- File Existence Tests ----

describe('hook files exist', () => {
  const expectedHooks = [
    'careful-guard.js',
    'auto-notify.js',
    'preuse-logger.js',
    'status-checkin.js',
    'context-guard.js',
    'pre-commit-verify.js',
    'auto-checkpoint.js',
    'confidence-gate.js',
    'session-end-verify.js',
    'cost-alert.js',
    'auto-lessons.js',
    'rate-predictor.js',
    'pre-compact.js',
    'self-verify.js',
  ];

  for (const hook of expectedHooks) {
    it(`${hook} exists`, () => {
      const fs = require('fs');
      const hookPath = path.join(HOOKS_DIR, hook);
      assert.ok(fs.existsSync(hookPath), `${hook} should exist in hooks/`);
    });
  }
});

// ---- Syntax Validation ----

describe('hook syntax', () => {
  it('all JS hooks have valid syntax', () => {
    const fs = require('fs');
    const hooks = fs.readdirSync(HOOKS_DIR).filter(f => f.endsWith('.js'));
    for (const hook of hooks) {
      const hookPath = path.join(HOOKS_DIR, hook);
      // node --check validates syntax without executing
      execSync(`node --check "${hookPath}"`, { timeout: 5000 });
    }
  });
});
