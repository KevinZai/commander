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

const MAX_JSONL_LINES = 5000; // same bounded-scan cap as mission-control-snapshot.js
const ROW_CAP = 30;
const SAVINGS_DAYS_CAP = 30;
const COST_DAYS_CAP = 30;

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

// Bounded-scan discipline (mirrors mission-control-snapshot.js's readJsonl):
// only the most recent maxLines non-empty lines are parsed — a file that
// has grown past the cap silently undercounts older entries.
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

async function readUsageModel({ baseDir, now } = {}) {
  const root = baseDir || defaultBaseDir();
  const nowMs = toMs(now) ?? Date.now();

  const [savingsRaw, metricsRows] = await Promise.all([
    readSavingsJson(path.join(root, 'savings.json')),
    readJsonl(path.join(root, 'mission-control', 'metrics.jsonl')),
  ]);

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

  return {
    totalSavedUsd,
    totalActualUsd,
    totalBaselineUsd,
    totalDispatches,
    savingsSeries,
    costSeries,
    costByApp,
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
.uc .stamp{color:var(--uc-muted);margin:0 0 18px;font-size:.86rem;}
.uc section{background:var(--uc-card);border:1px solid var(--uc-line);
  border-radius:12px;padding:16px;margin-bottom:16px;}
.uc .hero{border-color:var(--uc-accent);}
.uc .hero-line{font-size:1.12rem;margin:0 0 8px;}
.uc .hero-amount{color:var(--uc-ok);font-size:1.3em;font-weight:700;}
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

function renderHeroSection(totalSavedUsd, totalDispatches) {
  if (!Number.isFinite(totalDispatches) || totalDispatches <= 0) {
    return `<section aria-label="Savings summary">
<p class="zero">💰 No savings data yet — dispatch a task and Commander starts tracking what delegating to cheaper models saved you.</p>
</section>`;
  }

  const savedLabel = formatUsd(totalSavedUsd);
  const dispatchCount = Math.max(0, Math.round(totalDispatches));

  return `<section aria-label="Savings summary" class="hero">
<p class="hero-line">Delegating to cheaper models saved you <span class="hero-amount">${esc(savedLabel)}</span> across ${esc(dispatchCount)} dispatch${dispatchCount === 1 ? '' : 'es'}.</p>
<p class="muted disclaimer">Estimates vs an all-Opus 4.8 baseline, ±30%. Not actual Anthropic billing data.</p>
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

  return `<section aria-label="Cost by app">
<h2>🧮 Cost by app</h2>
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
  const nowMs = toMs(now) ?? toMs(source.generatedAt);

  return `<meta charset="utf-8">
<title>Commander Usage &amp; Cost</title>
<style>${brandBaseCss()}${deckStripCss()}${USAGE_CSS}</style>
${renderTerminalChromeOpen()}
<main class="uc">
${deckStripHtml('usage', { interactive: false })}
<header>
<h1>💰 Commander Usage &amp; Cost</h1>
<p class="stamp">Static snapshot${Number.isFinite(nowMs) ? ` · ${esc(stamp(nowMs))}` : ''}</p>
</header>
${renderHeroSection(totalSavedUsd, totalDispatches)}
${renderChartsSection(savingsSeries, costSeries)}
${renderCostByAppSection(costByApp)}
<footer>🔒 Built from local logs in ~/.claude/commander. If published, the displayed data leaves this machine for your private artifact URL.</footer>
</main>
${TERMINAL_CHROME_CLOSE}`;
}

export { buildUsageHtml, readUsageModel };
