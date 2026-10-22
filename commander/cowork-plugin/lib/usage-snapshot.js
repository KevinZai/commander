/**
 * usage-snapshot.js
 * Static HTML snapshot renderer for the "Usage & Cost" Commander deck.
 *
 * buildUsageHtml(model, { now }) turns a usage model ({ totalSavedUsd,
 * totalActualUsd, totalBaselineUsd, totalDispatches, savingsSeries,
 * costSeries, costByApp, generatedAt }) into ONE self-contained HTML
 * string: inline CSS, inline data, no <script>, no external URLs of any
 * kind — safe for the strict-CSP Artifact target. Emitted as a fragment
 * (<title> + <style> + terminal chrome + <main>) exactly like
 * ./mission-control-snapshot.js's buildSnapshotHtml — the Artifact
 * publisher supplies the doctype/head/body skeleton; browsers render the
 * raw file fine too. Theme-aware via brand-css.js's prefers-color-scheme
 * cascade with :root[data-theme] overrides.
 *
 * Since v7.4.0 the markup itself lives in ./console-render.js — buildUsageHtml
 * is a one-line delegation to buildDeckHtml(model, {tab: 'usage'}), so this
 * deck, Mission Control, Safety and the v7.4.0 console render from one section
 * renderer instead of four copies. The exported signature is unchanged;
 * equivalence is pinned byte-for-byte by
 * commander/tests/console-extraction.test.js. What remains here is the READER.
 *
 * readUsageModel({ baseDir, now }) is a self-contained, bounded, tolerant
 * reader over two local logs under baseDir (default ~/.claude/commander):
 *
 *   - savings.json — written by ../../lib/savings.js's recordDispatch().
 *     Shape: { days: { "YYYY-MM-DD": { actualUsd, baselineUsd, savedUsd,
 *     dispatches } } }. A `total` field may also be present (savings.js
 *     writes one), but this reader deliberately re-sums from `days` on
 *     every read rather than trusting `total` — the spec for this file
 *     only promises the `days` shape, and summing fresh avoids ever
 *     drifting from a stale/partial `total` bucket. Feeds the hero
 *     (cumulative $ saved + dispatch count) and the Saved/day chart.
 *
 *   - mission-control/metrics.jsonl — one row per (date, source_app):
 *     { date, source_app, cost_usd, agents_dispatched, tasks_completed,
 *     tool_failures, sessions }. Read directly here (not via ./metrics.js's
 *     getMetrics(), which shells out to `ccusage` and gap-fills a window)
 *     — this deck only needs a sum-by-source_app and a daily rollup, both
 *     of which ./charts.js's aggregateDaily already does over raw rows.
 *     Feeds the Cost-by-app panel and the Cost/day chart.
 *
 * Charts reuse the SAME sparkline builder from ./charts.js the live
 * dashboard and Mission Control snapshot use — server-rendered inline
 * SVG, no <script>, CSP-safe (see that file's doc comment). The shared
 * deck strip (./deck-switcher.js) renders first inside <main> so a viewer
 * can discover Commander's other decks. Both now happen in
 * ./console-render.js; this file just supplies the series they plot.
 *
 * Honesty rule (mirrors savings.js's own disclaimer): every $ figure
 * here is an ESTIMATE vs an all-Opus 4.8 baseline, ±30% — never actual
 * Anthropic billing data. Absent/partial/malformed source files degrade
 * to an honest zero-state panel, never a fabricated number and never a
 * crash.
 *
 * Metrics recompute (v7.3.0, W2+/codex 6): readUsageModel() triggers
 * ./metrics.js's getMetrics() as a side effect before reading
 * metrics.jsonl itself — getMetrics() shells out to `ccusage`, computes
 * fresh daily rows, and atomically persists the merged result back to
 * the same file (see metrics.js's persistMerged doc comment). This deck
 * used to ONLY read whatever was already on disk, which could be
 * arbitrarily stale if nothing else had polled getMetrics() recently
 * (e.g. the live dashboard was never opened this session). The recompute
 * result itself is discarded — this file still reads + aggregates
 * metrics.jsonl through its OWN byte-bounded reader below (readJsonl/
 * readTailText), unchanged, because that is the tolerant/bounded shape
 * this deck's cost-by-app + daily-rollup logic already depends on and
 * tests pin. `recompute` defaults to true; pass `recompute:false` (or an
 * injected `metricsRunner`) to skip/stub the real `ccusage` spawn in
 * tests — see metrics.js's own test suite for the same `runner`
 * injection seam.
 *
 * Deterministic rendering: every timestamp derives from the model or the
 * `now` argument — never Date.now() inside buildUsageHtml.
 * Zero dependencies (beyond this plugin's own lib/), ESM, read-only,
 * fail-open.
 * Core free forever — no license check, no tier gating.
 */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { aggregateDaily } from './charts.js';
