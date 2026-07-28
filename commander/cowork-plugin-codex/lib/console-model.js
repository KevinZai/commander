/**
 * console-model.js
 * The ONE data path behind every Commander deck (v7.4.0 Phase 0).
 *
 * readConsoleModel({ baseDir, now }) composes the readers that already exist —
 * mission-control-snapshot.js's readModel(), usage-snapshot.js's
 * readUsageModel(), safety-snapshot.js's readSafetyModel() — into a single
 * model whose sub-objects are EXACTLY what those readers return:
 *
 *   { missionControl, usage, safety, meta: { generatedAt, dataThrough }, errors }
 *
 * It delegates; it does not re-derive. Every log path, cap, tolerance rule and
 * dataThrough calculation stays owned by the reader that already got it right,
 * so a fix there reaches the console for free and the two can never disagree.
 * (Memory and History join in Phase 2 — this file is where they'll hang.)
 *
 * Fail-open per section: the decks exist to report on telemetry that may be
 * absent, partial or malformed, so one reader throwing must not blank the other
 * two. A failed section is `null` and gets an `errors` entry naming it; callers
 * render the zero-state for a null section exactly as they would for an empty
 * one. Nothing here throws.
 *
 * meta.dataThrough is the newest per-section dataThroughMs across the sections
 * that produced one, as an ISO string (null when no section has any data) —
 * the console header's single "Data through <timestamp>" stamp. Per-tab stamps
 * still come from each section's own dataThroughMs, because the sources have
 * genuinely different tails.
 *
 * Deterministic: `now` flows through to every reader, so a pinned clock pins
 * the whole model. Zero dependencies (beyond this plugin's own lib/), ESM,
 * read-only. Core free forever — no license check, no tier gating.
 */
import { readModel } from './mission-control-snapshot.js';
import { readSafetyModel } from './safety-snapshot.js';
import { readUsageModel } from './usage-snapshot.js';

function toMs(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// Run one section's reader, converting a throw into (null + an errors entry)
// rather than letting it take the whole model down.
async function section(name, read, errors) {
  try {
    return await read();
  } catch (error) {
    errors.push({ section: name, message: error && error.message ? error.message : String(error) });
    return null;
  }
}

/**
 * @param {object} [opts]
 * @param {string} [opts.baseDir]  telemetry root (default ~/.claude/commander)
 * @param {string|number|Date} [opts.now]  pinned clock; defaults to Date.now()
 * @param {boolean} [opts.recompute]  forwarded to readUsageModel — false skips
 *   its getMetrics() `ccusage` recompute side effect (tests, offline renders)
 * @param {Function} [opts.metricsRunner]  forwarded to readUsageModel
 */
async function readConsoleModel({ baseDir, now, recompute, metricsRunner } = {}) {
  const nowMs = toMs(now) ?? Date.now();
  const errors = [];

  // Mission Control runs FIRST, not alongside the other two: its readModel()
  // calls metrics.js's getMetrics(), which recomputes and atomically PERSISTS
  // mission-control/metrics.jsonl — the same file readUsageModel() then reads
  // for its cost-by-app split. Run concurrently, usage sees the file either
  // before or after that write depending on scheduling, so the same telemetry
  // yields two different Usage sections run to run. Sequencing the writer ahead
  // of the reader makes the composed model deterministic.
  const missionControl = await section(
    'missionControl',
    () => readModel({ baseDir, now: nowMs }),
    errors
  );
  const [usage, safety] = await Promise.all([
    section(
      'usage',
      () => readUsageModel({ baseDir, now: nowMs, recompute, metricsRunner }),
      errors
    ),
    section('safety', () => readSafetyModel({ baseDir, now: nowMs }), errors),
  ]);

  let dataThroughMs = null;
  for (const part of [missionControl, usage, safety]) {
    const ms = part && typeof part === 'object' ? toMs(part.dataThroughMs) : null;
    if (ms !== null && (dataThroughMs === null || ms > dataThroughMs)) dataThroughMs = ms;
  }

  return {
    missionControl,
    usage,
    safety,
    meta: {
      generatedAt: new Date(nowMs).toISOString(),
      dataThrough: dataThroughMs === null ? null : new Date(dataThroughMs).toISOString(),
    },
    errors,
  };
}

export { readConsoleModel };
