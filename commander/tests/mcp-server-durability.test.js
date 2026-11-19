'use strict';

// Local MCP server: notes, plans and tasks persist before success (audit #30),
// and commander_update honors CCC_OFFLINE (audit #23).
// Run: node --test commander/tests/mcp-server-durability.test.js

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Store paths and update-check's cache path resolve from HOME.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-mcp-durability-'));
const ENV_KEYS = ['HOME', 'CCC_OFFLINE', 'CC_LINEAR_TOKEN', 'LINEAR_DEV_TOKEN_PERSONAL', 'LINEAR_API_KEY_PERSONAL', 'LINEAR_API_KEY'];
const savedEnv = {};
for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
for (const k of ENV_KEYS) delete process.env[k];
process.env.HOME = TMP;

const server = require('../mcp-server/index.js');
const { HANDLERS } = server;
const STORE = path.join(TMP, '.claude', 'commander');

after(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  fs.rmSync(TMP, { recursive: true, force: true });
});

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(STORE, name), 'utf8'));
}

/** Run handleRequest and capture the JSON-RPC reply written to stdout. */
async function rpc(name, args) {
  const lines = [];
  const orig = process.stdout.write;
  process.stdout.write = (chunk) => { lines.push(String(chunk)); return true; };
  try {
    await server.handleRequest({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name, arguments: args } });
  } finally {
    process.stdout.write = orig;
  }
  assert.equal(lines.length, 1, 'exactly one reply');
  const msg = JSON.parse(lines[0]);
  return { isError: Boolean(msg.result.isError), body: JSON.parse(msg.result.content[0].text) };
}

beforeEach(() => {
  fs.rmSync(STORE, { recursive: true, force: true });
  delete process.env.CCC_OFFLINE;
});

describe('commander_notes_pin', () => {
  it('persists the note and returns its id', async () => {
    const { isError, body } = await rpc('commander_notes_pin', { content: 'remember this', tags: ['a'] });
    assert.equal(isError, false);
    assert.equal(body.pinned, true);
    assert.match(body.id, /^note-/);
    const notes = readJson('pinned-notes.json');
    assert.equal(notes.length, 1);
    assert.equal(notes[0].id, body.id);
    assert.equal(notes[0].content, 'remember this');
  });

  it('returns a tool error, not success, when the store cannot be written', async () => {
    fs.mkdirSync(path.dirname(STORE), { recursive: true });
    fs.writeFileSync(STORE, 'a file where the store directory should be');
    const { isError, body } = await rpc('commander_notes_pin', { content: 'lost?' });
    assert.equal(isError, true);
    const { error } = body;
    assert.match(error, /Could not (read|save)/);
    fs.rmSync(STORE);
  });

  it('refuses to overwrite an unreadable store', () => {
    fs.mkdirSync(STORE, { recursive: true });
    fs.writeFileSync(path.join(STORE, 'pinned-notes.json'), '{ not json');
    assert.throws(() => HANDLERS.commander_notes_pin({ content: 'x' }), /unreadable store/);
    assert.equal(fs.readFileSync(path.join(STORE, 'pinned-notes.json'), 'utf8'), '{ not json');
  });

  it('rejects a missing content field', () => {
    assert.throws(() => HANDLERS.commander_notes_pin({}), /content is required/);
  });
});

describe('commander_plan_integrate', () => {
  it('persists the plan and returns its id', async () => {
    const { isError, body } = await rpc('commander_plan_integrate', { plan: '1. do it', title: 'P' });
    assert.equal(isError, false);
    assert.equal(body.integrated, true);
    assert.match(body.id, /^plan-/);
    assert.equal(readJson('plans.json')[0].id, body.id);
  });

  it('returns a tool error for a malformed store and leaves it intact', async () => {
    fs.mkdirSync(STORE, { recursive: true });
    fs.writeFileSync(path.join(STORE, 'plans.json'), '{"not":"an array"}');
    const { isError } = await rpc('commander_plan_integrate', { plan: 'x' });
    assert.equal(isError, true);
    assert.equal(fs.readFileSync(path.join(STORE, 'plans.json'), 'utf8'), '{"not":"an array"}');
  });
});

