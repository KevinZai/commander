'use strict';

// Daemon job lifecycle (audit #12) and stop identity check (audit #36).
// Run: node --test commander/tests/daemon.test.js

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

// daemon.js and queue.js resolve their paths from HOME at require time.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-daemon-test-'));
const savedHome = process.env.HOME;
const savedQuiet = process.env.CCC_DAEMON_QUIET;
process.env.HOME = TMP;
process.env.CCC_DAEMON_QUIET = '1';

const queue = require('../queue');
const dispatcher = require('../dispatcher');
const daemon = require('../daemon');

after(() => {
  if (savedHome === undefined) delete process.env.HOME;
  else process.env.HOME = savedHome;
  if (savedQuiet === undefined) delete process.env.CCC_DAEMON_QUIET;
  else process.env.CCC_DAEMON_QUIET = savedQuiet;
  fs.rmSync(TMP, { recursive: true, force: true });
});

function readItem(id) {
  return JSON.parse(fs.readFileSync(path.join(TMP, '.claude', 'commander', 'queue', id + '.json'), 'utf8'));
}

describe('daemon tick: claim, dispatch, settle', () => {
  let origDispatchAsync;
  let origUpdateStatus;
  let statusCalls;

  beforeEach(() => {
    fs.rmSync(path.join(TMP, '.claude', 'commander', 'queue'), { recursive: true, force: true });
    daemon._resetForTests();
    origDispatchAsync = dispatcher.dispatchAsync;
    origUpdateStatus = queue.updateStatus;
    statusCalls = [];
    queue.updateStatus = function (id, status, extra) {
      statusCalls.push({ id, status });
      return origUpdateStatus.call(queue, id, status, extra);
    };
  });

  afterEach(() => {
    dispatcher.dispatchAsync = origDispatchAsync;
    queue.updateStatus = origUpdateStatus;
  });

  it('a synchronous dispatch result marks the job done (not left running)', async () => {
    const item = queue.addTask('sync job', 1);
    dispatcher.dispatchAsync = (task, opts) => {
      assert.equal(task, 'sync job');
      assert.equal(opts.stream, false);
      return { result: 'all good', cost_usd: 0.25 }; // plain object, not a thenable
    };
    const out = await daemon.tick({ budget: 15000 });
    assert.equal(out.status, 'done');
    const saved = readItem(item.id);
    assert.equal(saved.status, 'done');
    assert.equal(saved.result, 'all good');
    assert.equal(saved.cost, 0.25);
    assert.deepEqual(statusCalls.map((c) => c.status), ['running', 'done']);
  });

  it('a synchronous throw from dispatch marks the job failed exactly once', async () => {
    const item = queue.addTask('throws', 1);
    dispatcher.dispatchAsync = () => { throw new Error('cli missing'); };
    const out = await daemon.tick({ budget: 15000 });
    assert.equal(out.status, 'failed');
    const saved = readItem(item.id);
    const { status, error } = saved;
    assert.deepEqual({ status, error }, { status: 'failed', error: 'cli missing' });
    assert.deepEqual(statusCalls.map((c) => c.status), ['running', 'failed']);
  });

  it('a rejected dispatch marks the job failed exactly once', async () => {
    const item = queue.addTask('rejects', 1);
    dispatcher.dispatchAsync = () => Promise.reject(new Error('exit 1'));
    await daemon.tick({ budget: 15000 });
    assert.equal(readItem(item.id).status, 'failed');
    assert.deepEqual(statusCalls.map((c) => c.status), ['running', 'failed']);
  });

  it('an over-budget tick claims nothing and leaves the job pending', async () => {
    const item = queue.addTask('later', 1);
    let called = false;
    dispatcher.dispatchAsync = () => { called = true; return {}; };
    const out = await daemon.tick({ budget: -1 });
    assert.equal(out.skipped, 'budget');
    assert.equal(called, false);
    assert.equal(readItem(item.id).status, 'pending');
    assert.deepEqual(statusCalls, []);
  });

  it('does not claim a second job while one is in flight', async () => {
    const first = queue.addTask('first', 1);
    const second = queue.addTask('second', 2);
    let release;
    dispatcher.dispatchAsync = () => new Promise((resolve) => { release = resolve; });
    const firstTick = daemon.tick({ budget: 15000 });
    const busy = await daemon.tick({ budget: 15000 });
    assert.equal(busy.skipped, 'busy');
    assert.equal(readItem(second.id).status, 'pending');
    release({ result: 'ok', cost_usd: 0 });
    assert.equal((await firstTick).status, 'done');
    assert.equal(readItem(first.id).status, 'done');
  });
});

