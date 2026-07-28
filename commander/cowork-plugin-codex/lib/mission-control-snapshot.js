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
 * Since v7.4.0 the markup itself lives in ./console-render.js — this file's
 * buildSnapshotHtml is a one-line delegation to buildDeckHtml(model, {tab:
 * 'mission-control'}), so the deck, the Usage deck, the Safety deck and the
 * v7.4.0 console all render from one section renderer instead of four copies.
 * The exported signature is unchanged; equivalence is pinned byte-for-byte by
 * commander/tests/console-extraction.test.js. What remains here is the READER.
 *
 * readModel({ baseDir, now }) is a self-contained tolerant JSONL reader
 * over ~/.claude/commander/ that mirrors dashboard/lib/mission-model.js
 * (same shape, same wording) — duplicated on purpose for the agent-join/
 * event-merge/summary logic: the plugin ships WITHOUT dashboard/, so
 * this file must not import from it. metrics.js and top-skills.js are
 * NOT duplicated the same way — they already live in this same
 * commander/cowork-plugin/lib/ tree (they ship with the plugin), so
 * readModel imports them directly rather than re-implementing the
 * ccusage-shelling/rollup logic a second time.
 *
 * Item 1 (roster from delegation events) is mirrored verbatim from
 * mission-model.js's deriveRosterFromDelegations() — see that file's
 * doc comment for the Codex hook-drop rationale. readModel does NOT
 * mirror mission-model.js's Item 6 TTL cache: a snapshot is a one-shot
 * render, not a polled endpoint, so there's no repeated-read cost to
 * amortize here — it still uses the same bounded-read cap, though, so a
 * huge log can't blow up a single snapshot build.
 *
 * Item 1 also drives a UI marker: derived roster rows carry no real
 * token/cost data (see mission-model.js's doc comment on why), so their
 * agent card gets an `is-derived` class (dimmed) plus a small "inferred"
 * badge with a tooltip — never presented as if it were a verified run.
 *
 * Item 3 (charts strip) renders the SAME sparkline/barStrip builders
 * from ./charts.js the live dashboard's client-side script uses (see
 * that file's doc comment for why it's one canonical module, not a
 * duplicate) — server-rendered inline SVG, no <script>, CSP-safe. That
 * rendering now happens in ./console-render.js; readModel just supplies the
 * `metrics` rows it charts.
 *
 * Deterministic rendering: every timestamp derives from the model or the
 * `now` argument — never Date.now() inside buildSnapshotHtml.
 * Zero dependencies (beyond this plugin's own lib/), ESM, read-only,
 * fail-open.
 * Core free forever — no license check, no tier gating.
 */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// formatDuration/taskBucket live in ./console-render.js (they format and
// classify for display) — imported rather than re-declared here, and re-exported
// below so this module's public API is unchanged.
import { buildDeckHtml, formatDuration, taskBucket } from './console-render.js';
import { getMetrics } from './metrics.js';
import { readTopSkills } from './top-skills.js';

const AGENT_CAP = 200;
const TASK_CAP = 100;
const EVENT_CAP = 100;
const MAX_JSONL_LINES = 5000; // Item 6 bounded-scan cap, per source file
const SUGGESTION_CAP = 50;
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

// Item 6 bounded-scan discipline: only the most recent maxLines
// non-empty lines are parsed — a file that has grown past the cap
// silently undercounts older entries (rotated archives are never read
// at all).
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

function formatTokens(count) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`;
  if (count >= 1e3) return `${(count / 1e3).toFixed(1)}K`;
  return String(Math.round(count));
}

function stopStatus(status) {
  return FAILED_RE.test(String(status || '')) ? 'failed' : 'done';
}

function safeTokens(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function estimatedCostUsd(inputTokens, outputTokens, cacheReadTokens = 0) {
  const input = safeTokens(inputTokens);
  const output = safeTokens(outputTokens);
  const cacheRead = safeTokens(cacheReadTokens);
  if (input === 0 && output === 0 && cacheRead === 0) return null;
  // Sonnet-rate est ($/M): new input 3, cache-read 0.3 (≈0.1×), output 15.
  return Number(((input * 3 + cacheRead * 0.3 + output * 15) / 1_000_000).toFixed(4));
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
        cacheReadTokens: safeTokens(stop.cacheReadTokens),
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
      cacheReadTokens: safeTokens(stop.cacheReadTokens),
      status: stopStatus(stop.status),
      refMs: orphan.ms ?? 0,
    });
  }

  agents.sort((left, right) => right.refMs - left.refMs);
  return agents.slice(0, AGENT_CAP).map(({ refMs, ...agent }) => agent);
}

// Mirrors mission-model.js's enrichUnknownAgentsFromDelegations() (uses toMs
// here instead of parseTs): real Claude SubagentStart payloads carry no name,
// so lend each null-named start record a same-session delegation actor before
// deriving, or it double-ups as an "unknown" row plus a derived row.
function enrichUnknownAgentsFromDelegations(agents, eventEntries) {
  const actorsBySession = new Map();
  for (const entry of eventEntries) {
    if (entry.type !== 'delegation') continue;
    const actor =
      typeof entry.actor === 'string' && entry.actor.trim() ? entry.actor.trim() : null;
    if (!actor) continue;
    const ms = toMs(entry.ts);
    if (ms === null) continue;
    const key = `${entry.source_app || 'claude-code'}:${entry.session_id ?? entry.sessionId ?? ''}`;
    if (!actorsBySession.has(key)) actorsBySession.set(key, []);
    actorsBySession.get(key).push({ ms, actor });
  }
  if (actorsBySession.size === 0) return agents;
  for (const list of actorsBySession.values()) list.sort((a, b) => a.ms - b.ms);

  // Names already owned by a real named start record — exclude from the pool so a
  // null start isn't renamed to a duplicate of an already-named agent.
  const namedBySession = new Map();
  for (const agent of agents) {
    if (!agent.name || agent.name === 'unknown') continue;
    const key = `${agent.sourceApp || 'claude-code'}:${agent.sessionId ?? ''}`;
    if (!namedBySession.has(key)) namedBySession.set(key, new Set());
    namedBySession.get(key).add(agent.name);
  }

  const result = agents.slice();
  const unknownIdx = new Map();
  result.forEach((agent, idx) => {
    if (agent.name && agent.name !== 'unknown') return;
    const key = `${agent.sourceApp || 'claude-code'}:${agent.sessionId ?? ''}`;
    if (!unknownIdx.has(key)) unknownIdx.set(key, []);
    unknownIdx.get(key).push(idx);
  });
  for (const [key, idxs] of unknownIdx) {
    let actors = actorsBySession.get(key);
    if (!actors) continue;
    const owned = namedBySession.get(key);
    if (owned) actors = actors.filter((a) => !owned.has(a.actor));
    if (actors.length === 0) continue;
    idxs.sort((x, y) => (toMs(result[x].startedAt) ?? 0) - (toMs(result[y].startedAt) ?? 0));
    for (let i = 0; i < idxs.length && i < actors.length; i += 1) {
      result[idxs[i]] = { ...result[idxs[i]], name: actors[i].actor, nameFromDelegation: true };
    }
  }
  return result;
}

// Item 1 — mirrors mission-model.js's deriveRosterFromDelegations()
// verbatim (see that file's doc comment for the full Codex hook-drop
// rationale): joinAgents() above only ever sees claude-code
// (subagent-runs.jsonl/agent-runs.jsonl are claude-code-only legacy
// files). Synthesize a roster row from events.jsonl's `delegation`-type
// entries for any (sourceApp, name, sessionId) combo with no real start
// record. A real start record for the same combo always wins.
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

    const ms = toMs(entry.ts);
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
      estCostUsd: estimatedCostUsd(agent.inputTokens, agent.outputTokens, agent.cacheReadTokens),
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
  // Item 1: lend delegation names to null-named real start records, then fold
  // in synthesized rows for sources (e.g. Codex) that never get a start record.
  const enrichedAgents = enrichUnknownAgentsFromDelegations(joinedAgents, eventEntries);
  const derivedAgents = deriveRosterFromDelegations(eventEntries, enrichedAgents, nowMs);
  const mergedAgents = [...enrichedAgents, ...derivedAgents]
    .sort((left, right) => (toMs(right.startedAt) ?? 0) - (toMs(left.startedAt) ?? 0))
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
  const [metrics, topSkills] = await Promise.all([
    getMetrics({ baseDir: root, now: nowMs }).catch(() => []),
    readTopSkills({ baseDir: root, now: nowMs }).catch(() => []),
  ]);

  // dataThrough (v7.3.0, Item 6): newest source-row timestamp across this
  // deck's own hook-written logs — the raw signal for "are hooks actually
  // running", independent of any derived/joined agent-roster shape above.
  // metrics.jsonl is deliberately excluded: it's a derived rollup of
  // events.jsonl, not a primary source, and getMetrics() already recomputes
  // it fresh on every read regardless of this deck's own hook health.
  let dataThroughMs = null;
  let hasAnySourceRow = false;
  for (const rows of [starts, stops, taskEntries, eventEntries, suggestionEntries]) {
    for (const row of rows) {
      hasAnySourceRow = true;
      const ms = row && typeof row === 'object' ? toMs(row.ts) : null;
      if (ms !== null && (dataThroughMs === null || ms > dataThroughMs)) dataThroughMs = ms;
    }
  }

  return {
    agents,
    tasks,
    edges,
    events,
    summary,
    awaitingPermission,
    filterOptions,
    suggestions,
    metrics,
    topSkills,
    dataThroughMs,
    hasAnySourceRow,
    generatedAt: new Date(nowMs).toISOString(),
  };
}

// The deck page — chrome, CSS, and every section — is rendered by
// ./console-render.js. This wrapper exists so the skill-facing entry point and
// its signature are unchanged.
function buildSnapshotHtml(model, { now } = {}) {
  return buildDeckHtml(model, { tab: 'mission-control', surface: 'artifact', now });
}

export { buildSnapshotHtml, readModel, formatDuration, taskBucket };
