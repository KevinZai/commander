'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const P = require(path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'lib', 'confidence-policy.mjs'));

const sug = (n, score) => Array.from({ length: n }, (_, i) => ({
  skill: `/ccc-s${i}`, reason: `r${i}`, ...(score ? { score: score[i] } : {}),
}));

describe('confidence-policy', () => {
  it('resolveMode defaults to suggest and rejects junk', () => {
    assert.equal(P.resolveMode(undefined), 'suggest');
    assert.equal(P.resolveMode('bogus'), 'suggest');
    assert.equal(P.resolveMode(' AUTO '), 'auto');
    assert.equal(P.resolveMode('off'), 'off');
  });

  it('off is always silent', () => {
    assert.equal(P.decide({ confidence: 0.95, suggestions: sug(1) }, { CCC_ROUTE_MODE: 'off' }).action, 'silent');
  });

  it('low stays silent in every mode', () => {
    for (const m of ['suggest', 'auto']) {
      assert.equal(P.decide({ confidence: 0.39, suggestions: sug(2) }, { CCC_ROUTE_MODE: m }).action, 'silent');
    }
  });

  it('silent with no suggestions or bad confidence', () => {
    assert.equal(P.decide({ confidence: 0.9, suggestions: [] }, { CCC_ROUTE_MODE: 'auto' }).action, 'silent');
    assert.equal(P.decide({ confidence: NaN, suggestions: sug(1) }).action, 'silent');
    assert.equal(P.decide().action, 'silent');
  });

  it('auto + high + clear winner runs the skill', () => {
    const d = P.decide({ confidence: 0.8, suggestions: sug(2, [0.85, 0.5]) }, { CCC_ROUTE_MODE: 'auto' });
    assert.equal(d.action, 'run');
    assert.equal(d.skill, '/ccc-s0');
  });

  it('suggest + high shows the menu, never runs', () => {
    const d = P.decide({ confidence: 0.95, suggestions: sug(1) }, {});
    assert.equal(d.action, 'menu');
    assert.equal(d.options[0].recommended, true);
  });

  it('auto + high but top two close falls back to menu', () => {
    const d = P.decide({ confidence: 0.9, suggestions: sug(2, [0.85, 0.8]) }, { CCC_ROUTE_MODE: 'auto' });
    assert.equal(d.action, 'menu');
  });

  it('medium shows menu with recommended first', () => {
    const d = P.decide({ confidence: 0.6, suggestions: sug(3) }, { CCC_ROUTE_MODE: 'auto' });
    assert.equal(d.action, 'menu');
    assert.deepEqual(d.options.map(o => o.recommended), [true, false, false]);
  });

  it('boundaries: 0.4 is medium, just under 0.8 is medium in auto', () => {
    assert.equal(P.decide({ confidence: 0.4, suggestions: sug(1) }).action, 'menu');
    assert.equal(P.decide({ confidence: 0.79, suggestions: sug(1) }, { CCC_ROUTE_MODE: 'auto' }).action, 'menu');
  });

  it('caps options per surface', () => {
    const s = sug(6);
    const cc = P.decide({ confidence: 0.6, suggestions: s }, { CLAUDE_PLUGIN_ROOT: '/x' });
    const cx = P.decide({ confidence: 0.6, suggestions: s }, { PLUGIN_ROOT: '/x' });
    const tx = P.decide({ confidence: 0.6, suggestions: s }, {});
    assert.deepEqual([cc.surface, cc.options.length], ['claude-code', 4]);
    assert.deepEqual([cx.surface, cx.options.length], ['codex', 3]);
    assert.deepEqual([tx.surface, tx.options.length], ['text', 3]);
  });
});
