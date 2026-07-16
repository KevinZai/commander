// Pins the Mission Control read model (v6.8.0): dashboard/lib/mission-model.js
// merges ~/.claude/commander/{subagent-runs,agent-runs,tasks}.jsonl +
// mission-control/events.jsonl into {agents, tasks, edges, events, summary,
// generatedAt} — start/stop join within 24h, orphan stops, tolerant JSONL
// parsing, plain-English summary, and the /api/mission server endpoints.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import {
  buildMissionModel,
  filterEventsAfter,
} from '../../dashboard/lib/mission-model.js';
import { createServer } from '../../dashboard/server.js';
import { readModel } from '../cowork-plugin/lib/mission-control-snapshot.js';

let tmpRoot;

test.before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-mission-model-'));
});

test.after(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { force: true, recursive: true });
});

const T = (clock) => `2026-07-16T${clock}.000Z`;
const NOW = Date.parse(T('10:04:00'));

function toLines(entries) {
  return (
    entries
      .map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)))
      .join('\n') + '\n'
  );
}

async function makeBase({ subagent, agent, tasks, events } = {}) {
  const dir = await fs.mkdtemp(path.join(tmpRoot, 'base-'));
  if (subagent) {
    await fs.writeFile(path.join(dir, 'subagent-runs.jsonl'), toLines(subagent));
  }
  if (agent) {
    await fs.writeFile(path.join(dir, 'agent-runs.jsonl'), toLines(agent));
  }
  if (tasks) {
    await fs.writeFile(path.join(dir, 'tasks.jsonl'), toLines(tasks));
  }
  if (events) {
    const mcDir = path.join(dir, 'mission-control');
    await fs.mkdir(mcDir, { recursive: true });
    await fs.writeFile(path.join(mcDir, 'events.jsonl'), toLines(events));
  }
  return dir;
}

const start = (overrides = {}) => ({
  ts: T('10:00:00'),
  agent_name: 'reviewer',
  prompt: 'audit the auth flow',
  model: 'claude-sonnet-4-6',
  session_id: 'S1',
  ...overrides,
});

const stop = (overrides = {}) => ({
  ts: T('10:03:00'),
  agent: 'reviewer',
  sessionId: 'S1',
  durationMs: 180000,
  inputTokens: 1200,
  outputTokens: 345,
  status: 'completed',
  ...overrides,
});

test('joins a start and stop record into one done agent', async () => {
  const baseDir = await makeBase({ subagent: [start()], agent: [stop()] });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents.length, 1);
  assert.deepEqual(model.agents[0], {
    name: 'reviewer',
    sourceApp: 'claude-code',
    model: 'claude-sonnet-4-6',
    sessionId: 'S1',
    startedAt: T('10:00:00'),
    endedAt: T('10:03:00'),
    durationMs: 180000,
    inputTokens: 1200,
    outputTokens: 345,
    status: 'done',
    key: 'claude-code:reviewer',
    emoji: '🔍',
    role: 'Reviewer',
    currentTask: null,
    tasksCompleted: 1,
    estCostUsd: 0.0088,
  });
});

