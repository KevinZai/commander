// CC-2120: Claude Code's internal/background agents fire SubagentStop with an
// agent_id but no name and never fire SubagentStart. Readers must not list them
// as "unknown" agents; dispatched subagents (named or not) must still show.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  isInternalAgentRun,
  startIdSet,
  withoutInternalRuns,
} from '../cowork-plugin/lib/agent-runs.js';
import { readHistoryModel } from '../cowork-plugin/lib/history-reader.js';
import { readModel } from '../cowork-plugin/lib/mission-control-snapshot.js';
import { buildMissionModel } from '../../dashboard/lib/mission-model.js';

const T = (clock) => `2026-10-26T${clock}.000Z`;
const NOW = Date.parse(T('14:10:00'));

const starts = [
  { ts: T('14:00:00'), agent_id: 'a-named', agent_name: 'reviewer', session_id: 's1' },
  { ts: T('14:00:05'), agent_id: 'a-anon', agent_name: null, session_id: 's1' },
];
const stops = [
  { ts: T('14:01:00'), agent: 'reviewer', agentId: 'a-named', sessionId: 's1', status: 'completed' },
  { ts: T('14:01:05'), agent: 'unknown', agentId: 'a-anon', sessionId: 's1', status: 'completed' },
  { ts: T('14:02:00'), agent: 'unknown', agentId: 'cc-internal-1', sessionId: 's1', status: 'completed' },
  { ts: T('14:03:00'), agent: 'unknown', agentId: 'cc-internal-2', sessionId: 's1', status: 'completed', internal: true },
  { ts: T('14:04:00'), agent: 'unknown', agentId: null, sessionId: 's1', status: 'completed' },
];

test('isInternalAgentRun: only proven-internal rows are dropped', () => {
  const ids = startIdSet(starts);
  assert.equal(isInternalAgentRun(stops[0], ids), false, 'named dispatch');
  assert.equal(isInternalAgentRun(stops[1], ids), false, 'unnamed dispatch with a start record');
  assert.equal(isInternalAgentRun(stops[2], ids), true, 'legacy internal row');
  assert.equal(isInternalAgentRun(stops[3], ids), true, 'flagged by the logger');
  assert.equal(isInternalAgentRun(stops[4], ids), false, 'no agentId: older rows stay visible');
  assert.equal(isInternalAgentRun({ ...stops[2], internal: false }, ids), false, 'explicit false wins');
  // When in doubt a row is kept: the logger writes null when it could not scan the
  // whole start log, and readers only load a tail of it (Codex review r1, r2).
  assert.equal(isInternalAgentRun({ ...stops[1], internal: true }, ids), false, 'flagged, but the reader holds its start');
  assert.equal(isInternalAgentRun({ ...stops[2], internal: null }, ids), false, 'inconclusive is kept');
  assert.equal(isInternalAgentRun(stops[3], ids, false), true, 'logger proved absence: cut-off reader tail does not matter');
  assert.equal(isInternalAgentRun(stops[2], ids, false), false, 'unflagged row + cut-off start tail: keep');
  assert.equal(isInternalAgentRun(stops[3]), true, 'no start log loaded: trust the flag');
  assert.equal(isInternalAgentRun(stops[2]), false, 'no start log loaded, no flag: keep');
  const cutOff = Object.assign([...starts], { incomplete: true });
  assert.deepEqual(
    withoutInternalRuns(stops, cutOff).map((s) => s.agentId),
    ['a-named', 'a-anon', 'cc-internal-1', null],
    'only the logger-flagged row goes when the start tail was cut off'
  );
  for (const unknown of [null, undefined]) {
    assert.deepEqual(
      withoutInternalRuns(stops, unknown).map((s) => s.agentId),
      ['a-named', 'a-anon', 'cc-internal-1', null],
      `start log ${unknown}: unknown, so only the logger-flagged row goes`
    );
  }
  assert.equal(isInternalAgentRun(null, ids), false);
  assert.deepEqual(
    withoutInternalRuns(stops, starts).map((s) => s.agentId),
    ['a-named', 'a-anon', null]
  );
});

