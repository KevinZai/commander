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
  assert.deepEqual(remote.interactiveArgs({ maxTurns: 5 }, 's1'), ['--remote-control', 'ccc', '--session-id', 's1']);
  for (const option of ['maxBudgetUsd', 'jsonSchema', 'outputFormat']) assert.throws(() => remote.interactiveArgs({ [option]: 1 }), /unsupported.*interactive/);
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

function supervise(t, { script, config }) {
  const dir = temp();
  const bin = path.join(dir, 'fake-claude.js');
  fs.writeFileSync(bin, '#!/usr/bin/env node\n' + script);
  fs.chmodSync(bin, 0o755);
  const configDir = path.join(dir, 'cfg');
  fs.mkdirSync(path.join(configDir, 'projects', 'p'), { recursive: true });
  const launch = Object.assign({ binary: bin, args: [], cwd: dir, exitFile: path.join(dir, 'exit.json'), configDir, sessionId: 'sess-1', report: path.join(dir, 'REPORT.md'), job: 'j', killGraceMs: 500 }, config);
  const file = path.join(dir, 'launch.json');
  fs.writeFileSync(file, JSON.stringify(launch));
  return { dir, launch, file, transcript: path.join(configDir, 'projects', 'p', 'sess-1.jsonl') };
}
function runSupervisor(file) {
  return new Promise(resolve => {
    const started = Date.now();
    const child = cp.spawn(process.execPath, [path.resolve(__dirname, '../remote-session.js'), '--run', file], { stdio: 'ignore', env: { ...process.env, TMUX_PANE: '' } });
    child.on('close', code => resolve({ code, ms: Date.now() - started }));
  });
}

test('wall-clock timeout writes a blocked report and terminates the session', async (t) => {
  const s = supervise(t, { script: 'setInterval(()=>{},1000);', config: { wallTimeoutMs: 400 } });
  const result = await runSupervisor(s.file);
  assert.ok(result.ms < 20000);
  const report = fs.readFileSync(s.launch.report, 'utf8');
  assert.match(report, /^Status: blocked — Wall-clock limit of 0 seconds|^Status: blocked — Wall-clock limit/);
  assert.match(report, /session terminated/);
  assert.ok(fs.existsSync(s.launch.exitFile));
  assert.equal(JSON.parse(fs.readFileSync(s.launch.exitFile)).signal, 'SIGTERM');
});

test('a session that ignores SIGTERM is killed after the grace period', async (t) => {
  const s = supervise(t, { script: "process.on('SIGTERM',()=>{});setInterval(()=>{},1000);", config: { wallTimeoutMs: 300 } });
  await runSupervisor(s.file);
  assert.equal(JSON.parse(fs.readFileSync(s.launch.exitFile)).signal, 'SIGKILL');
});

test('max-turn watchdog terminates the session once distinct assistant turns exceed the limit', async (t) => {
  const script = "const fs=require('fs');let n=0;const f=process.env.T;setInterval(()=>{n++;fs.appendFileSync(f,JSON.stringify({type:'assistant',message:{id:'m'+n}})+'\\n'+JSON.stringify({type:'user'})+'\\n');},100);";
  const s = supervise(t, { script, config: { maxTurns: 3, watchdogPollMs: 100 } });
  process.env.T = s.transcript;
  try { await runSupervisor(s.file); } finally { delete process.env.T; }
  const report = fs.readFileSync(s.launch.report, 'utf8');
  assert.match(report, /^Status: blocked — Turn limit of 3 exceeded/);
  assert.equal(JSON.parse(fs.readFileSync(s.launch.exitFile)).signal, 'SIGTERM');
});

test('turn counter ignores duplicate message ids and partial trailing lines', () => {
  const dir = temp();
  fs.mkdirSync(path.join(dir, 'projects', 'p'), { recursive: true });
  const file = path.join(dir, 'projects', 'p', 's.jsonl');
  const count = remote.createTurnCounter(dir, 's');
  assert.equal(count(), 0);
  fs.writeFileSync(file, '{"type":"assistant","message":{"id":"a"}}\n{"type":"assistant","message":{"id":"a"}}\n{"type":"assistant","mess');
  assert.equal(count(), 1);
  fs.appendFileSync(file, 'age":{"id":"b"}}\n{"type":"user"}\n');
  assert.equal(count(), 2);
});

test('start records bounds and rejects invalid ones before launching', () => withLaunch((dir, calls) => {
  assert.throws(() => remote.start('task', { cwd: dir, maxTurns: 0 }), /maxTurns/);
  assert.throws(() => remote.start('task', { cwd: dir, wallTimeoutMs: -1 }), /wallTimeoutMs/);
  assert.equal(calls.length, 0);
  const handle = remote.start('task', { cwd: dir, maxTurns: 30, wallTimeoutMs: remote.DEFAULT_WALL_TIMEOUT_MS });
  const launch = JSON.parse(fs.readFileSync(path.join(dir, 'jobs', handle.job.job, 'launch.json')));
  assert.equal(launch.maxTurns, 30);
  assert.equal(launch.wallTimeoutMs, 45 * 60 * 1000);
  assert.ok(launch.args.includes('--remote-control'));
}));