describe('dispatcher.dispatchAsync', () => {
  it('resolves a synchronous result', async () => {
    const out = await dispatcher.dispatchAsync('t', {}, { dispatch: () => ({ result: 'x', cost_usd: 0 }) });
    assert.equal(out.result, 'x');
  });

  it('resolves an async result', async () => {
    const out = await dispatcher.dispatchAsync('t', {}, { dispatch: () => Promise.resolve({ result: 'y' }) });
    assert.equal(out.result, 'y');
  });

  it('turns a non-throwing { error } result into a rejection', async () => {
    await assert.rejects(
      dispatcher.dispatchAsync('t', {}, { dispatch: () => ({ error: 'Estimated cost exceeds ceiling' }) }),
      /Budget exceeded/
    );
  });

  it('retries a synchronous throw, then rejects once', async () => {
    let calls = 0;
    const origWrite = process.stderr.write;
    process.stderr.write = () => true;
    try {
      await assert.rejects(
        dispatcher.dispatchAsync('t', {}, { dispatch: () => { calls++; throw new Error('boom'); }, sleep: async () => {} }),
        /boom/
      );
    } finally {
      process.stderr.write = origWrite;
    }
    assert.equal(calls, 3);
  });
});

describe('daemon stop verifies process identity', () => {
  let child;
  let pidFile;

  before(async () => {
    child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)', 'ccc-daemon-test-marker'], { stdio: 'ignore' });
    for (let i = 0; i < 50; i++) {
      const id = daemon.processIdentity(child.pid);
      if (id && id.command.includes('setInterval')) break;
      await new Promise((r) => setTimeout(r, 20));
    }
  });

  after(() => {
    try { child.kill('SIGKILL'); } catch { /* gone */ }
  });

  beforeEach(() => {
    pidFile = path.join(TMP, 'daemon-' + Math.random().toString(36).slice(2) + '.pid');
  });

  function alive(pid) {
    try { process.kill(pid, 0); return true; } catch { return false; }
  }

  it('reads an identity for a live process', () => {
    const id = daemon.processIdentity(child.pid);
    assert.ok(id, 'identity available on this platform');
    assert.ok(id.startTime);
    assert.match(id.command, /ccc-daemon-test-marker/);
  });

  it('does not signal a recycled pid whose start time differs', () => {
    const id = daemon.processIdentity(child.pid);
    fs.writeFileSync(pidFile, JSON.stringify({ pid: child.pid, startTime: id.startTime + '-other', command: id.command }));
    let signalled = false;
    const origErr = process.stderr.write;
    process.stderr.write = () => true;
    try {
      assert.equal(daemon.stop({ pidFile, kill: () => { signalled = true; } }), false);
    } finally {
      process.stderr.write = origErr;
    }
    assert.equal(signalled, false);
    assert.equal(daemon.isRunning({ pidFile }), false);
    assert.ok(alive(child.pid));
  });

  it('does not signal a pid whose command line differs', () => {
    const id = daemon.processIdentity(child.pid);
    fs.writeFileSync(pidFile, JSON.stringify({ pid: child.pid, startTime: id.startTime, command: 'node bin/kc.js --daemon' }));
    const origErr = process.stderr.write;
    process.stderr.write = () => true;
    try {
      assert.equal(daemon.stop({ pidFile, kill: () => assert.fail('must not signal') }), false);
    } finally {
      process.stderr.write = origErr;
    }
    assert.ok(alive(child.pid));
  });

  it('does not signal from a legacy bare-pid file', () => {
    fs.writeFileSync(pidFile, String(child.pid));
    const origErr = process.stderr.write;
    process.stderr.write = () => true;
    try {
      assert.equal(daemon.stop({ pidFile, kill: () => assert.fail('must not signal') }), false);
    } finally {
      process.stderr.write = origErr;
    }
    assert.ok(alive(child.pid));
  });

  it('signals the recorded process when start time and command match', async () => {
    const id = daemon.processIdentity(child.pid);
    fs.writeFileSync(pidFile, JSON.stringify({ pid: child.pid, startTime: id.startTime, command: id.command }));
    assert.equal(daemon.isRunning({ pidFile }), child.pid);
    const exited = new Promise((r) => child.once('exit', (_code, signal) => r(signal)));
    assert.equal(daemon.stop({ pidFile }), true);
    assert.equal(await exited, 'SIGTERM');
  });

  it('writePidFile records this process identity', () => {
    const rec = daemon.writePidFile(pidFile);
    assert.equal(rec.pid, process.pid);
    assert.deepEqual(daemon.readPidFile(pidFile), { pid: process.pid, startTime: rec.startTime, command: rec.command, legacy: false });
    assert.equal(daemon.isRunning({ pidFile }), process.pid);
  });
});
