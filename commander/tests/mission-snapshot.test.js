'use strict';

// Pins the Mission Control snapshot library (v6.8.0):
// commander/cowork-plugin/lib/mission-control-snapshot.js must render ONE
// self-contained, strict-CSP-safe HTML string (inline CSS, no scripts, no
// external URLs in attributes, theme-aware, deterministic given a fixed
// `now`) from the mission model — and its readModel() must re-implement the
// tolerant JSONL reading over ~/.claude/commander/ without importing from
// dashboard/ (the plugin ships without it).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const LIB = '../cowork-plugin/lib/mission-control-snapshot.js';

async function loadLib() {
  return import(LIB);
}

const FIXED_NOW = '2026-07-16T12:00:00.000Z';

function fixtureModel() {
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
    summary: '⚠ 1 agent waiting for your approval — Approve snapshot publish. 3 tasks: 1 in progress, 1 done, 1 waiting.',
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
    generatedAt: FIXED_NOW,
  };
}

describe('buildSnapshotHtml — single self-contained document', () => {
  it('returns one HTML string with exactly one stable <title>', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.equal(typeof html, 'string');
    assert.ok(html.length > 500, 'non-trivial document');
    const titles = html.match(/<title>Commander Mission Control<\/title>/g) || [];
    assert.equal(titles.length, 1, 'exactly one <title>');
    assert.equal((html.match(/<style>/g) || []).length, 1, 'exactly one inline <style>');
  });

  it('is an artifact-safe fragment: no doctype/html/head/body tags', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.doesNotMatch(html, /<!doctype/i);
    assert.doesNotMatch(html, /<html[\s>]/i);
    assert.doesNotMatch(html, /<head[\s>]/i);
    assert.doesNotMatch(html, /<body[\s>]/i);
  });

  it('contains the summary text and every agent name', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const model = fixtureModel();
    const html = buildSnapshotHtml(model, { now: FIXED_NOW });
    assert.ok(html.includes('1 agent waiting for your approval'), 'summary rendered');
    assert.ok(html.includes('reviewer'), 'agent name reviewer');
    assert.ok(html.includes('builder'), 'agent name builder');
  });

  it('renders enriched agent roster cards', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.equal((html.match(/<article class="agent-card/g) || []).length, 3);
    for (const value of [
      '🔍',
      'Reviewer',
      'Review CSP changes',
      '2 tasks completed',
      '$0.0042',
      '🔨',
      'Builder',
      'No current task',
      '3 tasks completed',
      '$0.0156',
    ]) {
      assert.ok(html.includes(value), `enriched roster value ${value}`);
    }
  });

  it('puts awaiting-permission guidance in an amber banner above the summary', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.ok(html.includes('permission-banner'), 'amber banner class');
    assert.ok(html.includes('⚠ Waiting for your approval'), 'warning heading');
    assert.ok(html.includes('Approve snapshot publish'), 'permission subject');
    assert.ok(html.includes('session <span class="mono">s2</span>'), 'session to visit');
    assert.ok(html.includes('Switch to that session to approve.'), 'approval guidance');
    assert.ok(html.includes('agent-card is-awaiting'), 'agent card gets amber treatment');
    assert.ok(
      html.indexOf('aria-label="Awaiting permission"') < html.indexOf('aria-label="Summary"'),
      'permission banner precedes summary'
    );
  });

  it('renders the task board buckets and titles', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    for (const heading of ['In progress', 'Waiting', 'Done']) {
      assert.ok(html.includes(heading), `bucket heading ${heading}`);
    }
    for (const title of ['Ship v6.8.0', 'Write the docs', 'Plan the launch']) {
      assert.ok(html.includes(title), `task title ${title}`);
    }
  });

  it('renders the delegation list with from → to', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.ok(html.includes('sess-main'), 'edge source');
    assert.ok(html.includes('→'), 'arrow');
    assert.ok(html.includes('delegation'), 'edge type');
  });

  it('renders the event tail', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.ok(html.includes('reviewer started working (sonnet)'), 'event text rendered');
  });
});

