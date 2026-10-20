'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const remote = require('../remote-session');

function temp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-remote-test-')); }
function withLaunch(fn, output = '') {
  const dir = temp();
  const oldExec = cp.execFileSync;
  const oldDir = process.env.CLAUDE_REMOTE_JOBS_DIR;
  const oldLauncher = process.env.CLAUDE_REMOTE_LAUNCHER;
  const calls = [];
  process.env.CLAUDE_REMOTE_JOBS_DIR = path.join(dir, 'jobs');
  delete process.env.CLAUDE_REMOTE_LAUNCHER;
  cp.execFileSync = (command, args) => { calls.push({ command, args }); return output; };
  try { return fn(dir, calls); }
  finally {
    cp.execFileSync = oldExec;
    if (oldDir === undefined) delete process.env.CLAUDE_REMOTE_JOBS_DIR; else process.env.CLAUDE_REMOTE_JOBS_DIR = oldDir;
    if (oldLauncher === undefined) delete process.env.CLAUDE_REMOTE_LAUNCHER; else process.env.CLAUDE_REMOTE_LAUNCHER = oldLauncher;
  }
}

test('interactive arguments enable RC and preserve exact system prompt without print flags', () => {
  const args = remote.interactiveArgs({ model: 'sonnet', systemPrompt: 'a "quote"\nsecond line', resume: 'session-1' });
  assert.deepEqual(args, ['--remote-control', 'ccc', '--resume', 'session-1', '--model', 'sonnet', '--append-system-prompt', 'a "quote"\nsecond line']);
  for (const option of ['maxTurns', 'maxBudgetUsd', 'jsonSchema', 'outputFormat']) assert.throws(() => remote.interactiveArgs({ [option]: 1 }), /unsupported.*interactive/);
});

test('launch is a safe tmux argv boundary, preserves long prompts, and registers no content', () => withLaunch((dir, calls) => {
  const prompt = 'Task `$(touch should-not-exist)` "quote"\n' + 'x'.repeat(6000);
  const handle = remote.start(prompt, { cwd: dir, model: 'sonnet', linearIssue: 'CC-123' });
  const tmux = calls.find(call => call.command === 'tmux');
  assert.equal(tmux.args[0], 'new-session');
  assert.equal(tmux.args[tmux.args.length - 1].includes(prompt), false);
  const launch = JSON.parse(fs.readFileSync(path.join(dir, 'jobs', handle.job.job, 'launch.json')));
  assert.ok(fs.readFileSync(launch.promptFile, 'utf8').startsWith(prompt));
  assert.ok(launch.args.includes('--remote-control'));
  assert.ok(launch.args.includes('--session-id'));
  const metadata = fs.readFileSync(handle.jobFile, 'utf8');
  assert.equal(metadata.includes('touch should-not-exist'), false);
  assert.equal(JSON.parse(metadata).linearIssue, 'CC-123');
  assert.equal(fs.statSync(handle.jobFile).mode & 0o777, 0o600);
  assert.match(handle.job.report, /reports\/ccc-.*-REPORT.md$/);
}));

test('split mode uses the same registered interactive runner without a headless auth probe', () => withLaunch((dir, calls) => {
  const handle = remote.start('task', { cwd: dir, tmuxTarget: 'ccc' });
  const tmux = calls.find(call => call.command === 'tmux');
  assert.equal(tmux.args[0], 'split-window');
  assert.equal(handle.job.tmuxSession, 'ccc');
  assert.equal(calls.some(call => call.args.includes('-p')), false);
}));

test('stale reports and invalid timeouts are rejected before a tmux launch', () => withLaunch((dir, calls) => {
  const report = path.join(dir, 'old.md');
  fs.writeFileSync(report, 'Status: done — stale\n');
  assert.throws(() => remote.start('task', { cwd: dir, report }), /already exists/);
  assert.throws(() => remote.start('task', { cwd: dir, timeoutMs: -1 }), /positive number/);
  assert.equal(calls.some(call => call.command === 'tmux'), false);
}));

function observation(status) {
  const dir = temp();
  const report = path.join(dir, 'REPORT.md');
  if (status) fs.writeFileSync(report, 'Status: ' + status + ' — observed result\nEvidence.\n');
  return { job: { sessionId: 'native-id', tmuxSession: 'session', report }, exitFile: path.join(dir, 'exit.json') };
}
test('observation returns final report as result and leaves unknown cost unknown', async () => {
  const handle = observation('done');
  const result = await remote.observe(handle, { timeoutMs: 100 });
  assert.equal(result.session_id, 'native-id');
  assert.equal(result.cost_usd, null);
  assert.match(result.result, /^Status: done/);
});

