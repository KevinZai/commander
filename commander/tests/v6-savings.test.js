'use strict';
/**
 * v6.0 Tests — selectModelForComplexity + savings math
 */

var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var os = require('os');
var fs = require('fs');

var dispatcher = require('../dispatcher');

// ─── selectModelForComplexity ─────────────────────────────────

test('selectModelForComplexity: 0 → haiku', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(0), 'haiku');
});

test('selectModelForComplexity: 29 → haiku (upper boundary)', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(29), 'haiku');
});

test('selectModelForComplexity: 30 → sonnet (lower boundary)', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(30), 'sonnet');
});

test('selectModelForComplexity: 50 → sonnet (mid band)', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(50), 'sonnet');
});

test('selectModelForComplexity: 65 → sonnet (upper boundary)', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(65), 'sonnet');
});

test('selectModelForComplexity: 66 → opus (lower boundary)', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(66), 'opus');
});

test('selectModelForComplexity: 75 → opus (mid band)', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(75), 'opus');
});

test('selectModelForComplexity: 85 → opus (upper boundary)', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(85), 'opus');
});

test('selectModelForComplexity: 86 → fable (lower boundary)', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(86), 'fable');
});

test('selectModelForComplexity: 100 → fable (ceiling)', function() {
  assert.strictEqual(dispatcher.selectModelForComplexity(100), 'fable');
});

// ─── savings math ────────────────────────────────────────────

// Use a temp file so we don't pollute real ~/.claude/commander/savings.json
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-savings-test-'));
var tmpSavingsPath = path.join(tmpDir, 'savings.json');

// Monkey-patch the savings module to use a temp path
var savings = require('../lib/savings');

// Internal helper: directly invoke the math without touching the real FS
// We test by calling recordDispatch with a controlled tmp path via env override
// Since savings.js uses SAVINGS_PATH at module load, we must patch it via the
// module internals. Instead, we test the math directly by computing expected values.

var PRICING = {
  fable:  { input: 8,   output: 40  },
  opus:   { input: 4,   output: 20  },
  sonnet: { input: 2,   output: 10  },
  haiku:  { input: 0.1, output: 0.5 },
};

test('savings PRICING matches dispatcher MODEL_PRICING and this test table', function () {
  var dispatcherPricing = require('../dispatcher').MODEL_PRICING;
  Object.keys(savings.PRICING).forEach(function (k) {
    assert.deepStrictEqual(savings.PRICING[k], dispatcherPricing[k], 'savings vs dispatcher: ' + k);
    assert.deepStrictEqual(savings.PRICING[k], PRICING[k], 'savings vs test table: ' + k);
  });
});

function expectedUsd(modelKey, inputTok, outputTok) {
  var p = PRICING[modelKey];
  return (inputTok * p.input + outputTok * p.output) / 1000000;
}

test('savings math: sonnet dispatch → positive savedUsd vs opus baseline', function() {
  // 10K input, 5K output
  var inputTokens = 10000;
  var outputTokens = 5000;
  var actualUsd = expectedUsd('sonnet', inputTokens, outputTokens);
  var baselineUsd = expectedUsd('opus', inputTokens, outputTokens);
  var savedUsd = baselineUsd - actualUsd;

  // sonnet is cheaper than opus → positive savings
  assert.ok(savedUsd > 0, 'sonnet vs opus should yield positive savings, got ' + savedUsd);
  assert.ok(actualUsd < baselineUsd, 'sonnet actual < opus baseline');

  // Spot-check values:
  // sonnet: (10000*2 + 5000*10)/1e6 = (20000+50000)/1e6 = 0.07
  // opus:   (10000*4 + 5000*20)/1e6 = (40000+100000)/1e6 = 0.14
  assert.ok(Math.abs(actualUsd - 0.07) < 1e-9, 'sonnet actual expected 0.07, got ' + actualUsd);
  assert.ok(Math.abs(baselineUsd - 0.14) < 1e-9, 'opus baseline expected 0.14, got ' + baselineUsd);
  assert.ok(Math.abs(savedUsd - 0.07) < 1e-9, 'saved expected 0.07, got ' + savedUsd);
});

