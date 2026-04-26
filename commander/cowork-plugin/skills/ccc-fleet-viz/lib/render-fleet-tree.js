import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_STATE_DIR = '/tmp/ccc-fleet';
const STATUS_SUFFIX = '-status.json';
const COMPLETE_SUFFIX = '-complete.json';

function readDirSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return [];
  }
}

function readJsonSafe(file, skipped) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    skipped.push({ file, reason: error.message });
    return null;
  }
}

function stringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function arrayOfStrings(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item.length > 0);
}

function firstString(...values) {
  for (const value of values) {
    const s = stringOrNull(value);
    if (s) return s;
  }
  return null;
}

function firstNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function workerIdFromFilename(filename) {
  if (filename.endsWith(STATUS_SUFFIX)) {
    return filename.slice(0, -STATUS_SUFFIX.length);
  }
  if (filename.endsWith(COMPLETE_SUFFIX)) {
    return filename.slice(0, -COMPLETE_SUFFIX.length);
  }
  return null;
}

function normalizeStatus(raw, payload, markerKind) {
  if (markerKind === 'complete' && Number.isInteger(payload.exit_code)) {
    return payload.exit_code === 0 ? 'done' : 'failed';
  }

  const value = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['done', 'complete', 'completed', 'success', 'succeeded', 'pass', 'passed'].includes(value)) {
    return 'done';
  }
  if (['running', 'in_progress', 'active', 'started', 'working'].includes(value)) {
    return 'running';
  }
  if (['failed', 'failure', 'error', 'errored', 'blocked'].includes(value)) {
    return 'failed';
  }
  if (['waiting', 'pending', 'queued', 'scheduled', 'idle'].includes(value)) {
    return 'waiting';
  }
  return markerKind === 'complete' ? 'done' : 'unknown';
}

function statusRank(status) {
  return {
    unknown: 0,
    waiting: 1,
    running: 2,
    done: 3,
    failed: 4,
  }[status] || 0;
}

function extractOrdinal(id) {
  const match = String(id).match(/(?:^|[-_])w(?:orker)?[-_]?(\d+)(?:[-_]|$)/i);
  if (match) return Number.parseInt(match[1], 10);
  const direct = String(id).match(/^w(\d+)(?:[-_]|$)/i);
  if (direct) return Number.parseInt(direct[1], 10);
  return null;
}

