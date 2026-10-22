'use strict';

// Routing eval: the labelled prompt set in fixtures/routing-prompts.json run
// through the same scorer the UserPromptSubmit hook uses.
// Gates (SPEC (e) #5): recall >= 90%, zero false triggers — a "none" prompt
// must stay silent and a labelled prompt must never surface a different top
// route. Re-run after editing route-hints.json or any skill description.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCORER = path.join(ROOT, 'commander', 'cowork-plugin', 'hooks', 'lib', 'route-scorer.mjs');
const CASES = require('./fixtures/routing-prompts.json').cases;

async function evaluate() {
  const s = await import(SCORER);
  const routes = s.loadRoutes();
  const results = CASES.map((c) => {
    const candidates = s.skipReason(c.prompt) ? [] : s.scoreRoutes(c.prompt, routes);
    const tier = s.tierFor(candidates, 'auto');
    return { ...c, tier, top: candidates[0] ? candidates[0].route.id : null };
  });
  return { results, routeIds: new Set(routes.map((r) => r.id)) };
}

test('ccc-routes.json is up to date with skills, agents and route-hints.json', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-routes.js'), '--check'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr || r.stdout);
});

test('every labelled route exists in the registry', async () => {
  const { routeIds } = await evaluate();
  for (const c of CASES) {
    if (c.expect !== 'none') assert.ok(routeIds.has(c.expect), `unknown route ${c.expect}`);
  }
});

test('eval set has "none" prompts and labelled prompts', () => {
  assert.ok(CASES.filter((c) => c.expect === 'none').length >= 30);
  assert.ok(CASES.filter((c) => c.expect !== 'none').length >= 60);
});

test('recall >= 90%: the expected route is the top suggestion', async () => {
  const { results } = await evaluate();
  const labelled = results.filter((r) => r.expect !== 'none');
  const hits = labelled.filter((r) => r.tier !== 'low' && r.top === r.expect);
  const misses = labelled.filter((r) => !(r.tier !== 'low' && r.top === r.expect)).map((r) => `${r.expect} <- "${r.prompt}" (${r.tier}, ${r.top})`);
  const recall = hits.length / labelled.length;
  assert.ok(recall >= 0.9, `recall ${(recall * 100).toFixed(1)}% < 90%\n${misses.join('\n')}`);
});

test('zero false triggers: wrong route never fires', async () => {
  const { results } = await evaluate();
  const falseTriggers = results
    .filter((r) => r.tier !== 'low' && r.top !== r.expect)
    .map((r) => `expected ${r.expect}, fired ${r.top} (${r.tier}) <- "${r.prompt}"`);
  assert.deepStrictEqual(falseTriggers, []);
});

test('high tier (auto-run) only ever fires the expected skill', async () => {
  const { results } = await evaluate();
  for (const r of results.filter((x) => x.tier === 'high')) {
    assert.strictEqual(r.top, r.expect, `auto-run of ${r.top} for "${r.prompt}"`);
  }
});

test('every next[] edge points at a routable skill', async () => {
  const s = await import(SCORER);
  const routes = s.loadRoutes();
  const ids = new Set(routes.map((r) => r.id));
  for (const r of routes) for (const n of r.next) assert.ok(ids.has(n), `${r.id} -> ${n}`);
});
