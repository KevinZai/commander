// Pins Commander Mission Control's Item 2 (CC-1380) — the daily
// metrics rollup: commander/cowork-plugin/lib/metrics.js
// (buildMetrics/appendMetrics/readMetrics/getMetrics) and its
// metrics.jsonl persistence, plus model.metrics wiring in BOTH
// dashboard/lib/mission-model.js and commander/cowork-plugin/lib/
// mission-control-snapshot.js's readModel, and the GET /api/metrics
// server route. Every test injects a fake `runner` — the real
// `ccusage` binary is never invoked here (see mission-model.test.js /
// mission-roster-derived.test.js for the one incidental real-runner
// smoke test through buildMissionModel's default path).

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import {
  appendMetrics,
  buildMetrics,
  getMetrics,
  metricsFile,
  readMetrics,
} from '../cowork-plugin/lib/metrics.js';
import { buildMissionModel } from '../../dashboard/lib/mission-model.js';
import { createServer } from '../../dashboard/server.js';
import { readModel } from '../cowork-plugin/lib/mission-control-snapshot.js';

let tmpRoot;

test.before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-mission-metrics-'));
});

test.after(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { force: true, recursive: true });
});

async function freshBaseDir() {
  return fs.mkdtemp(path.join(tmpRoot, 'base-'));
}

function toLines(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
}

async function writeEvents(baseDir, entries) {
  const dir = path.join(baseDir, 'mission-control');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'events.jsonl'), toLines(entries));
}

const NOW = Date.parse('2026-07-16T10:04:00.000Z');

// Never touches the real ccusage binary.
const zeroRunner = async () => null;

test('buildMetrics: never calls a real process — zero rows when no runner given and both logs are empty', async () => {
  const baseDir = await freshBaseDir();
  const rows = await buildMetrics({ baseDir, now: NOW, days: 3, runner: zeroRunner });
  assert.deepEqual(rows, [], 'no source_app showed any signal, so nothing to gap-fill');
});

test('buildMetrics: agents_dispatched counts delegation events per (date, source_app)', async () => {
  const baseDir = await freshBaseDir();
  await writeEvents(baseDir, [
    { ts: '2026-07-15T09:00:00.000Z', session_id: 'S1', source_app: 'codex', type: 'delegation', actor: 'scout' },
    { ts: '2026-07-15T09:05:00.000Z', session_id: 'S1', source_app: 'codex', type: 'delegation', actor: 'coder' },
    { ts: '2026-07-15T09:10:00.000Z', session_id: 'S2', source_app: 'claude-code', type: 'delegation', actor: 'reviewer' },
  ]);
  const rows = await buildMetrics({ baseDir, now: NOW, days: 3, runner: zeroRunner });

  const codexRow = rows.find((row) => row.date === '2026-07-15' && row.source_app === 'codex');
  const claudeRow = rows.find((row) => row.date === '2026-07-15' && row.source_app === 'claude-code');
  assert.equal(codexRow.agents_dispatched, 2);
  assert.equal(claudeRow.agents_dispatched, 1);
});

test('buildMetrics: tasks_completed counts task-type events whose status looks done, per source_app', async () => {
  const baseDir = await freshBaseDir();
  await writeEvents(baseDir, [
    { ts: '2026-07-15T09:00:00.000Z', session_id: 'S1', source_app: 'codex', type: 'task', status: 'completed' },
    { ts: '2026-07-15T09:01:00.000Z', session_id: 'S1', source_app: 'codex', type: 'task', status: 'pending' },
    { ts: '2026-07-15T09:02:00.000Z', session_id: 'S1', source_app: 'codex', type: 'task', status: 'closed' },
  ]);
  const rows = await buildMetrics({ baseDir, now: NOW, days: 3, runner: zeroRunner });

  const row = rows.find((r) => r.date === '2026-07-15' && r.source_app === 'codex');
  assert.equal(row.tasks_completed, 2, 'completed + closed count; pending does not');
});