function titleFromId(id, ordinal) {
  let title = String(id)
    .replace(/^codex[-_]w\d+[-_]?/i, '')
    .replace(/^w\d+[-_]?/i, '')
    .replace(/^worker[-_]?\d+[-_]?/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  if (!title && ordinal !== null) return `W${ordinal}`;
  return title || String(id);
}

function normalizeWorker(payload, fallbackId, markerKind, sourceFile) {
  const id = firstString(payload.worker_id, payload.workerId, payload.id, fallbackId);
  if (!id) return null;

  const status = normalizeStatus(payload.status || payload.state || payload.phase, payload, markerKind);
  const ordinal = extractOrdinal(id);
  const branch = firstString(
    payload.branch,
    payload.git_branch,
    payload.worktree_branch,
    payload.branch_name
  );
  const commit = firstString(payload.commit, payload.commit_hash, payload.head, payload.sha);
  const label = firstString(payload.label, payload.display_name, payload.displayName);
  const title = firstString(payload.title, payload.name, payload.task, payload.role, payload.slice);
  const blockedBy = firstString(payload.blocked_by, payload.blockedBy, payload.waiting_on, payload.waitingOn);
  const error = firstString(payload.error, payload.reason, payload.failure, payload.blocked);
  const headline = firstString(payload.headline, payload.message, payload.summary, payload.detail, payload.status_detail);
  const etaRemainingMs = firstNumber(payload.eta_remaining_ms, payload.etaRemainingMs);
  const eta = firstString(payload.eta, payload.eta_text, payload.etaText);
  const progress = firstString(payload.progress, payload.progress_text, payload.progressText);

  return {
    id,
    ordinal,
    status,
    label,
    title,
    branch,
    commit,
    worktree: firstString(payload.worktree, payload.worktree_path, payload.path),
    headline,
    progress,
    progressCurrent: firstNumber(payload.progress_current, payload.progressCurrent, payload.done),
    progressTotal: firstNumber(payload.progress_total, payload.progressTotal, payload.total),
    progressLabel: firstString(payload.progress_label, payload.progressLabel),
    eta,
    etaRemainingMs,
    blockedBy,
    error,
    tests: payload.tests || null,
    testsPassing: typeof payload.tests_passing === 'boolean' ? payload.tests_passing : null,
    testsInFlight: Boolean(payload.tests_in_flight || payload.testsInFlight),
    filesChanged: arrayOfStrings(payload.files_changed || payload.filesChanged),
    filesWritten: arrayOfStrings(payload.files_written || payload.filesWritten),
    exitCode: Number.isInteger(payload.exit_code) ? payload.exit_code : null,
    completedAt: firstString(payload.completed_at, payload.completedAt),
    updatedAt: firstString(payload.updated_at, payload.updatedAt, payload.timestamp),
    markerKind,
    sourceFiles: sourceFile ? [sourceFile] : [],
  };
}

function mergeArrays(a, b) {
  return Array.from(new Set([...(a || []), ...(b || [])]));
}

function mergeWorker(existing, next) {
  if (!existing) return next;

  const merged = { ...existing };
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      merged[key] = mergeArrays(merged[key], value);
    } else if (key === 'status') {
      if (next.markerKind === 'complete' || statusRank(value) >= statusRank(merged.status)) {
        merged.status = value;
      }
    } else if (key === 'markerKind') {
      merged.markerKind = next.markerKind === 'complete' ? 'complete' : merged.markerKind;
    } else if (key === 'sourceFiles') {
      merged.sourceFiles = mergeArrays(merged.sourceFiles, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function parseWorktrees(cwd) {
  let output = '';
  try {
    output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    });
  } catch (_) {
    return [];
  }

  const worktrees = [];
  let current = null;
  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) worktrees.push(current);
      current = { path: line.slice('worktree '.length) };
    } else if (current && line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length);
    } else if (current && line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
    } else if (current && line.startsWith('locked')) {
      current.locked = line.slice('locked'.length).trim();
    }
  }
  if (current) worktrees.push(current);
  return worktrees;
}

function listTests(cwd) {
  const testDir = path.join(cwd, 'commander', 'tests');
  return readDirSafe(testDir)
    .filter((entry) => entry.isFile())
    .map((entry) => path.join('commander', 'tests', entry.name))
    .sort();
}

function sameWorkerSlug(worker, worktree) {
  const id = worker.id.toLowerCase();
  const branch = String(worktree.branch || '').toLowerCase();
  const base = path.basename(String(worktree.path || '')).toLowerCase();
  return branch.includes(id) || base.includes(id);
}

function enrichWorkerFromWorktrees(worker, worktrees) {
  if (worker.branch && worker.commit && worker.worktree) return worker;

  const match = worktrees.find((item) => {
    if (worker.branch && item.branch === worker.branch) return true;
    return sameWorkerSlug(worker, item);
  });
  if (!match) return worker;

  return {
    ...worker,
    branch: worker.branch || match.branch || null,
    commit: worker.commit || match.head || null,
    worktree: worker.worktree || match.path || null,
  };
}

function collectJsonlProgress(stateDir, byId, skipped) {
  const file = path.join(stateDir, 'worker-progress.jsonl');
  if (!fs.existsSync(file)) return;

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const payload = JSON.parse(line);
      const worker = normalizeWorker(payload, payload.worker_id, 'status', `${file}:${index + 1}`);
      if (worker) byId.set(worker.id, mergeWorker(byId.get(worker.id), worker));
    } catch (error) {
      skipped.push({ file: `${file}:${index + 1}`, reason: error.message });
    }
  });
}

