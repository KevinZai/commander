'use strict';

// CC-2110: statusLine JSON fields are untrusted (workspace.current_dir, model
// name, ...). lib/statusline.sh must read them as data, never eval them.

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stripVTControlCharacters } = require('node:util');

const STATUSLINE = path.join(__dirname, '..', 'lib', 'statusline.sh');
const HAS_JQ = spawnSync('jq', ['--version']).status === 0;
const SKIP = !HAS_JQ && 'jq not on PATH';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc statusline injection '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'home');
  const toolkit = path.join(root, 'toolkit');
  const sandbox = path.join(root, 'sandbox');
  fs.mkdirSync(home);
  fs.mkdirSync(sandbox);
  fs.mkdirSync(path.join(toolkit, 'lib'), { recursive: true });
  fs.copyFileSync(STATUSLINE, path.join(toolkit, 'lib', 'statusline.sh'));
  return { home, toolkit, sandbox };
}

function run(f, payload) {
  const result = spawnSync('bash', [path.join(f.toolkit, 'lib', 'statusline.sh')], {
    cwd: f.sandbox,
    env: { PATH: process.env.PATH, HOME: f.home, LC_ALL: 'C', CLAUDE_CONFIG_DIR: path.join(f.home, '.claude-ai2') },
    encoding: 'utf8',
    timeout: 10_000,
    input: JSON.stringify(payload),
  });
  assert.ifError(result.error);
  return result;
}

const SAMPLE = {
  model: { id: 'claude-opus', display_name: 'Opus 5.5' },
  workspace: { current_dir: '/work/my proj', project_dir: '/work/my proj' },
  cost: { total_cost_usd: 1.23, total_duration_ms: 3_723_000 },
  context_window: { used_percentage: 42, total_input_tokens: 84_000, total_output_tokens: 9_000 },
  agent: { name: 'builder' },
  tool_use: { name: 'Edit' },
};

// Captured from the pre-fix (eval-based) script on SAMPLE.
const EXPECTED = '\u001b[38;5;240m━━\u001b[0m \u001b[1;38;2;246;85;85mC\u001b[1;38;2;246;85;246mC\u001b[0m \u001b[38;5;240m│\u001b[0m ⚡\u001b[38;5;51mOpus\u001b[0m \u001b[38;5;240m│\u001b[0m 🔑 \u001b[38;5;145mai2\u001b[0m \u001b[38;5;240m│\u001b[0m 🧠 \u001b[38;5;39m42%\u001b[0m \u001b[38;5;240m│\u001b[0m 💰 \u001b[38;5;255m$1.23\u001b[0m \u001b[38;5;240m│\u001b[0m \u001b[38;5;51m↑\u001b[38;5;255m84K\u001b[38;5;51m↓\u001b[38;5;255m9K\u001b[0m \u001b[38;5;240m│\u001b[0m ⏰ \u001b[38;5;240m1h2m\u001b[0m \u001b[38;5;240m│\u001b[0m ⚡ \u001b[38;5;51mbuilder\u001b[0m \u001b[38;5;240m│\u001b[0m 📂 \u001b[38;5;238mmy proj\u001b[0m\n';

test('normal JSON renders byte-identically to the pre-fix output', { skip: SKIP }, (t) => {
  const f = fixture(t);
  const result = run(f, SAMPLE);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(result.stdout, EXPECTED);
});

for (const [field, make] of [
  ['workspace.current_dir', (v) => ({ workspace: { current_dir: v, project_dir: v } })],
  ['workspace.project_dir', (v) => ({ workspace: { current_dir: '/ok', project_dir: v } })],
  ['agent.name', (v) => ({ agent: { name: v } })],
  ['tool_use.name', (v) => ({ tool_use: { name: v } })],
  ['model.id', (v) => ({ model: { id: v, display_name: 'Opus' } })],
]) {
  test(`a quote and $(...) in ${field} is data, not shell`, { skip: SKIP }, (t) => {
    const f = fixture(t);
    const canary = path.join(f.sandbox, 'PWNED');
    const evil = `/tmp/x'$(touch '${canary}')'`;
    const result = run(f, { model: { display_name: 'Opus' }, ...make(evil) });
    assert.strictEqual(result.status, 0, result.stderr);
    assert.deepStrictEqual(fs.readdirSync(f.sandbox), [], 'payload must not execute');
    assert.ok(stripVTControlCharacters(result.stdout).includes('Opus'), result.stdout);
  });
}

test('injection through model.display_name does not execute and is rendered literally', { skip: SKIP }, (t) => {
  const f = fixture(t);
  const canary = path.join(f.sandbox, 'PWNED');
  const result = run(f, { model: { display_name: `Op'$(touch '${canary}')'us` } });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(fs.readdirSync(f.sandbox), []);
  assert.ok(stripVTControlCharacters(result.stdout).includes(`Op'$(touch '${canary}')'us`), result.stdout);
});

test('injection through the ClaudeSwap state file does not execute', { skip: SKIP }, (t) => {
  const f = fixture(t);
  const canary = path.join(f.sandbox, 'PWNED');
  const swap = path.join(f.home, '.config', 'claudeswap-state.json');
  fs.mkdirSync(path.dirname(swap), { recursive: true });
  fs.writeFileSync(swap, JSON.stringify({
    accounts: { a: { last_used: 1, five_hour_status: `x;touch '${canary}'`, seven_day_status: `x'$(touch '${canary}')'` } },
  }));
  const result = run(f, { model: { display_name: 'Opus' } });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(fs.readdirSync(f.sandbox), []);
  assert.ok(stripVTControlCharacters(result.stdout).includes('Opus'), result.stdout);
});

