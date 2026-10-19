'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-daemon-recovery-'));
process.env.HOME = home;
process.env.CLAUDE_REMOTE_JOBS_DIR = path.join(home, 'jobs');
process.env.CCC_DAEMON_POLICY = path.join(home, 'policy.json');
const queue = require('../queue');
const daemon = require('../daemon');
const remote = require('../remote-session');
const dispatcher = require('../dispatcher');
const quota = path.join(home, 'quota.json');
fs.writeFileSync(quota, JSON.stringify({ sessionPct: 1, weeklyPct: 1 }));
fs.writeFileSync(process.env.CCC_DAEMON_POLICY, JSON.stringify({ autoDispatch: true, quota: { file: quota } }));
function item() {
  const task = queue.addTask('small task');
  Object.assign(task, { domain: 'platform', cwd: home });
  fs.writeFileSync(path.join(queue.QUEUE_DIR, task.id + '.json'), JSON.stringify(task));
  return task;
}
function current(id) { return queue.listTasks().find(task => task.id === id); }
function patch(t, object, key, value) {
  const old = object[key]; object[key] = value;
  t.after(() => { object[key] = old; });
}

test('missing estimates hold even with config or environment cost gate disabled', t => {
  const task = { task: 'small task', domain: 'platform' };
  const config = path.join(home, '.claude', 'commander', 'config.json');
  fs.mkdirSync(path.dirname(config), { recursive: true });
  const old = process.env.CC_COST_GATE;
  t.after(() => { if (old === undefined) delete process.env.CC_COST_GATE; else process.env.CC_COST_GATE = old; });
  delete process.env.CC_COST_GATE;
  fs.writeFileSync(config, JSON.stringify({ costGateEnabled: false }));
  assert.match(daemon.admit(task, daemon.loadPolicy(), 0, Date.now()), /cost estimate missing/);
  fs.writeFileSync(config, JSON.stringify({ costGateEnabled: true }));
  process.env.CC_COST_GATE = 'off';
  assert.match(daemon.admit(task, daemon.loadPolicy(), 0, Date.now()), /cost estimate missing/);
  delete process.env.CC_COST_GATE;
  assert.equal(daemon.admit(task, daemon.loadPolicy(), 0, Date.now()), null);
  patch(t, dispatcher, 'checkCostCeiling', () => ({ allowed: true, estimate: { estimateHigh: 6 } }));
  assert.match(daemon.admit(task, daemon.loadPolicy(), 0, Date.now()), /exceeds/);
  for (const bad of [null, undefined, NaN, Infinity, -1, '1']) {
    dispatcher.checkCostCeiling = () => ({ allowed: true, estimate: { estimateHigh: bad } });
    assert.match(daemon.admit(task, daemon.loadPolicy(), 0, Date.now()), /cost estimate missing/);
  }
});

test('atomic claim admits one owner across competing processes', async () => {
  const task = item();
  const script = 'const q=require(' + JSON.stringify(path.resolve(__dirname, '../queue')) + ');console.log(!!q.claimTask(' + JSON.stringify(task.id) + '));';
  const run = () => new Promise((resolve, reject) => cp.execFile(process.execPath, ['-e', script], { env: process.env }, (error, stdout) => error ? reject(error) : resolve(stdout.trim())));
  const results = await Promise.all([run(), run(), run(), run()]);
  assert.equal(results.filter(value => value === 'true').length, 1);
  assert.equal(current(task.id).status, 'running');
  queue.updateStatus(task.id, 'failed');
});

test('queue persistence failure before tmux prevents launch and duplicate on next tick', t => {
  const task = item();
  const original = queue.updateStatus;
  let calls = 0;
  patch(t, queue, 'updateStatus', (id, status, extra) => {
    if (extra && extra.remote) throw new Error('disk write failed');
    return original(id, status, extra);
  });
  patch(t, cp, 'execFileSync', command => { if (command === 'tmux') calls++; return ''; });
  daemon.tick({ budget: 60000 });
  daemon.tick({ budget: 60000 });
  assert.equal(calls, 0);
  assert.equal(current(task.id).status, 'failed');
});

test('metadata is durable before launch and no post-launch running write exists', t => {
  const task = item();
  let launches = 0;
  const original = queue.updateStatus;
  let launched = false;
  patch(t, queue, 'updateStatus', (id, status, extra) => {
    if (launched && status === 'running') throw new Error('post-launch write forbidden');
    return original(id, status, extra);
  });
  patch(t, cp, 'execFileSync', (command, args) => {
    assert.equal(command, 'tmux'); assert.equal(args[0], 'new-session');
    const saved = current(task.id);
    assert.equal(saved.status, 'running');
    assert.ok(saved.remote.stateFile); assert.ok(saved.remote.exitFile);
    assert.ok(saved.remote.tmuxSession); assert.ok(saved.remote.report);
    launches++; launched = true; return '';
  });
  daemon.tick({ budget: 60000 });
  daemon.tick({ budget: 60000 });
  assert.equal(launches, 1);
  queue.updateStatus(task.id, 'failed');
});

