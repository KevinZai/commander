// Pins Commander Mission Control's suggestions feed (CC-1378 Item 5,
// non-UI parts): commander/cowork-plugin/lib/suggestions.js (writer +
// reader), model.suggestions integration in BOTH dashboard/lib/
// mission-model.js and commander/cowork-plugin/lib/mission-control-
// snapshot.js's readModel, and the GET /api/suggestions server route.
// The Suggestions dashboard/snapshot UI panels are a separate wave.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import {
  appendStatus,
  appendSuggestion,
  readSuggestions,
  suggestionsFile,
} from '../cowork-plugin/lib/suggestions.js';
import { buildMissionModel } from '../../dashboard/lib/mission-model.js';
import { createServer } from '../../dashboard/server.js';
import { readModel } from '../cowork-plugin/lib/mission-control-snapshot.js';

let tmpRoot;

test.before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-mission-suggestions-'));
});

test.after(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { force: true, recursive: true });
});

async function freshBaseDir() {
  return fs.mkdtemp(path.join(tmpRoot, 'base-'));
}

async function readRawLines(baseDir) {
  try {
    const raw = await fs.readFile(suggestionsFile(baseDir), 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

// ── lib/suggestions.js — appendSuggestion ───────────────────────────────────

test('appendSuggestion writes the documented creation shape with status "new"', async () => {
  const baseDir = await freshBaseDir();
  const ok = await appendSuggestion(
    {
      id: 'sug-1',
      from: 'reviewer',
      source_app: 'claude-code',
      idea: 'Add a retry to the flaky upload test',
      evidence: 'Failed 3/10 runs in CI last week',
      proposed_ticket: { title: 'Fix flaky upload test', project: 'CC', priority: 'P2' },
    },
    { baseDir }
  );
  assert.equal(ok, true);

  const lines = await readRawLines(baseDir);
  assert.equal(lines.length, 1);
  const entry = lines[0];
  assert.equal(entry.id, 'sug-1');
  assert.equal(entry.from, 'reviewer');
  assert.equal(entry.source_app, 'claude-code');
  assert.equal(entry.idea, 'Add a retry to the flaky upload test');
  assert.equal(entry.evidence, 'Failed 3/10 runs in CI last week');
  assert.deepEqual(entry.proposed_ticket, {
    title: 'Fix flaky upload test',
    project: 'CC',
    priority: 'P2',
  });
  assert.equal(entry.status, 'new');
  assert.ok(entry.ts, 'has a timestamp');
});

test('appendSuggestion defaults source_app to claude-code when absent', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion({ id: 'sug-2', idea: 'idea' }, { baseDir });
  const lines = await readRawLines(baseDir);
  assert.equal(lines[0].source_app, 'claude-code');
});

test('appendSuggestion redacts secrets and caps idea at 200 / evidence at 300', async () => {
  const baseDir = await freshBaseDir();
  const bearer = 'abc123def456ghi789';
  await appendSuggestion(
    {
      id: 'sug-3',
      idea: `Bearer ${bearer} ${'i'.repeat(300)}`,
      evidence: `password=supersecretvalue ${'e'.repeat(400)}`,
    },
    { baseDir }
  );
  const lines = await readRawLines(baseDir);
  const entry = lines[0];
  assert.ok(entry.idea.length <= 200);
  assert.ok(entry.evidence.length <= 300);
  assert.match(entry.idea, /\[redacted\]/);
  assert.match(entry.evidence, /^password=\[redacted\]/);
  assert.doesNotMatch(JSON.stringify(entry), new RegExp(`${bearer}|supersecretvalue`));
});

test('appendSuggestion redacts and caps the proposed ticket title', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion(
    {
      id: 'sug-4',
      idea: 'idea',
      proposed_ticket: { title: `Bearer ${'t'.repeat(20)} ${'x'.repeat(300)}` },
    },
    { baseDir }
  );
  const lines = await readRawLines(baseDir);
  assert.ok(lines[0].proposed_ticket.title.length <= 200);
  assert.match(lines[0].proposed_ticket.title, /\[redacted\]/);
});

test('appendSuggestion fails open (returns false, no throw) without an id', async () => {
  const baseDir = await freshBaseDir();
  const ok = await appendSuggestion({ idea: 'no id here' }, { baseDir });
  assert.equal(ok, false);
  assert.deepEqual(await readRawLines(baseDir), []);
});

test('appendSuggestion fails open on a write error (unwritable baseDir)', async () => {
  const ok = await appendSuggestion(
    { id: 'sug-5', idea: 'x' },
    { baseDir: '/dev/null/no-such-path' }
  );
  assert.equal(ok, false);
});

// ── lib/suggestions.js — appendStatus ───────────────────────────────────────

test('appendStatus writes a promoted status line with promoted_ticket + by', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion({ id: 'sug-6', idea: 'idea' }, { baseDir });
  const ok = await appendStatus(
    {
      id: 'sug-6',
      status: 'promoted',
      promoted_ticket: { url: 'https://example.test/CC-1', id: 'CC-1', title: 'Tracked' },
      by: 'kevin',
    },
    { baseDir }
  );
  assert.equal(ok, true);

  const lines = await readRawLines(baseDir);
  assert.equal(lines.length, 2);
  const statusLine = lines[1];
  assert.equal(statusLine.id, 'sug-6');
  assert.equal(statusLine.status, 'promoted');
  assert.deepEqual(statusLine.promoted_ticket, {
    url: 'https://example.test/CC-1',
    id: 'CC-1',
    title: 'Tracked',
  });
  assert.equal(statusLine.by, 'kevin');
});

