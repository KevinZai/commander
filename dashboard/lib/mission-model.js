/**
 * mission-model.js
 * Unified read model for Commander Mission Control.
 *
 * Merges the plugin hook logs under ~/.claude/commander/ into one
 * dashboard-ready snapshot: agents (start/stop joined, PLUS derived
 * roster rows synthesized from delegation events for sources that never
 * get a real start record — see deriveRosterFromDelegations below),
 * tasks (latest state per id), delegation edges, a merged event feed,
 * suggestions (latest-status-wins per id — see commander/cowork-plugin/
 * lib/suggestions.js for the writer side), metrics (daily cost/agents/
 * tasks/failures rollup — see commander/cowork-plugin/lib/metrics.js),
 * topSkills (see commander/cowork-plugin/lib/top-skills.js), and a
 * plain-English summary a non-coder can read.
 *
 * Item 1 — Codex Desktop's hook surface drops SubagentStart/
 * SubagentStop (see scripts/build-codex.js
 * HOOK_EVENTS_DROPPED_BY_BUILD), so subagent-runs.jsonl/agent-runs.jsonl
 * — the files joinAgents() below reads — are ALWAYS claude-code. Codex
 * work would otherwise appear in the Live Feed (events.jsonl, written
 * from the PostToolUse hook Codex keeps) but never the roster. To close
 * that gap, deriveRosterFromDelegations() synthesizes roster rows from
 * events.jsonl's `delegation`-type entries for any (sourceApp, name,
 * sessionId) combo that has no real start record — marked `derived:
 * true` so the UI can show them dimmed/unverified, since they carry no
 * token/cost data (a later completion signal is unavailable for these,
 * so — like real unjoined starts — they age out by RUNNING_WINDOW_MS
 * into 'stale').
 *
 * Item 6 — an in-memory TTL cache (default 2s, matching the dashboard's
 * POLL_MS) keyed by baseDir avoids N concurrent pollers each re-reading
 * every file; metrics/topSkills get a longer 30s TTL since they don't
 * change per-poll (and, for metrics, so a 2s poll doesn't append 30
 * duplicate ccusage-priced rows a minute). JSONL reads are bounded to
 * the most recent MAX_JSONL_LINES lines per file — a higher-volume log
 * beyond that cap silently undercounts older activity in the window;
 * rotated archives are never read.
 *
 * Zero dependencies, ESM, read-only, fail-open: a missing file yields
 * an empty slice, a bad JSONL line is skipped, any source erroring
 * (including a missing ccusage binary or a missing claude-mem db)
 * yields zero-state for that slice, never a 500.
 * Core free forever — no license check, no tier gating.
 */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { getMetrics } from '../../commander/cowork-plugin/lib/metrics.js';
import { readTopSkills } from '../../commander/cowork-plugin/lib/top-skills.js';