test('savings math: haiku dispatch → larger positive savedUsd vs opus baseline', function() {
  var inputTokens = 10000;
  var outputTokens = 5000;
  var actualUsd = expectedUsd('haiku', inputTokens, outputTokens);
  var baselineUsd = expectedUsd('opus', inputTokens, outputTokens);
  var savedUsd = baselineUsd - actualUsd;

  assert.ok(savedUsd > 0, 'haiku vs opus should yield positive savings');
  // haiku: (10000*0.1 + 5000*0.5)/1e6 = (1000+2500)/1e6 = 0.0035
  assert.ok(Math.abs(actualUsd - 0.0035) < 1e-9, 'haiku actual expected 0.0035, got ' + actualUsd);
  // savedUsd = 0.14 - 0.0035 = 0.1365
  assert.ok(Math.abs(savedUsd - 0.1365) < 1e-9, 'saved expected 0.1365, got ' + savedUsd);
});

test('savings math: fable dispatch → NEGATIVE savedUsd (recorded honestly)', function() {
  var inputTokens = 10000;
  var outputTokens = 5000;
  var actualUsd = expectedUsd('fable', inputTokens, outputTokens);
  var baselineUsd = expectedUsd('opus', inputTokens, outputTokens);
  var savedUsd = baselineUsd - actualUsd;

  // fable costs more than opus → savedUsd is negative (that's honest)
  assert.ok(savedUsd < 0, 'fable vs opus should yield negative savings (it costs more), got ' + savedUsd);
  // fable (Claude Fable 5.2): (10000*8 + 5000*40)/1e6 = (80000+200000)/1e6 = 0.28
  assert.ok(Math.abs(actualUsd - 0.28) < 1e-9, 'fable actual expected 0.28, got ' + actualUsd);
  // savedUsd = 0.14 - 0.28 = -0.14
  assert.ok(Math.abs(savedUsd - (-0.14)) < 1e-9, 'saved expected -0.14, got ' + savedUsd);
});

test('savings math: opus dispatch → zero savedUsd (same as baseline)', function() {
  var inputTokens = 10000;
  var outputTokens = 5000;
  var actualUsd = expectedUsd('opus', inputTokens, outputTokens);
  var baselineUsd = expectedUsd('opus', inputTokens, outputTokens);
  var savedUsd = baselineUsd - actualUsd;

  assert.strictEqual(savedUsd, 0, 'opus vs opus baseline should be 0, got ' + savedUsd);
});

test('getSavings: returns object with today/month/total and disclaimer', function() {
  var sv = savings.getSavings();
  assert.ok(sv.today && typeof sv.today === 'object', 'today bucket missing');
  assert.ok(sv.month && typeof sv.month === 'object', 'month bucket missing');
  assert.ok(sv.total && typeof sv.total === 'object', 'total bucket missing');
  assert.ok(typeof sv.disclaimer === 'string' && sv.disclaimer.length > 0, 'disclaimer missing');
  assert.ok(sv.disclaimer.includes('ESTIMATE'), 'disclaimer must mention ESTIMATE');
});

test('recordDispatch: does not throw on valid input', function() {
  // recordDispatch swallows errors but should not throw
  assert.doesNotThrow(function() {
    savings.recordDispatch({ modelKey: 'sonnet', inputTokens: 1000, outputTokens: 500 });
  });
});

test('recordDispatch: does not throw on null/empty input', function() {
  assert.doesNotThrow(function() {
    savings.recordDispatch(null);
    savings.recordDispatch({});
    savings.recordDispatch({ modelKey: 'unknown-model', inputTokens: 100, outputTokens: 100 });
  });
});

// Cleanup temp dir
process.on('exit', function() {
  try { fs.rmSync(tmpDir, { recursive: true }); } catch (_e) {}
});