async function writeState(dir) {
  await fs.mkdir(path.join(dir, 'mission-control'), { recursive: true });
  const lines = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  await fs.writeFile(path.join(dir, 'subagent-runs.jsonl'), lines(starts));
  await fs.writeFile(path.join(dir, 'agent-runs.jsonl'), lines(stops));
}

test('Mission Control roster and feed skip internal agents (cowork snapshot + dashboard)', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-agent-runs-internal-'));
  try {
    await writeState(dir);
    const snapshot = await readModel({ baseDir: dir, now: NOW });
    const dashboard = await buildMissionModel({ baseDir: dir, writeDir: dir, now: NOW });
    for (const [label, model] of [['snapshot', snapshot], ['dashboard', dashboard]]) {
      assert.equal(model.agents.length, 3, `${label}: 2 joined dispatches + 1 id-less orphan`);
      const feedStops = model.events.filter((e) => e.source === 'agent-runs');
      assert.equal(feedStops.length, 3, `${label}: internal stops are not in the activity feed`);
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('an unreadable start log keeps unflagged stops (no proof of absence)', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-agent-runs-unreadable-'));
  try {
    await fs.mkdir(path.join(dir, 'mission-control'), { recursive: true });
    await fs.mkdir(path.join(dir, 'subagent-runs.jsonl')); // EISDIR on read
    const rows = [
      { ts: T('14:05:00'), agent: 'unknown', agentId: 'a-legacy', sessionId: 's9', status: 'completed' },
      { ts: T('14:06:00'), agent: 'unknown', agentId: 'cc-flagged', sessionId: 's9', status: 'completed', internal: true },
    ];
    await fs.writeFile(path.join(dir, 'agent-runs.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    const snapshot = await readModel({ baseDir: dir, now: NOW });
    const dashboard = await buildMissionModel({ baseDir: dir, writeDir: dir, now: NOW });
    for (const [label, model] of [['snapshot', snapshot], ['dashboard', dashboard]]) {
      const feedStops = model.events.filter((e) => e.source === 'agent-runs');
      assert.equal(feedStops.length, 1, `${label}: the legacy row stays, the logger-flagged one goes`);
    }
    const history = await readHistoryModel({ baseDir: dir, now: NOW });
    assert.equal(history.totals.agentRuns, 1, 'history: the legacy row stays, the logger-flagged one goes');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('a dispatch whose start fell out of the readers\' 5000-line window stays visible', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-agent-runs-window-'));
  try {
    await fs.mkdir(path.join(dir, 'mission-control'), { recursive: true });
    const old = { ts: T('09:00:00'), agent_id: 'a-long', agent_name: null, session_id: 's9' };
    const newer = Array.from({ length: 5000 }, (_, i) =>
      JSON.stringify({ ts: T('13:00:00'), agent_id: `x-${i}`, agent_name: 'worker', session_id: 's8' })
    );
    await fs.writeFile(path.join(dir, 'subagent-runs.jsonl'), [JSON.stringify(old), ...newer].join('\n') + '\n');
    const rows = [
      { ts: T('14:05:00'), agent: 'unknown', agentId: 'a-long', sessionId: 's9', status: 'completed' },
      { ts: T('14:06:00'), agent: 'unknown', agentId: 'a-long2', sessionId: 's9', status: 'completed', internal: null },
    ];
    await fs.writeFile(path.join(dir, 'agent-runs.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    const snapshot = await readModel({ baseDir: dir, now: NOW });
    const dashboard = await buildMissionModel({ baseDir: dir, writeDir: dir, now: NOW });
    for (const [label, model] of [['snapshot', snapshot], ['dashboard', dashboard]]) {
      const feedStops = model.events.filter((e) => e.source === 'agent-runs');
      assert.equal(feedStops.length, 2, `${label}: both completions are kept`);
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
