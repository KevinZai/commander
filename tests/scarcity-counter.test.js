'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { initialState, reduce, reduceAll, soldCount, view } = require('../lib/scarcity-counter');
const fx = require('./fixtures/scarcity-events.json');

test('counts sold orders net of refunds', () => {
  assert.strictEqual(soldCount(reduceAll(initialState(), fx.basic)), 1);
});

test('replaying the same event stream is idempotent', () => {
  const once = reduceAll(initialState(), fx.basic);
  const twice = reduceAll(once, fx.basic);
  assert.deepStrictEqual(twice, once);
});

test('duplicate order with a new event id does not double count', () => {
  const s = reduceAll(initialState(), [
    { id: 'e1', type: 'order_created', orderId: 'o1' },
    { id: 'e2', type: 'order_created', orderId: 'o1' },
  ]);
  assert.strictEqual(soldCount(s), 1);
});

test('duplicate refund does not go negative or re-count', () => {
  const s = reduceAll(initialState(), [
    { id: 'e1', type: 'order_created', orderId: 'o1' },
    { id: 'e2', type: 'order_refunded', orderId: 'o1' },
    { id: 'e3', type: 'order_refunded', orderId: 'o1' },
  ]);
  assert.strictEqual(soldCount(s), 0);
});

test('out-of-order refund cancels the later order; delivery order is irrelevant', () => {
  const fwd = reduceAll(initialState(), fx.outOfOrder);
  const rev = reduceAll(initialState(), [...fx.outOfOrder].reverse());
  assert.strictEqual(soldCount(fwd), 1);
  assert.strictEqual(soldCount(rev), 1);
});

test('does not mutate input state', () => {
  const s = initialState();
  const frozen = JSON.stringify(s);
  reduce(s, fx.basic[0]);
  assert.strictEqual(JSON.stringify(s), frozen);
});

test('malformed and unknown events are ignored', () => {
  const s = initialState();
  assert.strictEqual(reduce(s, null), s);
  assert.strictEqual(reduce(s, { id: 'x', type: 'order_created' }), s);
  assert.strictEqual(reduce(s, { id: 'x', type: 'mystery', orderId: 'o' }), s);
});

test('view floors the shown count and caps at the limit', () => {
  const empty = view(initialState());
  assert.deepStrictEqual([empty.sold, empty.shown, empty.remaining], [0, 50, 500]);
  let s = initialState({ cap: 3, displayFloor: 0 });
  s = reduceAll(s, ['a', 'b', 'c', 'd'].map((o) => ({ id: 'e' + o, type: 'order_created', orderId: o })));
  const v = view(s);
  assert.deepStrictEqual([v.sold, v.remaining, v.soldOut], [3, 0, true]);
});
