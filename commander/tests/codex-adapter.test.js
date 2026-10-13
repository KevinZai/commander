'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const adapter = require('../adapters/codex');

function valueAfter(args, option) {
  const index = args.indexOf(option);
  return index === -1 ? undefined : args[index + 1];
}

test('default execution is headless and read-only without changing approval or auth', () => {
  const args = adapter.buildArgs('Inspect the failing check.');
  assert.ok(args.includes('exec'));
  assert.equal(valueAfter(args, '--sandbox'), 'read-only');
  assert.equal(valueAfter(args, '--ask-for-approval'), undefined);
  assert.equal(args.at(-1), 'Inspect the failing check.');
  assert.ok(!args.some((arg) => /dangerously|API_KEY|ignore-user-config|ignore-rules/.test(arg)));
});

test('legacy full-auto keeps workspace sandbox and on-request approval semantics', () => {
  const args = adapter.buildArgs('Implement the scoped fix.', { approval: 'full-auto' });
  assert.equal(valueAfter(args, '--ask-for-approval'), 'on-request');
  assert.ok(args.indexOf('--ask-for-approval') < args.indexOf('exec'));
  assert.equal(valueAfter(args, '--sandbox'), 'workspace-write');
  assert.ok(!args.includes('--full-auto'));
});

test('an explicit read-only sandbox wins over the full-auto compatibility default', () => {
  const args = adapter.buildArgs('Review only.', { approval: 'full-auto', sandbox: 'read-only' });
  assert.equal(valueAfter(args, '--sandbox'), 'read-only');
});

test('workspace, model and shell-looking prompt remain separate literal arguments', () => {
  const prompt = '--dangerously-bypass-approvals-and-sandbox $(untrusted)';
  const cwd = '/tmp/isolated worktree';
  const args = adapter.buildArgs(prompt, { sandbox: 'workspace-write', cwd, model: 'gpt-6-astra' });
  assert.equal(valueAfter(args, '--cd'), cwd);
  assert.equal(valueAfter(args, '--model'), 'gpt-6-astra');
  assert.equal(valueAfter(args, '--sandbox'), 'workspace-write');
  assert.equal(args.at(-2), '--');
  assert.equal(args.at(-1), prompt);
});

test('unsupported restriction and output options fail closed', () => {
  assert.throws(() => adapter.buildArgs('Review.', { allowedTools: ['Read'] }), /allowedTools/);
  assert.throws(() => adapter.buildArgs('Review.', { quiet: true }), /quiet/);
  assert.doesNotThrow(() => adapter.buildArgs('Review.', { allowedTools: [], quiet: false }));
});

test('invalid modes and structurally invalid input are rejected before dispatch', () => {
  assert.throws(() => adapter.buildArgs('Review.', { sandbox: 'danger-full-access' }), /sandbox/);
  assert.throws(() => adapter.buildArgs('Review.', { sandbox: 'typo' }), /sandbox/);
  assert.throws(() => adapter.buildArgs('Review.', { approval: 'bypass' }), /approval/);
  assert.throws(() => adapter.buildArgs(null), /prompt/);
  assert.throws(() => adapter.buildArgs('Review.', null), /options/);
});

test('installed Codex parses adapter-generated arguments without a model invocation', (t) => {
  const probe = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 5000 });
  if (probe.error && probe.error.code === 'ENOENT') {
    t.skip('Codex CLI is not installed on this test host');
    return;
  }
  assert.equal(probe.status, 0, probe.stderr);
  for (const options of [{}, { approval: 'full-auto' }, { sandbox: 'read-only', cwd: process.cwd(), model: 'gpt-6-astra' }]) {
    const args = adapter.buildArgs('Parser check only.', options);
    const separator = args.indexOf('--');
    const helpIndex = separator === -1 ? args.length - 1 : separator;
    const checkArgs = [...args.slice(0, helpIndex), '--help', ...args.slice(helpIndex)];
    const result = spawnSync('codex', checkArgs, { encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage: codex exec/);
  }
});
