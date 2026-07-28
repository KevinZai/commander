// Pins lib/console-model.js: readConsoleModel() must COMPOSE the three existing
// readers (never re-derive their logic), stamp a coherent meta, and fail open
// per section so one broken reader can't blank the console.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readConsoleModel } from '../cowork-plugin/lib/console-model.js';
import { readModel } from '../cowork-plugin/lib/mission-control-snapshot.js';
import { readSafetyModel } from '../cowork-plugin/lib/safety-snapshot.js';
import { readUsageModel } from '../cowork-plugin/lib/usage-snapshot.js';

const NOW = '2026-07-20T12:00:00.000Z';

// Newest row per source is deliberately different in each file, so the
// meta.dataThrough assertion below can only pass by taking the max across
// sections rather than reading any single one.
async function makeBase() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-console-model-'));
  await fs.mkdir(path.join(dir, 'analytics'), { recursive: true });
  await fs.mkdir(path.join(dir, 'mission-control'), { recursive: true });
  await fs.writeFile(
    path.join(dir, 'subagent-runs.jsonl'),
    JSON.stringify({ ts: '2026-07-18T09:00:00.000Z', agent_name: 'builder', session_id: 's1' }) + '\n'
  );
  await fs.writeFile(
    path.join(dir, 'savings.json'),
    JSON.stringify({ days: { '2026-07-17': { actualUsd: 0.5, baselineUsd: 2, savedUsd: 1.5, dispatches: 3 } } })
  );
  await fs.writeFile(
    path.join(dir, 'analytics', 'permission-gate.jsonl'),
    JSON.stringify({ timestamp: '2026-07-19T20:00:00.000Z', sessionId: 's1', decision: 'approved', toolName: 'Bash' }) + '\n'
  );
  return dir;
}

test('readConsoleModel composes the three readers verbatim', async (t) => {
  // Two pristine dirs with identical contents: readModel() persists a recomputed
  // mission-control/metrics.jsonl as a side effect, so comparing against direct
  // reader calls on the SAME dir would compare pre-write against post-write.
  const composedDir = await makeBase();
  const directDir = await makeBase();
  t.after(() => fs.rm(composedDir, { force: true, recursive: true }));
  t.after(() => fs.rm(directDir, { force: true, recursive: true }));

  const model = await readConsoleModel({ baseDir: composedDir, now: NOW, recompute: false });

  // Same order the composer uses — the metrics writer before the metrics reader.
  const mission = await readModel({ baseDir: directDir, now: Date.parse(NOW) });
  const usage = await readUsageModel({ baseDir: directDir, now: Date.parse(NOW), recompute: false });
  const safety = await readSafetyModel({ baseDir: directDir, now: Date.parse(NOW) });

  assert.deepEqual(model.missionControl, mission);
  assert.deepEqual(model.usage, usage);
  assert.deepEqual(model.safety, safety);
  assert.deepEqual(model.errors, []);
});

test('meta stamps generatedAt from `now` and dataThrough from the newest section', async (t) => {
  const baseDir = await makeBase();
  t.after(() => fs.rm(baseDir, { force: true, recursive: true }));

  const model = await readConsoleModel({ baseDir, now: NOW, recompute: false });

  assert.equal(model.meta.generatedAt, NOW);
  // Asserted as a property of the sections rather than a literal: readModel()
  // recomputes metrics.jsonl through the real `ccusage`, so the Usage section's
  // tail depends on the machine — the MAX across sections does not.
  const newest = Math.max(
    ...[model.missionControl, model.usage, model.safety].map((part) => part.dataThroughMs)
  );
  assert.equal(model.meta.dataThrough, new Date(newest).toISOString());
  assert.ok(model.safety.dataThroughMs === Date.parse('2026-07-19T20:00:00.000Z'));
});

test('an empty telemetry dir is a zero-state, not an error', async (t) => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-console-model-empty-'));
  t.after(() => fs.rm(baseDir, { force: true, recursive: true }));

  const model = await readConsoleModel({ baseDir, now: NOW, recompute: false });

  assert.deepEqual(model.errors, []);
  for (const part of [model.missionControl, model.usage, model.safety]) {
    assert.ok(part && typeof part === 'object', 'every section is present');
  }
  // Not asserted for Usage: readModel() persists a recomputed metrics.jsonl into
  // this dir from the real `ccusage`, which Usage then legitimately counts.
  assert.equal(model.missionControl.hasAnySourceRow, false);
  assert.equal(model.missionControl.dataThroughMs, null);
  assert.equal(model.safety.hasAnySourceRow, false);
  assert.equal(model.safety.dataThroughMs, null);
});

test('a reader that throws yields a null section plus an errors entry, never a throw', async () => {
  // A non-string baseDir makes every reader's path.join() throw — the readers
  // themselves are fail-open over MISSING files, so this is the reachable way
  // to prove the composer catches rather than propagates.
  const model = await readConsoleModel({ baseDir: 42, now: NOW, recompute: false });

  assert.equal(model.missionControl, null);
  assert.equal(model.usage, null);
  assert.equal(model.safety, null);
  assert.deepEqual(
    model.errors.map((entry) => entry.section).sort(),
    ['missionControl', 'safety', 'usage']
  );
  for (const entry of model.errors) assert.ok(entry.message, 'each error carries a message');
  assert.equal(model.meta.generatedAt, NOW);
  assert.equal(model.meta.dataThrough, null);
});