import { buildDeckHtml } from './console-render.js';
import { getMetrics } from './metrics.js';

const MAX_JSONL_LINES = 5000; // same bounded-scan cap as mission-control-snapshot.js
const MAX_JSONL_BYTES = 8 * 1024 * 1024; // read at most the trailing 8MB — the producer never rotates these logs
const SAVINGS_DAYS_CAP = 30;
const COST_DAYS_CAP = 30;
const SAVINGS_STALE_MS = 7 * 24 * 60 * 60 * 1000; // savings-source honesty note threshold (W2+/codex 6)

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

function num(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

// Read at most the trailing maxBytes of a file. Keeps an unrotated,
// ever-growing append-only log from being slurped whole into memory. The
// leading line of the window may be partial (the cut can land mid-record) —
// that's left as-is on purpose: readJsonl's JSON.parse tolerance drops an
// unparseable partial line, while a record that begins exactly at the byte
// boundary is preserved rather than being wrongly discarded.
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
  } catch {
    return '';
  } finally {
    await handle.close();
  }
}

// Bounded-scan discipline (mirrors mission-control-snapshot.js's readJsonl):
// only the most recent maxLines non-empty lines are parsed — a file that
// has grown past the cap silently undercounts older entries. The read is
// also byte-bounded (readTailText) so a huge log can't OOM the render.
async function readJsonl(filePath, maxLines = MAX_JSONL_LINES) {
  const raw = await readTailText(filePath, MAX_JSONL_BYTES);
  if (!raw) return [];

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

// savings.json is a single JSON object, not JSONL — tolerant read: any
// missing file, unreadable file, or malformed JSON degrades to an empty
// { days: {} } rather than throwing.
async function readSavingsJson(filePath) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.days === 'object' && parsed.days !== null) {
      return parsed;
    }
    return { days: {} };
  } catch {
    return { days: {} };
  }
}

// {"YYYY-MM-DD": {...}} -> ascending [{label, value}], capped to the most
// recent capDays entries. Non-numeric/malformed day buckets contribute 0.
function dailySeriesFromDays(days, field, capDays) {
  if (!days || typeof days !== 'object') return [];
  const entries = Object.entries(days)
    .filter(([date, value]) => typeof date === 'string' && value && typeof value === 'object')
    .map(([date, value]) => ({ label: date, value: num(value[field], 0) }))
    .sort((left, right) => left.label.localeCompare(right.label));
  return Number.isInteger(capDays) && capDays > 0 ? entries.slice(-capDays) : entries;
}

// Latest-wins merge by (date, source_app) — mirrors metrics.js's
// readMetrics()/latestByDateSource(). A metrics.jsonl carries repeated
// recomputations of the same day (each poll's buildMetrics appends a fresh
// line), so summing raw rows double-counts spend. The last-appended row for
// a given (date, source_app) wins, exactly as the canonical reader does — so
// the Usage deck's totals match the dashboard's. Rows missing either merge
// key are dropped, again matching the canonical reader.
function latestByDateSource(rows) {
  const byKey = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object') continue;
    if (typeof row.date !== 'string' || typeof row.source_app !== 'string') continue;
    byKey.set(`${row.date}::${row.source_app}`, row);
  }
  return [...byKey.values()];
}