describe('commander_tasks_push', () => {
  let origLinear;
  beforeEach(() => { origLinear = server.deps.linear; });
  afterEach(() => { server.deps.linear = origLinear; });

  it('persists locally and reports linear not_configured without a token', async () => {
    const { isError, body } = await rpc('commander_tasks_push', { title: 'Ship it', description: 'd' });
    assert.equal(isError, false);
    assert.equal(body.queued, true);
    assert.match(body.id, /^task-/);
    assert.equal(body.linear.status, 'not_configured');
    const tasks = readJson('tasks.json');
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].id, body.id);
    assert.equal(tasks[0].title, 'Ship it');
  });

  it('reports not_configured under CCC_OFFLINE and never calls Linear', async () => {
    process.env.CCC_OFFLINE = '1';
    server.deps.linear = () => ({ validateAuth: () => null, quickCreateIssue: () => assert.fail('no network in offline mode') });
    const { body } = await rpc('commander_tasks_push', { title: 'Offline' });
    assert.equal(body.linear.status, 'not_configured');
    assert.equal(readJson('tasks.json')[0].id, body.id);
  });

  it('pushes to Linear when available and records the issue on the local record', async () => {
    server.deps.linear = () => ({
      validateAuth: () => null,
      quickCreateIssue: async (title) => ({ id: 'iss_1', identifier: 'CC-42', url: 'https://linear.app/x/CC-42', title }),
    });
    const { isError, body } = await rpc('commander_tasks_push', { title: 'Remote' });
    assert.equal(isError, false);
    assert.equal(body.linear.status, 'pushed');
    assert.equal(body.linear.identifier, 'CC-42');
    assert.equal(readJson('tasks.json')[0].linear.identifier, 'CC-42');
  });

  it('keeps the local record and reports failed when the Linear push fails', async () => {
    server.deps.linear = () => ({ validateAuth: () => null, quickCreateIssue: async () => { throw new Error('401'); } });
    const { body } = await rpc('commander_tasks_push', { title: 'Nope' });
    assert.deepEqual(body.linear, { status: 'failed', error: '401' });
    const saved = readJson('tasks.json')[0];
    assert.equal(saved.id, body.id);
    assert.equal(saved.linear.status, 'failed');
  });

  it('returns a tool error when the task cannot be saved', async () => {
    fs.mkdirSync(path.dirname(STORE), { recursive: true });
    fs.writeFileSync(STORE, 'blocker');
    const { isError } = await rpc('commander_tasks_push', { title: 'x' });
    assert.equal(isError, true);
    fs.rmSync(STORE);
  });
});

describe('commander_update offline guard', () => {
  let origFetch;
  let fetchCalls;
  before(() => {
    origFetch = globalThis.fetch;
    globalThis.fetch = async () => { fetchCalls++; throw new Error('network'); };
  });
  after(() => { globalThis.fetch = origFetch; });
  beforeEach(() => { fetchCalls = 0; });

  it('makes no request under CCC_OFFLINE=1', async () => {
    process.env.CCC_OFFLINE = '1';
    const { isError, body } = await rpc('commander_update', {});
    assert.equal(isError, false);
    assert.equal(fetchCalls, 0);
    assert.equal(body.offline, true);
    assert.equal(body.status, 'unknown');
    assert.match(body.note, /Offline mode/);
  });

  it('makes no request when ~/.commander/config.json sets offline', async () => {
    fs.mkdirSync(path.join(TMP, '.commander'), { recursive: true });
    fs.writeFileSync(path.join(TMP, '.commander', 'config.json'), JSON.stringify({ offline: true }));
    try {
      const { body } = await rpc('commander_update', {});
      assert.equal(fetchCalls, 0);
      assert.equal(body.offline, true);
    } finally {
      fs.rmSync(path.join(TMP, '.commander'), { recursive: true, force: true });
    }
  });

  it('does fetch when online', async () => {
    await rpc('commander_update', {});
    assert.equal(fetchCalls, 1);
  });
});

// M5: the dispatch hint is structured data, never a shell string, and only names a shipped agent.
describe('commander_invoke_agent dispatch hint', () => {
  it('returns {command, argv} with the task as one literal argument', async () => {
    const task = 'fix "it"; rm -rf ~ $(whoami) `id`';
    const { isError, body } = await rpc('commander_invoke_agent', { name: 'reviewer', task });
    assert.equal(isError, false);
    assert.deepEqual(body.dispatch, { command: 'ccc', argv: ['--dispatch', '--agent', 'reviewer', '--', task] });
    assert.equal(body.dispatchHint, undefined, 'no shell-string hint');
  });

  it('rejects a name that is not a shipped agent', async () => {
    for (const name of ['nope', '../reviewer', 'reviewer; id', '']) {
      const { isError } = await rpc('commander_invoke_agent', { name, task: 't' });
      assert.equal(isError, true, JSON.stringify(name));
    }
  });
});

