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
 * SVG, no <script>, CSP-safe (see that file's doc comment).
 *
 * The shared deck strip (./deck-switcher.js) renders first inside <main>
 * so a viewer can discover Commander's other decks (Cockpit, Mission
 * Control, Safety). Rendered with interactive:false — like Mission
 * Control, this file emits no <script>, so the deck chips are plain
 * <span> elements showing the /ccc-* command as text, not a live-copy
 * button.
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

import { brandBaseCss } from './brand-css.js';
import { aggregateDaily, sparkline } from './charts.js';
import { deckStripCss, deckStripHtml } from './deck-switcher.js';
import { getMetrics } from './metrics.js';

const MAX_JSONL_LINES = 5000; // same bounded-scan cap as mission-control-snapshot.js
const MAX_JSONL_BYTES = 8 * 1024 * 1024; // read at most the trailing 8MB — the producer never rotates these logs
const ROW_CAP = 30;
const SAVINGS_DAYS_CAP = 30;
const COST_DAYS_CAP = 30;
// v7.3.0 staleness banner threshold. 48h, NOT 24h, deliberately: this deck's
// sources are DAY-granularity (savings.json day-keys, metrics.jsonl `date`
// rows), each treated as its UTC midnight — a genuinely-fresh "yesterday"
// bucket is already up to ~24h old at comparison time, so a 24h threshold
// would false-flag fresh data every day right after midnight UTC.
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;
const SAVINGS_STALE_MS = 7 * 24 * 60 * 60 * 1000; // savings-source honesty note threshold (W2+/codex 6)
const DOCTOR_POINTER =
  'Run /ccc-doctor to check your hooks are wired. (macOS Desktop: update the plugin to ≥7.2.0 — hook fix.)';

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

// Mirrors mission-control-snapshot.js's timeAgo() — duplicated per this
// file's own doc-comment convention (small, self-contained helpers are
// copied, not imported, across this lib/ tree).
function timeAgo(tsMs, nowMs) {
  if (!Number.isFinite(tsMs) || !Number.isFinite(nowMs)) return '';
  const delta = nowMs - tsMs;
  if (delta < 45 * 1000) return 'just now';
  if (delta < 60 * 60 * 1000) return `${Math.max(1, Math.round(delta / 60000))}m ago`;
  if (delta < 24 * 60 * 60 * 1000) return `${Math.round(delta / 3600000)}h ago`;
  return `${Math.round(delta / 86400000)}d ago`;
}

function sourceSlug(value) {
  const trimmed = String(value || 'claude-code').trim().toLowerCase();
  const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'claude-code';
}

