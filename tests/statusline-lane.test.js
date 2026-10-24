'use strict';

// Lane hint in the status line (🔑 segment): derived from the CLAUDE_CONFIG_DIR
// basename. ".claude-<lane>" shows <lane>; unset or plain ".claude" shows "pri";
// other names keep the ClaudeSwap / API-key-tail / n/a fallbacks.

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stripVTControlCharacters } = require('node:util');

const STATUSLINE = path.join(__dirname, '..', 'lib', 'statusline.sh');
// Fixture only: the status line shows the last 3 characters of the key.
const FAKE_KEY = 'x'.repeat(16) + 'xyz';
const HAS_JQ = spawnSync('jq', ['--version']).status === 0;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc statusline lane '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'home dir');
  const project = path.join(root, 'session project');
  const toolkit = path.join(root, 'toolkit checkout');
  fs.mkdirSync(home);
  fs.mkdirSync(project);
  fs.mkdirSync(path.join(toolkit, 'lib'), { recursive: true });
  fs.copyFileSync(STATUSLINE, path.join(toolkit, 'lib', 'statusline.sh'));
  return { root, home, project, toolkit };
}

function keyHint(f, env) {
  const fullEnv = { PATH: process.env.PATH, HOME: f.home, LC_ALL: 'C', ...env };
  for (const k of Object.keys(fullEnv)) if (fullEnv[k] === undefined) delete fullEnv[k];
  const result = spawnSync('bash', ['lib/statusline.sh'], {
    cwd: f.toolkit,
    env: fullEnv,
    encoding: 'utf8',
    timeout: 10_000,
    input: JSON.stringify({
      session_id: 'statusline-lane-test',
      cwd: f.project,
      model: { id: 'test-model', display_name: 'Claude' },
      workspace: { current_dir: f.project, project_dir: f.project },
      cost: { total_cost_usd: 0.5, total_duration_ms: 60_000 },
      context_window: { used_percentage: 10, total_input_tokens: 1000, total_output_tokens: 100 },
    }),
  });
  assert.ifError(result.error);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(result.stderr, '', 'status line must fail quietly');
  const out = stripVTControlCharacters(result.stdout);
  const m = out.match(/🔑 (\S+)/);
  assert.ok(m, `no key hint in output: ${out}`);
  return m[1];
}

for (const lane of ['ai1', 'ai2', 'ai3', 'ai4']) {
  test(`~/.claude-${lane} shows lane ${lane}`, (t) => {
    const f = fixture(t);
    assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, `.claude-${lane}`) }), lane);
  });
}

test('other lane names like .claude-gn are generic, not a fixed list', (t) => {
  const f = fixture(t);
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-gn') }), 'gn');
});

test('unset CLAUDE_CONFIG_DIR is the primary lane', (t) => {
  const f = fixture(t);
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: undefined }), 'pri');
});

test('empty CLAUDE_CONFIG_DIR is the primary lane', (t) => {
  const f = fixture(t);
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: '' }), 'pri');
});

test('plain ~/.claude is the primary lane, with or without trailing slash', (t) => {
  const f = fixture(t);
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude') }), 'pri');
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: `${path.join(f.home, '.claude')}/` }), 'pri');
});

test('trailing slashes are ignored', (t) => {
  const f = fixture(t);
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: `${path.join(f.home, '.claude-ai2')}/` }), 'ai2');
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: `${path.join(f.home, '.claude-ai3')}///` }), 'ai3');
});

test('relative .claude-<lane> paths work', (t) => {
  const f = fixture(t);
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: '.claude-ai4' }), 'ai4');
});

test('odd lane names are sanitized to safe characters and capped at 16', (t) => {
  const f = fixture(t);
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-My Lane!') }), 'MyLane');
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-team.v2_x-1') }), 'team.v2_x-1');
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-abcdefghijklmnopq') }), 'abcdefghijklmnop');
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-\u001b[31mred') }), '31mred');
});

test('lane names up to 16 characters show in full (guestnetworks)', (t) => {
  const f = fixture(t);
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-guestnetworks') }), 'guestnetworks');
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-abcdefghijklmnop') }), 'abcdefghijklmnop');
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-abcdefghijklmnopQ') }), 'abcdefghijklmnop');
});

test('only the basename matters: a .claude-<lane> parent does not leak', (t) => {
  const f = fixture(t);
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-ai1', 'nested') }), 'n/a');
});

test('non-lane config dir names keep the older fallbacks', (t) => {
  const f = fixture(t);
  for (const name of ['claude config', '.claude-', '.claude-!!!', '.claudeai1', 'claude-ai1', '.claude.bak']) {
    assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, name) }), 'n/a', name);
  }
  assert.strictEqual(
    keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, 'claude config'), ANTHROPIC_API_KEY: FAKE_KEY }),
    'xyz',
  );
});

test('a lane wins over the global ClaudeSwap state; odd names still use it', { skip: !HAS_JQ && 'jq not on PATH' }, (t) => {
  const f = fixture(t);
  const swap = path.join(f.home, '.config', 'claudeswap-state.json');
  fs.mkdirSync(path.dirname(swap), { recursive: true });
  fs.writeFileSync(swap, JSON.stringify({ accounts: { 'max-secondary': { last_used: 2 }, 'max-primary': { last_used: 1 } } }));
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-ai1') }), 'ai1');
  assert.strictEqual(keyHint(f, { CLAUDE_CONFIG_DIR: path.join(f.home, 'claude config') }), 'sec');
});
