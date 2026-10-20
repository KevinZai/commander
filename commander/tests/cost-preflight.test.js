'use strict';

var test = require('node:test');
var assert = require('node:assert');
var cp = require('../core/cost-preflight');
var table = require('./fixtures/cost-preflight-prices.json');

var task = { fileCount: 47, complexity: 'medium' };

test('estimate returns every tier plus hybrid, most expensive first', function() {
  var est = cp.estimate(task, table);
  var ids = est.options.map(function(o) { return o.id; });
  assert.deepStrictEqual(ids, ['opus-xhigh', 'hybrid', 'sonnet-high', 'haiku']);
  assert.strictEqual(est.options[0].savingsPct, 0);
  assert.ok(est.options[3].savingsPct > 90);
});

test('estimate is deterministic and scales with complexity', function() {
  var a = cp.estimate(task, table), b = cp.estimate(task, table);
  assert.deepStrictEqual(a, b);
  var hi = cp.estimate({ fileCount: 47, complexity: 'high' }, table);
  assert.ok(hi.options[0].cost > a.options[0].cost);
});

test('explicit token count overrides file-based guess; zero files costs zero', function() {
  assert.strictEqual(cp.estimate({ fileCount: 0 }, table).options[0].cost, 0);
  assert.strictEqual(cp.estimate({ tokens: 1e6, complexity: 'medium' }, table).inTokens, 1e6);
});

test('unknown complexity throws', function() {
  assert.throws(function() { cp.estimate({ fileCount: 1, complexity: 'nope' }, table); });
});

test('budget boundary: exactly at limit allowed, one cent over declined', function() {
  assert.strictEqual(cp.checkBudget(2, { monthlyLimit: 10, spentMonth: 8 }).allowed, true);
  var over = cp.checkBudget(2.01, { monthlyLimit: 10, spentMonth: 8 });
  assert.strictEqual(over.allowed, false);
  assert.match(over.reason, /monthly/);
});

test('daily limit is enforced independently of monthly', function() {
  var r = cp.checkBudget(1, { dailyLimit: 5, spentToday: 4.5, monthlyLimit: 100, spentMonth: 0 });
  assert.strictEqual(r.allowed, false);
  assert.match(r.reason, /daily/);
});

test('no budget configured means allowed', function() {
  assert.strictEqual(cp.checkBudget(999).allowed, true);
  assert.strictEqual(cp.checkBudget(999, {}).allowed, true);
});

test('override lets an over-budget run through and says so', function() {
  var r = cp.checkBudget(5, { monthlyLimit: 10, spentMonth: 9, override: true });
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.overridden, true);
});

test('vibe mode skips the gate; default mode gates per option', function() {
  assert.deepStrictEqual(cp.preflight(task, table, { monthlyLimit: 0 }, 'vibe'), { gated: false, mode: 'vibe' });
  var p = cp.preflight(task, table, { monthlyLimit: 1, spentMonth: 0 }, 'guided');
  assert.strictEqual(p.gated, true);
  assert.strictEqual(p.decisions['opus-xhigh'].allowed, false);
  assert.strictEqual(p.decisions.haiku.allowed, true);
});
