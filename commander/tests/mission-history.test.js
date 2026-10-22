// Pins Commander Mission Control's Item 5 (CC-1380, reader half) — the
// claude-mem History panel: dashboard/lib/history.js (readHistory) over
// ~/.claude-mem/claude-mem.db (SQLite, WAL), plus GET /api/history.
// This module is opt-in (most users won't have claude-mem installed) —
// every test asserts the missing-DB path degrades to [] cleanly.
//
// This file intentionally does NOT import node:sqlite directly at the
// top level — some environments genuinely lack it (dashboard/
// package.json's engines floor is node>=20; node:sqlite shipped
// experimentally from 22.5). Fixture creation is skipped (not failed)
// when node:sqlite isn't available in the CURRENT runtime, mirroring
// how readHistory() itself degrades.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { defaultDbPath, readHistory } from '../../dashboard/lib/history.js';
import { createServer } from '../../dashboard/server.js';

let tmpRoot;
// Resolved via top-level await (not test.before) — `{ skip }` options
// below are evaluated synchronously as each test() call registers, which
// happens before any test.before() hook has run.
let sqliteModule = null;
try {
  sqliteModule = await import('node:sqlite');
} catch {
  sqliteModule = null;
}

test.before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-mission-history-'));
});

test.after(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { force: true, recursive: true });
});

async function freshDbPath() {
  const dir = await fs.mkdtemp(path.join(tmpRoot, 'db-'));
  return path.join(dir, 'claude-mem.db');
}

function makeFixtureDb(dbPath, rows) {
  const { DatabaseSync } = sqliteModule;
  const db = new DatabaseSync(dbPath);
  db.exec(`CREATE TABLE observations (
    id INTEGER PRIMARY KEY,
    memory_session_id TEXT,
    project TEXT,
    text TEXT,
    type TEXT,
    title TEXT,
    subtitle TEXT,
    facts TEXT,
    narrative TEXT,
    created_at TEXT,
    created_at_epoch INTEGER,
    merged_into_project TEXT
  )`);
  db.exec('CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC)');
  const insert = db.prepare(
    'INSERT INTO observations (project, type, title, text, facts, narrative, created_at_epoch, merged_into_project) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const row of rows) {
    insert.run(
      row.project ?? null,
      row.type ?? 'discovery',
      row.title ?? null,
      row.text ?? 'raw prompt content that must never surface',
      row.facts ?? 'private facts blob',
      row.narrative ?? 'private narrative blob',
      row.createdAtEpoch,
      row.mergedIntoProject ?? null
    );
  }
  db.close();
}

test('defaultDbPath: resolves to ~/.claude-mem/claude-mem.db', () => {
  assert.equal(defaultDbPath(), path.join(os.homedir(), '.claude-mem', 'claude-mem.db'));
});

test('readHistory: a missing DB file returns [] and never throws', async () => {
  const dbPath = await freshDbPath();
  const rows = await readHistory({ dbPath });
  assert.deepEqual(rows, []);
});

test('readHistory: a nonsense dbPath (not even a valid path shape) still degrades to []', async () => {
  const rows = await readHistory({ dbPath: '\0invalid' });
  assert.deepEqual(rows, []);
});

test('readHistory: a real SQLite fixture maps rows and excludes merged rows', { skip: !sqliteModule }, async () => {
  const dbPath = await freshDbPath();
  makeFixtureDb(dbPath, [
    { project: 'proj-a', type: 'discovery', title: 'Found the root cause', createdAtEpoch: 1000 },
    { project: 'proj-a', type: 'bugfix', title: 'Fixed it', createdAtEpoch: 2000 },
    { project: 'proj-b', type: 'feature', title: 'Should not appear', createdAtEpoch: 3000, mergedIntoProject: 'proj-a' },
  ]);

  const rows = await readHistory({ dbPath });

  assert.equal(rows.length, 2, 'the merged row is excluded');
  assert.deepEqual(
    rows.map((row) => row.title),
    ['Fixed it', 'Found the root cause'],
    'newest first (created_at_epoch DESC)'
  );
  assert.equal(rows[0].type, 'bugfix');
  assert.equal(rows[0].project, 'proj-a');
  assert.equal(typeof rows[0].id, 'number');
});

