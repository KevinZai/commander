'use strict';

// scripts/refresh-stats.mjs: weekly active installs in docs/stats.json,
// computed from a stubbed HogQL query so no network call is made. Activation
// is reported as unavailable (null figures plus a reason): first_result is
// not retained anywhere this report can read.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const modP = import(path.join(ROOT, 'scripts', 'refresh-stats.mjs'));

test('buildActivation reports activation as unavailable, never as zero', async () => {
  const { buildActivation, ACTIVATION_UNAVAILABLE_REASON } = await modP;
  const a = buildActivation();
  assert.strictEqual(a.available, false);
  assert.strictEqual(a.reason, ACTIVATION_UNAVAILABLE_REASON);
  assert.match(a.reason, /process-local counter/);
  for (const key of ['installs', 'first_results', 'rate', 'median_seconds_to_first_result', 'by_skill']) {
    assert.strictEqual(a[key], null, `activation.${key} is null`);
  }
});

test('collectStats fills weekly active installs and never queries first_result', async () => {
  const { collectStats, summarize, ACTIVATION_METRICS } = await modP;
  const seen = [];
  const query = async (hql) => {
    seen.push(hql);
    if (hql === ACTIVATION_METRICS.weekly_active_installs) return { results: [[31]] };
    if (/GROUP BY/.test(hql)) return { results: [] };
    return { results: [[7]] };
  };
  const stats = await collectStats(query);
  assert.strictEqual(stats.weekly_active_installs, 31);
  assert.strictEqual(stats.activation.available, false);
  assert.strictEqual(stats.activation.rate, null);
  assert.strictEqual(stats.activation.first_results, null);
  assert.ok(!seen.some((hql) => /first_result/.test(hql)), 'no query reads an event that never reaches PostHog');
  assert.match(summarize(stats), /weekly active installs 31 · activation unavailable/);
  assert.doesNotMatch(stats.note, /Activation = /);
  assert.ok(ACTIVATION_METRICS.weekly_active_installs.includes('INTERVAL 7 DAY'));
  assert.ok(/SessionStart/.test(ACTIVATION_METRICS.weekly_active_installs), 'counts sessions from existing session events');
});

test('a failing query degrades to zero, not a crash', async () => {
  const { collectStats } = await modP;
  const stats = await collectStats(async () => { throw new Error('offline'); });
  assert.strictEqual(stats.weekly_active_installs, 0);
  assert.strictEqual(stats.activation.rate, null);
  assert.strictEqual(stats.activation.available, false);
});

test('docs/stats.json carries the activation and weekly active fields', async () => {
  const { emptyStats } = await modP;
  const stats = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'stats.json'), 'utf8'));
  for (const key of Object.keys(emptyStats(''))) assert.ok(key in stats, `docs/stats.json has ${key}`);
  for (const key of ['available', 'reason', 'installs', 'first_results', 'rate', 'by_skill']) assert.ok(key in stats.activation, `activation.${key}`);
  assert.strictEqual(stats.activation.available, false, 'the committed copy does not claim an activation figure');
});