test('reconciliation recovers abandoned claims, exits and legacy tmux loss, preserving live or uncertain jobs', t => {
  patch(t, cp, 'execFileSync', () => { const error = new Error('no session'); error.status = 1; throw error; });
  const stale = item(); queue.claimTask(stale.id);
  const fp = path.join(queue.QUEUE_DIR, stale.id + '.json');
  const record = current(stale.id); record.started = new Date(Date.now() - 180000).toISOString();
  fs.writeFileSync(fp, JSON.stringify(record));
  assert.equal(daemon.reconcile(), 0);
  assert.equal(current(stale.id).status, 'failed');
  const legacy = item(); queue.claimTask(legacy.id);
  fs.writeFileSync(path.join(queue.QUEUE_DIR, legacy.id + '.json'), JSON.stringify({ ...current(legacy.id), started: record.started, remote: { job: 'gone' } }));
  assert.equal(daemon.reconcile(), 0);
  assert.equal(current(legacy.id).status, 'failed');
  const live = item(); queue.claimTask(live.id);
  const stateFile = path.join(home, 'live-state.json');
  fs.writeFileSync(stateFile, JSON.stringify({ supervisorPid: process.pid, childPid: null, sessionId: 's' }));
  queue.updateStatus(live.id, 'running', { remote: { stateFile, sessionId: 's' } });
  assert.equal(daemon.reconcile(), 1);
  assert.equal(current(live.id).status, 'running');
  const exitFile = path.join(home, 'exit.json'); fs.writeFileSync(exitFile, '{}');
  queue.updateStatus(live.id, 'running', { remote: { exitFile } });
  assert.equal(daemon.reconcile(), 0);
  assert.equal(current(live.id).status, 'failed');
  const unknown = item(); queue.claimTask(unknown.id);
  fs.writeFileSync(path.join(queue.QUEUE_DIR, unknown.id + '.json'), JSON.stringify({ ...current(unknown.id), started: record.started, remote: { job: 'unknown' } }));
  cp.execFileSync = () => { throw new Error('tmux unavailable'); };
  assert.equal(daemon.reconcile(), 1);
  queue.updateStatus(unknown.id, 'failed');
});

test('real supervisor SIGKILL without report is recovered after its child exits', async t => {
  const task = item(); queue.claimTask(task.id);
  const stateFile = path.join(home, 'killed-state.json');
  const config = { binary: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'], cwd: home, sessionId: 'killed', stateFile, exitFile: path.join(home, 'killed-exit.json'), report: path.join(home, 'killed-report.md') };
  const file = path.join(home, 'killed-launch.json'); fs.writeFileSync(file, JSON.stringify(config));
  const supervisor = cp.spawn(process.execPath, [path.resolve(__dirname, '../remote-session.js'), '--run', file], { stdio: 'ignore' });
  let childPid;
  t.after(() => { try { supervisor.kill('SIGKILL'); } catch (_) {} if (childPid) { try { process.kill(childPid, 'SIGKILL'); } catch (_) {} } });
  const deadline = Date.now() + 5000;
  while (!fs.existsSync(stateFile) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(fs.existsSync(stateFile));
  childPid = JSON.parse(fs.readFileSync(stateFile)).childPid;
  queue.updateStatus(task.id, 'running', { remote: { stateFile, sessionId: config.sessionId, report: config.report } });
  const closed = new Promise(resolve => supervisor.on('close', resolve));
  supervisor.kill('SIGKILL'); await closed;
  assert.equal(fs.existsSync(config.report), false);
  assert.equal(daemon.reconcile(), 1, 'orphan still alive consumes capacity');
  process.kill(childPid, 'SIGKILL');
  const until = Date.now() + 5000;
  while (Date.now() < until && daemon.reconcile() !== 0) await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(current(task.id).status, 'failed');
  assert.equal(queue.getNext(), null, 'abandoned work is never automatically retried');
});


test('crash immediately after claim lock creation is recovered without relaunch', () => {
  for (const contents of ['', JSON.stringify({ pid: 2147483647 })]) {
    const task = item();
    const lock = path.join(queue.QUEUE_DIR, task.id + '.claim');
    fs.writeFileSync(lock, contents);
    assert.equal(queue.claimTask(task.id), null);
    daemon.reconcile();
    assert.equal(current(task.id).status, 'pending', 'startup grace is held');
    const old = new Date(Date.now() - 180000); fs.utimesSync(lock, old, old);
    daemon.reconcile();
    assert.equal(current(task.id).status, 'failed');
    assert.equal(queue.getNext(), null);
  }
  const live = item();
  const lock = path.join(queue.QUEUE_DIR, live.id + '.claim');
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }));
  const old = new Date(Date.now() - 180000); fs.utimesSync(lock, old, old);
  daemon.reconcile();
  assert.equal(current(live.id).status, 'pending', 'live owner is never taken over');
  queue.updateStatus(live.id, 'failed');
});