function summarize(workers) {
  const summary = {
    total: workers.length,
    done: 0,
    running: 0,
    failed: 0,
    waiting: 0,
    unknown: 0,
  };
  for (const worker of workers) {
    if (summary[worker.status] === undefined) summary.unknown += 1;
    else summary[worker.status] += 1;
  }
  return summary;
}

function collectFleetState({ stateDir = DEFAULT_STATE_DIR } = {}) {
  const skipped = [];
  const byId = new Map();
  const entries = readDirSafe(stateDir).filter((entry) => entry.isFile());

  collectJsonlProgress(stateDir, byId, skipped);

  for (const suffix of [STATUS_SUFFIX, COMPLETE_SUFFIX]) {
    for (const entry of entries.filter((item) => item.name.endsWith(suffix)).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(stateDir, entry.name);
      const payload = readJsonSafe(file, skipped);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;

      const id = workerIdFromFilename(entry.name);
      const markerKind = suffix === COMPLETE_SUFFIX ? 'complete' : 'status';
      const worker = normalizeWorker(payload, id, markerKind, file);
      if (worker) byId.set(worker.id, mergeWorker(byId.get(worker.id), worker));
    }
  }

  const cwd = process.cwd();
  const worktrees = parseWorktrees(cwd);
  const workers = Array.from(byId.values())
    .map((worker) => enrichWorkerFromWorktrees(worker, worktrees))
    .sort((a, b) => {
      if (a.ordinal !== null && b.ordinal !== null && a.ordinal !== b.ordinal) return a.ordinal - b.ordinal;
      if (a.ordinal !== null && b.ordinal === null) return -1;
      if (a.ordinal === null && b.ordinal !== null) return 1;
      return a.id.localeCompare(b.id);
    });

  return {
    kind: 'ccc-fleet',
    stateDir,
    orchestrator: {
      id: 'fleet',
      label: '/ccc-fleet (orchestrator)',
    },
    summary: summarize(workers),
    workers,
    skipped,
    worktrees,
    tests: listTests(cwd),
  };
}

function iconForStatus(status) {
  return {
    done: '✅',
    running: '🔄',
    failed: '❌',
    waiting: '⏳',
    unknown: '⏳',
  }[status] || '⏳';
}

function displayLabel(worker) {
  const explicit = firstString(worker.label);
  if (explicit) return explicit;

  const prefix = worker.ordinal !== null ? `W${worker.ordinal}` : worker.id;
  const title = firstString(worker.title) || titleFromId(worker.id, worker.ordinal);
  if (new RegExp(`^${prefix}\\b`, 'i').test(title)) return title;
  if (title === prefix) return prefix;
  return `${prefix} ${title}`;
}

function shortCommit(commit) {
  const value = stringOrNull(commit);
  return value ? value.slice(0, 7) : null;
}

function formatEta(worker) {
  if (worker.eta) {
    return worker.eta.startsWith('~') ? worker.eta : `~${worker.eta}`;
  }
  if (typeof worker.etaRemainingMs === 'number' && Number.isFinite(worker.etaRemainingMs)) {
    const minutes = Math.max(1, Math.round(worker.etaRemainingMs / 60000));
    return `~${minutes}min`;
  }
  return null;
}