describe('buildSnapshotHtml — strict-CSP safety', () => {
  it('has NO script/link/iframe/img elements at all', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.doesNotMatch(html, /<(script|link|iframe|img)\b/i);
  });

  it('has no http:// or https:// in any src/href attribute (URLs in log text stay escaped text)', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    const attrUrls = [...html.matchAll(/(?:src|href)\s*=\s*(["'])(.*?)\1/gi)].map((m) => m[2]);
    for (const value of attrUrls) {
      assert.doesNotMatch(value, /^(?:https?:)?\/\//i, `external URL in attribute: ${value}`);
    }
    assert.ok(
      html.includes('https://example.com/run/1'),
      'URL from event text survives as plain escaped text'
    );
  });

  it('escapes hostile log data — a <script> agent name never lands as markup', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.ok(!html.includes('<script>alert(1)</script>'), 'raw payload absent');
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'payload rendered escaped');
  });
});

describe('buildSnapshotHtml — theming + determinism', () => {
  it('is theme-aware: prefers-color-scheme dark plus :root[data-theme] overrides', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.match(html, /@media \(prefers-color-scheme: dark\)/);
    assert.match(html, /:root\[data-theme="dark"\]/);
    assert.match(html, /:root\[data-theme="light"\]/);
  });

  it('is deterministic: identical output for identical model + fixed now', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const first = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    const second = buildSnapshotHtml(fixtureModel(), { now: FIXED_NOW });
    assert.equal(first, second);
  });

  it('never reaches for Date.now(): with now omitted it derives from generatedAt', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const first = buildSnapshotHtml(fixtureModel());
    const second = buildSnapshotHtml(fixtureModel());
    assert.equal(first, second, 'stable without an explicit now');
    assert.ok(first.includes('2026-07-16 12:00 UTC'), 'stamp derived from generatedAt');
    assert.ok(first.includes('1h ago'), 'relative times derived from generatedAt, not wall clock');
  });
});

describe('buildSnapshotHtml — zero state + fail-open', () => {
  it('empty model renders the /ccc-spawn guidance', async () => {
    const { buildSnapshotHtml } = await loadLib();
    const html = buildSnapshotHtml({
      agents: [],
      tasks: [],
      edges: [],
      events: [],
      summary: 'No agent activity yet.',
      generatedAt: FIXED_NOW,
    });
    assert.ok(html.includes('No agent activity yet.'), 'zero summary rendered');
    assert.ok(html.includes('/ccc-spawn'), 'points the user at /ccc-spawn');
  });

  it('null / garbage model still renders a valid zero-state page', async () => {
    const { buildSnapshotHtml } = await loadLib();
    for (const bad of [null, undefined, 42, 'nope', { agents: 'x', tasks: 7 }]) {
      const html = buildSnapshotHtml(bad, { now: FIXED_NOW });
      assert.match(html, /<title>Commander Mission Control<\/title>/);
      assert.ok(html.includes('/ccc-spawn'));
    }
  });
});

// ── readModel — tolerant JSONL reading in an isolated tmpdir ────────────────