test('appendStatus writes a dismissed status line', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion({ id: 'sug-7', idea: 'idea' }, { baseDir });
  await appendStatus({ id: 'sug-7', status: 'dismissed', by: 'kevin' }, { baseDir });
  const lines = await readRawLines(baseDir);
  assert.equal(lines[1].status, 'dismissed');
  assert.equal(lines[1].promoted_ticket, null);
});

test('appendStatus rejects an invalid status (fails open, no write)', async () => {
  const baseDir = await freshBaseDir();
  const ok = await appendStatus({ id: 'sug-8', status: 'archived' }, { baseDir });
  assert.equal(ok, false);
  assert.deepEqual(await readRawLines(baseDir), []);
});

test('appendStatus fails open without an id', async () => {
  const baseDir = await freshBaseDir();
  const ok = await appendStatus({ status: 'promoted' }, { baseDir });
  assert.equal(ok, false);
});

// ── lib/suggestions.js — rotation ───────────────────────────────────────────

test('rotates suggestions.jsonl at 10MB and starts fresh', async () => {
  const baseDir = await freshBaseDir();
  const file = suggestionsFile(baseDir);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, 'x'.repeat(10 * 1024 * 1024 + 1));

  await appendSuggestion({ id: 'sug-rotate', idea: 'fresh' }, { baseDir });

  const dirFiles = await fs.readdir(path.dirname(file));
  const rotated = dirFiles.filter(
    (name) => name.startsWith('suggestions.') && name !== 'suggestions.jsonl'
  );
  assert.ok(rotated.length > 0, 'a rotated archive file was created');

  const lines = await readRawLines(baseDir);
  assert.equal(lines.length, 1, 'fresh file has only the new entry');
  assert.equal(lines[0].id, 'sug-rotate');
});

// ── lib/suggestions.js — readSuggestions (latest-status-wins) ──────────────

test('readSuggestions merges latest-status-wins by id, content persists forward', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion(
    { id: 'sug-9', from: 'reviewer', idea: 'Ship the retry fix', evidence: 'flaky CI' },
    { baseDir }
  );
  await appendStatus(
    { id: 'sug-9', status: 'promoted', promoted_ticket: { id: 'CC-42' }, by: 'kevin' },
    { baseDir }
  );

  const suggestions = await readSuggestions(baseDir);
  assert.equal(suggestions.length, 1);
  const s = suggestions[0];
  assert.equal(s.id, 'sug-9');
  assert.equal(s.status, 'promoted');
  assert.equal(s.idea, 'Ship the retry fix', 'idea persists forward from the creation line');
  assert.equal(s.evidence, 'flaky CI');
  assert.deepEqual(s.promoted_ticket, { url: null, id: 'CC-42', title: null });
  assert.equal(s.by, 'kevin');
});