const AGENT_CAP = 200;
const TASK_CAP = 100;
const EVENT_CAP = 100;
const SUGGESTION_CAP = 50;
const MAX_JSONL_LINES = 5000; // Item 6 bounded-scan cap, per source file
const JOIN_WINDOW_MS = 24 * 60 * 60 * 1000;
const RUNNING_WINDOW_MS = 6 * 60 * 60 * 1000;
const PERMISSION_WINDOW_MS = 15 * 60 * 1000;
const MODEL_CACHE_TTL_MS = 2000; // matches dashboard/public/mission-control.js's POLL_MS
const SLOW_FIELD_CACHE_TTL_MS = 30_000; // metrics/topSkills — Item 6
const EDGE_TYPES = new Set(['delegation', 'message', 'workflow']);
const FAILED_RE = /fail|error|abort|cancel|timeout|crash/i;
const DEFAULT_PERSONA = Object.freeze({ emoji: '🤖', role: 'Agent' });
const PERSONA_MAP = Object.freeze({
  architect: { emoji: '🏗️', role: 'Architect' },
  reviewer: { emoji: '🔍', role: 'Reviewer' },
  builder: { emoji: '🔨', role: 'Builder' },
  'security-auditor': { emoji: '🔐', role: 'Security Auditor' },
  debugger: { emoji: '🐛', role: 'Debugger' },
  designer: { emoji: '🎨', role: 'Designer' },
  'qa-engineer': { emoji: '🧪', role: 'QA Engineer' },
  'devops-engineer': { emoji: '🚀', role: 'DevOps Engineer' },
  'data-analyst': { emoji: '📊', role: 'Data Analyst' },
  'content-strategist': { emoji: '✍️', role: 'Content Strategist' },
  'product-manager': { emoji: '🎯', role: 'Product Manager' },
  'performance-engineer': { emoji: '⚡', role: 'Performance Engineer' },
  researcher: { emoji: '🔬', role: 'Researcher' },
  'technical-writer': { emoji: '📝', role: 'Technical Writer' },
  'fleet-worker': { emoji: '⚙️', role: 'Fleet Worker' },
  'typescript-reviewer': { emoji: '🔍', role: 'TypeScript Reviewer' },
  'python-reviewer': { emoji: '🔍', role: 'Python Reviewer' },
  'go-reviewer': { emoji: '🔍', role: 'Go Reviewer' },
  'rust-reviewer': { emoji: '🔍', role: 'Rust Reviewer' },
  'java-reviewer': { emoji: '🔍', role: 'Java Reviewer' },
  'kotlin-reviewer': { emoji: '🔍', role: 'Kotlin Reviewer' },
  'csharp-reviewer': { emoji: '🔍', role: 'C# Reviewer' },
});
// Per-sourceApp persona overrides, keyed by sourceApp then agent name.
// PERSONA_MAP above stays the persona table for sourceApp 'claude-code'
// only; other sources fall back to DEFAULT_PERSONA until they earn an
// entry here.
const SOURCE_PERSONAS = Object.freeze({});

function personaFor(sourceApp, name) {
  const table = Object.hasOwn(SOURCE_PERSONAS, sourceApp) ? SOURCE_PERSONAS[sourceApp] : null;
  if (table && Object.hasOwn(table, name)) return table[name];
  if (sourceApp === 'claude-code' && Object.hasOwn(PERSONA_MAP, name)) return PERSONA_MAP[name];
  return DEFAULT_PERSONA;
}

function defaultBaseDir() {
  return path.join(os.homedir(), '.claude', 'commander');
}

