/**
 * charts.js
 * Zero-dependency inline-SVG chart builders for Commander Mission
 * Control's Charts strip (CC-1380 Item 3): pure string builders, no DOM,
 * no external deps. The exact same functions render BOTH the live
 * client-side charts strip (browser — dashboard/public/mission-control.js
 * imports this file, served at /charts.js by dashboard/server.js) and
 * the server-rendered, CSP-safe Artifact snapshot
 * (commander/cowork-plugin/lib/mission-control-snapshot.js's
 * buildSnapshotHtml embeds no <script>, so its charts must be pure SVG
 * markup, never canvas/JS-driven).
 *
 * Lives in commander/cowork-plugin/lib/ (not dashboard/lib/) for the
 * same reason metrics.js/top-skills.js do (see mission-control-
 * snapshot.js's module doc comment): the plugin ships WITHOUT
 * dashboard/, so any file mission-control-snapshot.js needs must live
 * inside the plugin's own lib/ tree. This file has zero I/O and no
 * domain logic that could drift between two copies, so it's a single
 * canonical file (imported directly, not duplicated) — the same
 * precedent as metrics.js/top-skills.js.
 *
 * Has NO Node built-ins (no fs/path/process) — it also runs unmodified
 * as a browser ES module, which is how dashboard/public/mission-
 * control.js consumes it (`import ... from './charts.js'`, resolved to
 * GET /charts.js by dashboard/server.js).
 *
 * sparkline(points, opts) — a thin line(+area) chart for a daily time
 * series (cost/day, agents dispatched/day, tool failures/day).
 * barStrip(points, opts) — a small bar chart for a handful of buckets
 * (tasks completed/week).
 * aggregateDaily/aggregateWeekly — pure reducers over metrics.js's
 * {date, source_app, ...} rows into the {label, value} point series the
 * two builders above expect, summed across every source_app (Claude +
 * Codex combined into one line per Item 2's public-repo scope).
 *
 * Theme-safe: every stroke/fill is `currentColor` or a caller-supplied
 * CSS custom property (e.g. `var(--mc-accent)`) — never a hardcoded hex
 * — so the SAME markup reads correctly under prefers-color-scheme AND
 * the dashboard/snapshot's :root[data-theme] override.
 *
 * Zero-state: an empty/all-zero/all-NaN series renders a flat dashed
 * baseline plus a "no data yet" caption — never a broken axis, an empty
 * `d=""` path, or a NaN coordinate in the output markup.
 *
 * Deterministic: output is a pure function of (points, opts) — no
 * Date.now(), no random ids — so snapshot-string test assertions are
 * stable across runs.
 * Core free forever — no license check, no tier gating.
 */

const DEFAULT_SPARK_WIDTH = 240;
const DEFAULT_SPARK_HEIGHT = 56;
const DEFAULT_BAR_WIDTH = 240;
const DEFAULT_BAR_HEIGHT = 56;
const PAD = 4;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WEEKS = 8;

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function num(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

// Fixed-precision, trailing-zero-trimmed coordinate formatter — keeps
// generated path/points strings short and deterministic (no floating
// point noise like `12.340000000000002`).
function fmt(value) {
  const n = Number.isFinite(value) ? value : 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

function normalizePoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => {
      if (point && typeof point === 'object') {
        return {
          label: point.label != null ? String(point.label) : '',
          value: num(point.value, NaN),
        };
      }
      return { label: '', value: num(point, NaN) };
    })
    .filter((point) => Number.isFinite(point.value));
}

function zeroStateSvg(cls, width, height, label) {
  const baselineY = height - PAD;
  return (
    `<svg class="mc-chart ${cls}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" role="img" aria-label="${esc(label)} — no data yet">` +
    `<line x1="${PAD}" y1="${baselineY}" x2="${width - PAD}" y2="${baselineY}" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="3,3"/>` +
    `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="currentColor" fill-opacity="0.55">no data yet</text>` +
    `</svg>`
  );
}

/**
 * sparkline(points, opts) -> inline <svg> string.
 * points: [{label, value}] (or plain numbers), oldest-first.
 * opts: { width, height, label (aria-label), area (bool, default true),
 *   color (CSS color or var(), default 'currentColor') }.
 * Zero/empty series -> zeroStateSvg (flat dashed baseline + caption),
 * never a NaN coordinate.
 */