test('readHistory: only id/project/type/title/ts are ever returned — never text/facts/narrative', { skip: !sqliteModule }, async () => {
  const dbPath = await freshDbPath();
  makeFixtureDb(dbPath, [
    {
      project: 'proj-a',
      type: 'discovery',
      title: 'Safe title',
      text: 'SECRET_PROMPT_CONTENT',
      facts: 'SECRET_FACTS',
      narrative: 'SECRET_NARRATIVE',
      createdAtEpoch: 1000,
    },
  ]);

  const rows = await readHistory({ dbPath });
  const serialized = JSON.stringify(rows);
  assert.equal(serialized.includes('SECRET_PROMPT_CONTENT'), false);
  assert.equal(serialized.includes('SECRET_FACTS'), false);
  assert.equal(serialized.includes('SECRET_NARRATIVE'), false);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['id', 'project', 'title', 'ts', 'type']);
});

test('readHistory: the after cursor excludes rows at or before it', { skip: !sqliteModule }, async () => {
  const dbPath = await freshDbPath();
  makeFixtureDb(dbPath, [
    { title: 'old', createdAtEpoch: 1000 },
    { title: 'newer', createdAtEpoch: 2000 },
    { title: 'newest', createdAtEpoch: 3000 },
  ]);

  const rows = await readHistory({ dbPath, after: 1500 });
  assert.deepEqual(
    rows.map((row) => row.title),
    ['newest', 'newer']
  );
});

test('readHistory: caps at 50 rows', { skip: !sqliteModule }, async () => {
  const dbPath = await freshDbPath();
  const rows = [];
  for (let i = 0; i < 60; i += 1) {
    rows.push({ title: `entry ${i}`, createdAtEpoch: 1000 + i });
  }
  makeFixtureDb(dbPath, rows);

  const result = await readHistory({ dbPath });
  assert.equal(result.length, 50);
  assert.equal(result[0].title, 'entry 59', 'newest 50 survive, oldest 10 are dropped');
});

test('readHistory: an overly long title is truncated with an ellipsis', { skip: !sqliteModule }, async () => {
  const dbPath = await freshDbPath();
  makeFixtureDb(dbPath, [{ title: 'x'.repeat(400), createdAtEpoch: 1000 }]);

  const rows = await readHistory({ dbPath });
  assert.ok(rows[0].title.length <= 201);
  assert.ok(rows[0].title.endsWith('…'));
});

function dispatch(server, url) {
  return new Promise((resolve) => {
    const req = new Readable({
      read() {
        this.push(null);
      },
    });
    req.method = 'GET';
    req.url = url;
    req.headers = {};

    const chunks = [];
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    res.statusCode = 200;
    res.headers = {};
    res.writeHead = (statusCode, headers) => {
      res.statusCode = statusCode;
      res.headers = headers || {};
      return res;
    };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      resolve({ body: Buffer.concat(chunks).toString('utf8'), statusCode: res.statusCode });
      return Writable.prototype.end.call(res);
    };

    server.emit('request', req, res);
  });
}

test('GET /api/history: 200 with an empty list when the DB is absent', async () => {
  const commanderDir = await fs.mkdtemp(path.join(tmpRoot, 'commander-'));
  const historyDbPath = await freshDbPath();
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'none'), commanderDir, historyDbPath });
  const response = await dispatch(server, '/api/history');

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.deepEqual(body.history, []);
  assert.equal(typeof body.generatedAt, 'string');
});

test('GET /api/history: honors an after cursor query param', { skip: !sqliteModule }, async () => {
  const commanderDir = await fs.mkdtemp(path.join(tmpRoot, 'commander-'));
  const historyDbPath = await freshDbPath();
  makeFixtureDb(historyDbPath, [
    { title: 'old', createdAtEpoch: 1000 },
    { title: 'newer', createdAtEpoch: 2000 },
  ]);
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'none'), commanderDir, historyDbPath });

  const all = await dispatch(server, '/api/history');
  assert.equal(JSON.parse(all.body).history.length, 2);

  const after = await dispatch(server, '/api/history?after=1500');
  const body = JSON.parse(after.body);
  assert.equal(body.history.length, 1);
  assert.equal(body.history[0].title, 'newer');
});

test('POST /api/history is rejected — server stays GET-only', async () => {
  const commanderDir = await fs.mkdtemp(path.join(tmpRoot, 'commander-'));
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'none'), commanderDir });

  const response = await new Promise((resolve) => {
    const req = new Readable({
      read() {
        this.push(null);
      },
    });
    req.method = 'POST';
    req.url = '/api/history';
    req.headers = {};
    const chunks = [];
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    res.statusCode = 200;
    res.headers = {};
    res.writeHead = (statusCode, headers) => {
      res.statusCode = statusCode;
      res.headers = headers || {};
      return res;
    };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      resolve({ statusCode: res.statusCode, headers: res.headers });
      return Writable.prototype.end.call(res);
    };
    server.emit('request', req, res);
  });

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'GET');
});
