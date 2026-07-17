'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK_PATH = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'skill-runs-logger.js'
);
const HOOKS_JSON = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'hooks',
  'hooks.json'
);

function runHook(input, envOverrides = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-skill-runs-test-'));
  const result = spawnSync('node', [HOOK_PATH], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    timeout: 5000,
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      ...envOverrides,
    },
  });
  const logFile = path.join(
    home,
    '.claude',
    'commander',
    'skill-runs.jsonl'
  );
  const rawLog = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
  const entries = rawLog
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  let parsed = null;
  try {
    parsed = JSON.parse((result.stdout || '').trim());
  } catch {
    // Assertion messages below report invalid output.
  }
  fs.rmSync(home, { recursive: true, force: true });
  return { result, parsed, rawLog, entries };
}

describe('skill-runs-logger — capture and privacy', () => {
  it('logs a slash prompt with a lowercased skill and session ID', () => {
    const run = runHook({
      prompt: '/CCC:Browse inspect this page',
      session_id: 'session-123',
    });

    assert.equal(run.result.status, 0);
    assert.deepEqual(run.parsed, { continue: true, suppressOutput: true });
    assert.equal(run.entries.length, 1);
    assert.equal(run.entries[0].skill, 'ccc:browse');
    assert.equal(run.entries[0].session_id, 'session-123');
    assert.ok(!Number.isNaN(Date.parse(run.entries[0].ts)));
  });

  it('does not log a plain prompt', () => {
    const run = runHook({ prompt: 'Please run ccc-browse for me' });

    assert.equal(run.result.status, 0);
    assert.deepEqual(run.parsed, { continue: true, suppressOutput: true });
    assert.deepEqual(run.entries, []);
  });

  it('stores only the slash-command name, never the prompt body', () => {
    const secretBody = 'private body that must not be persisted';
    const run = runHook({
      user_prompt: `/make-plan ${secretBody}`,
    }, { CLAUDE_SESSION_ID: 'env-session' });

    assert.equal(run.entries.length, 1);
    assert.deepEqual(Object.keys(run.entries[0]), ['ts', 'skill', 'source_app', 'session_id']);
    assert.equal(run.entries[0].skill, 'make-plan');
    assert.equal(run.entries[0].session_id, 'env-session');
    assert.doesNotMatch(run.rawLog, new RegExp(secretBody));
  });
});

describe('skill-runs-logger — resilience', () => {
  it('fails open with JSON output for malformed stdin', () => {
    const run = runHook('{{{not json');

    assert.equal(run.result.status, 0);
    assert.deepEqual(run.parsed, { continue: true, suppressOutput: true });
    assert.deepEqual(run.entries, []);
  });

  it('fails open without logging stdin over 256KB', () => {
    const run = runHook(
      JSON.stringify({ prompt: `/ccc-browse ${'x'.repeat(256 * 1024)}` })
    );

    assert.equal(run.result.status, 0);
    assert.deepEqual(run.parsed, { continue: true, suppressOutput: true });
    assert.deepEqual(run.entries, []);
  });
});

describe('skill-runs-logger — registration', () => {
  it('tags every entry with source_app claude-code outside Codex', () => {
    const run = runHook({ prompt: '/ccc-review the diff', session_id: 's1' });
    assert.equal(run.result.status, 0);
    assert.equal(run.entries.length, 1);
    assert.equal(run.entries[0].source_app, 'claude-code');
  });

  it('tags entries as codex when CODEX_PLUGIN_ROOT is set', () => {
    const run = runHook(
      { prompt: '/ccc-review the diff', session_id: 's1' },
      { CODEX_PLUGIN_ROOT: '/tmp/codex-plugin' }
    );
    assert.equal(run.result.status, 0);
    assert.equal(run.entries.length, 1);
    assert.equal(run.entries[0].source_app, 'codex');
  });

  it('ignores built-in CLI commands like /model and /clear', () => {
    for (const prompt of ['/model claude-opus-4-8', '/clear', '/compact now', '/config']) {
      const run = runHook({ prompt, session_id: 's1' });
      assert.equal(run.result.status, 0);
      assert.equal(run.entries.length, 0, prompt + ' must not be logged as a skill');
    }
  });

  it('is registered as an async UserPromptSubmit hook', () => {
    const hooksJson = JSON.parse(fs.readFileSync(HOOKS_JSON, 'utf8'));
    const logger = (hooksJson.hooks.UserPromptSubmit || [])
      .flatMap((group) => group.hooks || [])
      .find((hook) => (hook.command || '').includes('skill-runs-logger.js'));

    assert.deepEqual(logger, {
      type: 'command',
      command: 'node ${CLAUDE_PLUGIN_ROOT}/hooks/skill-runs-logger.js',
      timeout: 3000,
      async: true,
    });
  });
});