function daemonFixture(t, policy) {
  const home = temp();
  const oldHome = process.env.HOME;
  const oldPolicy = process.env.CCC_DAEMON_POLICY;
  process.env.HOME = home;
  const file = path.join(home, 'policy.json');
  fs.writeFileSync(file, JSON.stringify(policy));
  process.env.CCC_DAEMON_POLICY = file;
  t.after(() => {
    if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
    if (oldPolicy === undefined) delete process.env.CCC_DAEMON_POLICY; else process.env.CCC_DAEMON_POLICY = oldPolicy;
  });
  return home;
}

test('daemon admission holds by default and on estimate, domain and quota gates, and admits a clean task', (t) => {
  const home = daemonFixture(t, { autoDispatch: true });
  const daemon = require('../daemon');
  const item = { id: 'q1', task: 'small task' };
  const base = daemon.loadPolicy();
  assert.equal(daemon.admit(item, base, 0, Date.now()), null);
  assert.match(daemon.admit(item, { ...base, autoDispatch: false }, 0, Date.now()), /not enabled/);
  assert.match(daemon.admit(item, base, 1, Date.now()), /already running/);
  assert.match(daemon.admit({ ...item, task: 'fix MyWiFi portal' }, { ...base, blockedDomains: ['mywifi'] }, 0, Date.now()), /domain blocked/);
  assert.match(daemon.admit({ ...item, tags: ['GN'] }, { ...base, blockedDomains: ['^gn$'] }, 0, Date.now()), /domain blocked/);
  assert.match(daemon.admit({ ...item, task: 'x'.repeat(400000), model: 'fable' }, { ...base, maxEstimateUsd: 0.5 }, 0, Date.now()), /exceeds|ceiling/);
  const quotaFile = path.join(home, 'quota.json');
  const quota = { file: quotaFile, sessionPctMax: 75, weeklyPctMax: 85, maxAgeSec: 600 };
  assert.match(daemon.admit(item, { ...base, quota }, 0, Date.now()), /missing/);
  fs.writeFileSync(quotaFile, JSON.stringify({ sessionPct: 80, weeklyPct: 10 }));
  assert.match(daemon.admit(item, { ...base, quota }, 0, Date.now()), /session quota/);
  fs.writeFileSync(quotaFile, JSON.stringify({ sessionPct: 10, weeklyPct: 90 }));
  assert.match(daemon.admit(item, { ...base, quota }, 0, Date.now()), /weekly quota/);
  fs.writeFileSync(quotaFile, JSON.stringify({ sessionPct: 10, weeklyPct: 10 }));
  assert.equal(daemon.admit(item, { ...base, quota }, 0, Date.now()), null);
  assert.match(daemon.admit(item, { ...base, quota }, 0, Date.now() + 3600 * 1000), /stale/);
});

test('daemon launches an admitted task with RC, 45 minute and turn bounds, then settles it from its report', (t) => {
  const home = daemonFixture(t, { autoDispatch: true, maxTurns: 12 });
  const queue = require('../queue');
  const daemon = require('../daemon');
  const store = [{ id: 'mem-1', task: 'queued small task', priority: 1, status: 'pending', cwd: home }];
  const item = store[0];
  const saved = ['getNext', 'listTasks', 'updateStatus'].map(key => [key, queue[key]]);
  queue.getNext = () => store.find(task => task.status === 'pending') || null;
  queue.listTasks = status => store.filter(task => !status || task.status === status);
  queue.updateStatus = (id, status, extra) => { const task = store.find(entry => entry.id === id); task.status = status; Object.assign(task, extra || {}); return task; };
  const oldExec = cp.execFileSync;
  const oldJobs = process.env.CLAUDE_REMOTE_JOBS_DIR;
  const oldOut = process.stdout.write;
  const calls = [];
  process.env.CLAUDE_REMOTE_JOBS_DIR = path.join(home, 'jobs');
  cp.execFileSync = (command, args) => { calls.push({ command, args }); return ''; };
  process.stdout.write = () => true;
  try {
    const cwd = process.cwd();
    daemon.tick({ budget: 60000 });
    const launched = queue.listTasks('running').find(task => task.id === item.id);
    assert.ok(launched, 'task moved to running');
    assert.ok(calls.some(call => call.command === 'tmux' && call.args[0] === 'new-session'));
    const launch = JSON.parse(fs.readFileSync(path.join(home, 'jobs', launched.remote.job, 'launch.json')));
    assert.ok(launch.args.includes('--remote-control'));
    assert.equal(launch.maxTurns, 12);
    assert.equal(launch.wallTimeoutMs, 45 * 60 * 1000);
    fs.writeFileSync(launched.remote.report, 'Status: done — finished\n');
    daemon.reconcile();
    assert.equal(queue.listTasks('done').find(task => task.id === item.id).result, 'finished');
    assert.equal(cwd, process.cwd());
  } finally {
    saved.forEach(([key, fn]) => { queue[key] = fn; });
    cp.execFileSync = oldExec;
    process.stdout.write = oldOut;
    if (oldJobs === undefined) delete process.env.CLAUDE_REMOTE_JOBS_DIR; else process.env.CLAUDE_REMOTE_JOBS_DIR = oldJobs;
  }
});