test('roster heartbeat uses known personas, unknown fallback, tasks, and token cost', async () => {
  const baseDir = await makeBase({
    subagent: [
      start(),
      start({ agent_name: 'mystery-agent', session_id: 'S2', ts: T('10:00:30') }),
    ],
    agent: [
      stop(),
      stop({ ts: T('09:59:00'), sessionId: 'S9', inputTokens: 800, outputTokens: 200 }),
    ],
    events: [
      { ts: T('10:01:00'), session_id: 'S1', type: 'message', actor: 'builder', subject: 'session task' },
      { ts: T('10:02:00'), session_id: 'other', type: 'message', actor: 'reviewer', subject: 'newest actor task' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  const reviewer = model.agents.find((agent) => agent.name === 'reviewer' && agent.model !== null);
  assert.equal(reviewer.emoji, '🔍');
  assert.equal(reviewer.role, 'Reviewer');
  assert.equal(reviewer.currentTask, 'session task');
  assert.equal(reviewer.tasksCompleted, 2);
  assert.equal(reviewer.estCostUsd, 0.0088);

  const unknown = model.agents.find((agent) => agent.name === 'mystery-agent');
  assert.equal(unknown.emoji, '🤖');
  assert.equal(unknown.role, 'Agent');
  assert.equal(unknown.currentTask, null);
  assert.equal(unknown.tasksCompleted, 0);
  assert.equal(unknown.estCostUsd, null);
});

test('start without a stop is reported as running', async () => {
  const baseDir = await makeBase({
    subagent: [start({ agent_name: 'builder', ts: T('10:01:00') })],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents.length, 1);
  assert.equal(model.agents[0].status, 'running');
  assert.equal(model.agents[0].endedAt, null);
  assert.equal(model.agents[0].durationMs, null);
});

test('orphan stop derives startedAt from durationMs and keeps token counts', async () => {
  const baseDir = await makeBase({
    agent: [
      stop({
        ts: T('10:05:00'),
        agent: 'qa',
        sessionId: 'S2',
        durationMs: 60000,
        status: 'error',
      }),
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents.length, 1);
  assert.equal(model.agents[0].name, 'qa');
  assert.equal(model.agents[0].startedAt, T('10:04:00'));
  assert.equal(model.agents[0].status, 'failed');
  assert.equal(model.agents[0].inputTokens, 1200);
});

test('failure-looking stop statuses map to failed on joined pairs', async () => {
  const baseDir = await makeBase({
    subagent: [start()],
    agent: [stop({ status: 'cancelled' })],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents.length, 1);
  assert.equal(model.agents[0].status, 'failed');
});

test('stop more than 24h from the start does not join', async () => {
  const baseDir = await makeBase({
    subagent: [start({ agent_name: 'slow', session_id: 'S3', ts: '2026-07-14T09:00:00.000Z' })],
    agent: [
      stop({ agent: 'slow', sessionId: 'S3', ts: '2026-07-16T09:00:01.000Z', durationMs: 5000 }),
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents.length, 2);
  const statuses = model.agents.map((agent) => agent.status).sort();
  // The unjoined start is >6h old, so it reads as historical noise, not a live agent.
  assert.deepEqual(statuses, ['done', 'stale']);
});

test('stop before a start stays orphaned instead of reverse-time joining', async () => {
  const baseDir = await makeBase({
    subagent: [start({ ts: T('10:00:00') })],
    agent: [stop({ ts: T('09:00:00'), durationMs: 60000 })],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents.length, 2);
  const started = model.agents.find((agent) => agent.model === 'claude-sonnet-4-6');
  const orphan = model.agents.find((agent) => agent.model === null);
  assert.equal(started.status, 'running');
  assert.equal(started.endedAt, null);
  assert.equal(orphan.status, 'done');
  assert.equal(orphan.endedAt, T('09:00:00'));
});

test('unjoined start within the running window stays running; older goes stale', async () => {
  const baseDir = await makeBase({
    subagent: [
      start({ agent_name: 'fresh', session_id: 'S8', ts: '2026-07-16T08:30:00.000Z' }),
      start({ agent_name: 'ancient', session_id: 'S9', ts: '2026-07-15T09:00:00.000Z' }),
    ],
    agent: [],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });
  const byName = Object.fromEntries(model.agents.map((agent) => [agent.name, agent.status]));
  assert.equal(byName.fresh, 'running');
  assert.equal(byName.ancient, 'stale');
  assert.ok(!model.summary.includes('ancient'));
});

test('stale agents are excluded from finished summary counts', async () => {
  const baseDir = await makeBase({
    subagent: [
      start({ agent_name: 'ancient', session_id: 'S9', ts: '2026-07-15T09:00:00.000Z' }),
    ],
    agent: [stop({ agent: 'builder', sessionId: 'S2' })],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.deepEqual(
    model.agents.map((agent) => agent.status).sort(),
    ['done', 'stale']
  );
  assert.equal(model.summary, 'No agents working right now — 1 finished.');
  assert.doesNotMatch(model.summary, /2 finished/);
});

test('current task prefers each agent session over newer same-persona activity', async () => {
  const baseDir = await makeBase({
    subagent: [
      start({ session_id: 'S1', ts: T('10:00:00') }),
      start({ session_id: 'S2', ts: T('10:00:30') }),
    ],
    events: [
      { ts: T('10:01:00'), session_id: 'S1', type: 'message', actor: 'reviewer', subject: 'Audit auth' },
      { ts: T('10:02:00'), session_id: 'S2', type: 'message', actor: 'reviewer', subject: 'Review billing' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });
  const taskBySession = Object.fromEntries(
    model.agents.map((agent) => [agent.sessionId, agent.currentTask])
  );

  assert.deepEqual(taskBySession, {
    S1: 'Audit auth',
    S2: 'Review billing',
  });
});

test('a start joins the nearest matching stop; the other stop stays an orphan', async () => {
  const baseDir = await makeBase({
    subagent: [start()],
    agent: [
      stop({ ts: T('10:10:00'), durationMs: 600000 }),
      stop({ ts: T('10:03:00'), durationMs: 180000 }),
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents.length, 2);
  const joined = model.agents.find((agent) => agent.model === 'claude-sonnet-4-6');
  assert.equal(joined.startedAt, T('10:00:00'));
  assert.equal(joined.endedAt, T('10:03:00'));
  assert.equal(joined.durationMs, 180000);
  const orphan = model.agents.find((agent) => agent.model === null);
  assert.equal(orphan.endedAt, T('10:10:00'));
  assert.equal(orphan.durationMs, 600000);
});

test('missing files yield an empty model with the zero-state summary', async () => {
  const baseDir = await makeBase({});
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.deepEqual(model.agents, []);
  assert.deepEqual(model.tasks, []);
  assert.deepEqual(model.edges, []);
  assert.deepEqual(model.events, []);
  assert.equal(model.summary, 'No agent activity yet.');
  assert.equal(model.generatedAt, T('10:04:00'));
});

test('bad JSONL lines are skipped, valid lines survive', async () => {
  const baseDir = await makeBase({
    subagent: [start(), 'not json {{{', '[1,2,3]', '"just a string"'],
    tasks: [{ ts: T('09:00:00'), task_id: '7', status: 'pending', title: 'Ship it' }, '{broken'],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents.length, 1);
  assert.equal(model.agents[0].name, 'reviewer');
  assert.equal(model.tasks.length, 1);
  assert.equal(model.tasks[0].title, 'Ship it');
});

test('tasks keep the latest state per task_id and carry title/sessionId forward', async () => {
  const baseDir = await makeBase({
    tasks: [
      { ts: T('09:00:00'), task_id: '42', status: 'pending', title: 'Ship dashboard', subject: 'Ship dashboard', session_id: 'S1' },
      { ts: T('09:05:00'), task_id: '42', status: 'in_progress' },
      { ts: T('09:02:00'), task_id: '9', status: 'completed', title: 'Write docs' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.tasks.length, 2);
  assert.deepEqual(
    model.tasks.map((task) => task.task_id),
    ['42', '9']
  );
  const shipped = model.tasks[0];
  assert.equal(shipped.status, 'in_progress');
  assert.equal(shipped.title, 'Ship dashboard');
  assert.equal(shipped.sessionId, 'S1');
});

test('tasks are capped at the 100 most recent ids', async () => {
  const entries = [];
  for (let i = 0; i < 105; i += 1) {
    entries.push({
      ts: new Date(Date.parse(T('09:00:00')) + i * 1000).toISOString(),
      task_id: `t${i}`,
      status: 'pending',
      title: `Task ${i}`,
    });
  }
  const baseDir = await makeBase({ tasks: entries });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.tasks.length, 100);
  assert.equal(model.tasks[0].task_id, 't104');
});

test('summary reads like plain English for running agents and task buckets', async () => {
  const baseDir = await makeBase({
    subagent: [
      start({ agent_name: 'reviewer', ts: T('10:01:00') }),
      start({ agent_name: 'builder', ts: T('10:03:00') }),
    ],
    tasks: [
      { ts: T('09:00:00'), task_id: 'a', status: 'in_progress', title: 'A' },
      { ts: T('09:01:00'), task_id: 'b', status: 'completed', title: 'B' },
      { ts: T('09:02:00'), task_id: 'c', status: 'done', title: 'C' },
      { ts: T('09:03:00'), task_id: 'd', status: 'pending', title: 'D' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(
    model.summary,
    '2 agents working — builder (1m), reviewer (3m). 4 tasks: 1 in progress, 2 done, 1 waiting.'
  );
});

test('summary covers the nothing-running case with finished and failed counts', async () => {
  const baseDir = await makeBase({
    subagent: [start()],
    agent: [
      stop(),
      stop({ ts: T('10:05:00'), agent: 'qa', sessionId: 'S2', status: 'error' }),
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.summary, 'No agents working right now — 1 finished, 1 failed.');
});

test('fresh newest permission event marks running session and leads the summary', async () => {
  const baseDir = await makeBase({
    subagent: [start({ ts: T('09:55:00') })],
    events: [
      { ts: T('10:01:00'), session_id: 'S1', type: 'message', actor: 'reviewer', subject: 'Prepare deploy' },
      { ts: T('10:03:00'), session_id: 'S1', type: 'permission', status: 'awaiting', subject: 'Approve deploy', source_app: 'Claude' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents[0].status, 'awaiting_permission');
  assert.equal(model.agents[0].currentTask, 'Approve deploy');
  assert.deepEqual(model.awaitingPermission, [
    { session_id: 'S1', subject: 'Approve deploy', ts: T('10:03:00') },
  ]);
  assert.match(model.summary, /^⚠ 1 agent waiting for your approval — Approve deploy\./);
});

test('later activity or an expired permission does not mark a session awaiting', async () => {
  const baseDir = await makeBase({
    subagent: [
      start({ session_id: 'S1' }),
      start({ agent_name: 'builder', session_id: 'S2' }),
    ],
    events: [
      { ts: T('10:01:00'), session_id: 'S1', type: 'permission', status: 'awaiting', subject: 'Approve one' },
      { ts: T('10:02:00'), session_id: 'S1', type: 'message', subject: 'Work continued' },
      { ts: T('09:40:00'), session_id: 'S2', type: 'permission', status: 'awaiting', subject: 'Approve two' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.deepEqual(model.awaitingPermission, []);
  assert.deepEqual(model.agents.map((agent) => agent.status), ['running', 'running']);
});

test('edges map delegation/message/workflow events and skip the rest', async () => {
  const baseDir = await makeBase({
    events: [
      { ts: T('10:00:01'), session_id: 'S1', type: 'delegation', tool: 'Agent', actor: 'reviewer', subject: 'audit auth' },
      { ts: T('10:00:02'), session_id: 'S1', type: 'message', actor: 'builder' },
      { ts: T('10:00:03'), session_id: 'S2', type: 'workflow', actor: 'qa' },
      { ts: T('10:00:04'), session_id: 'S1', type: 'task', actor: 't1' },
      { ts: T('10:00:05'), session_id: 'S1', type: 'delegation' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.deepEqual(model.edges, [
    { from: 'S1', to: 'reviewer', type: 'delegation', ts: T('10:00:01') },
    { from: 'S1', to: 'builder', type: 'message', ts: T('10:00:02') },
    { from: 'S2', to: 'qa', type: 'workflow', ts: T('10:00:03') },
  ]);
});

test('events merge all sources newest-first with readable text', async () => {
  const baseDir = await makeBase({
    subagent: [start()],
    agent: [stop()],
    tasks: [{ ts: T('10:01:00'), task_id: '42', status: 'in_progress', title: 'Ship dashboard' }],
    events: [
      { ts: T('10:02:00'), session_id: 'S1', type: 'delegation', actor: 'reviewer', subject: 'audit auth' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.deepEqual(
    model.events.map((event) => event.ts),
    [T('10:03:00'), T('10:02:00'), T('10:01:00'), T('10:00:00')]
  );
  assert.equal(model.events[0].text, 'reviewer finished after 3m');
  assert.equal(model.events[1].text, 'Session S1 delegated work to reviewer — "audit auth"');
  assert.equal(model.events[2].text, '"Ship dashboard" is in progress');
  assert.equal(model.events[3].text, 'reviewer started working (claude-sonnet-4-6)');
});

test('event feed is capped at the 100 newest entries', async () => {
  const entries = [];
  for (let i = 0; i < 120; i += 1) {
    entries.push({
      ts: new Date(Date.parse(T('09:00:00')) + i * 1000).toISOString(),
      session_id: 'S1',
      type: 'task',
      subject: `step ${i}`,
    });
  }
  const baseDir = await makeBase({ events: entries });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.events.length, 100);
  assert.equal(model.events[0].ts, entries[119].ts);
});

test('filterOptions contains unique agents, event types, and sessions', async () => {
  const baseDir = await makeBase({
    subagent: [start(), start({ agent_name: 'builder', session_id: 'S2' })],
    agent: [stop()],
    tasks: [{ ts: T('09:00:00'), task_id: '42', session_id: 'S3', status: 'pending' }],
    events: [
      { ts: T('10:01:00'), session_id: 'S1', type: 'message', actor: 'reviewer' },
      { ts: T('10:02:00'), session_id: 'S4', type: 'permission', status: 'awaiting' },
      { ts: T('10:03:00'), session_id: 'S4', type: 'message', actor: 'builder' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.deepEqual(model.filterOptions, {
    agents: ['builder', 'reviewer'],
    types: ['agent_done', 'agent_start', 'message', 'permission', 'task'],
    sessions: ['S1', 'S2', 'S3', 'S4'],
    sourceApps: ['claude-code'],
  });
});

test('sourceApp flows end-to-end: agents, merged events, and filterOptions.sourceApps', async () => {
  const baseDir = await makeBase({
    subagent: [
      start({ agent_name: 'reviewer', session_id: 'S1' }),
      start({ agent_name: 'scout', session_id: 'S5', source_app: 'other-app' }),
    ],
    agent: [stop({ agent: 'qa', sessionId: 'S9' })],
    events: [
      { ts: T('10:02:00'), session_id: 'S1', type: 'message', actor: 'reviewer', source_app: 'other-app' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  const reviewer = model.agents.find((agent) => agent.name === 'reviewer');
  assert.equal(reviewer.sourceApp, 'claude-code', 'no source_app on the start record defaults to claude-code');

  const scout = model.agents.find((agent) => agent.name === 'scout');
  assert.equal(scout.sourceApp, 'other-app', 'a source_app on the start record is honored');

  const qa = model.agents.find((agent) => agent.name === 'qa');
  assert.equal(qa.sourceApp, 'claude-code', 'legacy agent-runs.jsonl orphan stops are always claude-code per Item 1');

  const legacyEvents = model.events.filter((event) => event.source !== 'mission-control');
  assert.ok(legacyEvents.length > 0);
  assert.ok(legacyEvents.every((event) => event.sourceApp === 'claude-code'));

  const mcEvent = model.events.find((event) => event.source === 'mission-control');
  assert.equal(mcEvent.sourceApp, 'other-app', 'events.jsonl source_app is honored');

  assert.deepEqual(model.filterOptions.sourceApps, ['claude-code', 'other-app']);
});

test('agent_key: sourceApp:name identity keeps tasksCompleted scoped per key', async () => {
  const baseDir = await makeBase({
    subagent: [start({ agent_name: 'reviewer', session_id: 'S1' })],
    agent: [stop({ agent: 'reviewer', sessionId: 'S1' })],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.agents.length, 1);
  assert.equal(model.agents[0].key, 'claude-code:reviewer');
  assert.equal(model.agents[0].tasksCompleted, 1);
});

test('parseTs/toMs parity: ISO strings and finite numeric epoch-ms both survive, model and snapshot agree on ordering', async () => {
  const isoTs = T('10:00:00');
  const numericTs = Date.parse(T('10:01:00'));
  const baseDir = await makeBase({
    events: [
      { ts: isoTs, session_id: 'S1', type: 'message', actor: 'reviewer', subject: 'iso event' },
      { ts: numericTs, session_id: 'S1', type: 'message', actor: 'builder', subject: 'numeric event' },
    ],
  });

  const model = await buildMissionModel({ baseDir, now: NOW });
  const snapshot = await readModel({ baseDir, now: NOW });

  const toMillis = (ts) => (typeof ts === 'number' ? ts : Date.parse(ts));

  assert.equal(model.events.length, 2, 'model keeps both the ISO and numeric-ts events');
  assert.equal(snapshot.events.length, 2, 'snapshot keeps both the ISO and numeric-ts events');
  // Both readers must resolve the numeric-ts line to the same millisecond as
  // the ISO line's neighbor and order identically — text formatting differs
  // between the two readers by design and isn't asserted here.
  assert.deepEqual(
    model.events.map((event) => toMillis(event.ts)),
    snapshot.events.map((event) => toMillis(event.ts)),
    'identical ordering (by resolved ms) between model and snapshot'
  );
  assert.equal(model.events[0].actor, 'builder', 'newest (numeric ts) first in model');
  assert.equal(snapshot.events[0].actor, 'builder', 'newest (numeric ts) first in snapshot');
});

test('duplicate-id events.jsonl lines render once in events and edges (cowork+codex double-append guard)', async () => {
  const baseDir = await makeBase({
    events: [
      { id: 'evt-1', ts: T('10:00:00'), session_id: 'S1', type: 'delegation', actor: 'reviewer', subject: 'audit auth' },
      { id: 'evt-1', ts: T('10:00:00'), session_id: 'S1', type: 'delegation', actor: 'reviewer', subject: 'audit auth (dup)' },
      { id: 'evt-2', ts: T('10:00:05'), session_id: 'S1', type: 'workflow', actor: 'builder' },
      { ts: T('10:00:10'), session_id: 'S1', type: 'workflow', actor: 'qa' },
    ],
  });
  const model = await buildMissionModel({ baseDir, now: NOW });

  assert.equal(model.events.length, 3, 'first evt-1 kept, duplicate evt-1 dropped, evt-2 + id-less kept');
  assert.equal(model.edges.length, 3, 'evt-1 (deduped to one) + evt-2 + the id-less line all survive as edges');
  const auditEvents = model.events.filter((event) => event.text.includes('audit auth'));
  assert.equal(auditEvents.length, 1, 'the duplicate audit-auth event line was dropped');
  assert.equal(auditEvents[0].text.includes('(dup)'), false, 'first occurrence wins, not the duplicate');
});

test('filterEventsAfter keeps only events strictly newer than after', () => {
  const events = [
    { ts: T('10:03:00'), text: 'newest' },
    { ts: T('10:02:00'), text: 'middle' },
    { ts: T('10:01:00'), text: 'oldest' },
    { ts: null, text: 'no timestamp' },
  ];
  const filtered = filterEventsAfter(events, T('10:01:30'));

  assert.deepEqual(
    filtered.map((event) => event.text),
    ['newest', 'middle']
  );
});

test('filterEventsAfter with a missing or invalid cursor returns everything', () => {
  const events = [{ ts: T('10:03:00') }, { ts: T('10:02:00') }];
  assert.equal(filterEventsAfter(events, null).length, 2);
  assert.equal(filterEventsAfter(events, 'not-a-date').length, 2);
  assert.deepEqual(filterEventsAfter(undefined, null), []);
});

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

test('GET /api/mission returns the full model', async () => {
  const commanderDir = await makeBase({
    subagent: [start({ agent_name: 'builder', ts: T('10:01:00') })],
    tasks: [{ ts: T('09:00:00'), task_id: '1', status: 'pending', title: 'Plan launch' }],
  });
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'none'), commanderDir });
  const response = await dispatch(server, '/api/mission');

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.agents.length, 1);
  assert.equal(body.agents[0].status, 'running');
  assert.equal(body.tasks[0].title, 'Plan launch');
  assert.match(body.summary, /1 agent working — builder/);
  assert.equal(typeof body.generatedAt, 'string');
});

test('GET /api/mission/events honors the after cursor', async () => {
  const commanderDir = await makeBase({
    events: [
      { ts: T('10:00:01'), session_id: 'S1', type: 'delegation', actor: 'reviewer' },
      { ts: T('10:00:05'), session_id: 'S1', type: 'message', actor: 'builder' },
    ],
  });
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'none'), commanderDir });

  const all = await dispatch(server, '/api/mission/events');
  assert.equal(JSON.parse(all.body).events.length, 2);

  const after = await dispatch(
    server,
    `/api/mission/events?after=${encodeURIComponent(T('10:00:01'))}`
  );
  const body = JSON.parse(after.body);
  assert.equal(body.events.length, 1);
  assert.equal(body.events[0].ts, T('10:00:05'));
  assert.equal(typeof body.generatedAt, 'string');
});

test('GET /mission-control serves the dashboard page', async () => {
  const server = createServer({
    sessionsDir: path.join(tmpRoot, 'none'),
    commanderDir: path.join(tmpRoot, 'none'),
  });
  const response = await dispatch(server, '/mission-control');

  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Content-Type'], /text\/html/);
  assert.match(response.body, /Commander Mission Control/);
  assert.match(response.body, /mission-control\.js/);
});
