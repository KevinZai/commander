// Pins Commander Mission Control's Item 3 (CC-1380) — the Charts strip:
// commander/cowork-plugin/lib/charts.js's zero-dependency inline-SVG
// builders (sparkline/barStrip) plus the aggregateDaily/aggregateWeekly
// reducers over metrics.js rows. This one file is the SAME module both
// the live client-side charts strip (served at GET /charts.js) and the
// server-rendered Artifact snapshot import — no duplicate copy to drift.

import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { aggregateDaily, aggregateWeekly, barStrip, sparkline } from '../cowork-plugin/lib/charts.js';
import { createServer } from '../../dashboard/server.js';

const FORBIDDEN_TAGS = /<(script|link|iframe|img)\b/i;

test('sparkline: zero-state on an empty series — flat baseline, no NaN, "no data yet"', () => {
  const svg = sparkline([], { label: 'Cost per day' });
  assert.match(svg, /<svg\b/);
  assert.doesNotMatch(svg, /NaN/);
  assert.doesNotMatch(svg, FORBIDDEN_TAGS);
  assert.ok(svg.includes('no data yet'));
  assert.ok(svg.includes('aria-label="Cost per day — no data yet"'));
});

test('sparkline: zero-state on an all-zero series — same clean baseline, no NaN', () => {
  const svg = sparkline(
    [
      { label: '2026-07-01', value: 0 },
      { label: '2026-07-02', value: 0 },
    ],
    { label: 'Agents dispatched' }
  );
  assert.doesNotMatch(svg, /NaN/);
  assert.ok(svg.includes('no data yet'));
});

test('sparkline: deterministic SVG output for a fixed series', () => {
  const points = [
    { label: 'a', value: 1 },
    { label: 'b', value: 5 },
    { label: 'c', value: 3 },
  ];
  const first = sparkline(points, { label: 'trend', color: 'var(--mc-accent)', width: 240, height: 56 });
  const second = sparkline(points, { label: 'trend', color: 'var(--mc-accent)', width: 240, height: 56 });
  assert.equal(first, second, 'pure function of (points, opts) — identical input, identical output');
  assert.equal(
    first,
    '<svg class="mc-chart mc-chart-spark" viewBox="0 0 240 56" width="240" height="56" preserveAspectRatio="none" role="img" aria-label="trend">' +
      '<path d="M4,42.4L120,4L236,23.2L236,52L4,52Z" fill="var(--mc-accent)" fill-opacity="0.16" stroke="none"/>' +
      '<polyline points="4,42.4 120,4 236,23.2" fill="none" stroke="var(--mc-accent)" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>' +
      '</svg>'
  );
});

test('sparkline: negative-safe — a series with only NaN/non-finite entries also zero-states, never NaN in markup', () => {
  const svg = sparkline([{ label: 'a', value: NaN }, { label: 'b', value: 'nope' }, null, undefined], {
    label: 'garbage in',
  });
  assert.doesNotMatch(svg, /NaN/);
  assert.ok(svg.includes('no data yet'));
});