async function readUsageModel({ baseDir, now, recompute = true, metricsRunner } = {}) {
  const root = baseDir || defaultBaseDir();
  const nowMs = toMs(now) ?? Date.now();

  if (recompute) {
    // Trigger the canonical recompute+persist path (metrics.js's getMetrics())
    // before reading metrics.jsonl ourselves — see this file's doc comment.
    // Side-effect only: the resolved rows are discarded here. Never let a
    // failed recompute (missing ccusage binary, offline, etc.) block the deck.
    await getMetrics({ baseDir: root, now: nowMs, runner: metricsRunner }).catch(() => []);
  }

  const [savingsRaw, metricsRawRows] = await Promise.all([
    readSavingsJson(path.join(root, 'savings.json')),
    readJsonl(path.join(root, 'mission-control', 'metrics.jsonl')),
  ]);
  const metricsRows = latestByDateSource(metricsRawRows);

  const days = savingsRaw.days;

  let totalSavedUsd = 0;
  let totalActualUsd = 0;
  let totalBaselineUsd = 0;
  let totalDispatches = 0;
  for (const value of Object.values(days)) {
    if (!value || typeof value !== 'object') continue;
    totalSavedUsd += num(value.savedUsd, 0);
    totalActualUsd += num(value.actualUsd, 0);
    totalBaselineUsd += num(value.baselineUsd, 0);
    totalDispatches += num(value.dispatches, 0);
  }

  const savingsSeries = dailySeriesFromDays(days, 'savedUsd', SAVINGS_DAYS_CAP);

  const costByAppMap = new Map();
  for (const row of metricsRows) {
    if (!row || typeof row !== 'object') continue;
    const sourceApp = typeof row.source_app === 'string' && row.source_app.trim() ? row.source_app.trim() : 'claude-code';
    costByAppMap.set(sourceApp, (costByAppMap.get(sourceApp) || 0) + num(row.cost_usd, 0));
  }
  const totalAppCostUsd = [...costByAppMap.values()].reduce((sum, value) => sum + value, 0);
  const costByApp = [...costByAppMap.entries()]
    .map(([sourceApp, costUsd]) => ({
      sourceApp,
      costUsd,
      pct: totalAppCostUsd > 0 ? (costUsd / totalAppCostUsd) * 100 : 0,
    }))
    .sort((left, right) => right.costUsd - left.costUsd);

  const costSeries = aggregateDaily(metricsRows, 'cost_usd', COST_DAYS_CAP);

  // dataThrough (v7.3.0, Item 6): newest source-row timestamp across this
  // deck's own sources — savings.json's day-keys and metrics.jsonl's `date`
  // rows are both daily-granularity (not full timestamps), so each day-key
  // is treated as that day's UTC midnight via the same toMs() used
  // everywhere else in this file. hasAnySourceRow distinguishes "never
  // written" (zero-state) from "written, but stale" (warning banner).
  const dayKeys = Object.keys(days || {});
  let dataThroughMs = null;
  for (const key of dayKeys) {
    const ms = toMs(key);
    if (ms !== null && (dataThroughMs === null || ms > dataThroughMs)) dataThroughMs = ms;
  }
  // Metrics rows only count as telemetry when they carry ACTUAL activity.
  // getMetrics() gap-fills the window with all-zero rows on every read
  // (including "today"), so an unfiltered newest-`date` scan would stamp a
  // dead install as fresh-as-of-now and suppress the stale warning — the
  // exact failure the banner exists to expose.
  const metricsRowHasActivity = (row) =>
    row &&
    typeof row === 'object' &&
    ['cost_usd', 'agents_dispatched', 'tasks_completed', 'tool_failures', 'sessions'].some(
      (field) => Number.isFinite(row[field]) && row[field] > 0
    );
  let activeMetricsRows = 0;
  for (const row of metricsRawRows) {
    if (!metricsRowHasActivity(row)) continue;
    activeMetricsRows += 1;
    const ms = toMs(row.date);
    if (ms !== null && (dataThroughMs === null || ms > dataThroughMs)) dataThroughMs = ms;
  }
  const hasAnySourceRow = dayKeys.length > 0 || activeMetricsRows > 0;

  // Savings-source honesty (W2+/codex 6): savings.json is ONLY ever written
  // by the legacy CLI dispatcher (commander/lib/savings.js) — plugin-native
  // agent runs never touch it. "Stale" here means no day bucket within the
  // last 7 days (or the file was never written at all).
  let newestSavingsDayMs = null;
  for (const key of dayKeys) {
    const ms = toMs(key);
    if (ms !== null && (newestSavingsDayMs === null || ms > newestSavingsDayMs)) newestSavingsDayMs = ms;
  }
  const savingsStale = newestSavingsDayMs === null || nowMs - newestSavingsDayMs > SAVINGS_STALE_MS;

  return {
    totalSavedUsd,
    totalActualUsd,
    totalBaselineUsd,
    totalDispatches,
    savingsSeries,
    costSeries,
    costByApp,
    dataThroughMs,
    hasAnySourceRow,
    savingsStale,
    generatedAt: new Date(nowMs).toISOString(),
  };
}

// The deck page — chrome, CSS, and every section — is rendered by
// ./console-render.js. This wrapper exists so the skill-facing entry point and
// its signature are unchanged.
function buildUsageHtml(model, { now } = {}) {
  return buildDeckHtml(model, { tab: 'usage', surface: 'artifact', now });
}

export { buildUsageHtml, readUsageModel };