describe('record stores: lane dir and locking', () => {
  // Codex #302 delta2 MEDIUM 3: a slow writer whose lock was broken never saves its older snapshot.
  it('a writer whose lock was taken over does not save, and leaves the new owner\'s lock alone', async () => {
    const file = path.join(STORE, 'pinned-notes.json');
    const lock = file + '.lock';
    server.deps.storeWriteHook = () => {
      // Another server broke this writer's lock as stale, took it and saved a record.
      server.deps.storeWriteHook = null;
      fs.rmSync(lock);
      fs.writeFileSync(lock, 'other-owner');
      const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
      current.push({ id: 'note-from-other-writer' });
      fs.writeFileSync(file, JSON.stringify(current));
    };
    try {
      const { isError, body } = await rpc('commander_notes_pin', { content: 'slow writer' });
      assert.equal(isError, true, 'the slow writer reports failure');
      assert.match(body.error, /lock|changed/);
      const ids = readJson('pinned-notes.json').map((r) => r.id);
      assert.ok(ids.includes('note-from-other-writer'), 'the other writer\'s record survives');
      assert.equal(fs.readFileSync(lock, 'utf8'), 'other-owner', 'the new owner\'s lock is not released');
    } finally {
      server.deps.storeWriteHook = null;
      fs.rmSync(lock, { force: true });
    }
  });

  it('a store changed under a held lock is not overwritten (compare-and-swap)', async () => {
    const file = path.join(STORE, 'pinned-notes.json');
    server.deps.storeWriteHook = () => {
      server.deps.storeWriteHook = null;
      const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
      current.push({ id: 'note-sneaked-in' });
      fs.writeFileSync(file, JSON.stringify(current));
    };
    try {
      const { isError } = await rpc('commander_notes_pin', { content: 'cas loser' });
      assert.equal(isError, true);
      assert.ok(readJson('pinned-notes.json').some((r) => r.id === 'note-sneaked-in'));
    } finally {
      server.deps.storeWriteHook = null;
    }
  });

  it('a lock that keeps vanishing still respects the wait deadline', () => {
    const file = path.join(STORE, 'deadline.json');
    const lock = file + '.lock';
    const realOpen = fs.openSync;
    const realStat = fs.statSync;
    // Every open finds the lock; every stat finds it gone: the loop must still stop at the deadline.
    fs.openSync = (p, ...rest) => { if (p === lock) { const e = new Error('exists'); e.code = 'EEXIST'; throw e; } return realOpen(p, ...rest); };
    fs.statSync = (p, ...rest) => { if (p === lock) { const e = new Error('gone'); e.code = 'ENOENT'; throw e; } return realStat(p, ...rest); };
    const started = Date.now();
    try {
      assert.throws(() => server._store.withStoreLock(file, () => 'never'), /locked/);
    } finally {
      fs.openSync = realOpen;
      fs.statSync = realStat;
    }
    assert.ok(Date.now() - started < 10000, 'gave up near the deadline');
  });

  it('writes under the lane named by CCC_CONFIG_DIR', async () => {
    const lane = path.join(TMP, '.claude-ai9');
    process.env.CCC_CONFIG_DIR = lane;
    try {
      const { isError, body } = await rpc('commander_notes_pin', { content: 'lane note' });
      assert.equal(isError, false);
      assert.equal(body.store, path.join(fs.realpathSync(lane), 'commander', 'pinned-notes.json'));
    } finally {
      delete process.env.CCC_CONFIG_DIR;
    }
  });

  it('waits out a held lock and breaks a stale one', async () => {
    fs.mkdirSync(STORE, { recursive: true });
    const lock = path.join(STORE, 'pinned-notes.json.lock');
    fs.writeFileSync(lock, 'other');
    const old = new Date(Date.now() - 60_000);
    fs.utimesSync(lock, old, old);
    const { isError } = await rpc('commander_notes_pin', { content: 'after stale lock' });
    assert.equal(isError, false, 'a stale lock is broken');
    assert.equal(fs.existsSync(lock), false, 'the lock is released after the write');

    fs.writeFileSync(lock, 'held');
    const held = await rpc('commander_notes_pin', { content: 'blocked' });
    assert.equal(held.isError, true, 'a fresh lock held by another writer is not overridden');
    assert.match(held.body.error, /locked/);
    fs.rmSync(lock);
    assert.equal(readJson('pinned-notes.json').length, 1);
  });
});

describe('JSON-RPC notifications', () => {
  it('never replies to a message without an id', async () => {
    const lines = [];
    const orig = process.stdout.write;
    process.stdout.write = (chunk) => { lines.push(String(chunk)); return true; };
    try {
      await server.handleRequest({ jsonrpc: '2.0', method: 'notifications/initialized' });
      await server.handleRequest({ jsonrpc: '2.0', method: 'notifications/cancelled', params: {} });
      await server.handleRequest({ jsonrpc: '2.0', method: 'some/unknown' });
    } finally {
      process.stdout.write = orig;
    }
    assert.deepEqual(lines, []);
  });
});
