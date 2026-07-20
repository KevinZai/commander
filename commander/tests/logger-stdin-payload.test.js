'use strict';

// Pins the stdin-payload contract for two loggers whose fields were being read
// from absent env vars / wrong paths, producing skeleton rows (v7.0 Phase 1):
//   - user-prompt-submit.js  : must read `prompt`/`user_input` + `session_id`
//                              from STDIN (was CLAUDE_USER_PROMPT env → always 0).
//   - task-tracker.js        : TaskCreated nests human fields under `task_input`.

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOKS = path.join(__dirname, '..', 'cowork-plugin', 'hooks');
const TMP_HOME = path.join(os.tmpdir(), 'ccc-logger-stdin-test-' + process.pid);

function run(hookFile, stdinPayload) {
  const env = { ...process.env, HOME: TMP_HOME, USERPROFILE: TMP_HOME };
  delete env.CLAUDE_USER_PROMPT;
  delete env.CLAUDE_SESSION_ID;
  const result = spawnSync('node', [path.join(HOOKS, hookFile)], {
    input:
      typeof stdinPayload === 'string' ? stdinPayload : JSON.stringify(stdinPayload),
    encoding: 'utf-8',
    timeout: 6000,
    env,
  });
  return { exitCode: result.status ?? 0, stdout: result.stdout || '' };
}

function lastRow(file) {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  return lines.length ? JSON.parse(lines.at(-1)) : null;
}

before(() => fs.mkdirSync(TMP_HOME, { recursive: true }));
after(() => fs.rmSync(TMP_HOME, { recursive: true, force: true }));

describe('user-prompt-submit.js — stdin metadata', () => {
  const FILE = path.join(TMP_HOME, '.claude', 'commander', 'analytics', 'prompt-metadata.jsonl');
  beforeEach(() => fs.existsSync(FILE) && fs.unlinkSync(FILE));

  it('measures the prompt delivered on stdin (not the absent env var)', () => {
    const r = run('user-prompt-submit.js', {
      session_id: 'sess-1',
      prompt: 'refactor the parser ```js\ncode\n``` https://x.test',
    });
    assert.equal(r.exitCode, 0);
    const row = lastRow(FILE);
    assert.equal(row.sessionId, 'sess-1');
    assert.ok(row.promptLength > 0, 'promptLength must reflect the stdin prompt');
    assert.equal(row.hasCode, true);
    assert.equal(row.hasUrl, true);
  });

  it('accepts the `user_input` field name as well', () => {
    const r = run('user-prompt-submit.js', { session_id: 's', user_input: 'hello there' });
    assert.equal(r.exitCode, 0);
    assert.equal(lastRow(FILE).promptLength, 'hello there'.length);
  });

  it('NEVER writes the raw prompt text to disk', () => {
    run('user-prompt-submit.js', { session_id: 's', prompt: 'SECRET-sentinel-xyz' });
    const raw = fs.readFileSync(FILE, 'utf8');
    assert.equal(raw.includes('SECRET-sentinel-xyz'), false, 'raw prompt must never be logged');
  });
});

describe('task-tracker.js — TaskCreated task_input', () => {
  const FILE = path.join(TMP_HOME, '.claude', 'commander', 'tasks.jsonl');
  beforeEach(() => fs.existsSync(FILE) && fs.unlinkSync(FILE));

  it('reads title + description nested under task_input', () => {
    run('task-tracker.js', {
      task_id: '42',
      task_input: { title: 'Ship the widget', description: 'full description' },
      session_id: 's',
    });
    const row = lastRow(FILE);
    assert.equal(row.task_id, '42');
    assert.equal(row.title, 'Ship the widget');
    assert.equal(row.subject, 'full description');
  });

  it('still reads flat title/subject (TaskCompleted shape)', () => {
    run('task-tracker.js', { task_id: '7', status: 'completed', title: 'Flat title' });
    const row = lastRow(FILE);
    assert.equal(row.status, 'completed');
    assert.equal(row.title, 'Flat title');
  });
});
