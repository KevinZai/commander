'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const LIB = pathToFileURL(
  path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'lib', 'next-step.mjs')
).href;

const T0 = 1_000_000;

describe('next-step.mjs', () => {
  it('offers three options with the recommended one first', async () => {
    const { decideNextStep } = await import(LIB);
    const r = decideNextStep({ skill: '/ccc-build', runId: 'r1', now: T0 });
    assert.equal(r.offer, true);
    assert.deepEqual(r.options.map((o) => o.skill), ['ccc-testing', 'ccc-review', 'ccc-deploy-check']);
    assert.deepEqual(r.options.map((o) => o.recommended), [true, false, false]);
    assert.equal(r.state.lastOfferAt, T0);
    assert.deepEqual(r.state.offeredRuns, ['r1']);
  });

  it('normalizes $, / and commander: prefixes', async () => {
    const { normalizeSkill } = await import(LIB);
    assert.equal(normalizeSkill('$CCC-Build'), 'ccc-build');
    assert.equal(normalizeSkill('/commander:ccc-review'), 'ccc-review');
    assert.equal(normalizeSkill(null), '');
  });

  it('dedups per run id even after the cooldown has passed', async () => {
    const { decideNextStep, DEFAULT_COOLDOWN_MS } = await import(LIB);
    const first = decideNextStep({ skill: 'ccc-build', runId: 'r1', now: T0 });
    const again = decideNextStep({
      skill: 'ccc-build', runId: 'r1', now: T0 + DEFAULT_COOLDOWN_MS * 5, state: first.state,
    });
    assert.equal(again.offer, false);
    assert.equal(again.reason, 'already-offered');
  });

  it('applies the cooldown across different runs, then releases it', async () => {
    const { decideNextStep, DEFAULT_COOLDOWN_MS } = await import(LIB);
    const first = decideNextStep({ skill: 'ccc-build', runId: 'r1', now: T0 });
    const early = decideNextStep({
      skill: 'ccc-testing', runId: 'r2', now: T0 + DEFAULT_COOLDOWN_MS - 1, state: first.state,
    });
    assert.equal(early.offer, false);
    assert.equal(early.reason, 'cooldown');
    assert.deepEqual(early.state.offeredRuns, ['r1'], 'suppressed run is not recorded');
    const later = decideNextStep({
      skill: 'ccc-testing', runId: 'r2', now: T0 + DEFAULT_COOLDOWN_MS, state: first.state,
    });
    assert.equal(later.offer, true);
    assert.deepEqual(later.state.offeredRuns, ['r1', 'r2']);
  });

  it('honors a custom cooldown, including zero', async () => {
    const { decideNextStep } = await import(LIB);
    const first = decideNextStep({ skill: 'ccc-build', runId: 'r1', now: T0, cooldownMs: 0 });
    const next = decideNextStep({ skill: 'ccc-qa', runId: 'r2', now: T0, cooldownMs: 0, state: first.state });
    assert.equal(next.offer, true);
  });

  it('is silent when CCC_ROUTE_MODE is off/quiet/silent/none', async () => {
    const { decideNextStep } = await import(LIB);
    for (const mode of ['off', 'QUIET', ' silent ', 'none']) {
      const r = decideNextStep({ skill: 'ccc-build', runId: 'r1', now: T0, mode });
      assert.equal(r.offer, false, mode);
      assert.equal(r.reason, 'mode-off');
    }
    assert.equal(decideNextStep({ skill: 'ccc-build', runId: 'r1', now: T0, mode: 'auto' }).offer, true);
  });

  it('skips unknown skills, missing run ids and missing clock', async () => {
    const { decideNextStep } = await import(LIB);
    assert.equal(decideNextStep({ skill: 'ccc-ship', runId: 'r1', now: T0 }).reason, 'no-next-steps');
    assert.equal(decideNextStep({ skill: 'ccc-build', now: T0 }).reason, 'no-run-id');
    assert.equal(decideNextStep({ skill: 'ccc-build', runId: 'r1' }).reason, 'no-clock');
    assert.equal(decideNextStep().offer, false);
  });

  it('caps options at three and drops duplicates', async () => {
    const { nextOptions } = await import(LIB);
    const graph = { a: ['x', 'x', 'y', 'z', 'w'] };
    assert.deepEqual(nextOptions('a', graph).map((o) => o.skill), ['x', 'y', 'z']);
  });

  it('does not mutate the input state and bounds remembered runs', async () => {
    const { decideNextStep } = await import(LIB);
    const state = { lastOfferAt: undefined, offeredRuns: Array.from({ length: 50 }, (_, i) => `old${i}`) };
    const snapshot = JSON.stringify(state);
    const r = decideNextStep({ skill: 'ccc-build', runId: 'new', now: T0, state });
    assert.equal(JSON.stringify(state), snapshot);
    assert.equal(r.state.offeredRuns.length, 50);
    assert.equal(r.state.offeredRuns.at(-1), 'new');
    assert.equal(r.state.offeredRuns[0], 'old1');
  });

  it('every graph target is a distinct option list of at most three', async () => {
    const { NEXT_GRAPH, MAX_OPTIONS } = await import(LIB);
    for (const [k, v] of Object.entries(NEXT_GRAPH)) {
      assert.ok(v.length <= MAX_OPTIONS && new Set(v).size === v.length, k);
      assert.ok(!v.includes(k), `${k} must not point at itself`);
    }
  });
});