test('unit-separator and tab characters inside values do not shift other fields', { skip: SKIP }, (t) => {
  const f = fixture(t);
  const result = run(f, {
    ...SAMPLE,
    model: { id: 'demo-model', display_name: 'Demo\u001f\tModel' },
    workspace: { current_dir: '/work/a\u001fb\tc', project_dir: '/work/a\u001fb\tc' },
  });
  assert.strictEqual(result.status, 0, result.stderr);
  const out = stripVTControlCharacters(result.stdout);
  assert.ok(out.includes('Demo\u001f\tModel'), out);
  assert.ok(out.includes('42%'), out);
  assert.ok(out.includes('$1.23'), out);
  assert.ok(out.includes('84K') && out.includes('9K'), out);
  assert.ok(out.includes('builder'), out);
  assert.ok(out.includes('📂 a\u001fb\tc'), out);
});

// Verify-1 F2: numeric fields reach bash arithmetic, so a string such as
// "a[$(cmd)]" must be coerced to 0 by jq before it gets there.
const NUMERIC_FIELDS = [
  ['context_window.used_percentage', (v) => ({ context_window: { used_percentage: v } })],
  ['cost.total_cost_usd', (v) => ({ cost: { total_cost_usd: v } })],
  ['context_window.total_input_tokens', (v) => ({ context_window: { total_input_tokens: v } })],
  ['context_window.total_output_tokens', (v) => ({ context_window: { total_output_tokens: v } })],
  ['cost.total_duration_ms', (v) => ({ cost: { total_duration_ms: v } })],
  ['rate_limits.five_hour.used_percentage', (v) => ({ rate_limits: { five_hour: { used_percentage: v } } })],
  ['rate_limits.seven_day.used_percentage', (v) => ({ rate_limits: { seven_day: { used_percentage: v } } })],
];

for (const [field, make] of NUMERIC_FIELDS) {
  test(`a shell payload in numeric field ${field} is coerced, not evaluated`, { skip: SKIP }, (t) => {
    const f = fixture(t);
    const canary = path.join(f.sandbox, 'PWNED');
    const result = run(f, { model: { display_name: 'Opus' }, ...make(`a[$(touch '${canary}')]`) });
    assert.strictEqual(result.status, 0, result.stderr);
    assert.deepStrictEqual(fs.readdirSync(f.sandbox), [], 'payload must not execute');
    assert.ok(stripVTControlCharacters(result.stdout).includes('Opus'), result.stdout);
    assert.ok(!result.stderr.includes('syntax error'), result.stderr);
  });

  for (const odd of ['1e309', '-0', 'NaN', 'Infinity', '1e-7', '-5']) {
    test(`numeric field ${field} = ${JSON.stringify(odd)} renders without error`, { skip: SKIP }, (t) => {
      const f = fixture(t);
      const result = run(f, { model: { display_name: 'Opus' }, ...make(odd) });
      assert.strictEqual(result.status, 0, result.stderr);
      assert.strictEqual(result.stderr, '');
      assert.deepStrictEqual(fs.readdirSync(f.sandbox), []);
      const out = stripVTControlCharacters(result.stdout);
      assert.ok(out.includes('Opus') && out.includes('🧠'), out);
      assert.ok(!/-\d|e\+|NaN|Infinity/.test(out.replace(/Op.*?│/, '')), out);
    });
  }
}

test('a shell payload in the ClaudeSwap utilization fields is coerced, not evaluated', { skip: SKIP }, (t) => {
  const f = fixture(t);
  const canary = path.join(f.sandbox, 'PWNED');
  const swap = path.join(f.home, '.config', 'claudeswap-state.json');
  fs.mkdirSync(path.dirname(swap), { recursive: true });
  fs.writeFileSync(swap, JSON.stringify({
    accounts: { a: { last_used: 1, five_hour_utilization: `a[$(touch '${canary}')]`, seven_day_utilization: '0.5' } },
  }));
  const result = run(f, { model: { display_name: 'Opus' } });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(fs.readdirSync(f.sandbox), []);
  const out = stripVTControlCharacters(result.stdout);
  assert.ok(out.includes('Opus') && out.includes('⏱ 0%') && out.includes('📅 50%'), out);
});

test('percentages above 100 render capped at 100% (context, 5h and 7d)', { skip: SKIP }, (t) => {
  const f = fixture(t);
  const result = run(f, {
    ...SAMPLE,
    context_window: { ...SAMPLE.context_window, used_percentage: 250 },
    rate_limits: { five_hour: { used_percentage: 180 }, seven_day: { used_percentage: 4000 } },
  });
  assert.strictEqual(result.status, 0, result.stderr);
  const plain = stripVTControlCharacters(result.stdout);
  assert.match(plain, /🧠 100%/);
  assert.match(plain, /⏱ 100%/);
  assert.match(plain, /📅 100%/);
  assert.doesNotMatch(plain, /\b(250|180|4000)%/);
});