test('readSuggestions is newest-first and caps at 50', async () => {
  const baseDir = await freshBaseDir();
  for (let i = 0; i < 55; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await appendSuggestion(
      { id: `sug-${i}`, idea: `idea ${i}`, ts: new Date(2026, 0, 1, 0, 0, i).toISOString() },
      { baseDir }
    );
  }
  const suggestions = await readSuggestions(baseDir);
  assert.equal(suggestions.length, 50);
  assert.equal(suggestions[0].id, 'sug-54', 'newest first');
});

test('readSuggestions on a missing file returns []', async () => {
  const suggestions = await readSuggestions(path.join(tmpRoot, 'does-not-exist'));
  assert.deepEqual(suggestions, []);
});

// ── model integration: dashboard/lib/mission-model.js ───────────────────────

test('buildMissionModel exposes model.suggestions and mentions the count in summary', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion({ id: 'sug-a', idea: 'Add caching' }, { baseDir });
  await appendSuggestion({ id: 'sug-b', idea: 'Add rate limiting' }, { baseDir });

  const model = await buildMissionModel({ baseDir });
  assert.equal(model.suggestions.length, 2);
  assert.ok(model.suggestions.every((s) => s.status === 'new'));
  assert.match(model.summary, /2 suggestions awaiting review\./);
});

test('buildMissionModel summary uses singular phrasing for exactly one suggestion', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion({ id: 'sug-c', idea: 'Add caching' }, { baseDir });
  const model = await buildMissionModel({ baseDir });
  assert.match(model.summary, /1 suggestion awaiting review\./);
});

test('buildMissionModel does not count promoted/dismissed suggestions toward "awaiting review"', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion({ id: 'sug-d', idea: 'Add caching' }, { baseDir });
  await appendStatus({ id: 'sug-d', status: 'dismissed' }, { baseDir });
  const model = await buildMissionModel({ baseDir });
  assert.equal(model.suggestions[0].status, 'dismissed');
  assert.doesNotMatch(model.summary, /awaiting review/);
});

test('a suggestion alone (no agents/tasks) breaks the zero-state summary', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion({ id: 'sug-e', idea: 'Add caching' }, { baseDir });
  const model = await buildMissionModel({ baseDir });
  assert.notEqual(model.summary, 'No agent activity yet.');
  assert.match(model.summary, /1 suggestion awaiting review\./);
});

test('missing suggestions.jsonl yields model.suggestions === []', async () => {
  const baseDir = await freshBaseDir();
  const model = await buildMissionModel({ baseDir });
  assert.deepEqual(model.suggestions, []);
});

// ── model integration: commander/cowork-plugin/lib/mission-control-snapshot.js ─

test('readModel (snapshot lib) exposes model.suggestions with the same shape as buildMissionModel', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion(
    { id: 'sug-f', from: 'reviewer', idea: 'Add caching', evidence: 'slow endpoint' },
    { baseDir }
  );
  await appendStatus({ id: 'sug-f', status: 'promoted', by: 'kevin' }, { baseDir });

  const modelDashboard = await buildMissionModel({ baseDir });
  const modelSnapshot = await readModel({ baseDir });

  assert.deepEqual(modelSnapshot.suggestions, modelDashboard.suggestions);
});

test('readModel (snapshot lib) summary also mentions suggestions awaiting review', async () => {
  const baseDir = await freshBaseDir();
  await appendSuggestion({ id: 'sug-g', idea: 'idea' }, { baseDir });
  const model = await readModel({ baseDir });
  assert.match(model.summary, /1 suggestion awaiting review\./);
});

// ── server: GET /api/suggestions ────────────────────────────────────────────