function parseTs(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// Item 6 bounded-scan discipline: only the most recent maxLines
// non-empty lines are parsed — a file that has grown past the cap
// silently undercounts older entries in this file (its rotated
// archives, e.g. events.2026-01-01.jsonl, are never read at all).
async function readJsonl(filePath, maxLines = MAX_JSONL_LINES) {
  let raw;
  try {
    raw = await fsp.readFile(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = raw.split('\n').filter((line) => line.trim());
  const tail = lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;

  const entries = [];
  for (const line of tail) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        entries.push(parsed);
      }
    } catch {
      continue;
    }
  }
  return entries;
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${Math.max(seconds, 1)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function stopStatus(status) {
  return FAILED_RE.test(String(status || '')) ? 'failed' : 'done';
}

function taskBucket(status) {
  const value = String(status || '').toLowerCase();
  if (/(progress|active|started|running|working|doing)/.test(value)) return 'inProgress';
  if (/(done|complete|closed|resolved|finished|shipped|merged)/.test(value)) return 'done';
  return 'waiting';
}

function safeTokens(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function estimatedCostUsd(inputTokens, outputTokens) {
  const input = safeTokens(inputTokens);
  const output = safeTokens(outputTokens);
  if (input === 0 && output === 0) return null;
  return Number(((input * 3 + output * 15) / 1_000_000).toFixed(4));
}

function joinAgents(starts, stops, nowMs) {
  const stopPool = stops.map((record) => ({
    record,
    ms: parseTs(record.ts),
    matched: false,
  }));

  const sortedStarts = [...starts].sort(
    (left, right) => (parseTs(left.ts) ?? 0) - (parseTs(right.ts) ?? 0)
  );

  const agents = [];

  for (const start of sortedStarts) {
    const startMs = parseTs(start.ts);
    const name = start.agent_name ?? null;
    const sessionId = start.session_id ?? null;

    let best = null;
    if (startMs !== null) {
      for (const candidate of stopPool) {
        if (candidate.matched || candidate.ms === null) continue;
        if ((candidate.record.sessionId ?? null) !== sessionId) continue;
        if ((candidate.record.agent ?? null) !== name) continue;
        const delta = candidate.ms - startMs;
        if (delta < 0 || delta > JOIN_WINDOW_MS) continue;
        if (!best || delta < best.delta) best = { candidate, delta };
      }
    }

    if (best) {
      best.candidate.matched = true;
      const stop = best.candidate.record;
      agents.push({
        name: name || stop.agent || 'unknown',
        sourceApp: start.source_app || 'claude-code',
        model: start.model ?? null,
        sessionId,
        startedAt: start.ts ?? null,
        endedAt: stop.ts ?? null,
        durationMs: Number.isFinite(stop.durationMs) ? stop.durationMs : null,
        inputTokens: safeTokens(stop.inputTokens),
        outputTokens: safeTokens(stop.outputTokens),
        status: stopStatus(stop.status),
        refMs: best.candidate.ms ?? startMs ?? 0,
      });
    } else {
      // A start with no stop only counts as running for RUNNING_WINDOW_MS;
      // older orphans are historical noise (pre-Mission-Control logs have no stop records).
      const ageMs = startMs !== null ? nowMs - startMs : Infinity;
      agents.push({
        name: name || 'unknown',
        sourceApp: start.source_app || 'claude-code',
        model: start.model ?? null,
        sessionId,
        startedAt: start.ts ?? null,
        endedAt: null,
        durationMs: null,
        inputTokens: 0,
        outputTokens: 0,
        status: ageMs <= RUNNING_WINDOW_MS ? 'running' : 'stale',
        refMs: startMs ?? 0,
      });
    }
  }

  for (const orphan of stopPool) {
    if (orphan.matched) continue;
    const stop = orphan.record;
    const durationMs = Number.isFinite(stop.durationMs) ? stop.durationMs : null;
    const startedAt =
      orphan.ms !== null && durationMs !== null && durationMs > 0
        ? new Date(orphan.ms - durationMs).toISOString()
        : null;
    agents.push({
      name: stop.agent || 'unknown',
      // No start record to consult for an orphan stop — agent-runs.jsonl
      // (like the other two legacy log files) is always claude-code.
      sourceApp: 'claude-code',
      model: null,
      sessionId: stop.sessionId ?? null,
      startedAt,
      endedAt: stop.ts ?? null,
      durationMs,
      inputTokens: safeTokens(stop.inputTokens),
      outputTokens: safeTokens(stop.outputTokens),
      status: stopStatus(stop.status),
      refMs: orphan.ms ?? 0,
    });
  }

  agents.sort((left, right) => right.refMs - left.refMs);
  return agents.slice(0, AGENT_CAP).map(({ refMs, ...agent }) => agent);
}

// Item 1 — the roster's headline gap: joinAgents() above only ever sees
// claude-code (subagent-runs.jsonl/agent-runs.jsonl are claude-code-only
// legacy files — SubagentStart/SubagentStop are dropped by the Codex
// build). Synthesize a roster row from events.jsonl's `delegation`-type
// entries for any (sourceApp, name, sessionId) combo that has no real
// start record — so Codex (and any future non-claude-code source) shows
// up in the roster, not just the Live Feed. If multiple delegation
// events share a combo, the most recent one represents it (freshest
// signal for the running/stale status window below). A real start
// record for the same combo always wins — this never creates a
// duplicate.
function deriveRosterFromDelegations(eventEntries, existingAgents, nowMs) {
  const existingKeys = new Set(
    existingAgents.map(
      (agent) => `${agent.sourceApp || 'claude-code'}:${agent.name}:${agent.sessionId ?? ''}`
    )
  );

  const latestByCombo = new Map();
  for (const entry of eventEntries) {
    if (entry.type !== 'delegation') continue;
    const actor = typeof entry.actor === 'string' && entry.actor.trim() ? entry.actor.trim() : null;
    if (!actor) continue;
    const sourceApp = entry.source_app || 'claude-code';
    const sessionId = entry.session_id ?? entry.sessionId ?? null;
    const comboKey = `${sourceApp}:${actor}:${sessionId ?? ''}`;
    if (existingKeys.has(comboKey)) continue; // a real row already covers this combo

    const ms = parseTs(entry.ts);
    if (ms === null) continue;
    const current = latestByCombo.get(comboKey);
    if (!current || ms > current.ms) {
      latestByCombo.set(comboKey, { ms, entry, sourceApp, actor, sessionId });
    }
  }

  const derived = [];
  for (const { ms, entry, sourceApp, actor, sessionId } of latestByCombo.values()) {
    const ageMs = nowMs - ms;
    derived.push({
      name: actor,
      sourceApp,
      model: null,
      sessionId,
      startedAt: entry.ts ?? null,
      endedAt: null,
      durationMs: null,
      inputTokens: 0,
      outputTokens: 0,
      status: ageMs >= 0 && ageMs <= RUNNING_WINDOW_MS ? 'running' : 'stale',
      derived: true,
    });
  }
  return derived;
}

function latestTasks(taskEntries) {
  const byId = new Map();

  for (const entry of taskEntries) {
    const id = entry.task_id ?? entry.id ?? null;
    if (id === null || id === undefined) continue;
    const key = String(id);
    const ms = parseTs(entry.ts) ?? 0;
    const existing = byId.get(key);
    if (existing && ms < existing.ms) continue;
    const prior = existing ? existing.task : null;
    byId.set(key, {
      ms,
      task: {
        task_id: key,
        title: entry.subject || entry.title || (prior ? prior.title : key),
        status: entry.status ?? null,
        ts: entry.ts ?? null,
        sessionId:
          entry.session_id ?? entry.sessionId ?? (prior ? prior.sessionId : null),
      },
    });
  }

  return [...byId.values()]
    .sort((left, right) => right.ms - left.ms)
    .slice(0, TASK_CAP)
    .map((wrapped) => wrapped.task);
}

// suggestions.jsonl merge: same latest-ts-wins-by-id pattern as
// latestTasks above. A later status-only line (no idea/evidence/
// proposed_ticket) still wins on status; the earlier creation line's
// content persists forward. Mirrors commander/cowork-plugin/lib/
// suggestions.js's own readSuggestions() (deliberately duplicated —
// this file has no dependency on the plugin's lib/).
function latestSuggestions(suggestionEntries) {
  const byId = new Map();

  for (const entry of suggestionEntries) {
    const id = entry.id;
    // Scalar ids only — an object/array id coerces to "[object Object]"/"1,2",
    // silently merging unrelated suggestions under one key.
    if (typeof id !== 'string' && !Number.isFinite(id)) continue;
    const key = String(id).trim();
    if (!key) continue;
    const ms = parseTs(entry.ts) ?? 0;
    const existing = byId.get(key);
    if (existing && ms < existing.ms) continue;
    const prior = existing ? existing.suggestion : null;
    byId.set(key, {
      ms,
      suggestion: {
        id: key,
        ts: entry.ts ?? null,
        from: entry.from ?? (prior ? prior.from : null) ?? null,
        source_app: entry.source_app ?? (prior ? prior.source_app : null) ?? 'claude-code',
        idea: entry.idea ?? (prior ? prior.idea : null) ?? null,
        evidence: entry.evidence ?? (prior ? prior.evidence : null) ?? null,
        proposed_ticket: entry.proposed_ticket ?? (prior ? prior.proposed_ticket : null) ?? null,
        status: entry.status ?? (prior ? prior.status : null) ?? 'new',
        promoted_ticket: entry.promoted_ticket ?? (prior ? prior.promoted_ticket : null) ?? null,
        by: entry.by ?? (prior ? prior.by : null) ?? null,
      },
    });
  }

  return [...byId.values()]
    .sort((left, right) => right.ms - left.ms)
    .slice(0, SUGGESTION_CAP)
    .map((wrapped) => wrapped.suggestion);
}

function indexNewestEvents(eventEntries) {
  const latestByActor = new Map();
  const latestBySession = new Map();
  for (const [order, entry] of eventEntries.entries()) {
    const ms = parseTs(entry.ts);
    if (ms === null) continue;
    const candidate = { entry, ms, order };
    if (typeof entry.actor === 'string' && entry.actor) {
      const existing = latestByActor.get(entry.actor);
      if (!existing || ms > existing.ms || (ms === existing.ms && order > existing.order)) {
        latestByActor.set(entry.actor, candidate);
      }
    }
    const sessionId = entry.session_id ?? entry.sessionId ?? null;
    if (sessionId !== null && sessionId !== undefined) {
      const key = String(sessionId);
      const existing = latestBySession.get(key);
      if (!existing || ms > existing.ms || (ms === existing.ms && order > existing.order)) {
        latestBySession.set(key, candidate);
      }
    }
  }

  return { latestByActor, latestBySession };
}

function decorateAgents(agents, stops, eventIndex) {
  // agent-runs.jsonl is always claude-code (same legacy-file rule as
  // mergeEvents) — there's no per-record source_app to key off here.
  const completedByKey = new Map();
  for (const stop of stops) {
    if (!stop.agent || stopStatus(stop.status) !== 'done') continue;
    const key = `claude-code:${stop.agent}`;
    completedByKey.set(key, (completedByKey.get(key) || 0) + 1);
  }

  return agents.map((agent) => {
    const sourceApp = agent.sourceApp || 'claude-code';
    // sourceApp:name — so two sources can't collide on a shared agent name.
    const key = `${sourceApp}:${agent.name}`;
    const persona = personaFor(sourceApp, agent.name);
    const actorMatch = eventIndex.latestByActor.get(agent.name) || null;
    const sessionMatch =
      agent.sessionId === null || agent.sessionId === undefined
        ? null
        : eventIndex.latestBySession.get(String(agent.sessionId)) || null;
    const taskMatch = sessionMatch || actorMatch;

    return {
      ...agent,
      key,
      emoji: persona.emoji,
      role: persona.role,
      currentTask:
        taskMatch && typeof taskMatch.entry.subject === 'string'
          ? taskMatch.entry.subject
          : null,
      tasksCompleted: completedByKey.get(key) || 0,
      estCostUsd: estimatedCostUsd(agent.inputTokens, agent.outputTokens),
    };
  });
}

function applyAwaitingPermissions(agents, latestBySession, nowMs) {
  const awaitingPermission = [];
  const awaitingSessions = new Set();
  for (const [sessionId, latest] of latestBySession) {
    const ageMs = nowMs - latest.ms;
    if (
      latest.entry.type !== 'permission' ||
      latest.entry.status !== 'awaiting' ||
      ageMs < 0 ||
      ageMs >= PERMISSION_WINDOW_MS
    ) {
      continue;
    }
    awaitingSessions.add(sessionId);
    awaitingPermission.push({
      session_id: sessionId,
      subject: latest.entry.subject ?? null,
      ts: latest.entry.ts ?? null,
    });
  }

  awaitingPermission.sort((left, right) => (parseTs(right.ts) ?? 0) - (parseTs(left.ts) ?? 0));
  return {
    agents: agents.map((agent) =>
      agent.status === 'running' && awaitingSessions.has(String(agent.sessionId))
        ? { ...agent, status: 'awaiting_permission' }
        : agent
    ),
    awaitingPermission,
  };
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value))].sort();
}

