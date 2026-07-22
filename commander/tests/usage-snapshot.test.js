// Pins the Usage & Cost snapshot library: commander/cowork-plugin/lib/
// usage-snapshot.js must render ONE self-contained, strict-CSP-safe HTML
// string (inline CSS, no scripts, no external URLs) from a usage model,
// and its readUsageModel() must tolerantly sum ~/.claude/commander/
// savings.json's { days } bucket + read mission-control/metrics.jsonl for
// a cost-by-app split — without crashing on an absent baseDir.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const LIB = '../cowork-plugin/lib/usage-snapshot.js';

async function loadLib() {
  return import(LIB);
}

const FIXED_NOW = '2026-07-20T12:00:00.000Z';

// readUsageModel() triggers metrics.js's getMetrics() recompute by default
// (v7.3.0) — never touch the real `ccusage` binary or the real machine's
// ~/.claude/commander state from these tests. Every readUsageModel() call
// below passes recompute:false, which skips the getMetrics() side effect
// entirely and reads metrics.jsonl exactly as the test fixture wrote it.
// See mission-metrics.test.js's zeroRunner for the sibling injection
// pattern (that one stubs the runner instead of skipping the recompute
// outright — either is a valid seam; this file's tests assert exact $
// figures from a hand-crafted metrics.jsonl, so skipping the recompute
// +persist side effect entirely is the simpler, safer choice here).

let tmpRoot;

before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-usage-snapshot-'));
});

after(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { force: true, recursive: true });
});

async function makeBase({ savings, metrics } = {}) {
  const dir = await fs.mkdtemp(path.join(tmpRoot, 'base-'));
  if (savings) {
    await fs.writeFile(path.join(dir, 'savings.json'), JSON.stringify(savings));
  }
  if (metrics) {
    const mcDir = path.join(dir, 'mission-control');
    await fs.mkdir(mcDir, { recursive: true });
    const lines = metrics.map((row) => JSON.stringify(row)).join('\n') + '\n';
    await fs.writeFile(path.join(mcDir, 'metrics.jsonl'), lines);
  }
  return dir;
}

const SAMPLE_SAVINGS = {
  days: {
    '2026-07-18': { actualUsd: 0.5, baselineUsd: 2, savedUsd: 1.5, dispatches: 3 },
    '2026-07-19': { actualUsd: 0.25, baselineUsd: 1, savedUsd: 0.75, dispatches: 2 },
  },
};

const SAMPLE_METRICS = [
  { date: '2026-07-18', source_app: 'claude-code', cost_usd: 1.2, agents_dispatched: 3, tasks_completed: 2, tool_failures: 0, sessions: 1 },
  { date: '2026-07-18', source_app: 'codex', cost_usd: 0.3, agents_dispatched: 1, tasks_completed: 1, tool_failures: 0, sessions: 1 },
  { date: '2026-07-19', source_app: 'claude-code', cost_usd: 0.8, agents_dispatched: 2, tasks_completed: 1, tool_failures: 1, sessions: 1 },
];

describe('readUsageModel — savings.json summing', () => {
  it('sums saved $, actual $, baseline $ and dispatches across all days', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    assert.equal(model.totalSavedUsd, 2.25); // 1.5 + 0.75
    assert.equal(model.totalActualUsd, 0.75); // 0.5 + 0.25
    assert.equal(model.totalBaselineUsd, 3); // 2 + 1
    assert.equal(model.totalDispatches, 5); // 3 + 2
  });

  it('builds an ascending per-day savings series from the days bucket', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    assert.deepEqual(model.savingsSeries, [
      { label: '2026-07-18', value: 1.5 },
      { label: '2026-07-19', value: 0.75 },
    ]);
  });

  it('re-sums from days even if a stale total field is present, never trusting it', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await makeBase({
      savings: { ...SAMPLE_SAVINGS, total: { actualUsd: 999, baselineUsd: 999, savedUsd: 999, dispatches: 999 } },
    });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    assert.equal(model.totalSavedUsd, 2.25);
    assert.equal(model.totalDispatches, 5);
  });
});