function writeFixtureLogs(baseDir) {
  fs.mkdirSync(path.join(baseDir, 'mission-control'), { recursive: true });
  fs.writeFileSync(
    path.join(baseDir, 'subagent-runs.jsonl'),
    [
      JSON.stringify({ ts: '2026-07-16T10:00:00.000Z', agent_name: 'builder', prompt: 'build it', model: 'sonnet', session_id: 's1' }),
      '{{{ not json',
      '[1,2,3]',
      '"scalar"',
      JSON.stringify({ ts: '2026-07-16T11:00:00.000Z', agent_name: 'reviewer', prompt: 'review it', model: 'opus', session_id: 's2' }),
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(baseDir, 'agent-runs.jsonl'),
    [
      JSON.stringify({ ts: '2026-07-16T10:05:00.000Z', agent: 'builder', sessionId: 's1', durationMs: 300000, inputTokens: 1200, outputTokens: 800, status: 'ok' }),
      JSON.stringify({ ts: '2026-07-16T09:00:00.000Z', agent: 'ghost', sessionId: 's0', durationMs: 60000, inputTokens: 10, outputTokens: 5, status: 'error: crashed' }),
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(baseDir, 'tasks.jsonl'),
    [
      JSON.stringify({ ts: '2026-07-16T09:00:00.000Z', task_id: 't1', status: 'open', title: 'Ship v6.8.0' }),
      JSON.stringify({ ts: '2026-07-16T10:30:00.000Z', task_id: 't1', status: 'in_progress', title: 'Ship v6.8.0' }),
      JSON.stringify({ ts: '2026-07-16T10:45:00.000Z', task_id: 't2', status: 'completed', subject: 'Write the docs', title: 'ignored-fallback' }),
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(baseDir, 'mission-control', 'events.jsonl'),
    [
      JSON.stringify({ ts: '2026-07-16T10:01:00.000Z', type: 'delegation', tool: 'Agent', actor: 'builder', subject: 'Build it', detail: 'go', session_id: 's1', status: null }),
      JSON.stringify({ ts: '2026-07-16T10:02:00.000Z', type: 'noise', actor: 'x', session_id: 's1' }),
      JSON.stringify({ type: 'delegation', actor: 'no-timestamp', session_id: 's9' }),
    ].join('\n')
  );
}

function withTmpDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-mission-snapshot-test-'));
  return Promise.resolve(fn(dir)).finally(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  });
}

describe('readModel — tolerant reading', () => {
  it('missing baseDir → empty slices, zero-state summary, deterministic generatedAt', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      const model = await readModel({ baseDir: path.join(dir, 'does-not-exist'), now: FIXED_NOW });
      assert.deepEqual(model.agents, []);
      assert.deepEqual(model.tasks, []);
      assert.deepEqual(model.edges, []);
      assert.deepEqual(model.events, []);
      assert.deepEqual(model.awaitingPermission, []);
      assert.deepEqual(model.filterOptions, { agents: [], types: [], sessions: [] });
      assert.equal(model.summary, 'No agent activity yet.');
      assert.equal(model.generatedAt, FIXED_NOW);
    });
  });

  it('skips malformed / non-object JSONL lines and keeps the good ones', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      writeFixtureLogs(dir);
      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      assert.equal(model.agents.length, 3, '2 starts (bad lines dropped) + 1 orphan stop');
      const names = model.agents.map((a) => a.name);
      assert.deepEqual(names, ['reviewer', 'builder', 'ghost'], 'sorted newest first');
    });
  });

  it('joins start+stop into finished agents; unmatched start runs; orphan stop failed', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      writeFixtureLogs(dir);
      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      const byName = Object.fromEntries(model.agents.map((a) => [a.name, a]));

      assert.equal(byName.builder.status, 'done');
      assert.equal(byName.builder.durationMs, 300000);
      assert.equal(byName.builder.inputTokens, 1200);
      assert.equal(byName.builder.outputTokens, 800);
      assert.equal(byName.builder.model, 'sonnet');

      assert.equal(byName.reviewer.status, 'running');
      assert.equal(byName.reviewer.endedAt, null);

      assert.equal(byName.ghost.status, 'failed', 'FAILED_RE catches "error: crashed"');
      assert.equal(byName.ghost.startedAt, '2026-07-16T08:59:00.000Z', 'derived from ts - durationMs');
    });
  });

  it('does not reverse-time join a stop that happened before its start', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      fs.writeFileSync(
        path.join(dir, 'subagent-runs.jsonl'),
        `${JSON.stringify({ ts: '2026-07-16T10:00:00.000Z', agent_name: 'builder', model: 'sonnet', session_id: 's1' })}\n`
      );
      fs.writeFileSync(
        path.join(dir, 'agent-runs.jsonl'),
        `${JSON.stringify({ ts: '2026-07-16T09:00:00.000Z', agent: 'builder', sessionId: 's1', durationMs: 60000, status: 'ok' })}\n`
      );

      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      assert.equal(model.agents.length, 2);
      const started = model.agents.find((agent) => agent.model === 'sonnet');
      const orphan = model.agents.find((agent) => agent.model === null);
      assert.equal(started.status, 'running');
      assert.equal(started.endedAt, null);
      assert.equal(orphan.status, 'done');
      assert.equal(orphan.endedAt, '2026-07-16T09:00:00.000Z');
    });
  });

  it('renders an old unmatched start as muted stale, outside working and finished counts', async () => {
    const { readModel, buildSnapshotHtml } = await loadLib();
    await withTmpDir(async (dir) => {
      fs.writeFileSync(
        path.join(dir, 'subagent-runs.jsonl'),
        `${JSON.stringify({ ts: '2026-07-16T01:00:00.000Z', agent_name: 'builder', model: 'sonnet', session_id: 's-old' })}\n`
      );

      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      assert.equal(model.agents[0].status, 'stale');
      assert.equal(model.summary, 'No agents working right now.');

      const html = buildSnapshotHtml(model, { now: FIXED_NOW });
      assert.ok(html.includes('agent-card is-stale'));
      assert.ok(html.includes('<span class="badge st-stale">stale (no end recorded)</span>'));
      assert.ok(html.includes('🔄 0 working'));
      assert.ok(html.includes('✅ 0 finished'));
      assert.ok(!html.includes('🔄 1 working'));
      assert.ok(!html.includes('✅ 1 finished'));
    });
  });

  it('keeps current tasks scoped to concurrent sessions of the same persona', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      fs.mkdirSync(path.join(dir, 'mission-control'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'subagent-runs.jsonl'),
        [
          JSON.stringify({ ts: '2026-07-16T10:00:00.000Z', agent_name: 'reviewer', session_id: 's1' }),
          JSON.stringify({ ts: '2026-07-16T10:01:00.000Z', agent_name: 'reviewer', session_id: 's2' }),
        ].join('\n')
      );
      fs.writeFileSync(
        path.join(dir, 'mission-control', 'events.jsonl'),
        [
          JSON.stringify({ ts: '2026-07-16T10:02:00.000Z', actor: 'reviewer', session_id: 's1', subject: 'Audit auth' }),
          JSON.stringify({ ts: '2026-07-16T10:03:00.000Z', actor: 'reviewer', session_id: 's2', subject: 'Review billing' }),
        ].join('\n')
      );

      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      const taskBySession = Object.fromEntries(
        model.agents.map((agent) => [agent.sessionId, agent.currentTask])
      );
      assert.deepEqual(taskBySession, { s1: 'Audit auth', s2: 'Review billing' });
    });
  });

  it('decorates agents with persona, task count, current task, cost, and filter options', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      writeFixtureLogs(dir);
      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      const byName = Object.fromEntries(model.agents.map((agent) => [agent.name, agent]));

      assert.equal(byName.builder.emoji, '🔨');
      assert.equal(byName.builder.role, 'Builder');
      assert.equal(byName.builder.tasksCompleted, 1);
      assert.equal(byName.builder.currentTask, null);
      assert.equal(byName.builder.estCostUsd, 0.0156);
      assert.equal(byName.reviewer.emoji, '🔍');
      assert.equal(byName.reviewer.role, 'Reviewer');
      assert.deepEqual(model.filterOptions, {
        agents: ['builder', 'ghost', 'reviewer'],
        types: ['agent_done', 'agent_failed', 'agent_start', 'delegation', 'noise', 'task'],
        sessions: ['s0', 's1', 's2', 's9'],
      });
    });
  });

  it('promotes a recent permission event into awaitingPermission and the rendered banner', async () => {
    const { readModel, buildSnapshotHtml } = await loadLib();
    await withTmpDir(async (dir) => {
      writeFixtureLogs(dir);
      fs.appendFileSync(
        path.join(dir, 'mission-control', 'events.jsonl'),
        `\n${JSON.stringify({
          ts: '2026-07-16T11:58:00.000Z',
          type: 'permission',
          actor: 'reviewer',
          subject: 'Approve deploy',
          session_id: 's2',
          status: 'awaiting',
        })}`
      );

      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      assert.equal(model.agents.find((agent) => agent.name === 'reviewer').status, 'awaiting_permission');
      assert.deepEqual(model.awaitingPermission, [
        { session_id: 's2', subject: 'Approve deploy', ts: '2026-07-16T11:58:00.000Z' },
      ]);
      const html = buildSnapshotHtml(model, { now: FIXED_NOW });
      assert.ok(html.includes('Approve deploy'));
      assert.ok(html.includes('Switch to that session to approve.'));
    });
  });

  it('tasks: latest entry per id wins, subject beats title, sorted newest first', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      writeFixtureLogs(dir);
      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      assert.equal(model.tasks.length, 2);
      assert.deepEqual(
        model.tasks.map((t) => [t.task_id, t.title, t.status]),
        [
          ['t2', 'Write the docs', 'completed'],
          ['t1', 'Ship v6.8.0', 'in_progress'],
        ]
      );
    });
  });

  it('edges: only delegation/message/workflow with a from AND to', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      writeFixtureLogs(dir);
      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      assert.deepEqual(model.edges, [
        { from: 's1', to: 'builder', type: 'delegation', ts: '2026-07-16T10:01:00.000Z' },
        { from: 's9', to: 'no-timestamp', type: 'delegation', ts: null },
      ]);
    });
  });

  it('events: merged from all four logs, timestamped only, newest first; summary is exact', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      writeFixtureLogs(dir);
      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      // 2 starts + 2 stops + 3 tasks + 2 timestamped mission-control events
      assert.equal(model.events.length, 9, 'the ts-less events.jsonl line is excluded');
      const tsList = model.events.map((e) => Date.parse(e.ts));
      const sorted = [...tsList].sort((a, b) => b - a);
      assert.deepEqual(tsList, sorted, 'newest first');
      assert.ok(model.events.some((e) => e.text === 's1 delegated work to builder'));
      assert.equal(
        model.summary,
        '1 agent working — reviewer (1h). 2 tasks: 1 in progress, 1 done.'
      );
    });
  });

  it('duplicate-id events.jsonl lines render once (cowork+codex double-append guard)', async () => {
    const { readModel } = await loadLib();
    await withTmpDir(async (dir) => {
      fs.mkdirSync(path.join(dir, 'mission-control'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'mission-control', 'events.jsonl'),
        [
          JSON.stringify({ id: 'evt-1', ts: '2026-07-16T10:00:00.000Z', type: 'delegation', actor: 'reviewer', subject: 'audit auth', session_id: 's1' }),
          JSON.stringify({ id: 'evt-1', ts: '2026-07-16T10:00:00.000Z', type: 'delegation', actor: 'reviewer', subject: 'audit auth (dup)', session_id: 's1' }),
          JSON.stringify({ id: 'evt-2', ts: '2026-07-16T10:00:05.000Z', type: 'workflow', actor: 'builder', session_id: 's1' }),
          JSON.stringify({ ts: '2026-07-16T10:00:10.000Z', type: 'workflow', actor: 'qa', session_id: 's1' }),
        ].join('\n')
      );

      const model = await readModel({ baseDir: dir, now: FIXED_NOW });
      assert.equal(model.events.length, 3, 'first evt-1 kept, duplicate evt-1 dropped, evt-2 + id-less kept');
      assert.equal(model.edges.length, 3, 'evt-1 (deduped) + evt-2 + the id-less line all survive as edges');
      const delegationEvents = model.events.filter((e) => e.type === 'delegation');
      assert.equal(delegationEvents.length, 1, 'only one of the two identical-id delegation lines survives');
    });
  });

  it('feeds straight into buildSnapshotHtml deterministically', async () => {
    const { readModel, buildSnapshotHtml } = await loadLib();
    await withTmpDir(async (dir) => {
      writeFixtureLogs(dir);
      const modelA = await readModel({ baseDir: dir, now: FIXED_NOW });
      const modelB = await readModel({ baseDir: dir, now: FIXED_NOW });
      const htmlA = buildSnapshotHtml(modelA, { now: FIXED_NOW });
      const htmlB = buildSnapshotHtml(modelB, { now: FIXED_NOW });
      assert.equal(htmlA, htmlB);
      assert.ok(htmlA.includes('reviewer'));
      assert.ok(htmlA.includes('Write the docs'));
      assert.doesNotMatch(htmlA, /<(script|link|iframe|img)\b/i);
    });
  });
});