// Cowork and Codex mirrors can both append to the same events.jsonl on a
// shared machine (double-append guard) — keep the first occurrence of any
// entry that carries an `id`, drop later duplicates. Entries without an id
// are unaffected.
function dedupeById(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    const id = entry && typeof entry === 'object' ? entry.id : undefined;
    if (id !== undefined && id !== null) {
      const key = String(id);
      if (seen.has(key)) continue;
      seen.add(key);
    }
    result.push(entry);
  }
  return result;
}

function buildFilterOptions({ starts, stops, taskEntries, eventEntries }) {
  const types = [];
  if (starts.length > 0) types.push('agent_start');
  for (const stop of stops) {
    types.push(stopStatus(stop.status) === 'failed' ? 'agent_failed' : 'agent_done');
  }
  if (taskEntries.length > 0) types.push('task');
  for (const entry of eventEntries) types.push(entry.type || 'event');

  const allEntries = [...starts, ...stops, ...taskEntries, ...eventEntries];
  return {
    agents: uniqueSorted([
      ...starts.map((entry) => entry.agent_name),
      ...stops.map((entry) => entry.agent),
    ]),
    types: uniqueSorted(types),
    sessions: uniqueSorted(
      allEntries.map((entry) => entry.session_id ?? entry.sessionId ?? null)
    ),
    // subagent-runs/agent-runs/tasks are always 'claude-code' (Item 1) —
    // only events.jsonl can carry a different source_app — but the option
    // list always offers 'claude-code' even with zero data.
    sourceApps: uniqueSorted(['claude-code', ...eventEntries.map((entry) => entry.source_app)]),
  };
}

