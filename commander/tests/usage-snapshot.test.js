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
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });

    assert.equal(model.totalSavedUsd, 2.25); // 1.5 + 0.75
    assert.equal(model.totalActualUsd, 0.75); // 0.5 + 0.25
    assert.equal(model.totalBaselineUsd, 3); // 2 + 1
    assert.equal(model.totalDispatches, 5); // 3 + 2
  });

  it('builds an ascending per-day savings series from the days bucket', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS });
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });

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
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });

    assert.equal(model.totalSavedUsd, 2.25);
    assert.equal(model.totalDispatches, 5);
  });
});

describe('readUsageModel — cost by app', () => {
  it('sums cost_usd per source_app, sorted descending, with correct percentages', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });

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
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });

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
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });

    assert.equal(model.costByApp.length, 1);
    assert.equal(model.costByApp[0].sourceApp, 'codex');
    assert.equal(model.costByApp[0].costUsd, 9);
    assert.deepEqual(model.costSeries, [{ label: '2026-07-18', value: 9 }]);
  });
});

describe('readUsageModel — empty baseDir', () => {
  it('never crashes and returns an honest zero-state model', async () => {
    const { readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'empty-'));
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });

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
    const model = await readUsageModel({ baseDir: dir, now: FIXED_NOW });

    assert.equal(model.totalSavedUsd, 0);
    assert.equal(model.totalDispatches, 0);
  });
});

describe('buildUsageHtml — deck strip', () => {
  it('renders the shared deck strip with "usage" marked as current', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
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
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /saved you/);
    assert.match(html, /\$2\.25/);
    assert.match(html, /5 dispatches/);
  });

  it('renders a cost-by-app row per source_app with $ and %', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /claude-code/);
    assert.match(html, /codex/);
    assert.match(html, /\$2\.00/);
    assert.match(html, /\$0\.30/);
  });

  it('labels cost-by-app as all-time so it is not misread as the 30d trend', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
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
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
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
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /No savings data yet/);
    assert.doesNotMatch(html, /\$NaN/);
  });

  it('shows a "no cost data yet" message when there is no cost-by-app data', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'zero-cost-'));
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.match(html, /No cost data yet/);
  });

  it('never crashes building HTML from a fully empty baseDir', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await fs.mkdtemp(path.join(tmpRoot, 'fully-empty-'));
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
    assert.doesNotThrow(() => buildUsageHtml(model, { now: FIXED_NOW }));
  });
});

describe('buildUsageHtml — single self-contained document', () => {
  it('returns one HTML string with exactly one stable <title>', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    const titles = html.match(/<title>Commander Usage &amp; Cost<\/title>/g) || [];
    assert.equal(titles.length, 1, 'exactly one <title>');
  });

  it('has NO script/link/iframe/img elements at all', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
    const html = buildUsageHtml(model, { now: FIXED_NOW });

    assert.doesNotMatch(html, /<(script|link|iframe|img)\b/i);
  });

  it('has no http:// or https:// in any src/href attribute', async () => {
    const { buildUsageHtml, readUsageModel } = await loadLib();
    const baseDir = await makeBase({ savings: SAMPLE_SAVINGS, metrics: SAMPLE_METRICS });
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
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
    const model = await readUsageModel({ baseDir, now: FIXED_NOW });
    const htmlA = buildUsageHtml(model, { now: FIXED_NOW });
    const htmlB = buildUsageHtml(model, { now: FIXED_NOW });

    assert.equal(htmlA, htmlB);
  });
});
