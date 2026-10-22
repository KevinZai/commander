/**
 * history-reader.js
 * The Commander Console's History section (v7.4.0 Phase 2) — a day-bucketed
 * timeline over telemetry Commander ALREADY writes. **No new collector.**
 *
 * The spec's finding, re-verified before this file was written: everything a
 * v1 history needs is on disk under ~/.claude/commander/ today.
 *
 *   backbone  mission-control/metrics.jsonl  — the durable per-day per-app
 *             rollup {date, source_app, cost_usd, agents_dispatched,
 *             tasks_completed, tool_failures, sessions}. It survives the
 *             detail logs' 10MB rotation, so it is the only source that can
 *             carry the long horizon, and it is the ONLY source of cost.
 *   detail    skill-runs.jsonl (which skills ran), tasks.jsonl (task events),
 *             agent-runs.jsonl + subagent-runs.jsonl (dispatches), and the
 *             session stubs in sessions/ — all within a 30-day window.
 *
 * What is NOT claimed, because it does not exist: per-message content, session
 * summaries, or any pre-2026-05-23 rollup. A day that has a backbone row but no
 * detail rows is honest — the detail aged out; the rollup did not.
 *
 * ─── Session stubs are counted by FILENAME only ────────────────────────────
 * sessions/ holds ~16k `YYYY-MM-DD-<hash>.json` stubs on a well-used machine.
 * This reader lists the directory and derives the day from the filename; it
 * never opens one. That is both the cheap path (one readdir, no 16k reads) and
 * the private one — a stub's contents never enter the model, so they cannot
 * reach a rendered surface.
 *
 * ─── Fail-open PER SOURCE ──────────────────────────────────────────────────
 * Same contract as console-model.js one level up: a source that throws yields
 * an `errors` entry naming it and the rest of the timeline still renders. A
 * malformed LINE is simply skipped (JSON.parse tolerance), which is not an
 * error — half-written trailing lines are normal in an append-only log.
 *
 * Bounded reads: only the trailing MAX_JSONL_BYTES of a file are read and only
 * its last MAX_JSONL_LINES non-empty lines are parsed, following the same
 * convention as safety-snapshot.js / top-skills.js (each reader in this tree
 * keeps its own small copy rather than importing a five-line helper).
 *
 * Deterministic given (files, now). Zero deps beyond node builtins, ESM,
 * read-only. Core free forever — no license check, no tier gating.
 */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { redactedSample } from './safety-snapshot.js';

const MAX_JSONL_LINES = 20000;
const MAX_JSONL_BYTES = 8 * 1024 * 1024;
const DEFAULT_WINDOW_DAYS = 30;
const TOP_SKILLS_PER_DAY = 3;
const TOP_SKILLS_WINDOW = 10;
const SKILL_NAME_MAX = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
// sessions/ stubs are named `YYYY-MM-DD-<hash>.json`; anything else in there
// (e.g. active-cost-default.json) is not a session and is skipped.
const SESSION_FILE = /^(\d{4}-\d{2}-\d{2})-[^/]+\.json$/;

function defaultBaseDir() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.claude', 'commander');
}