function toEdges(eventEntries) {
  const edges = [];
  for (const entry of eventEntries) {
    if (!EDGE_TYPES.has(entry.type)) continue;
    const from = entry.from || entry.session_id || entry.sessionId || null;
    const to = entry.to || entry.actor || entry.agent || null;
    if (!from || !to) continue;
    edges.push({ from, to, type: entry.type, ts: entry.ts ?? null });
  }
  return edges;
}

function shortId(value) {
  const str = String(value);
  return str.length > 10 ? `${str.slice(0, 8)}…` : str;
}

function describeMissionEvent(entry) {
  if (typeof entry.text === 'string' && entry.text) return entry.text;
  const from = entry.from || entry.session_id || entry.sessionId || null;
  const fromLabel = from ? `Session ${shortId(from)}` : 'A session';
  const to = entry.to || entry.actor || entry.agent || 'an agent';
  const subject =
    typeof entry.subject === 'string' && entry.subject ? ` — "${entry.subject}"` : '';
  if (entry.type === 'delegation') return `${fromLabel} delegated work to ${to}${subject}`;
  if (entry.type === 'message') return `${fromLabel} sent a message to ${to}${subject}`;
  if (entry.type === 'workflow')
    return `${fromLabel} handed a workflow step to ${to}${subject}`;
  if (entry.type === 'task') return `${fromLabel} updated a task${subject}`;
  return `${entry.type || 'event'} from ${fromLabel}`;
}

