'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PARSER_PATH = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'skills',
  'ccc-xray',
  'lib',
  'cost-parser.js'
);

let parseCostOutput;

test('load parser (ESM via dynamic import)', async () => {
  const mod = await import(pathToFileURL(PARSER_PATH).href);
  parseCostOutput = mod.parseCostOutput;
  assert.equal(typeof parseCostOutput, 'function');
});

test('standard 2-model output → expected structure', async () => {
  const input = `Total cost: $12.34
Total duration (API): 5m 23s
Total duration (wall): 6m 12s
Total code changes: 87 lines added, 12 lines removed
Usage by model:
    claude-opus-4-7:  234.5k input, 12.3k output, 5.6k cache write, 89.0k cache read ($8.90)
    claude-sonnet-4-6:  45.6k input, 5.4k output, 2.1k cache write, 23.0k cache read ($3.44)`;

  const r = parseCostOutput(input);
  assert.equal(r.totalUsd, 12.34);
  assert.ok(r.models['claude-opus-4-7'], 'opus row parsed');
  assert.equal(r.models['claude-opus-4-7'].input, 234500);
  assert.equal(r.models['claude-opus-4-7'].output, 12300);
  assert.equal(r.models['claude-opus-4-7'].cache_creation, 5600);
  assert.equal(r.models['claude-opus-4-7'].cache_read, 89000);
  assert.equal(r.models['claude-opus-4-7'].usd, 8.90);

  assert.ok(r.models['claude-sonnet-4-6'], 'sonnet row parsed');
  assert.equal(r.models['claude-sonnet-4-6'].input, 45600);
  assert.equal(r.models['claude-sonnet-4-6'].cache_read, 23000);
  assert.equal(r.models['claude-sonnet-4-6'].usd, 3.44);

  // raw passthrough
  assert.equal(r.raw, input);
  // skipped should be empty (or only stray non-model lines from usage block)
  assert.ok(Array.isArray(r.skipped));
});

test('single-model session with no cache fields → zeros, no crash', async () => {
  const input = `Total cost: $0.42
Usage by model:
    claude-haiku-4-5:  10.0k input, 2.0k output ($0.42)`;

  const r = parseCostOutput(input);
  assert.equal(r.totalUsd, 0.42);
  const m = r.models['claude-haiku-4-5'];
  assert.ok(m, 'haiku row parsed');
  assert.equal(m.input, 10000);
  assert.equal(m.output, 2000);
  assert.equal(m.cache_creation, 0);
  assert.equal(m.cache_read, 0);
  assert.equal(m.usd, 0.42);
  // cache hit rate with 0 cache_read = 0
  assert.equal(r.cacheHitRate, 0);
});

test('empty input → zero-state object, no crash', async () => {
  const r = parseCostOutput('');
  assert.equal(r.totalUsd, 0);
  assert.deepEqual(r.models, {});
  assert.equal(r.cacheHitRate, 0);
  assert.equal(r.turns, 0);
  assert.equal(r.avgUsdPerTurn, 0);
  assert.ok(Array.isArray(r.skipped));

  // null also safe
  const r2 = parseCostOutput(null);
  assert.equal(r2.totalUsd, 0);
  assert.deepEqual(r2.models, {});
});

test('malformed model line → captured in skipped[], does not crash', async () => {
  const input = `Total cost: $1.00
Usage by model:
    this is not a real row
    claude-opus-4-7: ?????? garbage no numbers ($1.00)
    claude-sonnet-4-6:  10.0k input, 1.0k output ($0.50)`;

  const r = parseCostOutput(input);
  // sonnet should still parse cleanly
  assert.ok(r.models['claude-sonnet-4-6']);
  assert.equal(r.models['claude-sonnet-4-6'].input, 10000);
  // garbage line "this is not a real row" has no leading-ws-name-colon → skipped
  assert.ok(r.skipped.length >= 1, 'malformed line collected');
});

test('cacheHitRate computed correctly + clamped to [0,1]', async () => {
  // cache_read=80k, cache_creation=10k, input=10k → 80 / 100 = 0.80
  const input = `Total cost: $1.00
Usage by model:
    claude-opus-4-7:  10.0k input, 1.0k output, 10.0k cache write, 80.0k cache read ($1.00)`;

  const r = parseCostOutput(input);
  assert.ok(Math.abs(r.cacheHitRate - 0.8) < 1e-9, `expected 0.8, got ${r.cacheHitRate}`);
  assert.ok(r.cacheHitRate >= 0 && r.cacheHitRate <= 1);
});

test('avgUsdPerTurn computed when turns provided', async () => {
  const input = `Total cost: $10.00
Total turns: 4
Usage by model:
    claude-opus-4-7:  10.0k input, 1.0k output ($10.00)`;
  const r = parseCostOutput(input);
  assert.equal(r.turns, 4);
  assert.equal(r.avgUsdPerTurn, 2.5);
});

test('totalUsd falls back to sum of per-model USD when not stated', async () => {
  const input = `Usage by model:
    claude-opus-4-7:  10.0k input, 1.0k output ($1.50)
    claude-sonnet-4-6:  5.0k input, 0.5k output ($0.50)`;
  const r = parseCostOutput(input);
  assert.equal(r.totalUsd, 2.0);
});
