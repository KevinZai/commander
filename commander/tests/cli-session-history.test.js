'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const cli = path.resolve(__dirname, '../../bin/kc.js');

function fixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc history '));
  const config = path.join(home, '.claude-test');
  const sessions = path.join(config, 'commander', 'sessions');
  fs.mkdirSync(sessions, { recursive: true });
  return { home, config, sessions };
}

function run(f, json) {
  const result = spawnSync(process.execPath, [cli, '--list-sessions', ...(json ? ['--json'] : [])], {
    env: { ...process.env, HOME: f.home, CCC_CONFIG_DIR: f.config, CLAUDE_CONFIG_DIR: f.config },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout;
}

function write(f, name, value, time) {
  const file = path.join(f.sessions, name + '.json');
  fs.writeFileSync(file, JSON.stringify(value));
  if (time) fs.utimesSync(file, time, time);
}

test('CLI session history emits an empty JSON array or no text for a fresh lane', () => {
  const f = fixture();
  assert.equal(run(f, true), '[]\n');
  assert.equal(run(f, false), '');
});

test('CLI session history preserves JSON fields and skips malformed records', () => {
  const f = fixture();
  const session = { id: 'task-1', task: 'Review a change', status: 'done', detail: { turns: 3 } };
  write(f, 'valid', session);
  fs.writeFileSync(path.join(f.sessions, 'broken.json'), '{');
  assert.deepEqual(JSON.parse(run(f, true)), [session]);
});

test('CLI session history text truncates long tasks and supplies missing-field fallbacks', () => {
  const f = fixture();
  write(f, 'recent', { id: 'task-2', task: 'x'.repeat(80), status: 'running' }, 2000);
  write(f, 'older', {}, 1000);
  assert.equal(run(f, false), 'task-2 | ' + 'x'.repeat(60) + ' | running\n? |  | ?\n');
});

test('CLI session history returns the newest 50 records in descending order', () => {
  const f = fixture();
  for (let i = 0; i < 55; i++) write(f, String(i), { id: String(i) }, 1000 + i);
  assert.deepEqual(JSON.parse(run(f, true)).map(s => s.id),
    Array.from({ length: 50 }, (_, i) => String(54 - i)));
});
