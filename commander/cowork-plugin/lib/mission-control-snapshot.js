/**
 * mission-control-snapshot.js
 * Static HTML snapshot renderer for Commander Mission Control (v6.8.0).
 *
 * buildSnapshotHtml(model, { now }) turns the mission model
 * ({ agents, tasks, edges, events, summary, generatedAt }) into ONE
 * self-contained HTML string: inline CSS, inline data, no <script>, no
 * external URLs of any kind — safe for the strict-CSP Artifact target.
 * Emitted as a fragment (<title> + <style> + <main>) because the Artifact
 * publisher supplies the doctype/head/body skeleton; browsers render the
 * raw file fine too. Theme-aware via prefers-color-scheme with
 * :root[data-theme] overrides declared last so the viewer toggle wins.
 *
 * readModel({ baseDir, now }) is a self-contained tolerant JSONL reader
 * over ~/.claude/commander/ that mirrors dashboard/lib/mission-model.js
 * (same shape, same wording) — duplicated on purpose: the plugin ships
 * WITHOUT dashboard/, so this file must not import from it.
 *
 * Deterministic rendering: every timestamp derives from the model or the
 * `now` argument — never Date.now() inside buildSnapshotHtml.
 * Zero dependencies, ESM, read-only, fail-open.
 * Core free forever — no license check, no tier gating.
 */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const AGENT_CAP = 200;
const TASK_CAP = 100;
const EVENT_CAP = 100;
const SUGGESTION_CAP = 50;
const ROW_CAP = 30;
const JOIN_WINDOW_MS = 24 * 60 * 60 * 1000;
const RUNNING_WINDOW_MS = 6 * 60 * 60 * 1000;
const PERMISSION_WINDOW_MS = 15 * 60 * 1000;
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