function sparkline(points, opts = {}) {
  const width = num(opts.width, DEFAULT_SPARK_WIDTH);
  const height = num(opts.height, DEFAULT_SPARK_HEIGHT);
  const label = typeof opts.label === 'string' && opts.label ? opts.label : 'trend';
  const color = typeof opts.color === 'string' && opts.color ? opts.color : 'currentColor';
  const showArea = opts.area !== false;
  const series = normalizePoints(points);

  const isZero = series.length === 0 || series.every((point) => point.value === 0);
  if (isZero) return zeroStateSvg('mc-chart-spark', width, height, label);

  const max = Math.max(...series.map((point) => point.value));
  const min = Math.min(0, ...series.map((point) => point.value));
  const range = max - min || 1;
  const baselineY = height - PAD;
  const stepX = series.length > 1 ? (width - PAD * 2) / (series.length - 1) : 0;

  const coords = series.map((point, index) => ({
    x: PAD + stepX * index,
    y: height - PAD - ((point.value - min) / range) * (height - PAD * 2),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${fmt(c.x)},${fmt(c.y)}`).join('');
  const pointsAttr = coords.map((c) => `${fmt(c.x)},${fmt(c.y)}`).join(' ');
  const areaPath = showArea
    ? `${linePath}L${fmt(coords[coords.length - 1].x)},${fmt(baselineY)}L${fmt(coords[0].x)},${fmt(baselineY)}Z`
    : '';

  return (
    `<svg class="mc-chart mc-chart-spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">` +
    (showArea ? `<path d="${areaPath}" fill="${esc(color)}" fill-opacity="0.16" stroke="none"/>` : '') +
    `<polyline points="${pointsAttr}" fill="none" stroke="${esc(color)}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>` +
    `</svg>`
  );
}

/**
 * barStrip(points, opts) -> inline <svg> string, a small bar chart for a
 * handful of buckets (e.g. tasks completed per week, 8 bars).
 * points: [{label, value}], oldest-first.
 * opts: { width, height, label (aria-label), color }.
 * Zero/empty series -> zeroStateSvg, never a zero/negative bar height.
 */
function barStrip(points, opts = {}) {
  const width = num(opts.width, DEFAULT_BAR_WIDTH);
  const height = num(opts.height, DEFAULT_BAR_HEIGHT);
  const label = typeof opts.label === 'string' && opts.label ? opts.label : 'counts';
  const color = typeof opts.color === 'string' && opts.color ? opts.color : 'currentColor';
  const series = normalizePoints(points);
  const baselineY = height - PAD;

  const isZero = series.length === 0 || series.every((point) => point.value <= 0);
  if (isZero) return zeroStateSvg('mc-chart-bars', width, height, label);

  const max = Math.max(...series.map((point) => point.value), 1);
  const innerWidth = width - PAD * 2;
  const gap = series.length > 1 ? 3 : 0;
  const barWidth = Math.max(1, (innerWidth - gap * (series.length - 1)) / series.length);

  const bars = series
    .map((point, index) => {
      const barHeight = Math.max(1, (Math.max(0, point.value) / max) * (height - PAD * 2));
      const x = PAD + index * (barWidth + gap);
      const y = baselineY - barHeight;
      return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(barWidth)}" height="${fmt(barHeight)}" fill="${esc(color)}" rx="1.5"/>`;
    })
    .join('');

  return (
    `<svg class="mc-chart mc-chart-bars" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">` +
    bars +
    `</svg>`
  );
}

/**
 * aggregateDaily(metricsRows, field, days?) -> [{label: 'YYYY-MM-DD',
 * value}] ascending by date. Sums `field` across every source_app for
 * each date (Claude + Codex combined into one line). `days`, if given,
 * keeps only the most recent N dates present. Non-array input -> [].
 */
function aggregateDaily(metricsRows, field, days) {
  if (!Array.isArray(metricsRows)) return [];
  const byDate = new Map();
  for (const row of metricsRows) {
    if (!row || typeof row.date !== 'string') continue;
    const value = num(row[field], 0);
    byDate.set(row.date, (byDate.get(row.date) || 0) + value);
  }
  const sorted = [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ label: date, value }));
  return Number.isInteger(days) && days > 0 ? sorted.slice(-days) : sorted;
}

// ISO-8601 week key ('YYYY-Www') for a 'YYYY-MM-DD' date string —
// standard "Thursday of the week" algorithm, computed in UTC so it's
// stable regardless of the host's local timezone: snap the target date
// to the Thursday of its own week (the ISO year is whichever year that
// Thursday falls in), snap Jan 4 (always week 1 by ISO rule) to the
// Thursday of ITS week the same way, then the week number is the
// (always whole) number of 7-day steps between the two Thursdays, +1.
function isoWeekKey(dateStr) {
  const parsed = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return dateStr;

  const target = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
  const dayNum = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNum + 3); // Thursday of target's ISO week
  const isoYear = target.getUTCFullYear();

  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3); // Thursday of week 1

  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/**
 * aggregateWeekly(metricsRows, field, weeks = 8) -> [{label: 'YYYY-Www',
 * value}] ascending, one bucket per ISO week, capped to the most recent
 * `weeks` buckets present. Built on top of aggregateDaily (no day cap),
 * so a week is only ever partially represented if the underlying
 * metrics.jsonl window itself doesn't cover the full week.
 */
function aggregateWeekly(metricsRows, field, weeks = DEFAULT_WEEKS) {
  const daily = aggregateDaily(metricsRows, field);
  const byWeek = new Map();
  for (const point of daily) {
    const key = isoWeekKey(point.label);
    byWeek.set(key, (byWeek.get(key) || 0) + point.value);
  }
  const sorted = [...byWeek.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
  return Number.isInteger(weeks) && weeks > 0 ? sorted.slice(-weeks) : sorted;
}

export { aggregateDaily, aggregateWeekly, barStrip, sparkline };