test('buildMetrics: tool_failures is always attributed to claude-code (PostToolUseFailure is dropped by the Codex build)', async () => {
  const baseDir = await freshBaseDir();
  await fs.writeFile(
    path.join(baseDir, 'tool-failures.jsonl'),
    toLines([
      { ts: '2026-07-15T09:00:00.000Z', tool_name: 'Bash', error: 'boom' },
      { ts: '2026-07-15T09:01:00.000Z', tool_name: 'Write', error: 'boom again' },
    ])
  );
  const rows = await buildMetrics({ baseDir, now: NOW, days: 3, runner: zeroRunner });

  const row = rows.find((r) => r.date === '2026-07-15' && r.source_app === 'claude-code');
  assert.equal(row.tool_failures, 2);
  assert.equal(rows.some((r) => r.source_app === 'codex'), false, 'tool-failures.jsonl carries no source_app — never fabricate a codex row from it alone');
});

test('buildMetrics: sessions counts distinct session ids per (date, source_app)', async () => {
  const baseDir = await freshBaseDir();
  await writeEvents(baseDir, [
    { ts: '2026-07-15T09:00:00.000Z', session_id: 'S1', source_app: 'codex', type: 'delegation', actor: 'scout' },
    { ts: '2026-07-15T09:05:00.000Z', session_id: 'S1', source_app: 'codex', type: 'message' },
    { ts: '2026-07-15T09:10:00.000Z', session_id: 'S2', source_app: 'codex', type: 'message' },
  ]);
  const rows = await buildMetrics({ baseDir, now: NOW, days: 3, runner: zeroRunner });

  const row = rows.find((r) => r.date === '2026-07-15' && r.source_app === 'codex');
  assert.equal(row.sessions, 2, 'S1 + S2, deduped across 3 events');
});

test('buildMetrics: cost_usd is sourced from the injected ccusage runner, mapping claude totalCost and codex costUSD', async () => {
  const baseDir = await freshBaseDir();
  const runner = async (args) => {
    if (args[0] === 'claude') {
      return JSON.stringify({ daily: [{ date: '2026-07-15', totalCost: 4.5 }] });
    }
    if (args[0] === 'codex') {
      return JSON.stringify({ daily: [{ date: '2026-07-15', costUSD: 1.25 }] });
    }
    return null;
  };
  await writeEvents(baseDir, [
    { ts: '2026-07-15T09:00:00.000Z', session_id: 'S1', source_app: 'codex', type: 'delegation', actor: 'scout' },
  ]);
  const rows = await buildMetrics({ baseDir, now: NOW, days: 3, runner });

  const claudeRow = rows.find((r) => r.date === '2026-07-15' && r.source_app === 'claude-code');
  const codexRow = rows.find((r) => r.date === '2026-07-15' && r.source_app === 'codex');
  assert.equal(claudeRow.cost_usd, 4.5);
  assert.equal(codexRow.cost_usd, 1.25);
});

test('buildMetrics: a failing/timing-out runner degrades to zero cost, never throws', async () => {
  const baseDir = await freshBaseDir();
  await writeEvents(baseDir, [
    { ts: '2026-07-15T09:00:00.000Z', session_id: 'S1', source_app: 'codex', type: 'delegation', actor: 'scout' },
  ]);
  const throwingRunner = async () => {
    throw new Error('ccusage exploded');
  };
  const rows = await buildMetrics({ baseDir, now: NOW, days: 3, runner: throwingRunner });
  const codexRow = rows.find((r) => r.date === '2026-07-15' && r.source_app === 'codex');
  assert.equal(codexRow.cost_usd, 0);
});