async function readJsonl(filePath) {
  let raw;
  try {
    raw = await fsp.readFile(filePath, 'utf8');
  } catch {
    return [];
  }

  const entries = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
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

function formatTokens(count) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`;
  if (count >= 1e3) return `${(count / 1e3).toFixed(1)}K`;
  return String(Math.round(count));
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
    ms: toMs(record.ts),
    matched: false,
  }));

  const sortedStarts = [...starts].sort(
    (left, right) => (toMs(left.ts) ?? 0) - (toMs(right.ts) ?? 0)
  );

  const agents = [];

  for (const start of sortedStarts) {
    const startMs = toMs(start.ts);
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

function latestTasks(taskEntries) {
  const byId = new Map();

  for (const entry of taskEntries) {
    const id = entry.task_id ?? entry.id ?? null;
    if (id === null || id === undefined) continue;
    const key = String(id);
    const ms = toMs(entry.ts) ?? 0;
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
// content persists forward. Mirrors this same lib's sibling
// lib/suggestions.js's own readSuggestions() (deliberately duplicated
// here — buildSnapshotHtml's model shape must not depend on it).
function latestSuggestions(suggestionEntries) {
  const byId = new Map();

  for (const entry of suggestionEntries) {
    const id = entry.id;
    // Scalar ids only — an object/array id coerces to "[object Object]"/"1,2",
    // silently merging unrelated suggestions under one key.
    if (typeof id !== 'string' && !Number.isFinite(id)) continue;
    const key = String(id).trim();
    if (!key) continue;
    const ms = toMs(entry.ts) ?? 0;
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
    const ms = toMs(entry.ts);
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

  awaitingPermission.sort((left, right) => (toMs(right.ts) ?? 0) - (toMs(left.ts) ?? 0));
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

function describeMissionEvent(entry) {
  if (typeof entry.text === 'string' && entry.text) return entry.text;
  const from = entry.from || entry.session_id || entry.sessionId || 'session';
  const to = entry.to || entry.actor || entry.agent || 'agent';
  if (entry.type === 'delegation') return `${from} delegated work to ${to}`;
  if (entry.type === 'message') return `${from} sent a message to ${to}`;
  if (entry.type === 'workflow') return `${from} handed a workflow step to ${to}`;
  return `${entry.type || 'event'} from ${from}`;
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
    .filter((event) => toMs(event.ts) !== null)
    .sort((left, right) => (toMs(right.ts) ?? 0) - (toMs(left.ts) ?? 0))
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
    const shown = running.slice(0, 3).map((agent) => {
      const startMs = toMs(agent.startedAt);
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

async function readModel({ baseDir, now } = {}) {
  const root = baseDir || defaultBaseDir();

  const [starts, stops, taskEntries, rawEventEntries, suggestionEntries] = await Promise.all([
    readJsonl(path.join(root, 'subagent-runs.jsonl')),
    readJsonl(path.join(root, 'agent-runs.jsonl')),
    readJsonl(path.join(root, 'tasks.jsonl')),
    readJsonl(path.join(root, 'mission-control', 'events.jsonl')),
    readJsonl(path.join(root, 'mission-control', 'suggestions.jsonl')),
  ]);
  const eventEntries = dedupeById(rawEventEntries);

  const nowMs = toMs(now) ?? Date.now();

  const joinedAgents = joinAgents(starts, stops, nowMs);
  const tasks = latestTasks(taskEntries);
  const edges = toEdges(eventEntries);
  const events = mergeEvents({ starts, stops, taskEntries, eventEntries });
  const eventIndex = indexNewestEvents(eventEntries);
  const decoratedAgents = decorateAgents(joinedAgents, stops, eventIndex);
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

function sourceSlug(value) {
  const trimmed = String(value || 'claude-code').trim().toLowerCase();
  const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'claude-code';
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stamp(ms) {
  if (!Number.isFinite(ms)) return '';
  return `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function timeAgo(tsMs, nowMs) {
  if (!Number.isFinite(tsMs) || !Number.isFinite(nowMs)) return '';
  const delta = nowMs - tsMs;
  if (delta < 45 * 1000) return 'just now';
  if (delta < 60 * 60 * 1000) return `${Math.max(1, Math.round(delta / 60000))}m ago`;
  if (delta < 24 * 60 * 60 * 1000) return `${Math.round(delta / 3600000)}h ago`;
  return `${Math.round(delta / 86400000)}d ago`;
}

function renderSourceBadge(sourceApp) {
  const label = typeof sourceApp === 'string' && sourceApp.trim() ? sourceApp.trim() : 'claude-code';
  return `<span class="src src-${sourceSlug(label)}">${esc(label)}</span>`;
}

const STATUS_META = {
  running: { label: 'working', cls: 'st-running' },
  awaiting_permission: { label: '⚠ awaiting approval', cls: 'st-awaiting' },
  done: { label: 'finished', cls: 'st-done' },
  failed: { label: 'hit a problem', cls: 'st-failed' },
  stale: { label: 'stale (no end recorded)', cls: 'st-stale' },
};

const SUGGESTION_STATUS_META = {
  new: { label: 'new', cls: 'st-waiting' },
  promoted: { label: 'promoted', cls: 'st-done' },
  dismissed: { label: 'dismissed', cls: 'st-stale' },
};

const SNAPSHOT_CSS = `
:root{
  --mc-bg:#f6f7f9;--mc-card:#ffffff;--mc-fg:#1a1d21;--mc-muted:#5c6470;
  --mc-line:#e3e6ea;--mc-accent:#7c3aed;
  --mc-run:#1d4ed8;--mc-run-bg:#dbeafe;
  --mc-ok:#15803d;--mc-ok-bg:#dcfce7;
  --mc-err:#b91c1c;--mc-err-bg:#fee2e2;
  --mc-wait:#b45309;--mc-wait-bg:#fef3c7;
}
@media (prefers-color-scheme: dark){
  :root{
    --mc-bg:#0f1115;--mc-card:#171a21;--mc-fg:#e8eaed;--mc-muted:#9aa3af;
    --mc-line:#262b33;--mc-accent:#a78bfa;
    --mc-run:#93c5fd;--mc-run-bg:#12233d;
    --mc-ok:#4ade80;--mc-ok-bg:#132a1a;
    --mc-err:#f87171;--mc-err-bg:#2a1414;
    --mc-wait:#fbbf24;--mc-wait-bg:#2a2210;
  }
}
:root[data-theme="light"]{
  --mc-bg:#f6f7f9;--mc-card:#ffffff;--mc-fg:#1a1d21;--mc-muted:#5c6470;
  --mc-line:#e3e6ea;--mc-accent:#7c3aed;
  --mc-run:#1d4ed8;--mc-run-bg:#dbeafe;
  --mc-ok:#15803d;--mc-ok-bg:#dcfce7;
  --mc-err:#b91c1c;--mc-err-bg:#fee2e2;
  --mc-wait:#b45309;--mc-wait-bg:#fef3c7;
}
:root[data-theme="dark"]{
  --mc-bg:#0f1115;--mc-card:#171a21;--mc-fg:#e8eaed;--mc-muted:#9aa3af;
  --mc-line:#262b33;--mc-accent:#a78bfa;
  --mc-run:#93c5fd;--mc-run-bg:#12233d;
  --mc-ok:#4ade80;--mc-ok-bg:#132a1a;
  --mc-err:#f87171;--mc-err-bg:#2a1414;
  --mc-wait:#fbbf24;--mc-wait-bg:#2a2210;
}
body{margin:0;background:var(--mc-bg);color:var(--mc-fg);}
.mc{max-width:1080px;margin:0 auto;padding:24px 16px 48px;
  font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--mc-fg);}
.mc *{box-sizing:border-box;}
.mc h1{font-size:1.45rem;margin:0 0 2px;}
.mc h2{font-size:1.02rem;margin:0 0 10px;}
.mc .stamp{color:var(--mc-muted);margin:0 0 18px;font-size:.86rem;}
.mc section{background:var(--mc-card);border:1px solid var(--mc-line);
  border-radius:12px;padding:16px;margin-bottom:16px;}
.mc .summary-text{font-size:1.06rem;margin:0 0 10px;}
.mc .chips{display:flex;flex-wrap:wrap;gap:8px;}
.mc .chip{border:1px solid var(--mc-line);border-radius:999px;
  padding:2px 10px;font-size:.8rem;color:var(--mc-muted);white-space:nowrap;}
.mc .badge{display:inline-block;border-radius:999px;padding:1px 9px;
  font-size:.78rem;font-weight:600;white-space:nowrap;}
.mc .src{display:inline-block;border:1px solid var(--mc-line);border-radius:999px;
  padding:0 8px;font-size:.72rem;font-weight:600;color:var(--mc-muted);
  background:var(--mc-line);white-space:nowrap;}
.mc .src-claude-code{color:var(--mc-accent);border-color:var(--mc-accent);
  background:color-mix(in srgb,var(--mc-accent) 16%,transparent);}
.mc .st-running{color:var(--mc-run);background:var(--mc-run-bg);}
.mc .st-done{color:var(--mc-ok);background:var(--mc-ok-bg);}
.mc .st-failed{color:var(--mc-err);background:var(--mc-err-bg);}
.mc .st-stale{color:var(--mc-muted);background:var(--mc-line);}
.mc .st-waiting,.mc .st-awaiting{color:var(--mc-wait);background:var(--mc-wait-bg);}
.mc .permission-banner{border-color:var(--mc-wait);background:var(--mc-wait-bg);}
.mc .permission-banner h2{color:var(--mc-wait);}
.mc .permission-banner p{margin:8px 0 0;}
.mc .permission-banner li{border-color:color-mix(in srgb,var(--mc-wait) 30%,transparent);}
.mc .scroll{overflow-x:auto;}
.mc table{border-collapse:collapse;width:100%;font-size:.9rem;}
.mc th{text-align:left;color:var(--mc-muted);font-weight:600;
  border-bottom:1px solid var(--mc-line);padding:6px 12px 6px 0;white-space:nowrap;}
.mc td{border-bottom:1px solid var(--mc-line);padding:7px 12px 7px 0;
  vertical-align:top;}
.mc tr:last-child td{border-bottom:none;}
.mc .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.84rem;}
.mc .muted{color:var(--mc-muted);}
.mc .zero{color:var(--mc-muted);margin:0;}
.mc .agent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;}
.mc .agent-card{border:1px solid var(--mc-line);border-radius:10px;padding:12px;min-width:0;}
.mc .agent-card.is-awaiting{border-color:var(--mc-wait);background:var(--mc-wait-bg);}
.mc .agent-card.is-stale{color:var(--mc-muted);opacity:.68;}
.mc .agent-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
.mc .agent-name{display:flex;gap:9px;align-items:flex-start;min-width:0;}
.mc .agent-emoji{font-size:1.35rem;line-height:1.2;}
.mc .agent-role,.mc .agent-task,.mc .agent-meta{color:var(--mc-muted);font-size:.82rem;}
.mc .agent-task{margin:10px 0;color:var(--mc-fg);overflow-wrap:anywhere;}
.mc .agent-meta{display:flex;flex-wrap:wrap;gap:5px 12px;}
.mc .board{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;}
.mc .col{border:1px solid var(--mc-line);border-radius:10px;padding:10px;min-width:0;}
.mc .col h3{margin:0 0 8px;font-size:.86rem;color:var(--mc-muted);}
.mc .card{border:1px solid var(--mc-line);border-radius:8px;padding:8px 10px;
  margin-bottom:8px;font-size:.9rem;overflow-wrap:anywhere;}
.mc .card:last-child{margin-bottom:0;}
.mc .card .when{display:block;font-size:.78rem;color:var(--mc-muted);margin-top:2px;}
.mc ul,.mc ol{margin:0;padding-left:0;list-style:none;}
.mc li{padding:6px 0;border-bottom:1px solid var(--mc-line);overflow-wrap:anywhere;}
.mc li:last-child{border-bottom:none;}
.mc .arrow{color:var(--mc-accent);font-weight:700;}
.mc footer{color:var(--mc-muted);font-size:.82rem;text-align:center;}
@media (max-width:560px){.mc{padding:16px 10px 32px;}.mc section{padding:12px;}}
`;

function renderSummarySection(summary, agents, tasks) {
  const running = agents.filter((agent) => agent.status === 'running').length;
  const awaiting = agents.filter((agent) => agent.status === 'awaiting_permission').length;
  const failed = agents.filter((agent) => agent.status === 'failed').length;
  const finished = agents.filter((agent) => agent.status === 'done').length;
  const headlineAgents = agents.filter((agent) => agent.status !== 'stale').length;
  const buckets = { inProgress: 0, done: 0, waiting: 0 };
  for (const task of tasks) buckets[taskBucket(task.status)] += 1;

  const chips = [
    `🤖 ${headlineAgents} agent${headlineAgents === 1 ? '' : 's'}`,
    `🔄 ${running} working`,
    `⚠ ${awaiting} awaiting approval`,
    `✅ ${finished} finished`,
    `❌ ${failed} failed`,
    `📋 ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
    `⏳ ${buckets.inProgress} in progress`,
    `🕐 ${buckets.waiting} waiting`,
    `🏁 ${buckets.done} done`,
  ];

  return `<section aria-label="Summary">
<p class="summary-text">${esc(summary)}</p>
<div class="chips">${chips.map((chip) => `<span class="chip">${esc(chip)}</span>`).join('')}</div>
</section>`;
}

function renderAwaitingPermissionSection(awaitingPermission, nowMs) {
  if (awaitingPermission.length === 0) return '';

  const items = awaitingPermission.slice(0, ROW_CAP).map((permission) => {
    const sessionId = permission.session_id ?? 'unknown';
    const subject = permission.subject || 'Approval needed';
    const when = timeAgo(toMs(permission.ts) ?? NaN, nowMs ?? NaN);
    return `<li><strong>${esc(subject)}</strong> · session <span class="mono">${esc(sessionId)}</span>${when ? ` <span class="muted">· ${esc(when)}</span>` : ''}</li>`;
  });

  return `<section class="permission-banner" aria-label="Awaiting permission">
<h2>⚠ Waiting for your approval</h2>
<ul>${items.join('')}</ul>
<p><strong>Switch to that session to approve.</strong></p>
</section>`;
}

function renderAgentsSection(agents, nowMs) {
  if (agents.length === 0) {
    return `<section aria-label="Agent roster">
<h2>🤖 Agents</h2>
<p class="zero">No agents yet — spawn one with /ccc-spawn and this board lights up.</p>
</section>`;
  }

  const cards = agents.slice(0, ROW_CAP).map((agent) => {
    const meta = STATUS_META[agent.status] || {
      label: 'unknown status',
      cls: 'st-stale',
    };
    const startMs = toMs(agent.startedAt);
    const started = timeAgo(startMs ?? NaN, nowMs ?? NaN) || (startMs !== null ? stamp(startMs) : '—');
    let took = '—';
    if (agent.status === 'running') {
      took =
        startMs !== null && Number.isFinite(nowMs) && nowMs > startMs
          ? `${formatDuration(nowMs - startMs)} so far`
          : 'just started';
    } else if (Number.isFinite(agent.durationMs) && agent.durationMs > 0) {
      took = formatDuration(agent.durationMs);
    }
    const tasksCompleted = Number.isFinite(agent.tasksCompleted)
      ? Math.max(0, Math.round(agent.tasksCompleted))
      : 0;
    const cost = Number.isFinite(agent.estCostUsd)
      ? `$${agent.estCostUsd.toFixed(4)}`
      : '—';
    const currentTask = agent.currentTask || 'No current task';
    const statusClass =
      agent.status === 'awaiting_permission'
        ? ' is-awaiting'
        : agent.status === 'stale'
          ? ' is-stale'
          : '';
    return `<article class="agent-card${statusClass}">
<div class="agent-head">
<div class="agent-name"><span class="agent-emoji" aria-hidden="true">${esc(agent.emoji || '🤖')}</span><div><strong>${esc(agent.name)}</strong><div class="agent-role">${esc(agent.role || 'Agent')} · ${renderSourceBadge(agent.sourceApp)}</div></div></div>
<span class="badge ${meta.cls}">${esc(meta.label)}</span>
</div>
<p class="agent-task"><strong>Current task:</strong> ${esc(currentTask)}</p>
<div class="agent-meta">
<span>${esc(tasksCompleted)} task${tasksCompleted === 1 ? '' : 's'} completed</span>
<span>Est. cost: <span class="mono">${esc(cost)}</span></span>
<span>Started: ${esc(started)}</span>
<span>Took: <span class="mono">${esc(took)}</span></span>
<span>Model: <span class="mono">${esc(agent.model || '—')}</span></span>
</div>
</article>`;
  });

  const overflow =
    agents.length > ROW_CAP
      ? `<p class="muted">…and ${agents.length - ROW_CAP} earlier run${agents.length - ROW_CAP === 1 ? '' : 's'}.</p>`
      : '';

  return `<section aria-label="Agent roster">
<h2>🤖 Agents</h2>
<div class="agent-grid">${cards.join('')}</div>${overflow}
</section>`;
}

function renderTasksSection(tasks, nowMs) {
  if (tasks.length === 0) {
    return `<section aria-label="Task board">
<h2>📋 Tasks</h2>
<p class="zero">No tasks tracked yet.</p>
</section>`;
  }

  const columns = [
    ['inProgress', 'In progress', 'st-running'],
    ['waiting', 'Waiting', 'st-waiting'],
    ['done', 'Done', 'st-done'],
  ];

  const cols = columns.map(([bucket, label, cls]) => {
    const items = tasks.filter((task) => taskBucket(task.status) === bucket).slice(0, ROW_CAP);
    const cards = items.map((task) => {
      const when = timeAgo(toMs(task.ts) ?? NaN, nowMs ?? NaN);
      return `<div class="card"><span class="badge ${cls}">${esc(label.toLowerCase())}</span> ${esc(task.title)}${when ? `<span class="when">${esc(when)}</span>` : ''}</div>`;
    });
    return `<div class="col"><h3>${esc(label)} · ${items.length}</h3>${cards.join('') || '<p class="zero">none</p>'}</div>`;
  });

  return `<section aria-label="Task board">
<h2>📋 Tasks</h2>
<div class="board">${cols.join('')}</div>
</section>`;
}

function renderEdgesSection(edges, nowMs) {
  if (edges.length === 0) {
    return `<section aria-label="Delegation flow">
<h2>🔀 Delegation flow</h2>
<p class="zero">No delegations recorded yet — when a session hands work to an agent, it shows up here.</p>
</section>`;
  }

  const items = edges.slice(0, ROW_CAP).map((edge) => {
    const when = timeAgo(toMs(edge.ts) ?? NaN, nowMs ?? NaN);
    return `<li><span class="mono">${esc(edge.from)}</span> <span class="arrow">→</span> <strong>${esc(edge.to)}</strong> <span class="chip">${esc(edge.type)}</span>${when ? ` <span class="muted">${esc(when)}</span>` : ''}</li>`;
  });

  return `<section aria-label="Delegation flow">
<h2>🔀 Delegation flow</h2>
<ul>${items.join('')}</ul>
</section>`;
}

function renderEventsSection(events, nowMs) {
  if (events.length === 0) {
    return `<section aria-label="Latest activity">
<h2>🕐 Latest activity</h2>
<p class="zero">No activity yet.</p>
</section>`;
  }

  const items = events.slice(0, ROW_CAP).map((event) => {
    const ms = toMs(event.ts);
    const when = timeAgo(ms ?? NaN, nowMs ?? NaN) || (ms !== null ? stamp(ms) : '');
    return `<li>${when ? `<span class="muted mono">${esc(when)}</span> ` : ''}${renderSourceBadge(event.sourceApp)} ${esc(event.text)}</li>`;
  });

  return `<section aria-label="Latest activity">
<h2>🕐 Latest activity</h2>
<ol>${items.join('')}</ol>
</section>`;
}

function renderSuggestionsSection(suggestions) {
  if (suggestions.length === 0) {
    return `<section aria-label="Suggestions">
<h2>💡 Suggestions</h2>
<p class="zero">No suggestions yet — agents surface ideas here as they notice them.</p>
</section>`;
  }

  const items = suggestions.slice(0, ROW_CAP).map((suggestion) => {
    const meta = SUGGESTION_STATUS_META[suggestion.status] || {
      label: suggestion.status || 'unknown',
      cls: 'st-stale',
    };
    const from = suggestion.from ? `<strong>${esc(suggestion.from)}</strong> — ` : '';
    const idea = suggestion.idea ? esc(suggestion.idea) : 'No idea text.';
    const evidence = suggestion.evidence
      ? `<div class="muted">${esc(suggestion.evidence)}</div>`
      : '';
    const proposedTitle =
      suggestion.proposed_ticket && suggestion.proposed_ticket.title
        ? `<div class="muted">Proposed: ${esc(suggestion.proposed_ticket.title)}</div>`
        : '';
    const promoted =
      suggestion.status === 'promoted' && suggestion.promoted_ticket
        ? `<div class="muted">Tracked as: ${esc(
            suggestion.promoted_ticket.title ||
              suggestion.promoted_ticket.id ||
              suggestion.promoted_ticket.url ||
              'ticket'
          )}</div>`
        : '';
    return `<li><span class="badge ${meta.cls}">${esc(meta.label)}</span> ${from}${idea}${evidence}${proposedTitle}${promoted}</li>`;
  });

  const overflow =
    suggestions.length > ROW_CAP
      ? `<p class="muted">…and ${suggestions.length - ROW_CAP} more suggestion${suggestions.length - ROW_CAP === 1 ? '' : 's'}.</p>`
      : '';

  return `<section aria-label="Suggestions">
<h2>💡 Suggestions</h2>
<ul>${items.join('')}</ul>${overflow}
</section>`;
}

function buildSnapshotHtml(model, { now } = {}) {
  const source = model && typeof model === 'object' ? model : {};
  const agents = Array.isArray(source.agents) ? source.agents : [];
  const tasks = Array.isArray(source.tasks) ? source.tasks : [];
  const edges = Array.isArray(source.edges) ? source.edges : [];
  const events = Array.isArray(source.events) ? source.events : [];
  const suggestions = Array.isArray(source.suggestions) ? source.suggestions : [];
  const awaitingPermission = Array.isArray(source.awaitingPermission)
    ? source.awaitingPermission
    : [];
  const summary =
    typeof source.summary === 'string' && source.summary
      ? source.summary
      : 'No agent activity yet.';
  const nowMs = toMs(now) ?? toMs(source.generatedAt);
  const empty =
    agents.length === 0 &&
    tasks.length === 0 &&
    edges.length === 0 &&
    events.length === 0 &&
    suggestions.length === 0 &&
    awaitingPermission.length === 0;

  const hero = empty
    ? `<section aria-label="Getting started">
<p class="zero">🎛️ Nothing to show yet — no agents have run on this machine. Spawn one with /ccc-spawn (or fan out with /ccc-fleet) and mission control lights up.</p>
</section>`
    : '';

  return `<title>Commander Mission Control</title>
<style>${SNAPSHOT_CSS}</style>
<main class="mc">
<header>
<h1>🎛️ Commander Mission Control</h1>
<p class="stamp">Static snapshot${Number.isFinite(nowMs) ? ` · ${esc(stamp(nowMs))}` : ''}</p>
</header>
${renderAwaitingPermissionSection(awaitingPermission, nowMs)}
${hero}
${renderSummarySection(summary, agents, tasks)}
${renderAgentsSection(agents, nowMs)}
${renderTasksSection(tasks, nowMs)}
${renderEdgesSection(edges, nowMs)}
${renderEventsSection(events, nowMs)}
${renderSuggestionsSection(suggestions)}
<footer>🔒 Built from local logs in ~/.claude/commander. If published, the displayed data leaves this machine for your private artifact URL.</footer>
</main>`;
}

export { buildSnapshotHtml, readModel, formatDuration, taskBucket };
