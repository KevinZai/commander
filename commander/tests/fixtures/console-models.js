/**
 * console-models.js — the model fixtures the console golden-file gate renders.
 *
 * v7.4.0 Phase 0 extracts every deck's HTML out of mission-control-snapshot.js
 * / usage-snapshot.js / safety-snapshot.js into one shared lib/console-render.js.
 * The ONLY acceptable proof that the extraction changed nothing is byte-identical
 * output, so the goldens under ./console-goldens/ were generated from the
 * PRE-extraction renderers and are compared against post-extraction output by
 * ../console-extraction.test.js.
 *
 * That comparison is only meaningful if both sides render the SAME model, so the
 * model fixtures live here (one module, imported by both the generator and the
 * test) rather than being re-typed on each side.
 *
 * Shapes mirror the fixtures the existing deck suites already use — mission
 * fixtureModel() from ../mission-snapshot.test.js, SAMPLE_SAVINGS/SAMPLE_METRICS
 * from ../usage-snapshot.test.js, GATE_ROWS/FAILURE_ROWS from
 * ../safety-snapshot.test.js — copied rather than imported because importing a
 * test file would run its tests. Usage/safety go through the real
 * readUsageModel()/readSafetyModel() over a temp baseDir (the readers are not
 * touched by the extraction, so they stay a fixed input), while the mission model
 * is a literal: readModel() shells out to `ccusage` via getMetrics(), which is
 * neither deterministic nor safe to run from a fixture.
 *
 * Every timestamp is pinned — nothing here may call Date.now(), or the goldens
 * would change on every run.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readHistoryModel } from '../../cowork-plugin/lib/history-reader.js';
import { readSafetyModel } from '../../cowork-plugin/lib/safety-snapshot.js';
import { readUsageModel } from '../../cowork-plugin/lib/usage-snapshot.js';

// Same pinned clocks the three deck suites use.
export const MISSION_NOW = '2026-07-16T12:00:00.000Z';
export const DECK_NOW = '2026-07-20T12:00:00.000Z';
// A clock far enough past the fixture rows to trip the staleness banner.
const STALE_NOW = '2026-07-25T12:00:00.000Z';

function toLines(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
}

// Write the given files under a fresh temp baseDir, read a model from it, then
// remove the dir. The readers are pure over (files, now), so the returned model
// is deterministic.
async function withBaseDir(files, read) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-console-fixture-'));
  try {
    for (const [relative, contents] of Object.entries(files)) {
      const target = path.join(dir, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, contents);
    }
    return await read(dir);
  } finally {
    await fs.rm(dir, { force: true, recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Mission Control

// Copied from ../mission-snapshot.test.js's fixtureModel().
function missionFixtureModel() {
  return {
    agents: [
      {
        name: 'reviewer',
        model: 'sonnet',
        sessionId: 's2',
        startedAt: '2026-07-16T11:00:00.000Z',
        endedAt: null,
        durationMs: null,
        inputTokens: 0,
        outputTokens: 0,
        status: 'awaiting_permission',
        emoji: '🔍',
        role: 'Reviewer',
        currentTask: 'Review CSP changes',
        tasksCompleted: 2,
        estCostUsd: 0.0042,
      },
      {
        name: 'builder',
        model: 'haiku',
        sessionId: 's1',
        startedAt: '2026-07-16T10:00:00.000Z',
        endedAt: '2026-07-16T10:05:00.000Z',
        durationMs: 300000,
        inputTokens: 1200,
        outputTokens: 800,
        status: 'done',
        emoji: '🔨',
        role: 'Builder',
        currentTask: null,
        tasksCompleted: 3,
        estCostUsd: 0.0156,
      },
      {
        name: '<script>alert(1)</script>',
        model: null,
        sessionId: 's0',
        startedAt: null,
        endedAt: '2026-07-16T09:00:00.000Z',
        durationMs: 60000,
        inputTokens: 10,
        outputTokens: 5,
        status: 'failed',
        emoji: '🤖',
        role: 'Agent',
        currentTask: 'Probe <unsafe> markup',
        tasksCompleted: 0,
        estCostUsd: 0.0001,
      },
    ],
    tasks: [
      { task_id: 't1', title: 'Ship v6.8.0', status: 'in_progress', ts: '2026-07-16T10:30:00.000Z' },
      { task_id: 't2', title: 'Write the docs', status: 'completed', ts: '2026-07-16T10:45:00.000Z' },
      { task_id: 't3', title: 'Plan the launch', status: 'todo', ts: '2026-07-16T09:30:00.000Z' },
    ],
    edges: [
      { from: 'sess-main', to: 'reviewer', type: 'delegation', ts: '2026-07-16T11:00:00.000Z' },
    ],
    events: [
      {
        ts: '2026-07-16T11:00:00.000Z',
        source: 'subagent-runs',
        type: 'agent_start',
        actor: 'reviewer',
        text: 'reviewer started working (sonnet)',
      },
      {
        ts: '2026-07-16T10:05:00.000Z',
        source: 'agent-runs',
        type: 'agent_done',
        actor: 'builder',
        text: 'builder finished after 5m — see https://example.com/run/1',
      },
    ],
    summary:
      '⚠ 1 agent waiting for your approval — Approve snapshot publish. 3 tasks: 1 in progress, 1 done, 1 waiting.',
    awaitingPermission: [
      {
        session_id: 's2',
        subject: 'Approve snapshot publish',
        ts: '2026-07-16T11:58:00.000Z',
      },
    ],
    filterOptions: {
      agents: ['builder', 'reviewer'],
      types: ['agent_done', 'agent_start', 'delegation'],
      sessions: ['s1', 's2'],
    },
    generatedAt: MISSION_NOW,
  };
}

// fixtureModel() alone never reaches the charts-with-data, suggestions-list,
// derived-row or staleness-banner branches — roughly a third of the deck's
// markup. This variant covers them so the golden gate sees the whole renderer.
function missionRichModel() {
  const base = missionFixtureModel();
  return {
    ...base,
    agents: [
      ...base.agents,
      {
        name: 'codex-worker',
        sourceApp: 'codex',
        model: null,
        sessionId: 's9',
        startedAt: '2026-07-16T11:30:00.000Z',
        endedAt: null,
        durationMs: null,
        inputTokens: 0,
        outputTokens: 0,
        status: 'running',
        derived: true,
        emoji: '🤖',
        role: 'Agent',
        currentTask: null,
        tasksCompleted: 0,
        estCostUsd: null,
      },
    ],
    metrics: [
      { date: '2026-07-14', source_app: 'claude-code', cost_usd: 1.2, agents_dispatched: 3, tasks_completed: 2, tool_failures: 1, sessions: 1 },
      { date: '2026-07-15', source_app: 'claude-code', cost_usd: 0.8, agents_dispatched: 2, tasks_completed: 4, tool_failures: 0, sessions: 2 },
      { date: '2026-07-15', source_app: 'codex', cost_usd: 0.3, agents_dispatched: 1, tasks_completed: 1, tool_failures: 2, sessions: 1 },
    ],
    suggestions: [
      {
        id: 'sg1',
        ts: '2026-07-15T09:00:00.000Z',
        from: 'reviewer',
        source_app: 'claude-code',
        idea: 'Cache the catalog read — <b>every</b> deck re-reads it.',
        evidence: 'observed in 3 sessions',
        proposed_ticket: { title: 'Cache catalog reads' },
        status: 'new',
        promoted_ticket: null,
        by: null,
      },
      {
        id: 'sg2',
        ts: '2026-07-14T09:00:00.000Z',
        from: null,
        source_app: 'codex',
        idea: null,
        evidence: null,
        proposed_ticket: null,
        status: 'promoted',
        promoted_ticket: { title: 'CC-1394 extraction' },
        by: 'kevin',
      },
    ],
    // Older than the 24h banner threshold relative to MISSION_NOW.
    dataThroughMs: Date.parse('2026-07-14T09:00:00.000Z'),
    hasAnySourceRow: true,
  };
}

// What readModel() returns for a machine that has never run an agent.
function missionZeroModel() {
  return {
    agents: [],
    tasks: [],
    edges: [],
    events: [],
    summary: 'No agent activity yet.',
    awaitingPermission: [],
    filterOptions: { agents: [], types: [], sessions: [], sourceApps: ['claude-code'] },
    suggestions: [],
    metrics: [],
    topSkills: [],
    dataThroughMs: null,
    hasAnySourceRow: false,
    generatedAt: MISSION_NOW,
  };
}

// ---------------------------------------------------------------------------
// Usage & Cost — copied from ../usage-snapshot.test.js

const SAMPLE_SAVINGS = {
  days: {
    '2026-07-18': { actualUsd: 0.5, baselineUsd: 2, savedUsd: 1.5, dispatches: 3 },
    '2026-07-19': { actualUsd: 0.25, baselineUsd: 1, savedUsd: 0.75, dispatches: 2 },
  },
};

const SAMPLE_METRICS = [
  { date: '2026-07-18', source_app: 'claude-code', cost_usd: 1.2, agents_dispatched: 3, tasks_completed: 2, tool_failures: 0, sessions: 1 },
  { date: '2026-07-18', source_app: 'codex', cost_usd: 0.3, agents_dispatched: 1, tasks_completed: 1, tool_failures: 0, sessions: 1 },
  { date: '2026-07-19', source_app: 'claude-code', cost_usd: 0.8, agents_dispatched: 2, tasks_completed: 1, tool_failures: 1, sessions: 1 },
];

// Delegation that ran pricier than the all-Opus baseline, on day buckets old
// enough to trip both the staleness banner and the savings-source note.
const NEGATIVE_SAVINGS = {
  days: {
    '2026-07-01': { actualUsd: 4, baselineUsd: 2.5, savedUsd: -1.5, dispatches: 1 },
  },
};

function usageModel({ savings, metrics, now = DECK_NOW }) {
  const files = {};
  if (savings) files['savings.json'] = JSON.stringify(savings);
  if (metrics) files[path.join('mission-control', 'metrics.jsonl')] = toLines(metrics);
  return withBaseDir(files, (baseDir) => readUsageModel({ recompute: false, baseDir, now }));
}

// ---------------------------------------------------------------------------
// Safety — copied from ../safety-snapshot.test.js

const GATE_ROWS = [
  { timestamp: '2026-07-20T05:00:00.000Z', sessionId: 's1', decision: 'approved', toolName: 'Bash' },
  { timestamp: '2026-07-20T05:00:01.000Z', sessionId: 's1', decision: 'approved', toolName: 'Read' },
  { timestamp: '2026-07-20T05:00:02.000Z', sessionId: 's1', decision: 'approved', toolName: 'Bash' },
  {
    timestamp: '2026-07-20T05:00:03.000Z',
    sessionId: 's1',
    decision: 'rejected-dangerous',
    toolName: 'Bash',
    commandSnippet: 'rm -rf /tmp',
  },
  {
    timestamp: '2026-07-20T05:00:04.000Z',
    sessionId: 's1',
    decision: 'rejected-autofix',
    toolName: 'Write',
    skill: '/ccc-review',
    phase: 'autofix',
  },
];

// Split literal so the CI "verify no secrets" grep (sk-<20+ alnum>) doesn't
// false-positive on this redaction fixture; runtime value is unchanged.
const SECRET = 'sk-' + 'THISISNOTAREALKEY1234567890ABCDEF';

const FAILURE_ROWS = [
  { ts: '2026-07-19T10:00:00.000Z', tool_name: 'Bash', error: 'Exit code 143\nCommand timed out after 1m 30s' },
  { ts: '2026-07-19T11:00:00.000Z', tool_name: 'Bash', error: 'Exit code 143\nCommand timed out after 2m 45s' },
  {
    ts: '2026-07-19T12:00:00.000Z',
    tool_name: 'mcp__openclaw__web_search',
    error: 'Blocked hostname or private/internal/special-use IP address',
  },
  {
    ts: '2026-07-19T13:00:00.000Z',
    tool_name: 'Bash',
    error: `Auth failed using token ${SECRET}`,
  },
];

function safetyModel({ gate, failures, now = DECK_NOW }) {
  const files = {};
  if (gate) files[path.join('analytics', 'permission-gate.jsonl')] = toLines(gate);
  if (failures) files['tool-failures.jsonl'] = toLines(failures);
  return withBaseDir(files, (baseDir) => readSafetyModel({ baseDir, now }));
}

// ---------------------------------------------------------------------------
// Memory (v7.4.0 Phase 2) — claude-mem is optional and NOT bundled, so the
// not-installed shape is a first-class fixture, not an edge case.
//
// These are literal models rather than a real sqlite read: creating a claude-mem
// store would make the fixture depend on node:sqlite being present, which is
// exactly the condition memory-reader.js is designed to survive the ABSENCE of.
// ../console-memory-history.test.js pins these literals against the real
// reader's key set so they cannot silently drift out of shape.

function memoryFixtureModel() {
  return {
    available: true,
    unavailableReason: null,
    observations: [
      {
        id: 3,
        ts: Date.parse('2026-07-20T09:00:00.000Z'),
        type: 'bugfix',
        title: 'Fixed the deck strip <script>alert(1)</script> escaping',
        project: 'cc-commander',
      },
      {
        id: 2,
        ts: Date.parse('2026-07-19T09:00:00.000Z'),
        type: 'feature',
        title: 'Added the console widget prompt bar',
        project: 'cc-commander',
      },
      {
        id: 1,
        ts: Date.parse('2026-07-18T09:00:00.000Z'),
        type: 'discovery',
        title: 'Telemetry lives under <home>/.claude/commander',
        project: 'dashboard-v2',
      },
    ],
    projects: [
      { project: 'cc-commander', count: 2 },
      { project: 'dashboard-v2', count: 1 },
    ],
    counts: { last7d: 3, last30d: 11, shown: 3 },
    dataThroughMs: Date.parse('2026-07-20T09:00:00.000Z'),
    generatedAt: DECK_NOW,
  };
}

function memoryUnavailableModel(reason) {
  return {
    available: false,
    unavailableReason: reason,
    observations: [],
    projects: [],
    counts: { last7d: 0, last30d: 0, shown: 0 },
    dataThroughMs: null,
    generatedAt: DECK_NOW,
  };
}

// ---------------------------------------------------------------------------
// History (v7.4.0 Phase 2) — built through the REAL reader over a temp baseDir,
// like Usage and Safety, so the fixtures can never describe a shape the reader
// does not actually produce.

const HISTORY_METRICS = [
  { date: '2026-07-18', source_app: 'claude-code', cost_usd: 1.2, agents_dispatched: 3, tasks_completed: 2, tool_failures: 1, sessions: 1 },
  { date: '2026-07-19', source_app: 'claude-code', cost_usd: 0.8, agents_dispatched: 2, tasks_completed: 4, tool_failures: 0, sessions: 2 },
  { date: '2026-07-19', source_app: 'codex', cost_usd: 0.3, agents_dispatched: 1, tasks_completed: 1, tool_failures: 2, sessions: 1 },
  // Older than the 30-day window: it must widen `backbone` without adding a day row.
  { date: '2026-05-23', source_app: 'claude-code', cost_usd: 9.99, agents_dispatched: 9, tasks_completed: 9, tool_failures: 9, sessions: 9 },
];

const HISTORY_SKILL_RUNS = [
  { ts: '2026-07-19T10:00:00.000Z', skill: 'commander:ccc-review', source_app: 'claude-code', session_id: 's1' },
  { ts: '2026-07-19T11:00:00.000Z', skill: 'commander:ccc-review', source_app: 'claude-code', session_id: 's1' },
  { ts: '2026-07-19T12:00:00.000Z', skill: '<img src=x onerror=1>', source_app: 'codex', session_id: 's2' },
  { ts: '2026-07-18T12:00:00.000Z', skill: 'commander:ccc-plan', source_app: 'claude-code', session_id: 's3' },
];

const HISTORY_TASKS = [
  { ts: '2026-07-19T09:30:00.000Z', task_id: '1', status: 'completed', title: 'Ship Phase 2' },
  { ts: '2026-07-18T09:30:00.000Z', task_id: '2', status: 'in_progress', title: 'Write the tests' },
];

const HISTORY_AGENT_RUNS = [
  { ts: '2026-07-19T10:05:00.000Z', agent: 'builder', sessionId: 's1', durationMs: 1000, status: 'completed' },
  { ts: '2026-07-18T10:05:00.000Z', agent: 'reviewer', sessionId: 's3', durationMs: 2000, status: 'completed' },
];

const HISTORY_SUBAGENT_RUNS = [
  { ts: '2026-07-19T10:06:00.000Z', agent_name: 'general-purpose', session_id: 's1' },
];

// Deliberately broken lines around good ones: an append-only log routinely ends
// mid-record, and a half-written line must be skipped, not counted, and never
// throw. This is tolerance, not an error state — `errors` stays empty.
const MALFORMED_METRICS_TEXT = [
  JSON.stringify({ date: '2026-07-19', source_app: 'claude-code', cost_usd: 0.5, agents_dispatched: 1, tasks_completed: 1, tool_failures: 0, sessions: 1 }),
  '{"date":"2026-07-19","cost_usd":',
  'not json at all',
  '[]',
  'null',
  JSON.stringify({ date: 'not-a-date', cost_usd: 99 }),
  JSON.stringify({ date: '2026-07-18', source_app: 'codex', cost_usd: 0.25, agents_dispatched: 1, tasks_completed: 0, tool_failures: 3, sessions: 1 }),
].join('\n') + '\n';

function historyModel({ metrics, skills, tasks, agents, subagents, sessions, rawFiles, now = DECK_NOW }) {
  const files = {};
  if (metrics) files[path.join('mission-control', 'metrics.jsonl')] = toLines(metrics);
  if (skills) files['skill-runs.jsonl'] = toLines(skills);
  if (tasks) files['tasks.jsonl'] = toLines(tasks);
  if (agents) files['agent-runs.jsonl'] = toLines(agents);
  if (subagents) files['subagent-runs.jsonl'] = toLines(subagents);
  for (const name of sessions || []) files[path.join('sessions', name)] = '{}';
  Object.assign(files, rawFiles || {});
  return withBaseDir(files, (baseDir) => readHistoryModel({ baseDir, now }));
}

// ---------------------------------------------------------------------------
// Cases. `name` is the golden basename half; `now` is what build*Html receives.

export async function missionControlCases() {
  return [
    { name: 'fixture', now: MISSION_NOW, model: missionFixtureModel() },
    { name: 'rich', now: MISSION_NOW, model: missionRichModel() },
    { name: 'zero', now: MISSION_NOW, model: missionZeroModel() },
  ];
}

export async function usageCases() {
  return [
    {
      name: 'fixture',
      now: DECK_NOW,
      model: await usageModel({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS }),
    },
    // No metrics rows on purpose: with the day buckets 19 days behind DECK_NOW,
    // dataThrough falls past the 48h threshold and the staleness banner renders.
    { name: 'negative', now: DECK_NOW, model: await usageModel({ savings: NEGATIVE_SAVINGS }) },
    { name: 'zero', now: DECK_NOW, model: await usageModel({}) },
  ];
}

export async function safetyCases() {
  return [
    {
      name: 'fixture',
      now: DECK_NOW,
      model: await safetyModel({ gate: GATE_ROWS, failures: FAILURE_ROWS }),
    },
    {
      name: 'stale',
      now: STALE_NOW,
      model: await safetyModel({ gate: GATE_ROWS, failures: FAILURE_ROWS, now: STALE_NOW }),
    },
    { name: 'zero', now: DECK_NOW, model: await safetyModel({}) },
  ];
}

export async function memoryCases() {
  return [
    { name: 'fixture', now: DECK_NOW, model: memoryFixtureModel() },
    {
      name: 'not-installed',
      now: DECK_NOW,
      model: memoryUnavailableModel(
        'claude-mem not detected — install it separately to see session memory here.'
      ),
    },
    {
      name: 'empty',
      now: DECK_NOW,
      model: { ...memoryFixtureModel(), observations: [], projects: [], counts: { last7d: 0, last30d: 0, shown: 0 }, dataThroughMs: null },
    },
  ];
}

export async function historyCases() {
  return [
    {
      name: 'fixture',
      now: DECK_NOW,
      model: await historyModel({
        metrics: HISTORY_METRICS,
        skills: HISTORY_SKILL_RUNS,
        tasks: HISTORY_TASKS,
        agents: HISTORY_AGENT_RUNS,
        subagents: HISTORY_SUBAGENT_RUNS,
        sessions: ['2026-07-19-abc123.json', '2026-07-19-def456.json', 'active-cost-default.json'],
      }),
    },
    {
      name: 'malformed',
      now: DECK_NOW,
      model: await historyModel({
        rawFiles: { [path.join('mission-control', 'metrics.jsonl')]: MALFORMED_METRICS_TEXT },
      }),
    },
    { name: 'zero', now: DECK_NOW, model: await historyModel({}) },
  ];
}

export const GOLDEN_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  'console-goldens'
);