function prettyTaskStatus(status) {
  const bucket = taskBucket(status);
  if (bucket === 'inProgress') return 'in progress';
  if (bucket === 'done') return 'done';
  return 'waiting';
}

function mergeEvents({ starts, stops, taskEntries, eventEntries }) {
  const merged = [];

  for (const start of starts) {
    const name = start.agent_name || 'An agent';
    merged.push({
      ts: start.ts ?? null,
      source: 'subagent-runs',
      type: 'agent_start',
      actor: start.agent_name || 'unknown',
      sourceApp: 'claude-code',
      text: `${name} started working${start.model ? ` (${start.model})` : ''}`,
    });
  }

  for (const stop of stops) {
    const name = stop.agent || 'An agent';
    const failed = stopStatus(stop.status) === 'failed';
    const took =
      Number.isFinite(stop.durationMs) && stop.durationMs > 0
        ? ` after ${formatDuration(stop.durationMs)}`
        : '';
    merged.push({
      ts: stop.ts ?? null,
      source: 'agent-runs',
      type: failed ? 'agent_failed' : 'agent_done',
      actor: stop.agent || 'unknown',
      sourceApp: 'claude-code',
      text: failed ? `${name} hit a problem${took}` : `${name} finished${took}`,
    });
  }

  for (const entry of taskEntries) {
    const id = entry.task_id ?? entry.id ?? null;
    const title = entry.subject || entry.title || (id !== null ? `Task ${id}` : 'A task');
    merged.push({
      ts: entry.ts ?? null,
      source: 'tasks',
      type: 'task',
      actor: id !== null ? String(id) : 'task',
      sourceApp: 'claude-code',
      text: entry.status ? `"${title}" is ${prettyTaskStatus(entry.status)}` : `"${title}" was updated`,
    });
  }

  for (const entry of eventEntries) {
    merged.push({
      ts: entry.ts ?? null,
      source: 'mission-control',
      type: entry.type || 'event',
      actor: entry.actor || entry.to || entry.from || 'system',
      sourceApp: entry.source_app || 'claude-code',
      text: describeMissionEvent(entry),
    });
  }

  return merged
    .filter((event) => parseTs(event.ts) !== null)
    .sort((left, right) => (parseTs(right.ts) ?? 0) - (parseTs(left.ts) ?? 0))
    .slice(0, EVENT_CAP);
}

