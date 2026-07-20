/**
 * suggestions.js
 * Shared read/write helpers for Commander Mission Control's suggestions
 * feed: ~/.claude/commander/mission-control/suggestions.jsonl — an
 * append-only JSONL log of proactive "you might want to do X" ideas any
 * agent can propose, for the user to promote (into a tracked ticket) or
 * dismiss from the dashboard/snapshot Suggestions panel.
 *
 * Two line shapes, both appended by id:
 *   creation:      { id, ts, from, source_app, idea, evidence, proposed_ticket, status: "new" }
 *   status-change: { id, ts, status: "promoted"|"dismissed", promoted_ticket?, by }
 *
 * readSuggestions() merges by id — latest-ts wins for status (and
 * whatever fields that line carries); earlier fields persist forward
 * (same pattern as mission-model.js's latestTasks). idea/evidence and
 * ticket titles are redacted + capped — mirrors
 * mission-control-feed.js's redact()/truncate(). Rotation at 10MB
 * mirrors the same feed hook's rotateLog(). Every export fails open
 * (never throws) — a broken suggestions feed must never break the
 * caller.
 *
 * Core free forever — no license check, no tier gating.
 */
import { access, appendFile, mkdir, readFile, rename, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const IDEA_MAX = 200;
const EVIDENCE_MAX = 300;
const TICKET_TITLE_MAX = 200;
const SUGGESTION_CAP = 50;

// build:codex mirrors this file verbatim, so an unqualified caller under Codex
// must not be labelled claude-code. Same detection as mission-control-feed.js.
const SOURCE_APP =
  process.env.CODEX_PLUGIN_ROOT || /cowork-plugin-codex|\/\.codex\//.test(import.meta.url)
    ? 'codex'
    : 'claude-code';

function defaultBaseDir() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.claude', 'commander');
}

function suggestionsDir(baseDir) {
  return path.join(baseDir || defaultBaseDir(), 'mission-control');
}

function suggestionsFile(baseDir) {
  return path.join(suggestionsDir(baseDir), 'suggestions.jsonl');
}

