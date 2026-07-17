// Pins Commander Mission Control's Item 1 (CC-1380) — the roster's
// headline gap: Codex Desktop drops SubagentStart/SubagentStop
// (scripts/build-codex.js HOOK_EVENTS_DROPPED_BY_BUILD), so
// subagent-runs.jsonl/agent-runs.jsonl only ever cover claude-code.
// deriveRosterFromDelegations() (dashboard/lib/mission-model.js and its
// verbatim mirror in commander/cowork-plugin/lib/
// mission-control-snapshot.js) synthesizes roster rows from
// events.jsonl's `delegation`-type entries for any (sourceApp, name,
// sessionId) combo with no real start record, so Codex (and any other
// non-claude-code source) shows up in the roster, not just the Live
// Feed.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildMissionModel } from '../../dashboard/lib/mission-model.js';
import { readModel } from '../cowork-plugin/lib/mission-control-snapshot.js';

let tmpRoot;

test.before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-mission-roster-derived-'));
});

test.after(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { force: true, recursive: true });
});

const T = (clock) => `2026-07-16T${clock}.000Z`;
const NOW = Date.parse(T('10:04:00'));

function toLines(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
}

async function makeBase({ subagent, events } = {}) {
  const dir = await fs.mkdtemp(path.join(tmpRoot, 'base-'));
  if (subagent) {
    await fs.writeFile(path.join(dir, 'subagent-runs.jsonl'), toLines(subagent));
  }
  if (events) {
    const mcDir = path.join(dir, 'mission-control');
    await fs.mkdir(mcDir, { recursive: true });
    await fs.writeFile(path.join(mcDir, 'events.jsonl'), toLines(events));
  }
  return dir;
}

// Every reader under test — asserts model and snapshot agree (lockstep).
const readers = [
  ['buildMissionModel', (opts) => buildMissionModel({ ...opts, cache: false })],
  ['readModel (snapshot)', readModel],
];

