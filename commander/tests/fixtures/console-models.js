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

export const GOLDEN_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  'console-goldens'
);