function redact(value) {
  if (typeof value !== 'string') return null;
  return value
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, '[redacted]')
    .replace(/\b(basic)\s+([A-Za-z0-9+/]{4,}={0,2})/gi, (match, scheme, b64) => {
      try {
        return Buffer.from(b64, 'base64').toString('utf8').includes(':') ? `${scheme} [redacted]` : match;
      } catch {
        return match;
      }
    })
    .replace(/(authorization\s*[=:]\s*)(?:bearer|digest|negotiate|token)\s+[^\s"']+/gi, '$1[redacted]')
    .replace(/AKIA[0-9A-Z]{16}/g, '[redacted]')
    .replace(/gh[pousr]_[A-Za-z0-9]{20,}/g, '[redacted]')
    .replace(/hf_[A-Za-z0-9]{16,}/g, '[redacted]')
    .replace(/xox[baprs]-[A-Za-z0-9-]{10,}/g, '[redacted]')
    .replace(
      /((?:api[_-]?key|token|secret|password|passwd|authorization)\s*[=:]\s*)\S+/gi,
      '$1[redacted]'
    );
}

function truncate(value, max) {
  const redacted = redact(value);
  if (redacted === null) return null;
  const trimmed = redacted.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function normalizeProposedTicket(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const title = truncate(value.title, TICKET_TITLE_MAX);
  if (!title) return null;
  const project =
    typeof value.project === 'string' && value.project.trim()
      ? value.project.trim().slice(0, 100)
      : null;
  const priority =
    typeof value.priority === 'string' && value.priority.trim()
      ? value.priority.trim().slice(0, 40)
      : null;
  return { title, project, priority };
}

function normalizePromotedTicket(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const url = typeof value.url === 'string' ? truncate(value.url, 300) : null;
  const id =
    typeof value.id === 'string' && value.id.trim() ? value.id.trim().slice(0, 100) : null;
  const title = truncate(value.title, TICKET_TITLE_MAX);
  if (!url && !id && !title) return null;
  return { url, id, title };
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function rotateLog(dir, file) {
  try {
    const info = await stat(file);
    if (info.size < MAX_BYTES) return;
    const now = new Date();
    const datestamp =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0');
    const timestamp =
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    let archive = path.join(dir, `suggestions.${datestamp}-${timestamp}.jsonl`);
    let counter = 1;
    while (await fileExists(archive)) {
      archive = path.join(dir, `suggestions.${datestamp}-${timestamp}-${counter}.jsonl`);
      counter += 1;
    }
    await rename(file, archive);
  } catch {
    // File doesn't exist yet or stat failed — that's fine
  }
}

/**
 * Append a new suggestion. Returns true on success, false on any failure
 * (missing id, write error, …) — never throws.
 */
async function appendSuggestion(entry, { baseDir } = {}) {
  try {
    if (!entry || typeof entry !== 'object') return false;
    const id = entry.id;
    if (id === null || id === undefined || String(id).trim() === '') return false;

    const root = baseDir || defaultBaseDir();
    const dir = suggestionsDir(root);
    const file = suggestionsFile(root);

    const record = {
      id: String(id),
      ts: typeof entry.ts === 'string' && entry.ts ? entry.ts : new Date().toISOString(),
      from: typeof entry.from === 'string' && entry.from.trim() ? entry.from.trim() : null,
      source_app:
        typeof entry.source_app === 'string' && entry.source_app.trim()
          ? entry.source_app.trim()
          : SOURCE_APP,
      idea: truncate(entry.idea, IDEA_MAX),
      evidence: truncate(entry.evidence, EVIDENCE_MAX),
      proposed_ticket: normalizeProposedTicket(entry.proposed_ticket),
      status: 'new',
    };

    await mkdir(dir, { recursive: true });
    await rotateLog(dir, file);
    await appendFile(file, JSON.stringify(record) + '\n');
    return true;
  } catch {
    return false;
  }
}

/**
 * Append a status-change line ("promoted" or "dismissed") for an
 * existing suggestion id. Returns true on success, false on any
 * failure (missing/invalid id or status, write error, …) — never
 * throws.
 */
async function appendStatus(entry, { baseDir } = {}) {
  try {
    if (!entry || typeof entry !== 'object') return false;
    const id = entry.id;
    if (id === null || id === undefined || String(id).trim() === '') return false;
    const status = entry.status;
    if (status !== 'promoted' && status !== 'dismissed') return false;

    const root = baseDir || defaultBaseDir();
    const dir = suggestionsDir(root);
    const file = suggestionsFile(root);

    const record = {
      id: String(id),
      ts: typeof entry.ts === 'string' && entry.ts ? entry.ts : new Date().toISOString(),
      status,
      promoted_ticket:
        status === 'promoted' ? normalizePromotedTicket(entry.promoted_ticket) : null,
      by: typeof entry.by === 'string' && entry.by.trim() ? entry.by.trim() : null,
    };

    await mkdir(dir, { recursive: true });
    await rotateLog(dir, file);
    await appendFile(file, JSON.stringify(record) + '\n');
    return true;
  } catch {
    return false;
  }
}

function parseTs(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

async function readJsonl(filePath) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
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

// Latest-ts-wins merge by id — mirrors mission-model.js's latestTasks.
// A later status-only line (no idea/evidence/proposed_ticket) still wins
// on status, while the earlier creation line's content persists forward.
function latestSuggestions(entries) {
  const byId = new Map();

  for (const entry of entries) {
    const id = entry.id;
    if (id === null || id === undefined) continue;
    const key = String(id);
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

/**
 * Tolerant read of suggestions.jsonl, merged latest-status-wins by id,
 * newest first, capped at 50. Missing file → []. Never throws.
 */
async function readSuggestions(baseDir) {
  try {
    const entries = await readJsonl(suggestionsFile(baseDir));
    return latestSuggestions(entries);
  } catch {
    return [];
  }
}

export {
  appendSuggestion,
  appendStatus,
  readSuggestions,
  suggestionsFile,
  IDEA_MAX,
  EVIDENCE_MAX,
  SUGGESTION_CAP,
};