describe('readUsageModel — cost by app', () => {
  it('sums cost_usd per source_app, sorted descending, with correct percentages', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    // claude-code: 1.2 + 0.8 = 2.0, codex: 0.3 — total 2.3
    assert.equal(model.costByApp.length, 2);
    assert.equal(model.costByApp[0].sourceApp, 'claude-code');
    assert.equal(model.costByApp[0].costUsd, 2);
    assert.ok(Math.abs(model.costByApp[0].pct - (2 / 2.3) * 100) < 1e-9);
    assert.equal(model.costByApp[1].sourceApp, 'codex');
    assert.equal(model.costByApp[1].costUsd, 0.3);
    assert.ok(Math.abs(model.costByApp[1].pct - (0.3 / 2.3) * 100) < 1e-9);
  });

  it('builds a daily cost series summed across every source_app', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    assert.deepEqual(model.costSeries, [
      { label: '2026-07-18', value: 1.5 }, // 1.2 + 0.3
      { label: '2026-07-19', value: 0.8 },
    ]);
  });
});

describe('readUsageModel — latest-wins dedupe by (date, source_app)', () => {
  it('does NOT double-count repeated recomputations of the same day+app (last row wins)', async () => {
    const { readUsageModel } = await loadLib();
    // metrics.jsonl carries one $1 row then a $9 recompute for the same
    // (date, source_app). The canonical readMetrics() reports $9; a naive
    // sum would report $10. Both cost-by-app AND the daily series must dedupe.
    const baseDir = await makeBase({
      metrics: [
        { date: '2026-07-18', source_app: 'codex', cost_usd: 1 },
        { date: '2026-07-18', source_app: 'codex', cost_usd: 9 },
      ],
    });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    assert.equal(model.costByApp.length, 1);
    assert.equal(model.costByApp[0].sourceApp, 'codex');
    assert.equal(model.costByApp[0].costUsd, 9);
    assert.deepEqual(model.costSeries, [{ label: '2026-07-18', value: 9 }]);
  });
});

describe('readUsageModel — 8MB tail boundary', () => {
  it('keeps a valid record beginning exactly at the byte-window edge (not dropped)', async () => {
    const { readUsageModel } = await loadLib();
    const MAX = 8 * 1024 * 1024; // must match MAX_JSONL_BYTES in the lib
    const boundary = JSON.stringify({ date: '2026-07-18', source_app: 'boundary', cost_usd: 7 }) + '\n';
    // Large junk lines (4KB, invalid JSON → skipped) so the 8MiB tail holds
    // ~2k lines — under the 5000-line cap — and the boundary record stays in
    // scope; a small-line fill would evict it by the line cap and mask the bug.
    const junk = 'x'.repeat(4095) + '\n';
    const avail = MAX - Buffer.byteLength(boundary);
    const padCount = Math.floor(avail / junk.length);
    const remainder = avail - padCount * junk.length;
    const tail = boundary + junk.repeat(padCount) + 'q'.repeat(remainder); // exactly MAX bytes
    // A newline-terminated prefix pushes the window start onto the boundary
    // record — the exact case the old "drop the first line" logic mishandled.
    const file = 'z'.repeat(100) + '\n' + tail;

    const dir = await fs.mkdtemp(path.join(tmpRoot, 'boundary-'));
    const mcDir = path.join(dir, 'mission-control');
    await fs.mkdir(mcDir, { recursive: true });
    await fs.writeFile(path.join(mcDir, 'metrics.jsonl'), file);

    const model = await readUsageModel({ recompute: false, baseDir: dir, now: FIXED_NOW });
    const boundaryApp = model.costByApp.find((r) => r.sourceApp === 'boundary');
    assert.ok(boundaryApp, 'boundary record at the window edge must be read, not dropped');
    assert.equal(boundaryApp.costUsd, 7);
  });
});