function dispatch(server, url, options = {}) {
  return new Promise((resolve) => {
    const req = new Readable({
      read() {
        this.push(null);
      },
    });
    req.method = options.method || 'GET';
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
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      resolve({
        body: Buffer.concat(chunks).toString('utf8'),
        headers: res.headers,
        statusCode: res.statusCode,
      });
      return Writable.prototype.end.call(res);
    };

    server.emit('request', req, res);
  });
}

test('GET /api/suggestions returns { suggestions }', async () => {
  const commanderDir = await freshBaseDir();
  await appendSuggestion({ id: 'sug-h', idea: 'Ship it' }, { baseDir: commanderDir });
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'none'), commanderDir });

  const response = await dispatch(server, '/api/suggestions');
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Content-Type'], /application\/json/);
  const body = JSON.parse(response.body);
  assert.equal(body.suggestions.length, 1);
  assert.equal(body.suggestions[0].id, 'sug-h');
});

test('POST /api/suggestions is rejected — server stays GET-only', async () => {
  const commanderDir = await freshBaseDir();
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'none'), commanderDir });
  const response = await dispatch(server, '/api/suggestions', { method: 'POST' });
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'GET');
});

test('object and array ids are skipped rather than merged under one key', async () => {
  const commanderDir = await freshBaseDir();
  const dir = path.join(commanderDir, 'mission-control');
  await fs.mkdir(dir, { recursive: true });
  // Both object ids would coerce to "[object Object]" and collapse into a single
  // suggestion; only scalar ids are a stable identity.
  await fs.writeFile(
    path.join(dir, 'suggestions.jsonl'),
    [
      JSON.stringify({ id: { a: 1 }, ts: '2026-07-16T10:00:00.000Z', idea: 'first object' }),
      JSON.stringify({ id: { b: 2 }, ts: '2026-07-16T10:00:01.000Z', idea: 'second object' }),
      JSON.stringify({ id: [1, 2], ts: '2026-07-16T10:00:02.000Z', idea: 'array id' }),
      JSON.stringify({ id: '   ', ts: '2026-07-16T10:00:03.000Z', idea: 'blank id' }),
      JSON.stringify({ id: 'real-1', ts: '2026-07-16T10:00:04.000Z', idea: 'keeper' }),
      JSON.stringify({ id: 7, ts: '2026-07-16T10:00:05.000Z', idea: 'numeric id keeper' }),
    ].join('\n') + '\n'
  );

  const model = await buildMissionModel({ baseDir: commanderDir });
  assert.deepEqual(
    model.suggestions.map((s) => s.id).sort(),
    ['7', 'real-1'],
    'only scalar ids survive'
  );

  const snapshot = await readModel({ baseDir: commanderDir });
  assert.deepEqual(
    snapshot.suggestions.map((s) => s.id).sort(),
    ['7', 'real-1'],
    'snapshot reader agrees with the model'
  );
});

test('unqualified suggestions inherit the running app, not a hardcoded claude-code', async () => {
  const commanderDir = await freshBaseDir();
  // The lib is mirrored verbatim into the Codex plugin; an entry that does not
  // name its own source must not be labelled claude-code when Codex is the host.
  const child = await import('node:child_process');
  const script = `
    import { appendSuggestion } from ${JSON.stringify(
      path.join(process.cwd(), 'commander/cowork-plugin/lib/suggestions.js')
    )};
    await appendSuggestion({ id: 'codex-1', from: 'reviewer', idea: 'from codex' }, { baseDir: ${JSON.stringify(
      commanderDir
    )} });
  `;
  const res = child.spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, CODEX_PLUGIN_ROOT: '/tmp/codex-root' },
  });
  assert.equal(res.status, 0, res.stderr);

  const rows = await readSuggestions(commanderDir);
  assert.equal(rows[0].source_app, 'codex');

  await appendSuggestion(
    { id: 'claude-1', from: 'reviewer', idea: 'from claude' },
    { baseDir: commanderDir }
  );
  const after = await readSuggestions(commanderDir);
  assert.equal(after.find((r) => r.id === 'claude-1').source_app, 'claude-code');
});
