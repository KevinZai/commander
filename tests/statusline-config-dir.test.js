'use strict';

// Skill count (🎯) and Linear ticket (📋) in the status line are lane-aware:
// they read ${CLAUDE_CONFIG_DIR:-$HOME/.claude}, never $HOME/.claude directly.

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stripVTControlCharacters } = require('node:util');

const STATUSLINE = path.join(__dirname, '..', 'lib', 'statusline.sh');
const HAS_JQ = spawnSync('jq', ['--version']).status === 0;

function seed(configDir, { skills = 0, ticket } = {}) {
  for (let i = 0; i < skills; i++) fs.mkdirSync(path.join(configDir, 'skills', `skill ${i}`), { recursive: true });
  if (ticket) {
    fs.mkdirSync(path.join(configDir, 'commander'), { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'commander', 'state.json'),
      JSON.stringify({ activeSession: { linearIssueIdentifier: ticket } }),
    );
  }
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc statusline config dir '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'home dir');
  const project = path.join(root, 'session project');
  const toolkit = path.join(root, 'toolkit checkout');
  const primary = path.join(home, '.claude');
  const lane = path.join(home, '.claude-ai1');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(path.join(toolkit, 'lib'), { recursive: true });
  fs.mkdirSync(primary, { recursive: true });
  fs.mkdirSync(lane, { recursive: true });
  fs.copyFileSync(STATUSLINE, path.join(toolkit, 'lib', 'statusline.sh'));
  return { home, project, toolkit, primary, lane };
}

function run(f, env) {
  const fullEnv = { PATH: process.env.PATH, HOME: f.home, LC_ALL: 'C', ...env };
  for (const k of Object.keys(fullEnv)) if (fullEnv[k] === undefined) delete fullEnv[k];
  const result = spawnSync('bash', ['lib/statusline.sh'], {
    cwd: f.toolkit,
    env: fullEnv,
    encoding: 'utf8',
    timeout: 10_000,
    input: JSON.stringify({
      session_id: 'statusline-config-dir-test',
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
  return stripVTControlCharacters(result.stdout);
}

const skills = (out) => (out.match(/🎯 (\d+)/) || [])[1];
const ticket = (out) => (out.match(/📋 (\S+)/) || [])[1];

test('CLAUDE_CONFIG_DIR set: skill count and ticket come from the lane dir', { skip: !HAS_JQ && 'jq not on PATH' }, (t) => {
  const f = fixture(t);
  seed(f.primary, { skills: 5, ticket: 'PRI-9' });
  seed(f.lane, { skills: 3, ticket: 'LANE-1' });
  const out = run(f, { CLAUDE_CONFIG_DIR: f.lane });
  assert.strictEqual(skills(out), '3', out);
  assert.strictEqual(ticket(out), 'LANE-1', out);
  assert.doesNotMatch(out, /PRI-9/);
});

test('CLAUDE_CONFIG_DIR unset: skill count and ticket come from $HOME/.claude', { skip: !HAS_JQ && 'jq not on PATH' }, (t) => {
  const f = fixture(t);
  seed(f.primary, { skills: 5, ticket: 'PRI-9' });
  seed(f.lane, { skills: 3, ticket: 'LANE-1' });
  const out = run(f, { CLAUDE_CONFIG_DIR: undefined });
  assert.strictEqual(skills(out), '5', out);
  assert.strictEqual(ticket(out), 'PRI-9', out);
});

test('CLAUDE_CONFIG_DIR empty is treated as unset', { skip: !HAS_JQ && 'jq not on PATH' }, (t) => {
  const f = fixture(t);
  seed(f.primary, { skills: 2, ticket: 'PRI-2' });
  const out = run(f, { CLAUDE_CONFIG_DIR: '' });
  assert.strictEqual(skills(out), '2', out);
  assert.strictEqual(ticket(out), 'PRI-2', out);
});

test('a lane with no skills or state never shows the primary lane values', (t) => {
  const f = fixture(t);
  seed(f.primary, { skills: 4, ticket: 'PRI-4' });
  const out = run(f, { CLAUDE_CONFIG_DIR: f.lane });
  assert.strictEqual(skills(out), undefined, out);
  assert.strictEqual(ticket(out), undefined, out);
  assert.doesNotMatch(out, /PRI-4/);
});
