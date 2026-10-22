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

test('json and output-last-message are emitted for headless executor runs', () => {
  const args = adapter.buildArgs('Execute the goal file.', {
    sandbox: 'workspace-write',
    model: 'gpt-6.1-sol',
    json: true,
    outputLastMessage: '/tmp/goal result.md',
  });
  assert.ok(args.includes('--json'));
  assert.equal(valueAfter(args, '--output-last-message'), '/tmp/goal result.md');
  assert.equal(valueAfter(args, '--model'), 'gpt-6.1-sol');
  assert.ok(args.indexOf('--json') < args.indexOf('--'));
  assert.ok(!adapter.buildArgs('x').includes('--json'), 'json is opt-in');
  assert.throws(() => adapter.buildArgs('x', { json: 'yes' }), /json/);
  assert.throws(() => adapter.buildArgs('x', { outputLastMessage: '' }), /outputLastMessage/);
  assert.throws(() => adapter.buildArgs('x', { outputLastMessage: 'a\0b' }), /outputLastMessage/);
});

test('exec resume --last keeps the sandbox through a config override and rejects --cd', () => {
  const args = adapter.buildArgs('Continue with criterion 3 only.', { resume: 'last', json: true });
  assert.deepEqual(args.slice(0, 3), ['exec', 'resume', '--last']);
  assert.equal(valueAfter(args, '-c'), 'sandbox_mode="read-only"');
  assert.ok(!args.includes('--sandbox'), 'exec resume has no --sandbox flag');
  assert.ok(args.includes('--json'));
  assert.equal(args.at(-1), 'Continue with criterion 3 only.');

  const write = adapter.buildArgs('Fix it.', { resume: 'last', sandbox: 'workspace-write' });
  assert.equal(valueAfter(write, '-c'), 'sandbox_mode="workspace-write"');

  const byId = adapter.buildArgs('', { resume: '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b' });
  assert.equal(byId.at(-1), '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b');
  assert.ok(!byId.includes('--'), 'no prompt separator without a prompt');

  assert.throws(() => adapter.buildArgs('x', { resume: 'last', cwd: '/tmp' }), /--cd/);
  assert.throws(() => adapter.buildArgs('x', { resume: '--last' }), /resume/);
  assert.throws(() => adapter.buildArgs('x', { resume: '' }), /resume/);
});

test('review targets uncommitted changes or a base branch, always read-only', () => {
  const uncommitted = adapter.buildReviewArgs({ uncommitted: true });
  assert.deepEqual(uncommitted.slice(0, 2), ['exec', 'review']);
  assert.equal(valueAfter(uncommitted, '-c'), 'sandbox_mode="read-only"');
  assert.ok(uncommitted.includes('--uncommitted'));

  const base = adapter.buildReviewArgs({
    base: 'main',
    model: 'gpt-6-astra',
    json: true,
    outputLastMessage: '/tmp/review.md',
  });
  assert.equal(valueAfter(base, '--base'), 'main');
  assert.equal(valueAfter(base, '--model'), 'gpt-6-astra');
  assert.ok(base.includes('--json'));
  assert.ok(!base.includes('--'), 'a targeted review carries no positional prompt');

  // Prompt-only review: custom instructions are themselves the target
  // (codex review [PROMPT]); a leading dash stays a prompt, not an option.
  const prompted = adapter.buildReviewArgs({ instructions: '--focus on auth', json: true });
  assert.equal(prompted.at(-2), '--');
  assert.equal(prompted.at(-1), '--focus on auth');
  assert.ok(!prompted.includes('--base') && !prompted.includes('--uncommitted'));

  const commit = adapter.buildReviewArgs({ commit: 'abc1234', title: 'Fix login' });
  assert.equal(valueAfter(commit, '--commit'), 'abc1234');
  assert.equal(valueAfter(commit, '--title'), 'Fix login');
});

test('review rejects ambiguous targets, unsafe refs and write sandboxes', () => {
  assert.throws(() => adapter.buildReviewArgs({}), /exactly one/);
  assert.throws(() => adapter.buildReviewArgs({ uncommitted: true, base: 'main' }), /exactly one/);
  assert.throws(() => adapter.buildReviewArgs({ base: '--output=x' }), /branch/);
  assert.throws(() => adapter.buildReviewArgs({ base: 'main..evil' }), /branch/);
  assert.throws(() => adapter.buildReviewArgs({ commit: 'HEAD~1' }), /SHA/);
  assert.throws(() => adapter.buildReviewArgs({ uncommitted: 'yes' }), /boolean/);
  assert.throws(() => adapter.buildReviewArgs({ uncommitted: true, sandbox: 'workspace-write' }), /read-only/);
  assert.throws(() => adapter.buildReviewArgs({ uncommitted: true, cwd: '/tmp' }), /--cd/);
  assert.throws(() => adapter.buildReviewArgs({ uncommitted: true, allowedTools: ['Read'] }), /allowedTools/);
});

test('installed Codex parses adapter-generated arguments without a model invocation', (t) => {
  const probe = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 5000 });
  if (probe.error && probe.error.code === 'ENOENT') {
    t.skip('Codex CLI is not installed on this test host');
    return;
  }
  assert.equal(probe.status, 0, probe.stderr);
  const withHelp = (args) => {
    const separator = args.indexOf('--');
    const helpIndex = separator === -1 ? args.length : separator;
    return [...args.slice(0, helpIndex), '--help', ...args.slice(helpIndex)];
  };
  const cases = [
    [adapter.buildArgs('Parser check only.'), /Usage: codex exec/],
    [adapter.buildArgs('Parser check only.', { approval: 'full-auto' }), /Usage: codex exec/],
    [adapter.buildArgs('Parser check only.', { sandbox: 'read-only', cwd: process.cwd(), model: 'gpt-6-astra', json: true, outputLastMessage: '/tmp/out.md' }), /Usage: codex exec/],
    [adapter.buildArgs('Parser check only.', { resume: 'last', json: true, outputLastMessage: '/tmp/out.md' }), /Usage: codex exec resume/],
    [adapter.buildReviewArgs({ uncommitted: true }), /Usage: codex exec review/],
    [adapter.buildReviewArgs({ base: 'main', json: true, outputLastMessage: '/tmp/r.md' }), /Usage: codex exec review/],
    [adapter.buildReviewArgs({ instructions: 'focus', json: true, outputLastMessage: '/tmp/r.md' }), /Usage: codex exec review/],
  ];
  for (const [args, usage] of cases) {
    const result = spawnSync('codex', withHelp(args), { encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}`);
    assert.match(result.stdout, usage);
  }
});

test('buildReviewArgs: refuses a review target combined with custom instructions (codex-cli 0.162)', () => {
  assert.throws(() => adapter.buildReviewArgs({ base: 'main', instructions: 'Focus on auth' }), /exactly one/);
  assert.throws(() => adapter.buildReviewArgs({ uncommitted: true, instructions: 'x' }), /exactly one/);
  assert.throws(() => adapter.buildReviewArgs({ commit: 'a'.repeat(40), instructions: 'x' }), /exactly one/);
  const targetOnly = adapter.buildReviewArgs({ base: 'main' });
  assert.ok(targetOnly.includes('--base') && !targetOnly.includes('--'), 'target-only review carries no prompt separator');
  const promptOnly = adapter.buildReviewArgs({ instructions: 'Focus on auth' });
  assert.equal(promptOnly[promptOnly.length - 1], 'Focus on auth');
});