test('buildMetrics: gap-fills zero rows across the whole window for every source_app that showed any signal', async () => {
  const baseDir = await freshBaseDir();
  await writeEvents(baseDir, [
    { ts: '2026-07-14T09:00:00.000Z', session_id: 'S1', source_app: 'codex', type: 'delegation', actor: 'scout' },
  ]);
  const rows = await buildMetrics({ baseDir, now: NOW, days: 4, runner: zeroRunner });

  const codexDates = rows.filter((r) => r.source_app === 'codex').map((r) => r.date).sort();
  assert.deepEqual(codexDates, ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16']);
  const zeroDay = rows.find((r) => r.date === '2026-07-13' && r.source_app === 'codex');
  assert.deepEqual(zeroDay, {
    date: '2026-07-13',
    source_app: 'codex',
    cost_usd: 0,
    agents_dispatched: 0,
    tasks_completed: 0,
    tool_failures: 0,
    sessions: 0,
  });
});

test('appendMetrics + readMetrics: fail-open on a missing file, round-trips rows on a real write', async () => {
  const baseDir = await freshBaseDir();
  assert.deepEqual(await readMetrics({ baseDir }), []);

  const rows = [
    { date: '2026-07-15', source_app: 'codex', cost_usd: 1, agents_dispatched: 2, tasks_completed: 1, tool_failures: 0, sessions: 1 },
  ];
  const ok = await appendMetrics(rows, { baseDir });
  assert.equal(ok, true);

  const read = await readMetrics({ baseDir });
  assert.deepEqual(read, rows);
});

test('readMetrics: latest-wins by (date, source_app) — a re-run replaces a day instead of double-counting', async () => {
  const baseDir = await freshBaseDir();
  await appendMetrics(
    [{ date: '2026-07-15', source_app: 'codex', cost_usd: 1, agents_dispatched: 1, tasks_completed: 0, tool_failures: 0, sessions: 1 }],
    { baseDir }
  );
  await appendMetrics(
    [{ date: '2026-07-15', source_app: 'codex', cost_usd: 9, agents_dispatched: 9, tasks_completed: 9, tool_failures: 9, sessions: 9 }],
    { baseDir }
  );

  const read = await readMetrics({ baseDir });
  assert.equal(read.length, 1);
  assert.equal(read[0].cost_usd, 9, 'the second append wins, not summed with the first');
});

test('getMetrics: computes, persists, and reads back rows filtered to the requested window', async () => {
  const baseDir = await freshBaseDir();
  await writeEvents(baseDir, [
    { ts: '2026-07-15T09:00:00.000Z', session_id: 'S1', source_app: 'codex', type: 'delegation', actor: 'scout' },
  ]);
  const rows = await getMetrics({ baseDir, now: NOW, days: 2, runner: zeroRunner });

  assert.equal(rows.length, 2, 'one row per day in the 2-day window for the one source_app seen');
  const written = await fs.readFile(metricsFile(baseDir), 'utf8');
  assert.ok(written.includes('"codex"'), 'getMetrics persists what it computed to metrics.jsonl');
});

test('model.metrics: buildMissionModel and readModel (snapshot) both expose a metrics array using the injected/default runner path', async () => {
  const baseDir = await freshBaseDir();
  await writeEvents(baseDir, [
    { ts: '2026-07-15T09:00:00.000Z', session_id: 'S1', source_app: 'codex', type: 'delegation', actor: 'scout' },
  ]);

  const model = await buildMissionModel({ baseDir, now: NOW, cache: false, metricsDays: 2 });
  assert.ok(Array.isArray(model.metrics));
  assert.ok(model.metrics.some((row) => row.source_app === 'codex'));

  const snapshot = await readModel({ baseDir, now: NOW });
  assert.ok(Array.isArray(snapshot.metrics));
  assert.ok(snapshot.metrics.some((row) => row.source_app === 'codex'));
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

test('GET /api/metrics returns { metrics, generatedAt }', async () => {
  const commanderDir = await freshBaseDir();
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'none'), commanderDir });
  const response = await dispatch(server, '/api/metrics');

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.ok(Array.isArray(body.metrics));
  assert.equal(typeof body.generatedAt, 'string');
});