test('blocked and failed reports reject without allowing automatic duplicate jobs', async () => {
  for (const status of ['blocked', 'failed']) await assert.rejects(remote.observe(observation(status), { timeoutMs: 100 }), error => error.noRetry && error.message.includes(status));
});

test('early exit and timeout write terminal reports without claiming success', async () => {
  const handle = observation();
  fs.writeFileSync(handle.exitFile, '{"code":0}');
  await assert.rejects(remote.observe(handle, { timeoutMs: 100 }), /without a valid terminal report/);
  assert.match(fs.readFileSync(handle.job.report, 'utf8'), /^Status: failed/);
  const timeout = observation();
  await assert.rejects(remote.observe(timeout, { timeoutMs: 1, pollMs: 2 }), /remains available/);
  assert.match(fs.readFileSync(timeout.job.report, 'utf8'), /^Status: blocked/);
});

test('Claude adapter no longer builds print launches', () => {
  const args = require('../adapters/claude').buildArgs('prompt', { plan: true });
  assert.ok(args.includes('--remote-control'));
  assert.ok(args.includes('--permission-mode'));
  assert.equal(args[args.length - 1], 'prompt');
  assert.equal(args.includes('-p'), false);
});

test('RC admission requires matching live native pid, session and valid bridge id', () => {
  const dir = temp();
  fs.mkdirSync(path.join(dir, 'sessions'));
  const config = { configDir: dir, sessionId: 'native-session' };
  const file = path.join(dir, 'sessions', process.pid + '.json');
  const record = { pid: process.pid, sessionId: config.sessionId, bridgeSessionId: 'session_test123456' };
  fs.writeFileSync(file, JSON.stringify(record));
  assert.equal(remote.remoteReady(config, process.pid), true);
  for (const patch of [{ sessionId: 'other' }, { pid: process.pid + 1 }, { bridgeSessionId: '' }, { bridgeSessionId: 'https://attacker.invalid/' }]) {
    fs.writeFileSync(file, JSON.stringify({ ...record, ...patch }));
    assert.equal(remote.remoteReady(config, process.pid), false);
  }
});

test('portable runner captures caller attribution for existing tmux servers', () => withLaunch((dir) => {
  const oldAgent = process.env.BRAIN_AGENT;
  const oldNested = process.env.CLAUDECODE;
  process.env.BRAIN_AGENT = 'test-attributed-agent';
  process.env.CLAUDECODE = 'preserve-guard';
  try {
    const handle = remote.start('task', { cwd: dir });
    const config = JSON.parse(fs.readFileSync(path.join(dir, 'jobs', handle.job.job, 'launch.json')));
    assert.equal(config.attribution.BRAIN_AGENT, 'test-attributed-agent');
    assert.equal(config.attribution.CLAUDECODE, 'preserve-guard');
  } finally {
    if (oldAgent === undefined) delete process.env.BRAIN_AGENT; else process.env.BRAIN_AGENT = oldAgent;
    if (oldNested === undefined) delete process.env.CLAUDECODE; else process.env.CLAUDECODE = oldNested;
  }
}));

test('unknown Remote Control cost remains unknown in replay', () => {
  const replay = require('../session-replay').generateReplay({ task: 'task', cost: null });
  assert.match(replay.markdown || replay.report || String(replay), /unknown/);
});

test('daemon holds capped tasks pending without claiming or failing them', () => {
  const queue = require('../queue');
  const oldNext = queue.getNext;
  const oldUpdate = queue.updateStatus;
  const oldExec = cp.execSync;
  const oldWrite = process.stdout.write;
  let mutations = 0;
  let output = '';
  queue.getNext = () => ({ id: 'task-1', task: 'queued task', status: 'pending' });
  queue.updateStatus = () => { mutations++; };
  cp.execSync = () => '';
  process.stdout.write = value => { output += value; return true; };
  try {
    require('../daemon').tick({ budget: 1000 });
    assert.equal(mutations, 0);
    assert.match(output, /Queue held/);
  } finally {
    queue.getNext = oldNext;
    queue.updateStatus = oldUpdate;
    cp.execSync = oldExec;
    process.stdout.write = oldWrite;
  }
});