describe('readUsageModel — empty baseDir', () => {
  it('never crashes and returns an honest zero-state model', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'empty-'));
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    assert.equal(model.totalSavedUsd, 0);
    assert.equal(model.totalDispatches, 0);
    assert.deepEqual(model.savingsSeries, []);
    assert.deepEqual(model.costByApp, []);
    assert.deepEqual(model.costSeries, []);
  });

  it('tolerates a malformed savings.json (not an object) without crashing', async () => {
    const { readUsageModel } = await loadLib();
    const dir = await fs.mkdtemp(path.join(tmpRoot, 'malformed-'));
    await fs.writeFile(path.join(dir, 'savings.json'), '["not", "an", "object"]');
    const model = await readUsageModel({ recompute: false, baseDir: dir, now: FIXED_NOW });

    assert.equal(model.totalSavedUsd, 0);
    assert.equal(model.totalDispatches, 0);
  });
});

describe('buildUsageHtml — deck strip', () => {
  it('renders the shared deck strip with "usage" marked as current', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /class="deck-strip"/);
    assert.match(html, /class="deck-chip current"/);
    // The current chip renders the Usage & Cost label with no /ccc-usage
    // command text next to it (that's only shown for the OTHER decks).
    assert.match(html, /<span class="deck-chip current"[^>]*>[\s\S]*?Usage &amp; Cost<\/span>/);
    // The other three decks are present too, each with their open command visible.
    assert.match(html, /\/ccc-browse/);
    assert.match(html, /\/ccc-mission-control/);
    assert.match(html, /\/ccc-safety/);
  });
});

describe('buildUsageHtml — panels with real data', () => {
  it('renders the hero line with the summed $ saved and dispatch count', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /saved you/);
    assert.match(html, /\$2\.25/);
    assert.match(html, /5 dispatches/);
  });

  it('renders a cost-by-app row per source_app with $ and %', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /claude-code/);
    assert.match(html, /codex/);
    assert.match(html, /\$2\.00/);
    assert.match(html, /\$0\.30/);
  });

  it('labels cost-by-app as all-time so it is not misread as the 30d trend', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    // Cost-by-app carries a timeframe note ("all time"), while the trend
    // charts are labelled 30d — the two must be visually distinguishable.
    assert.match(html, /Cost by app[\s\S]{0,80}all time/i);
    assert.match(html, /Cost \/ day \(30d\)/);
  });
});

describe('buildUsageHtml — negative savings honesty', () => {
  it('renders negative savings as an extra cost, never green "saved you -$X"', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({
      savings: { days: { '2026-07-18': { actualUsd: 5, baselineUsd: 1.5, savedUsd: -3.5, dispatches: 2 } } },
    });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    assert.equal(model.totalSavedUsd, -3.5);

    const html = buildUsageHtml(model, { now: FIXED_NOW });
    assert.doesNotMatch(html, /saved you/, 'must not say "saved you" for a loss');
    assert.doesNotMatch(html, /-\$3\.50/, 'must not render a negative dollar amount');
    assert.match(html, /Delegation cost/);
    assert.match(html, /\$3\.50/);
    assert.match(html, /more than an all-Opus/);
    assert.match(html, /hero-negative/);
  });
});

describe('buildUsageHtml — honest zero-state', () => {
  it('shows a "no savings data yet" message when totalDispatches is 0', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'zero-'));
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /No savings data yet/);
    assert.doesNotMatch(html, /\$NaN/);
  });

  it('shows a "no cost data yet" message when there is no cost-by-app data', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'zero-cost-'));
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /No cost data yet/);
  });

  it('never crashes building HTML from a fully empty baseDir', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'fully-empty-'));
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    assert.doesNotThrow(() => buildUsageHtml(model, { now: FIXED_NOW }));
  });
});