function formatUsd(value) {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(value) {
  const n = Number.isFinite(value) ? value : 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Same --uc-* forwarding-token pattern mission-control-snapshot.js uses
// for --mc-*: every color is a `var()` reference into brand-css.js's
// :root cascade, so light/dark/data-theme switching needs zero extra
// logic here.
const USAGE_CSS = `
:root{
  --uc-bg:var(--bg);--uc-card:var(--bg-card);--uc-fg:var(--text);--uc-muted:var(--text-dim);
  --uc-line:var(--border);--uc-accent:var(--primary);
  --uc-ok:var(--green-dot);--uc-ok-bg:color-mix(in srgb,var(--green-dot) 16%,transparent);
  --uc-warn:var(--red-dot,#e5484d);
}
body{margin:0;background:var(--uc-bg);color:var(--uc-fg);}
.uc-shell{max-width:1080px;margin:20px auto 40px;}
.uc-shell .terminal-title{letter-spacing:0.03em;}
.uc{padding:20px 16px 40px;
  font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--uc-fg);}
.uc *{box-sizing:border-box;}
.uc h1{font-size:1.45rem;margin:0 0 2px;}
.uc h2{font-size:1.02rem;margin:0 0 10px;}
.uc .tf-note{color:var(--uc-muted);font-size:.75em;font-weight:400;}
.uc .stamp{color:var(--uc-muted);margin:0 0 18px;font-size:.86rem;}
.uc section{background:var(--uc-card);border:1px solid var(--uc-line);
  border-radius:12px;padding:16px;margin-bottom:16px;}
.uc .hero{border-color:var(--uc-accent);}
.uc .hero-line{font-size:1.12rem;margin:0 0 8px;}
.uc .hero-amount{color:var(--uc-ok);font-size:1.3em;font-weight:700;}
.uc .hero-negative{border-color:var(--uc-warn);}
.uc .hero-negative .hero-amount{color:var(--uc-warn);}
.uc .stale-banner{border-color:var(--uc-warn);background:color-mix(in srgb,var(--uc-warn) 12%,transparent);}
.uc .stale-banner p{margin:0;color:var(--uc-warn);font-size:.9rem;}
.uc .disclaimer{margin:0;font-size:.8rem;}
.uc .muted{color:var(--uc-muted);}
.uc .zero{color:var(--uc-muted);margin:0;}
.uc .chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;}
.uc .chart-card{border:1px solid var(--uc-line);border-radius:10px;padding:10px 12px 8px;min-width:0;}
.uc .chart-card h3{margin:0 0 6px;font-size:.8rem;font-weight:600;color:var(--uc-muted);}
.uc .mc-chart{display:block;width:100%;height:auto;color:var(--uc-accent);}
.uc .cost-list{margin:0;padding:0;list-style:none;}
.uc .cost-row{padding:8px 0;border-bottom:1px solid var(--uc-line);}
.uc .cost-row:last-child{border-bottom:none;}
.uc .cost-row-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;}
.uc .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.84rem;}
.uc .src{display:inline-block;border:1px solid var(--uc-line);border-radius:999px;
  padding:0 8px;font-size:.72rem;font-weight:600;color:var(--uc-muted);
  background:var(--uc-line);white-space:nowrap;}
.uc .src-claude-code{color:var(--uc-accent);border-color:var(--uc-accent);
  background:color-mix(in srgb,var(--uc-accent) 16%,transparent);}
.uc .cost-bar-track{height:6px;border-radius:999px;background:var(--uc-line);overflow:hidden;}
.uc .cost-bar-fill{height:100%;background:var(--uc-accent);border-radius:999px;}
.uc footer{color:var(--uc-muted);font-size:.82rem;text-align:center;}
@media (max-width:560px){.uc{padding:16px 10px 32px;}.uc section{padding:12px;}}
`;

// Terminal-window chrome wraps the whole board, same component the
// Cockpit and Mission Control snapshot use.
function renderTerminalChromeOpen() {
  return `<div class="terminal-chrome uc-shell">
<div class="terminal-header">
<span class="terminal-dot red" aria-hidden="true"></span><span class="terminal-dot yellow" aria-hidden="true"></span><span class="terminal-dot green" aria-hidden="true"></span>
<span class="terminal-title">commander &middot; usage</span>
</div>`;
}

const TERMINAL_CHROME_CLOSE = '</div>';

// Staleness warning banner (v7.3.0, Item 6) — only rendered when at least
// one source row exists but the newest one is older than the threshold.
// The fully-empty case (no source rows at all) is handled separately by
// appending DOCTOR_POINTER to the hero's zero-state, not this banner.
function renderStalenessBanner(dataThroughMs, nowMs) {
  if (!Number.isFinite(dataThroughMs) || !Number.isFinite(nowMs)) return '';
  if (nowMs - dataThroughMs <= STALE_THRESHOLD_MS) return '';
  return `<section aria-label="Telemetry freshness" class="stale-banner">
<p>⚠️ Telemetry last written ${esc(timeAgo(dataThroughMs, nowMs))} — hooks may not be running. Run /ccc-doctor. (macOS Desktop: update the plugin to ≥7.2.0 — hook fix.)</p>
</section>`;
}

// Savings-source honesty sub-note (W2+/codex 6) — only shown when
// savings.json has no day bucket within the last 7 days (or was never
// written), since savings.json is exclusively a legacy-CLI-dispatcher signal.
function renderSavingsSourceNote(savingsStale) {
  if (!savingsStale) return '';
  return '<p class="muted disclaimer">Savings tracking currently comes from CLI dispatches — plugin-native agent runs aren\'t counted yet.</p>';
}

function renderHeroSection(totalSavedUsd, totalDispatches, { savingsStale = false, hasAnySourceRow = true } = {}) {
  if (!Number.isFinite(totalDispatches) || totalDispatches <= 0) {
    const doctorNote = hasAnySourceRow ? '' : ` ${DOCTOR_POINTER}`;
    return `<section aria-label="Savings summary">
<p class="zero">💰 No savings data yet — dispatch a task and Commander starts tracking what delegating to cheaper models saved you.${esc(doctorNote)}</p>
${renderSavingsSourceNote(savingsStale)}
</section>`;
  }

  const dispatchCount = Math.max(0, Math.round(totalDispatches));
  const dispatchWord = `dispatch${dispatchCount === 1 ? '' : 'es'}`;
  const disclaimer = '<p class="muted disclaimer">Estimates vs an all-Opus 4.8 baseline, ±30%. Not actual Anthropic billing data.</p>';
  const savingsNote = renderSavingsSourceNote(savingsStale);

  // Negative "savings" is legitimate — delegation that ran pricier than the
  // all-Opus baseline. Render it honestly as an extra cost (warn-coloured),
  // not as green success copy reading "saved you -$3.50".
  if (Number.isFinite(totalSavedUsd) && totalSavedUsd < 0) {
    const overLabel = formatUsd(Math.abs(totalSavedUsd));
    return `<section aria-label="Savings summary" class="hero hero-negative">
<p class="hero-line">Delegation cost <span class="hero-amount">${esc(overLabel)}</span> more than an all-Opus 4.8 baseline across ${esc(dispatchCount)} ${dispatchWord}.</p>
${disclaimer}
${savingsNote}
</section>`;
  }

  const savedLabel = formatUsd(totalSavedUsd);
  return `<section aria-label="Savings summary" class="hero">
<p class="hero-line">Delegating to cheaper models saved you <span class="hero-amount">${esc(savedLabel)}</span> across ${esc(dispatchCount)} ${dispatchWord}.</p>
${disclaimer}
${savingsNote}
</section>`;
}

// Same sparkline builder Mission Control's Charts strip uses — see
// ./charts.js's doc comment for why it's one canonical module.
function renderChartsSection(savingsSeries, costSeries) {
  const cards = [
    [
      '💵 Saved / day (30d)',
      sparkline(savingsSeries, { label: 'Amount saved per day, last 30 days', color: 'var(--uc-ok)' }),
    ],
    [
      '💳 Cost / day (30d)',
      sparkline(costSeries, { label: 'Dispatch cost per day, last 30 days', color: 'var(--uc-accent)' }),
    ],
  ];

  return `<section aria-label="Trends">
<h2>📈 Trends</h2>
<div class="chart-grid">${cards.map(([title, svg]) => `<div class="chart-card"><h3>${esc(title)}</h3>${svg}</div>`).join('')}</div>
</section>`;
}

function renderCostByAppSection(costByApp) {
  const rows = Array.isArray(costByApp) ? costByApp : [];
  const hasData = rows.some((row) => Number.isFinite(row.costUsd) && row.costUsd > 0);

  if (!hasData) {
    return `<section aria-label="Cost by app">
<h2>🧮 Cost by app</h2>
<p class="zero">No cost data yet.</p>
</section>`;
  }

  const items = rows.slice(0, ROW_CAP).map((row) => {
    const pct = Number.isFinite(row.pct) ? row.pct : 0;
    const widthPct = Math.max(0, Math.min(100, pct));
    return `<li class="cost-row">
<div class="cost-row-head"><span class="src src-${sourceSlug(row.sourceApp)}">${esc(row.sourceApp)}</span><span class="mono">${esc(formatUsd(row.costUsd))} &middot; ${esc(fmtPct(pct))}%</span></div>
<div class="cost-bar-track"><div class="cost-bar-fill" style="width:${fmtPct(widthPct)}%"></div></div>
</li>`;
  });

  const overflow =
    rows.length > ROW_CAP
      ? `<p class="muted">…and ${rows.length - ROW_CAP} more app${rows.length - ROW_CAP === 1 ? '' : 's'}.</p>`
      : '';

  // Timeframe label matters: the Trends charts above are explicitly 30-day,
  // but this breakdown totals all retained metrics history. Label it so a
  // large all-time total isn't misread as a 30-day figure.
  return `<section aria-label="Cost by app">
<h2>🧮 Cost by app <span class="tf-note">· all time (retained history)</span></h2>
<ul class="cost-list">${items.join('')}</ul>${overflow}
</section>`;
}

function buildUsageHtml(model, { now } = {}) {
  const source = model && typeof model === 'object' ? model : {};
  const totalSavedUsd = Number.isFinite(source.totalSavedUsd) ? source.totalSavedUsd : 0;
  const totalDispatches = Number.isFinite(source.totalDispatches) ? source.totalDispatches : 0;
  const savingsSeries = Array.isArray(source.savingsSeries) ? source.savingsSeries : [];
  const costSeries = Array.isArray(source.costSeries) ? source.costSeries : [];
  const costByApp = Array.isArray(source.costByApp) ? source.costByApp : [];
  const dataThroughMs = Number.isFinite(source.dataThroughMs) ? source.dataThroughMs : null;
  const hasAnySourceRow = source.hasAnySourceRow !== false;
  const savingsStale = source.savingsStale === true;
  const nowMs = toMs(now) ?? toMs(source.generatedAt);
  const dataThroughLine =
    dataThroughMs !== null ? ` · Data through: ${esc(stamp(dataThroughMs))}` : '';

  return `<meta charset="utf-8">
<title>Commander Usage &amp; Cost</title>
<style>${brandBaseCss()}${deckStripCss()}${USAGE_CSS}</style>
${renderTerminalChromeOpen()}
<main class="uc">
${deckStripHtml('usage', { interactive: false })}
<header>
<h1>💰 Commander Usage &amp; Cost</h1>
<p class="stamp">Static snapshot${Number.isFinite(nowMs) ? ` · ${esc(stamp(nowMs))}` : ''}${dataThroughLine}</p>
</header>
${renderStalenessBanner(dataThroughMs, nowMs)}
${renderHeroSection(totalSavedUsd, totalDispatches, { savingsStale, hasAnySourceRow })}
${renderChartsSection(savingsSeries, costSeries)}
${renderCostByAppSection(costByApp)}
<footer>🔒 Built from local logs in ~/.claude/commander. If published, the displayed data leaves this machine for your private artifact URL.</footer>
</main>
${TERMINAL_CHROME_CLOSE}`;
}

export { buildUsageHtml, readUsageModel };
