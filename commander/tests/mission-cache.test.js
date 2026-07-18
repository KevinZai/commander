// Pins Commander Mission Control's Item 6 (CC-1380) — scan discipline
// ported from Agent HQ v4: an in-memory TTL cache keyed by baseDir for
// the assembled model (default 2s, matching the dashboard's POLL_MS),
// a longer 30s TTL for metrics/topSkills, and bounded JSONL reads (the
// most recent MAX_JSONL_LINES lines survive; older lines in a
// high-volume file are silently dropped, rotated archives are never
// read). All TTLs here are overridden to tiny values so the tests stay
// fast and deterministic — no real multi-second sleeps.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildMissionModel, clearMissionModelCaches } from '../../dashboard/lib/mission-model.js';

let tmpRoot;

test.before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-mission-cache-'));
});

test.after(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { force: true, recursive: true });
});

test.afterEach(() => {
  clearMissionModelCaches();
});

async function freshBaseDir() {
  return fs.mkdtemp(path.join(tmpRoot, 'base-'));
}

function toLines(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
}

const NOW = Date.parse('2026-07-16T10:04:00.000Z');
const zeroRunner = async () => null;

test('buildMissionModel: within the TTL window, a second call reuses the cached base model even after the file changes on disk', async () => {
  const baseDir = await freshBaseDir();
  await fs.writeFile(
    path.join(baseDir, 'subagent-runs.jsonl'),
    toLines([{ ts: '2026-07-16T10:00:00.000Z', agent_name: 'reviewer', session_id: 'S1' }])
  );

  const first = await buildMissionModel({ baseDir, now: NOW, cacheTtlMs: 60_000, slowFieldTtlMs: 1, metricsDays: 1 });
  assert.equal(first.agents.length, 1);
  assert.equal(first.agents[0].name, 'reviewer');

  // Mutate the file after the first read — a fresh (uncached) read would see this.
  await fs.writeFile(
    path.join(baseDir, 'subagent-runs.jsonl'),
    toLines([
      { ts: '2026-07-16T10:00:00.000Z', agent_name: 'reviewer', session_id: 'S1' },
      { ts: '2026-07-16T10:01:00.000Z', agent_name: 'builder', session_id: 'S2' },
    ])
  );

  const second = await buildMissionModel({ baseDir, now: NOW, cacheTtlMs: 60_000, slowFieldTtlMs: 1, metricsDays: 1 });
  assert.equal(second.agents.length, 1, 'still the cached (stale) result — the second agent has not been picked up yet');
});

test('buildMissionModel: after the TTL expires, the next call re-reads the files', async () => {
  const baseDir = await freshBaseDir();
  await fs.writeFile(
    path.join(baseDir, 'subagent-runs.jsonl'),
    toLines([{ ts: '2026-07-16T10:00:00.000Z', agent_name: 'reviewer', session_id: 'S1' }])
  );

  const first = await buildMissionModel({ baseDir, now: NOW, cacheTtlMs: 5, slowFieldTtlMs: 5, metricsDays: 1, runner: zeroRunner });
  assert.equal(first.agents.length, 1);

  await new Promise((resolve) => setTimeout(resolve, 20));

  await fs.writeFile(
    path.join(baseDir, 'subagent-runs.jsonl'),
    toLines([
      { ts: '2026-07-16T10:00:00.000Z', agent_name: 'reviewer', session_id: 'S1' },
      { ts: '2026-07-16T10:01:00.000Z', agent_name: 'builder', session_id: 'S2' },
    ])
  );

  const second = await buildMissionModel({ baseDir, now: NOW, cacheTtlMs: 5, slowFieldTtlMs: 5, metricsDays: 1, runner: zeroRunner });
  assert.equal(second.agents.length, 2, 'the TTL expired, so this call re-read the (now 2-agent) file');
});

test('buildMissionModel: cache: false always forces a fresh read, ignoring any cached entry', async () => {
  const baseDir = await freshBaseDir();
  await fs.writeFile(
    path.join(baseDir, 'subagent-runs.jsonl'),
    toLines([{ ts: '2026-07-16T10:00:00.000Z', agent_name: 'reviewer', session_id: 'S1' }])
  );

  const first = await buildMissionModel({ baseDir, now: NOW, cacheTtlMs: 60_000, slowFieldTtlMs: 60_000, metricsDays: 1, runner: zeroRunner });
  assert.equal(first.agents.length, 1);

  await fs.writeFile(
    path.join(baseDir, 'subagent-runs.jsonl'),
    toLines([
      { ts: '2026-07-16T10:00:00.000Z', agent_name: 'reviewer', session_id: 'S1' },
      { ts: '2026-07-16T10:01:00.000Z', agent_name: 'builder', session_id: 'S2' },
    ])
  );

  const second = await buildMissionModel({ baseDir, now: NOW, cache: false, metricsDays: 1, runner: zeroRunner });
  assert.equal(second.agents.length, 2, 'cache: false bypasses the TTL entirely');
});

test('buildMissionModel: two different baseDirs never share a cache entry', async () => {
  const dirA = await freshBaseDir();
  const dirB = await freshBaseDir();
  await fs.writeFile(
    path.join(dirA, 'subagent-runs.jsonl'),
    toLines([{ ts: '2026-07-16T10:00:00.000Z', agent_name: 'from-a', session_id: 'S1' }])
  );
  await fs.writeFile(
    path.join(dirB, 'subagent-runs.jsonl'),
    toLines([{ ts: '2026-07-16T10:00:00.000Z', agent_name: 'from-b', session_id: 'S2' }])
  );

  const modelA = await buildMissionModel({ baseDir: dirA, now: NOW, cacheTtlMs: 60_000, slowFieldTtlMs: 60_000, metricsDays: 1, runner: zeroRunner });
  const modelB = await buildMissionModel({ baseDir: dirB, now: NOW, cacheTtlMs: 60_000, slowFieldTtlMs: 60_000, metricsDays: 1, runner: zeroRunner });

  assert.equal(modelA.agents[0].name, 'from-a');
  assert.equal(modelB.agents[0].name, 'from-b');
});

test('buildMissionModel: bounded reads cap subagent-runs.jsonl at the most recent lines — older starts silently drop', async () => {
  const baseDir = await freshBaseDir();
  const entries = [];
  // MAX_JSONL_LINES is 5000 in the source; write comfortably past that
  // so this test doesn't depend on the exact constant while still
  // proving the tail-keeping behavior.
  const total = 5010;
  for (let i = 0; i < total; i += 1) {
    entries.push({
      ts: new Date(Date.parse('2026-07-16T00:00:00.000Z') + i * 1000).toISOString(),
      agent_name: `agent-${i}`,
      session_id: `S${i}`,
    });
  }
  await fs.writeFile(path.join(baseDir, 'subagent-runs.jsonl'), toLines(entries));

  const model = await buildMissionModel({ baseDir, now: NOW, cache: false, metricsDays: 1, runner: zeroRunner });

  // The earliest entries (agent-0, agent-1, ...) were pushed out of the
  // bounded tail read and must never appear.
  assert.equal(model.agents.some((agent) => agent.name === 'agent-0'), false);
  // The very last-written entries survive the tail cap.
  assert.equal(model.agents.some((agent) => agent.name === `agent-${total - 1}`), true);
});