describe('buildUsageHtml — single self-contained document', () => {
  it('returns one HTML string with exactly one stable <title>', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    const titles = html.match(/<title>Commander Usage &amp; Cost<\/title>/g) || [];
    assert.equal(titles.length, 1, 'exactly one <title>');
  });

  it('has NO script/link/iframe/img elements at all', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.doesNotMatch(html, /<(script|link|iframe|img)\b/i);
  });

  it('has no http:// or https:// in any src/href attribute', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    const attrUrls = [...html.matchAll(/(?:src|href)\s*=\s*(["'])(.*?)\1/gi)].map((m) => m[2]);
    for (const value of attrUrls) {
      assert.doesNotMatch(value, /^(?:https?:)?\/\//i, `external URL in attribute: ${value}`);
    }
    // Belt-and-suspenders: no bare http(s):// substring anywhere at all.
    assert.doesNotMatch(html, /https?:\/\//i);
  });

  it('is deterministic for a fixed now — two builds produce identical output', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const htmlA = buildUsageHtml(model, { now: FIXED_NOW });
    const htmlB = buildUsageHtml(model, { now: FIXED_NOW });

    assert.equal(htmlA, htmlB);
  });
});

// ---------------------------------------------------------------------------
// v7.3.0 — Item 6: dataThrough + staleness banner. Item W2+/codex 6: savings
// source honesty note.
// ---------------------------------------------------------------------------

describe('readUsageModel — dataThroughMs + hasAnySourceRow', () => {
  it('computes dataThroughMs as the newest of savings.json day-keys and metrics.jsonl date rows', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await makeBase({
      savings: { days: { '2026-07-18': { actualUsd: 1, baselineUsd: 2, savedUsd: 1, dispatches: 1 } } },
      metrics: [{ date: '2026-07-19', source_app: 'claude-code', cost_usd: 1 }],
    });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    assert.equal(model.dataThroughMs, Date.parse('2026-07-19T00:00:00.000Z'));
    assert.equal(model.hasAnySourceRow, true);
  });

  it('hasAnySourceRow is false and dataThroughMs is null when both sources are empty', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'freshness-empty-'));
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    assert.equal(model.hasAnySourceRow, false);
    assert.equal(model.dataThroughMs, null);
  });
});

describe('buildUsageHtml — Data through stamp + staleness banner', () => {
  it('renders "Data through" next to the snapshot stamp when dataThroughMs is present', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: [{ date: '2026-07-19', source_app: 'claude-code', cost_usd: 1 }] });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /Data through: 2026-07-19/);
  });

  it('shows the stale-telemetry warning when the newest source row is more than 24h old', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    // 2026-07-10 is 10 days before FIXED_NOW (2026-07-20) — well past 24h.
    const baseDir = await makeBase({ metrics: [{ date: '2026-07-10', source_app: 'claude-code', cost_usd: 1 }] });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /Telemetry last written .* ago/);
    assert.match(html, /\/ccc-doctor/);
    assert.match(html, /update the plugin to ≥7\.2\.0/);
  });

  it('does NOT show the stale-telemetry warning when the newest source row is within 24h', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: [{ date: '2026-07-20', source_app: 'claude-code', cost_usd: 1 }] });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.doesNotMatch(html, /Telemetry last written/);
  });

  it('extends the honest zero-state with the doctor pointer when every source is empty', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'freshness-zero-doctor-'));
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /No savings data yet/);
    assert.match(html, /Run \/ccc-doctor to check your hooks are wired/);
  });

  it('does NOT append the doctor pointer to the zero-state when other sources have data (only savings is empty)', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /No savings data yet/);
    assert.doesNotMatch(html, /Run \/ccc-doctor to check your hooks are wired/);
  });
});