function summarize(agents, tasks, nowMs, awaitingPermission, suggestions = []) {
  const newSuggestionCount = suggestions.filter((suggestion) => suggestion.status === 'new').length;
  if (
    agents.length === 0 &&
    tasks.length === 0 &&
    awaitingPermission.length === 0 &&
    newSuggestionCount === 0
  ) {
    return 'No agent activity yet.';
  }

  const parts = [];
  const running = agents.filter((agent) => agent.status === 'running');

  if (awaitingPermission.length > 0) {
    const subjects = uniqueSorted(
      awaitingPermission.map((permission) => permission.subject)
    );
    const subjectText = subjects.length > 0 ? ` — ${subjects.slice(0, 3).join(', ')}` : '';
    parts.push(
      `⚠ ${awaitingPermission.length} agent${
        awaitingPermission.length === 1 ? '' : 's'
      } waiting for your approval${subjectText}.`
    );
  }

  if (running.length > 0) {
    // Prefer named agents in the headline; unnamed ones still count in the total.
    const namedFirst = [...running].sort((a, b) =>
      (a.name === 'unknown' ? 1 : 0) - (b.name === 'unknown' ? 1 : 0)
    );
    const shown = namedFirst.slice(0, 3).map((agent) => {
      const startMs = parseTs(agent.startedAt);
      const elapsed =
        startMs !== null && nowMs > startMs ? formatDuration(nowMs - startMs) : 'just started';
      return `${agent.name} (${elapsed})`;
    });
    const extra = running.length > 3 ? ` +${running.length - 3} more` : '';
    parts.push(
      `${running.length} agent${running.length === 1 ? '' : 's'} working — ${shown.join(', ')}${extra}.`
    );
  } else if (agents.length > 0 && awaitingPermission.length > 0) {
    const failed = agents.filter((agent) => agent.status === 'failed').length;
    const done = agents.filter((agent) => agent.status === 'done').length;
    if (done > 0 || failed > 0) {
      parts.push(
        `No other agents working right now — ${done} finished${
          failed > 0 ? `, ${failed} failed` : ''
        }.`
      );
    }
  } else if (agents.length > 0) {
    const failed = agents.filter((agent) => agent.status === 'failed').length;
    const done = agents.filter((agent) => agent.status === 'done').length;
    if (done > 0 || failed > 0) {
      parts.push(
        `No agents working right now — ${done} finished${failed > 0 ? `, ${failed} failed` : ''}.`
      );
    } else {
      parts.push('No agents working right now.');
    }
  } else if (awaitingPermission.length === 0) {
    parts.push('No agents working right now.');
  }

  if (tasks.length > 0) {
    const buckets = { inProgress: 0, done: 0, waiting: 0 };
    for (const task of tasks) buckets[taskBucket(task.status)] += 1;
    const segments = [];
    if (buckets.inProgress > 0) segments.push(`${buckets.inProgress} in progress`);
    if (buckets.done > 0) segments.push(`${buckets.done} done`);
    if (buckets.waiting > 0) segments.push(`${buckets.waiting} waiting`);
    parts.push(`${tasks.length} task${tasks.length === 1 ? '' : 's'}: ${segments.join(', ')}.`);
  }

  if (newSuggestionCount > 0) {
    parts.push(
      `${newSuggestionCount} suggestion${newSuggestionCount === 1 ? '' : 's'} awaiting review.`
    );
  }

  return parts.join(' ');
}

async function computeBaseModel({ baseDir, now }) {
  const root = baseDir || defaultBaseDir();

  const [starts, stops, taskEntries, rawEventEntries, suggestionEntries] = await Promise.all([
    readJsonl(path.join(root, 'subagent-runs.jsonl')),
    readJsonl(path.join(root, 'agent-runs.jsonl')),
    readJsonl(path.join(root, 'tasks.jsonl')),
    readJsonl(path.join(root, 'mission-control', 'events.jsonl')),
    readJsonl(path.join(root, 'mission-control', 'suggestions.jsonl')),
  ]);
  const eventEntries = dedupeById(rawEventEntries);

  const nowMs =
    now instanceof Date ? now.getTime() : Number.isFinite(now) ? now : Date.now();

  const joinedAgents = joinAgents(starts, stops, nowMs);
  // Item 1: fold in roster rows derived from delegation events for
  // sources (e.g. Codex) that never get a real start record, then
  // re-sort/re-cap the combined roster by recency.
  const derivedAgents = deriveRosterFromDelegations(eventEntries, joinedAgents, nowMs);
  const mergedAgents = [...joinedAgents, ...derivedAgents]
    .sort((left, right) => (parseTs(right.startedAt) ?? 0) - (parseTs(left.startedAt) ?? 0))
    .slice(0, AGENT_CAP);

  const tasks = latestTasks(taskEntries);
  const edges = toEdges(eventEntries);
  const events = mergeEvents({ starts, stops, taskEntries, eventEntries });
  const eventIndex = indexNewestEvents(eventEntries);
  const decoratedAgents = decorateAgents(mergedAgents, stops, eventIndex);
  const permissionState = applyAwaitingPermissions(
    decoratedAgents,
    eventIndex.latestBySession,
    nowMs
  );
  const agents = permissionState.agents;
  const awaitingPermission = permissionState.awaitingPermission;
  const filterOptions = buildFilterOptions({ starts, stops, taskEntries, eventEntries });
  const suggestions = latestSuggestions(suggestionEntries);
  const summary = summarize(agents, tasks, nowMs, awaitingPermission, suggestions);

  return {
    agents,
    tasks,
    edges,
    events,
    summary,
    awaitingPermission,
    filterOptions,
    suggestions,
    generatedAt: new Date(nowMs).toISOString(),
  };
}