function detailForWorker(worker) {
  const branch = stringOrNull(worker.branch);
  const commit = shortCommit(worker.commit);
  const branchAndCommit = branch && commit ? `${branch} @ ${commit}` : branch || commit;

  if (worker.status === 'done') {
    if (branchAndCommit) return branchAndCommit;
    if (worker.headline) return worker.headline;
    if (worker.filesWritten.length > 0) return `${worker.filesWritten.length} files written`;
    return 'complete';
  }

  if (worker.status === 'failed') {
    if (worker.blockedBy) return `blocked: ${worker.blockedBy}`;
    if (worker.error) return worker.error.startsWith('blocked') ? worker.error : `failed: ${worker.error}`;
    if (worker.exitCode !== null) return `failed: exit ${worker.exitCode}`;
    return 'failed';
  }

  if (worker.status === 'waiting') {
    if (worker.blockedBy) return `waiting on ${worker.blockedBy}`;
    if (worker.headline) return worker.headline;
    return 'waiting';
  }

  const parts = [];
  if (worker.progress) {
    parts.push(worker.progress);
  } else if (worker.progressCurrent !== null && worker.progressTotal !== null) {
    const label = worker.progressLabel || 'steps complete';
    parts.push(`${worker.progressCurrent}/${worker.progressTotal} ${label}`);
  } else if (worker.headline) {
    parts.push(worker.headline);
  } else if (worker.filesChanged.length > 0) {
    parts.push(`${worker.filesChanged.length} files changed`);
  } else {
    parts.push(worker.status === 'unknown' ? 'status unknown' : 'running');
  }

  if (worker.testsInFlight) parts.push('tests in flight');
  const eta = formatEta(worker);
  if (eta) parts.push(`ETA ${eta}`);
  return parts.join(', ');
}

function renderASCII(state) {
  const workers = Array.isArray(state?.workers) ? state.workers : [];
  const summary = state?.summary || summarize(workers);
  const header = `/ccc-fleet (orchestrator) — ${summary.total} workers, ${summary.done} done, ${summary.running} running, ${summary.failed} failed`;
  if (workers.length === 0) return header;

  const labels = workers.map(displayLabel);
  const width = Math.max(...labels.map((label) => label.length));
  const lines = [header];

  workers.forEach((worker, index) => {
    const branch = index === workers.length - 1 ? '└──' : '├──';
    const label = labels[index].padEnd(width, ' ');
    lines.push(`${branch} ${iconForStatus(worker.status)} ${label} → ${detailForWorker(worker)}`);
  });

  return lines.join('\n');
}

function sanitizeNodeId(id, index) {
  const base = String(id || `worker_${index + 1}`)
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^([^a-zA-Z_])/, 'w_$1');
  return base || `worker_${index + 1}`;
}

function escapeMermaidLabel(label) {
  return String(label).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');
}

function renderMermaid(state) {
  const workers = Array.isArray(state?.workers) ? state.workers : [];
  const lines = ['```mermaid', 'graph TD', '  fleet["/ccc-fleet orchestrator"]'];
  const used = new Set(['fleet']);

  workers.forEach((worker, index) => {
    let nodeId = sanitizeNodeId(worker.id, index);
    while (used.has(nodeId)) nodeId = `${nodeId}_${index + 1}`;
    used.add(nodeId);
    const label = `${displayLabel(worker)} ${iconForStatus(worker.status)}`;
    lines.push(`  fleet --> ${nodeId}["${escapeMermaidLabel(label)}"]`);
  });

  lines.push('```');
  return lines.join('\n');
}

function allWorkersSettled(state) {
  const summary = state.summary || summarize(state.workers || []);
  return summary.total === 0 || (summary.running === 0 && summary.waiting === 0 && summary.unknown === 0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCli() {
  const stateDirArg = process.argv.find((arg) => arg.startsWith('--state-dir='));
  const stateDir = stateDirArg ? stateDirArg.slice('--state-dir='.length) : DEFAULT_STATE_DIR;
  const watch = process.argv.includes('--watch');

  for (;;) {
    const state = collectFleetState({ stateDir });
    process.stdout.write(`${renderASCII(state)}\n\n${renderMermaid(state)}\n`);
    if (!watch || allWorkersSettled(state)) break;
    await sleep(2000);
    process.stdout.write('\n');
  }
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (entrypoint && entrypoint === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

export { collectFleetState, renderASCII, renderMermaid };
