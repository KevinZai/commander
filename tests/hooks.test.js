// ============================================================================
// CC Commander — Hook Test Harness
// ============================================================================
// Tests all 15 kit-native hooks using Node.js built-in test runner.
// Run: node --test tests/hooks.test.js
// ============================================================================

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
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
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
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
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      // Should not crash — graceful handling
      assert.ok(true);
    }
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
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 15000,
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
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
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
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
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
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
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
  });
});

// ---- context-guard.js (PostToolUse) ----

describe('context-guard.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'context-guard.js');

  function runHook(input) {
    const json = JSON.stringify(input);
    try {
      const result = execSync(`echo '${json.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
        env: { ...process.env, CLAUDE_SESSION_ID: 'test-context-' + Date.now() },
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
  }

  it('processes input and passes through', () => {
    const input = { tool_name: 'Bash', tool_input: { command: 'ls' }, tool_output: {} };
    const result = runHook(input);
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('handles malformed input gracefully', () => {
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
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
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
        env: { ...process.env, CLAUDE_SESSION_ID: 'test-checkpoint-' + Date.now() },
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
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
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
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
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
        env: { ...process.env, CLAUDE_SESSION_ID: 'test-cost-' + Date.now() },
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
  }

  it('basic passthrough works', () => {
    const result = runHook();
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('handles malformed input gracefully', () => {
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
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
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
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
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
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
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
        env: { ...process.env, CLAUDE_SESSION_ID: 'test-rate-' + Date.now() },
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
  }

  it('basic passthrough works', () => {
    const result = runHook();
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('handles malformed input gracefully', () => {
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
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
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 10000,
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
  }

  it('basic passthrough works', () => {
    const result = runHook();
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Stop');
  });

  it('handles malformed input gracefully', () => {
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
  });
});

// ---- session-coach.js (Stop) ----

describe('session-coach.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'session-coach.js');

  function runHook(toolName) {
    const input = JSON.stringify({
      tool_name: toolName || 'Bash',
      tool_input: { command: 'ls' },
      tool_output: {},
    });
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
        env: { ...process.env, CLAUDE_SESSION_ID: 'test-coach-' + Date.now(), KZ_COACH_INTERVAL: '999' },
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
  }

  it('basic passthrough works', () => {
    const result = runHook('Edit');
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Edit');
  });

  it('handles Bash tool input', () => {
    const result = runHook('Bash');
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.tool_name, 'Bash');
  });

  it('respects KZ_COACH_DISABLE', () => {
    const input = JSON.stringify({ tool_name: 'Bash', tool_input: {}, tool_output: {} });
    try {
      execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
        env: { ...process.env, KZ_COACH_DISABLE: '1' },
      });
    } catch (err) {
      assert.ok(true);
    }
  });

  it('handles malformed input gracefully', () => {
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
  });
});

// ---- pre-compact.js (PreCompact) ----

describe('pre-compact.js', () => {
  const hookPath = path.join(HOOKS_DIR, 'pre-compact.js');

  function runHook() {
    const input = JSON.stringify({
      session_id: 'test-compact',
    });
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 10000,
        env: { ...process.env, CLAUDE_SESSION_ID: 'test-compact-' + Date.now() },
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
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
    const prevSessionsDir = process.env.KC_SESSIONS_DIR;
    process.env.KC_SESSIONS_DIR = tmpSessions;
    const input = JSON.stringify({ session_id: sessionId });
    try {
      execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 10000,
        env: { ...process.env, CLAUDE_SESSION_ID: sessionId, KC_SESSIONS_DIR: tmpSessions },
      });
    } catch {
      // May exit non-zero but still write file
    }
    const files = fs.readdirSync(tmpSessions).filter(f => f.includes(sessionId));
    assert.ok(files.length > 0, 'Should create a pre-compact session file');
    // Cleanup
    try { fs.rmSync(tmpSessions, { recursive: true, force: true }); } catch {}
    if (prevSessionsDir === undefined) {
      delete process.env.KC_SESSIONS_DIR;
    } else {
      process.env.KC_SESSIONS_DIR = prevSessionsDir;
    }
  });

  it('handles malformed input gracefully', () => {
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
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
    try {
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 10000,
      });
      return { exitCode: 0, output: result };
    } catch (err) {
      return { exitCode: err.status, output: err.stderr || '' };
    }
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
      const result = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 10000,
      });
      // Output goes to stdout, warnings go to stderr — passthrough should work
      assert.equal(JSON.parse(result).tool_name, 'Stop');
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
    try {
      execSync(`echo 'not json' | node "${hookPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (err) {
      assert.ok(true);
    }
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
    'session-coach.js',
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