// metrics/topSkills are computed independently of the base model above —
// see the module doc comment (Item 6) for why they get their own,
// longer-lived cache entry instead of riding the 2s base-model TTL.
async function computeSlowFields({ baseDir, now, metricsDays }) {
  const [metrics, topSkills] = await Promise.all([
    getMetrics({ baseDir, now, days: metricsDays }).catch(() => []),
    readTopSkills({ baseDir, now }).catch(() => []),
  ]);
  return { metrics, topSkills };
}

// Item 6 — in-memory TTL cache keyed by baseDir, so N concurrent
// pollers (or, in tests, N calls against the same fixture within the
// TTL window) share one computed result instead of each re-reading
// every file / re-shelling out to ccusage. A rejected factory promise
// is evicted immediately so a transient failure doesn't poison the
// cache for the rest of the TTL window.
function cached(map, key, ttlMs, factory) {
  const nowWall = Date.now();
  const hit = map.get(key);
  if (hit && hit.expiresAt > nowWall) return hit.promise;
  const promise = factory();
  map.set(key, { expiresAt: nowWall + ttlMs, promise });
  promise.catch(() => {
    if (map.get(key)?.promise === promise) map.delete(key);
  });
  return promise;
}

const modelCache = new Map(); // baseDir -> { expiresAt, promise<baseModel> }
const slowFieldCache = new Map(); // baseDir -> { expiresAt, promise<{metrics, topSkills}> }

/** Test-only escape hatch: drop every cached model/metrics/topSkills entry. */
function clearMissionModelCaches() {
  modelCache.clear();
  slowFieldCache.clear();
}

/**
 * Build the full Mission Control read model. `cache` (default true)
 * gates the Item 6 TTL caching described above — pass `cache: false` to
 * force a fresh read (used by tests that mutate fixture files between
 * back-to-back calls against the same baseDir). `cacheTtlMs`/
 * `slowFieldTtlMs` override the default 2s/30s windows, and
 * `metricsDays` overrides metrics.js's default lookback window.
 */
async function buildMissionModel({
  baseDir,
  now,
  cache = true,
  cacheTtlMs = MODEL_CACHE_TTL_MS,
  slowFieldTtlMs = SLOW_FIELD_CACHE_TTL_MS,
  metricsDays,
} = {}) {
  const root = baseDir || defaultBaseDir();

  const [base, slow] = await Promise.all([
    cache
      ? cached(modelCache, root, cacheTtlMs, () => computeBaseModel({ baseDir: root, now }))
      : computeBaseModel({ baseDir: root, now }),
    cache
      ? cached(slowFieldCache, root, slowFieldTtlMs, () =>
          computeSlowFields({ baseDir: root, now, metricsDays })
        )
      : computeSlowFields({ baseDir: root, now, metricsDays }),
  ]);

  return { ...base, ...slow };
}

function filterEventsAfter(events, after) {
  if (!Array.isArray(events)) return [];
  const afterMs = parseTs(after);
  if (afterMs === null) return [...events];
  return events.filter((event) => {
    const ms = parseTs(event && event.ts);
    return ms !== null && ms > afterMs;
  });
}

export {
  buildMissionModel,
  clearMissionModelCaches,
  filterEventsAfter,
  formatDuration,
  taskBucket,
};