function toMs(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// A day key is always UTC, for the same reason usage-snapshot.js treats
// metrics.jsonl `date` rows as UTC midnight: the backbone is already written in
// UTC days, and mixing a local-time bucket for the detail sources would put the
// same event in two different rows depending on the machine's timezone.
function dayKeyFromMs(ms) {
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
}

function dayKeyToMs(key) {
  return DAY_KEY.test(key) ? Date.parse(`${key}T00:00:00.000Z`) : null;
}

function num(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Read at most the trailing maxBytes. The leading line of that window may be a
// partial record; JSON.parse tolerance below drops it, while a record starting
// exactly on the boundary survives.
async function readTailText(filePath, maxBytes = MAX_JSONL_BYTES) {
  let handle;
  try {
    handle = await fsp.open(filePath, 'r');
  } catch {
    return '';
  }
  try {
    const { size } = await handle.stat();
    if (size <= maxBytes) return await handle.readFile('utf8');
    const buf = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buf, 0, maxBytes, size - maxBytes);
    return buf.toString('utf8', 0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function readJsonl(filePath, maxLines = MAX_JSONL_LINES) {
  const raw = await readTailText(filePath);
  if (!raw) return [];

  const lines = raw.split('\n').filter((line) => line.trim());
  const tail = lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;

  const entries = [];
  for (const line of tail) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) entries.push(parsed);
    } catch {
      continue;
    }
  }
  return entries;
}

// Run one source, converting a throw into an `errors` entry rather than losing
// the whole timeline. A MISSING file is not a failure — readJsonl returns [].
async function source(name, read, errors) {
  try {
    return await read();
  } catch (error) {
    errors.push({ source: name, message: error && error.message ? error.message : String(error) });
    return null;
  }
}

function emptyDay(date) {
  return {
    date,
    costUsd: 0,
    agentsDispatched: 0,
    tasksCompleted: 0,
    toolFailures: 0,
    sessions: 0,
    agentRuns: 0,
    taskEvents: 0,
    sessionFiles: 0,
    skills: [],
  };
}

function skillName(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  // Route through safety-snapshot.js's redactedSample so a hostile/pasted
  // skill name can't leak a secret or the machine's username the same way an
  // error sample already couldn't (CC-1397) — skill-runs.jsonl's `skill`
  // field is free text and was never scrubbed before this.
  const redacted = redactedSample(value.trim());
  if (!redacted || redacted === '(no error text)') return null;
  return redacted.length > SKILL_NAME_MAX ? `${redacted.slice(0, SKILL_NAME_MAX - 1)}…` : redacted;
}

/**
 * Read the History section model.
 *
 * @param {object} [opts]
 * @param {string} [opts.baseDir]  telemetry root (default ~/.claude/commander)
 * @param {string|number|Date} [opts.now]  pinned clock; defaults to Date.now()
 * @param {number} [opts.windowDays]  detail window, default 30
 * @returns {Promise<object>} {days, totals, backbone, topSkills, windowDays,
 *   hasAnySourceRow, dataThroughMs, errors, generatedAt}
 */
async function readHistoryModel({ baseDir, now, windowDays = DEFAULT_WINDOW_DAYS } = {}) {
  const nowMs = toMs(now) ?? Date.now();
  const errors = [];
  const span = Number.isFinite(windowDays) && windowDays > 0 ? Math.round(windowDays) : DEFAULT_WINDOW_DAYS;
  // Inclusive of today, so a 30-day window is [today-29 … today].
  const cutoffMs = Date.parse(`${dayKeyFromMs(nowMs)}T00:00:00.000Z`) - (span - 1) * DAY_MS;

  const root = baseDir || defaultBaseDir();
  const filePath = (...parts) => path.join(root, ...parts);

  const [metricsRows, skillRows, taskRows, agentRows, subagentRows, sessionNames] = await Promise.all([
    source('metrics', () => readJsonl(filePath('mission-control', 'metrics.jsonl')), errors),
    source('skill-runs', () => readJsonl(filePath('skill-runs.jsonl')), errors),
    source('tasks', () => readJsonl(filePath('tasks.jsonl')), errors),
    source('agent-runs', () => readJsonl(filePath('agent-runs.jsonl')), errors),
    source('subagent-runs', () => readJsonl(filePath('subagent-runs.jsonl')), errors),
    source(
      'sessions',
      async () => {
        // The path is resolved OUTSIDE the readdir guard on purpose: a missing
        // sessions/ dir is a zero-state (swallowed), but an unusable baseDir is
        // a real failure and must reach `errors` like every other source.
        const dir = filePath('sessions');
        try {
          return await fsp.readdir(dir);
        } catch {
          return []; // no sessions dir yet — a zero-state, not a failure
        }
      },
      errors
    ),
  ]);

  const days = new Map();
  const skillsPerDay = new Map();
  let dataThroughMs = null;
  let hasAnySourceRow = false;

  const bump = (key) => {
    if (!DAY_KEY.test(key)) return null;
    const ms = dayKeyToMs(key);
    if (ms === null || ms < cutoffMs) return null;
    let day = days.get(key);
    if (!day) {
      day = emptyDay(key);
      days.set(key, day);
    }
    return day;
  };

  // Metrics rows only count as telemetry (for dataThroughMs/hasAnySourceRow)
  // when they carry ACTUAL activity. getMetrics() gap-fills the window with
  // all-zero rows on every read (including "today"), so an unfiltered scan
  // would stamp a dead install as fresh-as-of-now and the >24h stale warning
  // could never fire — the exact failure the banner exists to expose. Mirrors
  // usage-snapshot.js's metricsRowHasActivity (see that file's comment).
  const metricsRowHasActivity = (row) =>
    row &&
    typeof row === 'object' &&
    ['cost_usd', 'agents_dispatched', 'tasks_completed', 'tool_failures', 'sessions'].some(
      (field) => Number.isFinite(row[field]) && row[field] > 0
    );

  // ── Backbone. Also carries the FULL horizon (not window-clipped) so the
  // renderer can say how far the retained rollups actually go back — every
  // row (including all-zero gap-fill rows) still counts toward that horizon
  // and toward per-day chart accumulation below; only the freshness stamps
  // are gated on real activity.
  const backboneDays = new Set();
  for (const row of metricsRows || []) {
    const key = typeof row.date === 'string' ? row.date.trim() : '';
    if (!DAY_KEY.test(key)) continue;
    backboneDays.add(key);
    if (metricsRowHasActivity(row)) {
      hasAnySourceRow = true;
      const ms = dayKeyToMs(key);
      if (ms !== null && (dataThroughMs === null || ms > dataThroughMs)) dataThroughMs = ms;
    }

    const day = bump(key);
    if (!day) continue;
    day.costUsd += num(row.cost_usd);
    day.agentsDispatched += num(row.agents_dispatched);
    day.tasksCompleted += num(row.tasks_completed);
    day.toolFailures += num(row.tool_failures);
    day.sessions += num(row.sessions);
  }

  // ── Detail. Every one of these carries a real ISO `ts`.
  const stampDetail = (rows, apply) => {
    for (const row of rows || []) {
      const ms = toMs(row.ts);
      if (ms === null) continue;
      hasAnySourceRow = true;
      if (dataThroughMs === null || ms > dataThroughMs) dataThroughMs = ms;
      const day = bump(dayKeyFromMs(ms));
      if (day) apply(day, row);
    }
  };

  stampDetail(skillRows, (day, row) => {
    const skill = skillName(row.skill);
    if (!skill) return;
    let perDay = skillsPerDay.get(day.date);
    if (!perDay) {
      perDay = new Map();
      skillsPerDay.set(day.date, perDay);
    }
    perDay.set(skill, (perDay.get(skill) || 0) + 1);
  });
  stampDetail(taskRows, (day) => {
    day.taskEvents += 1;
  });
  stampDetail(agentRows, (day) => {
    day.agentRuns += 1;
  });
  stampDetail(subagentRows, (day) => {
    day.agentRuns += 1;
  });

  for (const name of sessionNames || []) {
    const match = typeof name === 'string' ? SESSION_FILE.exec(name) : null;
    if (!match) continue;
    hasAnySourceRow = true;
    const day = bump(match[1]);
    if (day) day.sessionFiles += 1;
  }

  // Top skills: per day (for the row) and across the window (for the summary).
  const windowSkills = new Map();
  for (const [date, perDay] of skillsPerDay) {
    const day = days.get(date);
    const ranked = [...perDay.entries()]
      .map(([skill, runs]) => ({ skill, runs }))
      .sort((left, right) => right.runs - left.runs || left.skill.localeCompare(right.skill));
    if (day) day.skills = ranked.slice(0, TOP_SKILLS_PER_DAY);
    for (const { skill, runs } of ranked) {
      windowSkills.set(skill, (windowSkills.get(skill) || 0) + runs);
    }
  }

  const ordered = [...days.values()].sort((left, right) => right.date.localeCompare(left.date));

  const totals = {
    costUsd: 0,
    agentsDispatched: 0,
    tasksCompleted: 0,
    toolFailures: 0,
    sessions: 0,
    agentRuns: 0,
    skillRuns: [...windowSkills.values()].reduce((sum, runs) => sum + runs, 0),
    activeDays: ordered.length,
  };
  for (const day of ordered) {
    totals.costUsd += day.costUsd;
    totals.agentsDispatched += day.agentsDispatched;
    totals.tasksCompleted += day.tasksCompleted;
    totals.toolFailures += day.toolFailures;
    totals.sessions += day.sessions;
    totals.agentRuns += day.agentRuns;
  }

  const backboneSorted = [...backboneDays].sort();

  return {
    days: ordered,
    totals,
    topSkills: [...windowSkills.entries()]
      .map(([skill, runs]) => ({ skill, runs }))
      .sort((left, right) => right.runs - left.runs || left.skill.localeCompare(right.skill))
      .slice(0, TOP_SKILLS_WINDOW),
    backbone: {
      firstDate: backboneSorted[0] || null,
      lastDate: backboneSorted[backboneSorted.length - 1] || null,
      dayCount: backboneSorted.length,
    },
    windowDays: span,
    hasAnySourceRow,
    dataThroughMs,
    errors,
    generatedAt: new Date(nowMs).toISOString(),
  };
}

export { readHistoryModel };
