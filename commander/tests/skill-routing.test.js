'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { evaluate, loadSkills, FIXTURES } = require('../../scripts/routing-eval.js');

const fixtures = JSON.parse(fs.readFileSync(FIXTURES, 'utf8')).prompts;
const skills = loadSkills();

test('routing gate: recall >=90%, 0 false triggers, 0 wrong-skill fires', () => {
  const r = evaluate(fixtures, skills);
  assert.deepStrictEqual(r.failures, [], JSON.stringify({ m: r.misses, i: r.interference, f: r.falseTriggers }, null, 1));
});

test('fixtures include "none" prompts and cover a broad skill set', () => {
  const none = fixtures.filter((f) => f.expect === 'none').length;
  const covered = new Set(fixtures.flatMap((f) => (f.expect === 'none' ? [] : [].concat(f.expect))));
  assert.ok(none >= 20, `need >=20 none prompts, have ${none}`);
  assert.ok(covered.size >= 50, `need >=50 distinct skills covered, have ${covered.size}`);
});

test('gate detects trigger drift: a gutted description fails recall/interference', () => {
  const drifted = skills.map((s) => (s.name === 'ccc-review' ? { ...s, description: 'Placeholder.' } : s));
  const r = evaluate(fixtures, drifted);
  assert.ok(r.misses.length + r.interference.length > 0);
});

test('gate detects false triggers: a "none" prompt aimed at a skill is flagged', () => {
  const extra = [{ prompt: 'Review my current branch before I open a pull request', expect: 'none' }];
  const r = evaluate(extra, skills);
  assert.strictEqual(r.pass, false);
  assert.strictEqual(r.falseTriggers.length, 1);
});
