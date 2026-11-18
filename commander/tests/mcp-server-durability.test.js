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