test('sparkline: theme-safe — default color is currentColor, never a hardcoded hex', () => {
  const svg = sparkline([{ label: 'a', value: 1 }, { label: 'b', value: 2 }], { label: 'trend' });
  assert.ok(svg.includes('currentColor'));
  assert.doesNotMatch(svg, /#[0-9a-f]{3,6}/i, 'no hardcoded hex color — reads correctly in light and dark');
});

test('sparkline: a single-point series renders without NaN (degenerate stepX=0 case)', () => {
  const svg = sparkline([{ label: 'only', value: 7 }], { label: 'trend' });
  assert.doesNotMatch(svg, /NaN/);
  assert.match(svg, /<polyline/);
});

test('barStrip: zero-state on an empty series — flat baseline, no NaN', () => {
  const svg = barStrip([], { label: 'Tasks per week' });
  assert.doesNotMatch(svg, /NaN/);
  assert.doesNotMatch(svg, FORBIDDEN_TAGS);
  assert.ok(svg.includes('no data yet'));
});

test('barStrip: deterministic SVG output for a fixed series, no zero-height/negative bars', () => {
  const points = [
    { label: 'w1', value: 1 },
    { label: 'w2', value: 5 },
    { label: 'w3', value: 3 },
  ];
  const first = barStrip(points, { label: 'weekly', color: 'var(--mc-ok)', width: 240, height: 56 });
  const second = barStrip(points, { label: 'weekly', color: 'var(--mc-ok)', width: 240, height: 56 });
  assert.equal(first, second);
  assert.equal((first.match(/<rect\b/g) || []).length, 3);
  assert.doesNotMatch(first, /width="0"|height="0"|width="-|height="-/);
});

test('barStrip: theme-safe — default color is currentColor', () => {
  const svg = barStrip([{ label: 'a', value: 1 }], { label: 'weekly' });
  assert.ok(svg.includes('currentColor'));
});

test('aggregateDaily: sums a field across every source_app for each date, ascending order', () => {
  const rows = [
    { date: '2026-07-02', source_app: 'claude-code', cost_usd: 1.5 },
    { date: '2026-07-01', source_app: 'claude-code', cost_usd: 2 },
    { date: '2026-07-01', source_app: 'codex', cost_usd: 0.5 },
  ];
  const series = aggregateDaily(rows, 'cost_usd');
  assert.deepEqual(series, [
    { label: '2026-07-01', value: 2.5 },
    { label: '2026-07-02', value: 1.5 },
  ]);
});

test('aggregateDaily: a `days` cap keeps only the most recent N dates present', () => {
  const rows = [
    { date: '2026-07-01', source_app: 'claude-code', agents_dispatched: 1 },
    { date: '2026-07-02', source_app: 'claude-code', agents_dispatched: 2 },
    { date: '2026-07-03', source_app: 'claude-code', agents_dispatched: 3 },
  ];
  const series = aggregateDaily(rows, 'agents_dispatched', 2);
  assert.deepEqual(series, [
    { label: '2026-07-02', value: 2 },
    { label: '2026-07-03', value: 3 },
  ]);
});

test('aggregateDaily: non-array input never throws, returns []', () => {
  assert.deepEqual(aggregateDaily(null, 'cost_usd'), []);
  assert.deepEqual(aggregateDaily(undefined, 'cost_usd'), []);
  assert.deepEqual(aggregateDaily('nope', 'cost_usd'), []);
});

test('aggregateDaily: a row with a non-finite field value contributes zero, not NaN', () => {
  const rows = [{ date: '2026-07-01', source_app: 'claude-code', tool_failures: 'oops' }];
  const series = aggregateDaily(rows, 'tool_failures');
  assert.deepEqual(series, [{ label: '2026-07-01', value: 0 }]);
});

test('aggregateWeekly: buckets daily rows into ISO weeks and sums within each week', () => {
  const rows = [
    { date: '2026-07-06', source_app: 'claude-code', tasks_completed: 1 }, // Mon
    { date: '2026-07-08', source_app: 'claude-code', tasks_completed: 2 }, // Wed, same ISO week
    { date: '2026-07-13', source_app: 'claude-code', tasks_completed: 4 }, // next Mon, new week
  ];
  const weekly = aggregateWeekly(rows, 'tasks_completed', 8);
  assert.equal(weekly.length, 2);
  assert.equal(weekly[0].value, 3, 'Jul 6 + Jul 8 fall in the same ISO week');
  assert.equal(weekly[1].value, 4);
  assert.ok(/^\d{4}-W\d{2}$/.test(weekly[0].label));
});

test('aggregateWeekly: a `weeks` cap keeps only the most recent N week-buckets', () => {
  const rows = Array.from({ length: 21 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 0, 1 + i * 7)).toISOString().slice(0, 10),
    source_app: 'claude-code',
    tasks_completed: 1,
  }));
  const weekly = aggregateWeekly(rows, 'tasks_completed', 8);
  assert.ok(weekly.length <= 8);
});

test('aggregateWeekly: a week spanning a year boundary (Dec 31 / Jan 1) stays in one ISO-year bucket', () => {
  const rows = [
    { date: '2026-12-31', source_app: 'claude-code', tasks_completed: 1 }, // Thu
    { date: '2027-01-01', source_app: 'claude-code', tasks_completed: 1 }, // Fri, same ISO week
  ];
  const weekly = aggregateWeekly(rows, 'tasks_completed', 8);
  assert.equal(weekly.length, 1, 'both dates collapse into the single ISO week that contains them');
  assert.equal(weekly[0].value, 2);
  assert.equal(weekly[0].label, '2026-W53');
});

function dispatch(server, url, method = 'GET') {
  return new Promise((resolve) => {
    const req = new Readable({
      read() {
        this.push(null);
      },
    });
    req.method = method;
    req.url = url;
    req.headers = {};
    const chunks = [];
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    res.statusCode = 200;
    res.headers = {};
    res.writeHead = (statusCode, headers) => {
      res.statusCode = statusCode;
      res.headers = headers || {};
      return res;
    };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      resolve({ body: Buffer.concat(chunks).toString('utf8'), statusCode: res.statusCode, headers: res.headers });
      return Writable.prototype.end.call(res);
    };
    server.emit('request', req, res);
  });
}

test('GET /charts.js: served as a browser-loadable ES module, same file the snapshot imports', async () => {
  const server = createServer({ sessionsDir: '/tmp/does-not-exist' });
  const response = await dispatch(server, '/charts.js');
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Content-Type'], /text\/javascript/);
  assert.ok(response.body.includes('export'), 'ESM export — loadable via <script type="module">');
  assert.ok(response.body.includes('sparkline'));
  assert.ok(response.body.includes('barStrip'));
});

test('POST /charts.js is rejected — server stays GET-only', async () => {
  const server = createServer({ sessionsDir: '/tmp/does-not-exist' });
  const response = await dispatch(server, '/charts.js', 'POST');
  assert.equal(response.statusCode, 405);
});