describe('buildUsageHtml — savings-source honesty note (W2+/codex 6)', () => {
  it('shows the CLI-dispatch honesty note when savings.json has no day within 7 days', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({
      savings: { days: { '2026-07-10': { actualUsd: 1, baselineUsd: 2, savedUsd: 1, dispatches: 1 } } },
    });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    assert.equal(model.savingsStale, true);
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /Savings tracking currently comes from CLI dispatches/);
    assert.match(html, /plugin-native agent runs aren.t counted yet/);
  });

  it('omits the honesty note when a savings day falls within the last 7 days', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({
      savings: { days: { '2026-07-19': { actualUsd: 1, baselineUsd: 2, savedUsd: 1, dispatches: 1 } } },
    });
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });
    assert.equal(model.savingsStale, false);
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.doesNotMatch(html, /Savings tracking currently comes from CLI dispatches/);
  });

  it('savingsStale is true when savings.json was never written', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'freshness-no-savings-'));
    const model = await readUsageModel({ recompute: false, baseDir, now: FIXED_NOW });

    assert.equal(model.savingsStale, true);
  });
});

// ---------------------------------------------------------------------------
// v7.3.0 — Item W2+/codex 6: metrics recompute trigger. readUsageModel()
// must invoke metrics.js's getMetrics() (persisting fresh merged rows) by
// default rather than only ever reading whatever was already on disk.
// Every test injects `metricsRunner` (a stub, never the real `ccusage`
// binary) — same seam mission-metrics.test.js's zeroRunner exercises.
// ---------------------------------------------------------------------------

describe('readUsageModel — metrics recompute trigger (recompute:true default)', () => {
  it('recompute:true (default) runs getMetrics() and persists a fresh sourceApp row derived from events.jsonl', async () => {
    const { readUsageModel } = await loadLib();
    const dir = await fs.mkdtemp(path.join(tmpRoot, 'recompute-'));
    const mcDir = path.join(dir, 'mission-control');
    await fs.mkdir(mcDir, { recursive: true });
    await fs.writeFile(
      path.join(mcDir, 'events.jsonl'),
      JSON.stringify({ ts: '2026-07-20T09:00:00.000Z', type: 'delegation', source_app: 'codex', actor: 'scout', session_id: 'S1' }) + '\n'
    );

    const zeroRunner = async () => null; // never touches the real ccusage binary
    const model = await readUsageModel({ baseDir: dir, now: FIXED_NOW, metricsRunner: zeroRunner });

    const persisted = await fs.readFile(path.join(mcDir, 'metrics.jsonl'), 'utf8');
    assert.match(persisted, /"source_app":"codex"/);
    const codexRow = model.costByApp.find((row) => row.sourceApp === 'codex');
    assert.ok(codexRow, 'expected a codex row surfaced from the recomputed + persisted metrics.jsonl');
  });

  it('recompute:false skips getMetrics() entirely — metrics.jsonl is never created even with matching signal present', async () => {
    const { readUsageModel } = await loadLib();
    const dir = await fs.mkdtemp(path.join(tmpRoot, 'no-recompute-'));
    const mcDir = path.join(dir, 'mission-control');
    await fs.mkdir(mcDir, { recursive: true });
    await fs.writeFile(
      path.join(mcDir, 'events.jsonl'),
      JSON.stringify({ ts: '2026-07-20T09:00:00.000Z', type: 'delegation', source_app: 'codex', actor: 'scout', session_id: 'S1' }) + '\n'
    );

    await readUsageModel({ recompute: false, baseDir: dir, now: FIXED_NOW });

    await assert.rejects(fs.access(path.join(mcDir, 'metrics.jsonl')));
  });

  it('a failed recompute (runner throws) never blocks the deck from rendering with whatever is on disk', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const throwingRunner = async () => {
      throw new Error('simulated ccusage failure');
    };

    const model = await readUsageModel({ baseDir, now: FIXED_NOW, metricsRunner: throwingRunner });
    assert.equal(model.totalSavedUsd, 2.25);
  });
});