test('invalid partial reports are preserved under a failed terminal result on process exit', async () => {
  const handle = observation();
  fs.writeFileSync(handle.job.report, 'Partial evidence');
  fs.writeFileSync(handle.exitFile, '{"code":1}');
  await assert.rejects(remote.observe(handle, { timeoutMs: 100 }), /without a valid terminal report/);
  const report = fs.readFileSync(handle.job.report, 'utf8');
  assert.match(report, /^Status: failed/);
  assert.match(report, /Partial evidence/);
});

test('knowledge and dream averages exclude unknown cost and report coverage', () => {
  const home = temp();
  const dir = path.join(home, '.claude', 'commander', 'knowledge');
  fs.mkdirSync(dir, { recursive: true });
  [null, 4, 2].forEach((cost, i) => fs.writeFileSync(path.join(dir, i + '.json'), JSON.stringify({ id: String(i), timestamp: new Date().toISOString(), category: 'api', cost, outcome: 'success', patterns: {} })));
  const result = cp.execFileSync(process.execPath, ['-e', 'const k=require(' + JSON.stringify(path.resolve(__dirname, '../knowledge')) + '); const d=require(' + JSON.stringify(path.resolve(__dirname, '../dream')) + ');console.log(JSON.stringify({stats:k.getStats(),insights:k.getInsights("api"),preference:k.getModelPreference("api"),dream:d.consolidate().stats}));'], { env: { ...process.env, HOME: home }, encoding: 'utf8' });
  const values = JSON.parse(result);
  assert.equal(values.stats.totalCost, 6);
  assert.equal(values.stats.unknownCostSessions, 1);
  assert.equal(values.insights.avgCost, 3);
  assert.equal(values.preference.avgCost, 3);
  assert.equal(values.dream.totalCost, 6);
  assert.equal(values.dream.unknownCostSessions, 1);
});

test('detaching from menu preserves native session and does not mark completion or Linear success', async (t) => {
  const Engine = require('../engine');
  const state = require('../state');
  const dispatcher = require('../dispatcher');
  const knowledge = require('../knowledge');
  const linear = require('../integrations/linear');
  const tui = require('../tui');
  const originals = [];
  const stub = (object, key, value) => { const original = object[key]; object[key] = value; originals.push(() => { object[key] = original; }); };
  const oldHome = process.env.HOME;
  const oldSplit = process.env.CCC_TMUX_SESSION;
  process.env.HOME = temp();
  delete process.env.CCC_TMUX_SESSION;
  const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  t.after(() => {
    originals.reverse().forEach(restore => restore());
    if (ttyDescriptor) Object.defineProperty(process.stdin, 'isTTY', ttyDescriptor); else delete process.stdin.isTTY;
    if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
    if (oldSplit === undefined) delete process.env.CCC_TMUX_SESSION; else process.env.CCC_TMUX_SESSION = oldSplit;
  });
  stub(process.stdin, 'setRawMode', () => {});
  stub(process.stdin, 'resume', () => process.stdin);
  stub(process.stdin, 'pause', () => process.stdin);
  stub(process.stdout, 'write', () => true);
  stub(tui, 'spinner', () => ({ start() {}, stop() {} }));
  const session = { id: 'menu-session', task: 'task' };
  let completions = 0;
  let successWrites = 0;
  stub(state, 'createSession', () => session);
  stub(state, 'loadState', () => ({}));
  stub(state, 'getUserLevel', () => 'guided');
  stub(state, 'getSession', () => session);
  stub(state, 'updateSession', (id, patch) => Object.assign(session, patch));
  stub(state, 'completeSession', () => { completions++; });
  stub(knowledge, 'buildKnowledgePrompt', () => '');
  stub(linear, 'syncSession', () => { successWrites++; return Promise.resolve(); });
  const observation = new Promise(() => {});
  observation.remoteSession = { sessionId: 'native-detached-id' };
  stub(dispatcher, 'dispatchWithRetry', () => observation);
  const engine = new Engine();
  engine.rl = {};
  engine.ask = async () => '';
  const execution = engine.executeBuildFromIssue({ title: 'task', identifier: 'CC-123', id: 'issue-id' });
  process.stdin.emit('data', Buffer.from('q'));
  await execution;
  assert.equal(session.claudeSessionId, 'native-detached-id');
  assert.equal(session.status, 'active');
  assert.equal(session.outcome, 'detached');
  assert.equal(session.cost, null);
  assert.equal(completions, 0);
  assert.equal(successWrites, 0);
});
