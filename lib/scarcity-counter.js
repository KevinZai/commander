'use strict';
// ============================================================================
// CC Commander — Lifetime scarcity counter (CC-758, slice 1)
// ============================================================================
// Pure reducer: (state, event) -> state. No I/O, no clock, no billing calls.
// Events are normalized order events (synthetic in this slice); a later slice
// maps the real billing webhook onto this shape and persists the state.
//
//   { id, type: 'order_created' | 'order_refunded', orderId, variant? }
//
// Idempotent: replaying an event id, or a duplicate order/refund, is a no-op.
// Out-of-order refunds (refund before its order) are remembered and cancel the
// order when it arrives, so delivery order never changes the final count.
// ============================================================================

const DEFAULT_CAP = 500;
const DEFAULT_DISPLAY_FLOOR = 50; // never show a count below this (CC-758 risk note)

function initialState(opts = {}) {
  return {
    cap: Number.isInteger(opts.cap) && opts.cap > 0 ? opts.cap : DEFAULT_CAP,
    displayFloor: Number.isInteger(opts.displayFloor) && opts.displayFloor >= 0 ? opts.displayFloor : DEFAULT_DISPLAY_FLOOR,
    orders: {},    // orderId -> 'sold' | 'refunded'
    seen: {},      // event id -> true
    refundedEarly: {}, // orderId -> true (refund arrived before order)
  };
}

function reduce(state, event) {
  if (!event || typeof event.id !== 'string' || typeof event.orderId !== 'string') return state;
  if (state.seen[event.id]) return state;
  const seen = { ...state.seen, [event.id]: true };

  if (event.type === 'order_created') {
    if (state.orders[event.orderId]) return { ...state, seen };
    if (state.refundedEarly[event.orderId]) {
      const { [event.orderId]: _drop, ...rest } = state.refundedEarly;
      return { ...state, seen, refundedEarly: rest, orders: { ...state.orders, [event.orderId]: 'refunded' } };
    }
    return { ...state, seen, orders: { ...state.orders, [event.orderId]: 'sold' } };
  }

  if (event.type === 'order_refunded') {
    const current = state.orders[event.orderId];
    if (current === 'refunded' || state.refundedEarly[event.orderId]) return { ...state, seen };
    if (current === 'sold') return { ...state, seen, orders: { ...state.orders, [event.orderId]: 'refunded' } };
    return { ...state, seen, refundedEarly: { ...state.refundedEarly, [event.orderId]: true } };
  }

  return state; // unknown type: ignored, not recorded as seen
}

function reduceAll(state, events) {
  return events.reduce(reduce, state);
}

function soldCount(state) {
  return Object.values(state.orders).filter((s) => s === 'sold').length;
}

// Public view: capped real count, floored for display, plus spots remaining.
function view(state) {
  const sold = Math.min(soldCount(state), state.cap);
  const shown = Math.max(sold, Math.min(state.displayFloor, state.cap));
  return { sold, shown, remaining: state.cap - sold, soldOut: sold >= state.cap, cap: state.cap };
}

module.exports = { DEFAULT_CAP, DEFAULT_DISPLAY_FLOOR, initialState, reduce, reduceAll, soldCount, view };
