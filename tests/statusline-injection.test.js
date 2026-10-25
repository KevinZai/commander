'use strict';

// FLT-187 / audit H1: the status line used to `eval` jq output that wrapped
// statusLine JSON strings in bare single quotes, so a `'` in a directory,
// model or agent name ran shell code on every refresh. Values must reach the
// shell as data only.

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stripVTControlCharacters } = require('node:util');

const STATUSLINE = path.join(__dirname, '..', 'lib', 'statusline.sh');
const HAS_JQ = spawnSync('jq', ['--version']).status === 0;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc statusline inject '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'home');
  const toolkit = path.join(root, 'toolkit');
  fs.mkdirSync(home);
  fs.mkdirSync(path.join(toolkit, 'lib'), { recursive: true });
  fs.copyFileSync(STATUSLINE, path.join(toolkit, 'lib', 'statusline.sh'));
  return { root, home, toolkit };
}

function run(f, payload) {
  const result = spawnSync('bash', ['lib/statusline.sh'], {
    cwd: f.toolkit,
    env: { PATH: process.env.PATH, HOME: f.home, LC_ALL: 'C' },
    encoding: 'utf8',
    timeout: 10_000,
    input: JSON.stringify(payload),
  });
  if (result.error) throw result.error;
  return stripVTControlCharacters(result.stdout);
}

function payload(over) {
  return {
    session_id: 'statusline-injection-test',
    model: { id: 'test-model', display_name: 'Claude' },
    workspace: { current_dir: '/tmp', project_dir: '/tmp' },
    cost: { total_cost_usd: 0.5, total_duration_ms: 60_000 },
    context_window: { used_percentage: 10, total_input_tokens: 1000, total_output_tokens: 100 },
    ...over,
  };
}

test('quotes, $() and backticks in statusLine strings never execute', { skip: !HAS_JQ && 'jq not installed' }, (t) => {
  const f = fixture(t);
  const pwned = (tag) => path.join(f.root, `PWNED-${tag}`);
  const breakout = (tag) => `x'; touch '${pwned(tag)}'; echo '`;
  const subst = (tag) => `$(touch '${pwned(tag)}')\`touch '${pwned(tag)}-bt'\``;
  const dir = path.join(f.root, "it's a dir");
  fs.mkdirSync(dir);

  run(f, payload({ workspace: { current_dir: breakout('cwd'), project_dir: breakout('pd') } }));
  run(f, payload({ model: { id: breakout('id'), display_name: breakout('model') }, agent: { name: breakout('agent') } }));
  run(f, payload({ model: { id: 'm', display_name: subst('subst') }, tool_use: { name: breakout('tool') } }));
  run(f, payload({ context_window: { used_percentage: `1; touch '${pwned('num')}'` } }));
  run(f, payload({ workspace: { current_dir: dir, project_dir: dir } }));

  const created = fs.readdirSync(f.root).filter((n) => n.startsWith('PWNED'));
  assert.deepStrictEqual(created, [], 'statusLine input executed as shell code');
});

test('ordinary input still renders the model and project', { skip: !HAS_JQ && 'jq not installed' }, (t) => {
  const f = fixture(t);
  const project = path.join(f.root, "Kevin's app");
  fs.mkdirSync(project);
  const out = run(f, payload({ model: { id: 'claude-opus-5-5', display_name: 'Opus 5.5' }, workspace: { current_dir: project, project_dir: project } }));
  assert.match(out, /│ Opus │/);
  assert.match(out, /Kevin's app/, 'a quote in the project name is shown, not dropped');
});
