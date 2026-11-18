'use strict';

// scripts/refresh-stats.mjs: activation (first_result per install) and weekly
// active installs in docs/stats.json, computed from a stubbed HogQL query so
// no network call is made.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const modP = import(path.join(ROOT, 'scripts', 'refresh-stats.mjs'));

test('buildActivation computes the rate and handles an empty window', async () => {
  const { buildActivation } = await modP;
  assert.deepStrictEqual(buildActivation(), { window_days: 30, installs: 0, first_results: 0, rate: null, median_seconds_to_first_result: null, by_skill: [] });
  const a = buildActivation({ installs_30d: 40, first_results_30d: 10, median_seconds_to_first_result: 212.4 });
  assert.strictEqual(a.rate, 0.25);
  assert.strictEqual(a.median_seconds_to_first_result, 212);
  assert.strictEqual(buildActivation({ installs_30d: 3, first_results_30d: 9 }).rate, 1, 'never above 100%');
});

test('collectStats fills activation and weekly active installs from the query', async () => {
  const { collectStats, summarize, ACTIVATION_METRICS } = await modP;
  const answers = new Map([
    [ACTIVATION_METRICS.installs_30d, 50],
    [ACTIVATION_METRICS.first_results_30d, 20],
    [ACTIVATION_METRICS.median_seconds_to_first_result, 180],
    [ACTIVATION_METRICS.weekly_active_installs, 31],
  ]);
  const query = async (hql) => {
    if (answers.has(hql)) return { results: [[answers.get(hql)]] };
    if (/properties\.skill as name/.test(hql)) return { results: [['ccc-xray', 12], ['ccc-plan', 8]] };
    if (/GROUP BY/.test(hql)) return { results: [] };
    return { results: [[7]] };
  };
  const stats = await collectStats(query);
  assert.strictEqual(stats.weekly_active_installs, 31);
  assert.strictEqual(stats.activation.installs, 50);
  assert.strictEqual(stats.activation.first_results, 20);
  assert.strictEqual(stats.activation.rate, 0.4);
  assert.deepStrictEqual(stats.activation.by_skill, [{ name: 'ccc-xray', count: 12 }, { name: 'ccc-plan', count: 8 }]);
  assert.match(summarize(stats), /weekly active installs 31 · activation 20\/50 installs \(40\.0%\)/);
  assert.ok(ACTIVATION_METRICS.weekly_active_installs.includes('INTERVAL 7 DAY'));
  assert.ok(/SessionStart/.test(ACTIVATION_METRICS.weekly_active_installs), 'counts sessions from existing session events');
});

test('a failing query degrades to zero, not a crash', async () => {
  const { collectStats } = await modP;
  const stats = await collectStats(async () => { throw new Error('offline'); });
  assert.strictEqual(stats.weekly_active_installs, 0);
  assert.strictEqual(stats.activation.rate, null);
});

test('docs/stats.json carries the activation and weekly active fields', async () => {
  const { emptyStats } = await modP;
  const stats = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'stats.json'), 'utf8'));
  for (const key of Object.keys(emptyStats(''))) assert.ok(key in stats, `docs/stats.json has ${key}`);
  for (const key of ['installs', 'first_results', 'rate', 'by_skill']) assert.ok(key in stats.activation, `activation.${key}`);
});