for (const [label, read] of readers) {
  test(`${label}: a Codex-only delegation event yields a derived roster row keyed codex:<actor>`, async () => {
    const baseDir = await makeBase({
      events: [
        {
          ts: T('10:00:00'),
          session_id: 'S1',
          source_app: 'codex',
          type: 'delegation',
          actor: 'scout',
          subject: 'audit the CLI build',
        },
      ],
    });
    const model = await read({ baseDir, now: NOW });

    assert.equal(model.agents.length, 1);
    const [agent] = model.agents;
    assert.equal(agent.key, 'codex:scout');
    assert.equal(agent.name, 'scout');
    assert.equal(agent.sourceApp, 'codex');
    assert.equal(agent.derived, true);
    assert.equal(agent.status, 'running', 'a fresh delegation event within the running window reads as running');
  });

  test(`${label}: a real claude-code start record for the same actor is NOT duplicated by a derived row`, async () => {
    const baseDir = await makeBase({
      subagent: [
        { ts: T('10:00:00'), agent_name: 'reviewer', session_id: 'S1', model: 'claude-sonnet-4-6' },
      ],
      events: [
        {
          ts: T('10:00:05'),
          session_id: 'S1',
          source_app: 'claude-code',
          type: 'delegation',
          actor: 'reviewer',
        },
      ],
    });
    const model = await read({ baseDir, now: NOW });

    assert.equal(model.agents.length, 1, 'the real start record wins — no duplicate derived row');
    assert.equal(model.agents[0].derived, undefined, 'the real row is not marked derived');
    assert.equal(model.agents[0].sourceApp, 'claude-code');
  });

  test(`${label}: derived rows carry zero token/cost data (no NaN, clean zero-state)`, async () => {
    const baseDir = await makeBase({
      events: [
        { ts: T('10:00:00'), session_id: 'S9', source_app: 'codex', type: 'delegation', actor: 'coder' },
      ],
    });
    const model = await read({ baseDir, now: NOW });

    const [agent] = model.agents;
    assert.equal(agent.inputTokens, 0);
    assert.equal(agent.outputTokens, 0);
    assert.equal(agent.estCostUsd, null);
    assert.equal(Number.isNaN(agent.estCostUsd), false);
    assert.equal(agent.durationMs, null);
    assert.equal(agent.endedAt, null);
  });

  test(`${label}: a derived row older than RUNNING_WINDOW_MS (6h) ages out to stale`, async () => {
    const baseDir = await makeBase({
      events: [
        {
          ts: '2026-07-15T09:00:00.000Z', // ~25h before NOW
          session_id: 'S2',
          source_app: 'codex',
          type: 'delegation',
          actor: 'ancient-scout',
        },
      ],
    });
    const model = await read({ baseDir, now: NOW });

    assert.equal(model.agents.length, 1);
    assert.equal(model.agents[0].status, 'stale');
  });

  test(`${label}: multiple delegation events for the same combo collapse to ONE row using the most recent timestamp`, async () => {
    const baseDir = await makeBase({
      events: [
        { ts: T('09:50:00'), session_id: 'S3', source_app: 'codex', type: 'delegation', actor: 'scout' },
        { ts: T('10:00:00'), session_id: 'S3', source_app: 'codex', type: 'delegation', actor: 'scout' },
      ],
    });
    const model = await read({ baseDir, now: NOW });

    assert.equal(model.agents.length, 1);
    assert.equal(model.agents[0].startedAt, T('10:00:00'));
  });

  test(`${label}: non-delegation event types (message, task, permission) never synthesize a roster row`, async () => {
    const baseDir = await makeBase({
      events: [
        { ts: T('10:00:00'), session_id: 'S4', source_app: 'codex', type: 'message', actor: 'scout' },
        { ts: T('10:00:01'), session_id: 'S4', source_app: 'codex', type: 'task', actor: 't1' },
      ],
    });
    const model = await read({ baseDir, now: NOW });

    assert.deepEqual(model.agents, []);
  });

  test(`${label}: a delegation event without an actor is skipped (nothing to name the row after)`, async () => {
    const baseDir = await makeBase({
      events: [{ ts: T('10:00:00'), session_id: 'S5', source_app: 'codex', type: 'delegation' }],
    });
    const model = await read({ baseDir, now: NOW });

    assert.deepEqual(model.agents, []);
  });

  test(`${label}: two different sourceApps delegating to an actor with the same name produce two distinct rows`, async () => {
    const baseDir = await makeBase({
      events: [
        { ts: T('10:00:00'), session_id: 'S6', source_app: 'codex', type: 'delegation', actor: 'builder' },
        { ts: T('10:00:01'), session_id: 'S7', source_app: 'claude-code', type: 'delegation', actor: 'builder' },
      ],
    });
    const model = await read({ baseDir, now: NOW });

    const keys = model.agents.map((agent) => agent.key).sort();
    assert.deepEqual(keys, ['claude-code:builder', 'codex:builder']);
  });

  test(`${label}: a null-named real start record adopts the session's delegation name instead of doubling up`, async () => {
    // Real Claude Desktop SubagentStart payloads arrive name-less; the Task
    // delegation event in the same session carries the name. Without enrichment
    // this surfaced as TWO rows — one "unknown" (the start), one derived (the
    // delegation). It must collapse to ONE real row with the real name.
    const baseDir = await makeBase({
      subagent: [
        { ts: T('10:00:00'), agent_name: null, prompt: null, model: null, session_id: 'S8' },
      ],
      events: [
        { ts: T('10:00:01'), session_id: 'S8', source_app: 'claude-code', type: 'delegation', actor: 'builder' },
      ],
    });
    const model = await read({ baseDir, now: NOW });

    assert.equal(model.agents.length, 1);
    const row = model.agents[0];
    assert.equal(row.key, 'claude-code:builder');
    assert.equal(row.name, 'builder');
    // It kept its real start record — it is NOT a synthesized derived row.
    assert.notEqual(row.derived, true);
  });

  test(`${label}: a named start + a null start in one session don't cross-pair into a duplicate`, async () => {
    // Mixed case: named 'alpha' start + one null start, delegations [alpha, beta].
    // 'alpha' is already owned by the named start, so the null start must take
    // 'beta' — not a second 'alpha' (duplicate) plus a spurious derived 'beta'.
    const baseDir = await makeBase({
      subagent: [
        { ts: T('10:00:00'), agent_name: 'alpha', prompt: 'p', model: 'm', session_id: 'S9' },
        { ts: T('10:00:01'), agent_name: null, prompt: null, model: null, session_id: 'S9' },
      ],
      events: [
        { ts: T('10:00:02'), session_id: 'S9', source_app: 'claude-code', type: 'delegation', actor: 'alpha' },
        { ts: T('10:00:03'), session_id: 'S9', source_app: 'claude-code', type: 'delegation', actor: 'beta' },
      ],
    });
    const model = await read({ baseDir, now: NOW });

    const keys = model.agents.map((agent) => agent.key).sort();
    assert.deepEqual(keys, ['claude-code:alpha', 'claude-code:beta']);
    assert.equal(model.agents.filter((a) => a.name === 'alpha').length, 1, 'no duplicate alpha');
    // beta came from the null start record adopting the name, not a synthesized row.
    assert.notEqual(model.agents.find((a) => a.name === 'beta').derived, true);
  });
}
