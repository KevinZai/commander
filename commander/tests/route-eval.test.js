'use strict';

// Routing eval: the labelled prompt set in fixtures/routing-prompts.json run
// through the same scorer the UserPromptSubmit hook uses.
// Gates (SPEC (e) #5): recall >= 90%, zero false triggers — a "none" prompt
// must stay silent and a labelled prompt must never surface a different top
// route. Re-run after editing route-hints.json or any skill description;
// `npm run eval:routes` (scripts/route-eval.js) prints the same gates as a report.

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
  const labelled = results.filter((r) => r.expect !== 'none' && !r.maxTier);
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
    assert.notStrictEqual(r.maxTier, 'medium', `topic mention auto-ran ${r.top} for "${r.prompt}"`);
  }
});

// Hidden (disable-model-invocation) skills never auto-run: an explicit request
// for one becomes a medium-tier offer with that skill on top (CC-2112).
test('explicit high-tier requests auto-run a visible skill and offer a hidden one', async () => {
  const s = await import(SCORER);
  const manual = new Set(s.loadRoutes().filter((r) => r.manual).map((r) => r.id));
  const { results } = await evaluate();
  for (const r of results.filter((x) => x.minTier === 'high')) {
    assert.strictEqual(r.tier, manual.has(r.expect) ? 'medium' : 'high', `wrong tier for "${r.prompt}"`);
    assert.strictEqual(r.top, r.expect);
  }
});

test('high requires intent evidence as well as score and margin', async () => {
  const s = await import(SCORER);
  const review = s.loadRoutes().find((r) => r.id === 'ccc-review');
  const scoreOnly = s.scoreRoutes('code review', [review]);
  assert.ok(scoreOnly[0].score >= s.HIGH_THRESHOLD);
  assert.strictEqual(s.tierFor(scoreOnly), 'medium');
  const request = s.scoreRoutes('please review my changes', [review]);
  assert.strictEqual(s.tierFor(request), 'high');
  assert.strictEqual(s.tierFor(request, 'suggest'), 'medium');
  assert.strictEqual(s.tierFor([{ ...request[0], score: s.HIGH_THRESHOLD - 0.01 }]), 'medium');
  assert.strictEqual(s.tierFor([request[0], { ...request[0], score: request[0].score - 0.1 }]), 'medium');
  for (const overrides of [{ manual: true }, { kind: 'agent' }]) {
    assert.strictEqual(s.tierFor([{ ...request[0], route: { ...review, ...overrides } }]), 'medium');
  }
});

test('routes without any matching signals are excluded', async () => {
  const { routeIds } = await evaluate();
  for (const id of ['agent:builder', 'agent:content-strategist', 'agent:fleet-worker']) {
    assert.ok(!routeIds.has(id), id);
  }
});

test('every next[] edge points at a routable skill', async () => {
  const s = await import(SCORER);
  const routes = s.loadRoutes();
  const ids = new Set(routes.map((r) => r.id));
  for (const r of routes) for (const n of r.next) assert.ok(ids.has(n), `${r.id} -> ${n}`);
});

// ── scripts/route-eval.js: the one command to re-run the gates (CC-2063) ──

const fs = require('node:fs');
const os = require('node:os');
const EVAL = path.join(ROOT, 'scripts', 'route-eval.js');
const { evaluate: runEval } = require(EVAL);
const REGISTRY = path.join(ROOT, 'commander', 'cowork-plugin', 'hooks', 'lib', 'ccc-routes.json');

function tmpFile(name, data) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-route-eval-')), name);
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}

test('route-eval CLI passes on the checked-in set and prints every gate', () => {
  const r = spawnSync(process.execPath, [EVAL], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /recall \d+\.\d%, false triggers 0, interference 0, wrong auto-runs 0, missed auto-runs 0, silent routes 0/);
  assert.match(r.stdout, /routing gates pass/);
});

test('route-eval --json reports the same counts the gates use', () => {
  const r = spawnSync(process.execPath, [EVAL, '--json'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.strictEqual(report.pass, true);
  assert.strictEqual(report.cases, CASES.length);
  assert.ok(report.recall >= 0.9);
  for (const key of ['falseTriggers', 'interference', 'wrongAutoRuns', 'missedAutoRuns', 'silentRoutes', 'failures']) assert.deepStrictEqual(report[key], [], key);
});

test('route-eval catches trigger drift: a route stripped of its hints loses recall', async () => {
  const s = await import(SCORER);
  const data = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  for (const r of data.routes) if (r.id === 'ccc-review') Object.assign(r, { strong: [], triggers: [], patterns: [], descTriggers: [] });
  const report = await runEval(CASES, s.loadRoutes(tmpFile('ccc-routes.json', data)));
  assert.ok(report.misses.some((m) => m.expect === 'ccc-review'));
  assert.ok(report.recall >= 0.9, 'aggregate recall alone would not catch this');
  assert.deepStrictEqual(report.silentRoutes, ['ccc-review']);
  assert.strictEqual(report.pass, false);
});

test('route-eval fails when minTier "high" prompts drop to a suggestion', async () => {
  const s = await import(SCORER);
  const data = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  for (const r of data.routes) r.manual = true;
  const report = await runEval(CASES, s.loadRoutes(tmpFile('ccc-routes.json', data)));
  assert.ok(report.recall >= 0.9, 'medium-tier hits still count toward recall');
  assert.strictEqual(report.missedAutoRuns.length, CASES.filter((c) => c.minTier === 'high').length);
  assert.ok(report.failures.some((f) => /missed auto-run/.test(f)));
  assert.strictEqual(report.pass, false);
});

test('route-eval counts a firing "none" prompt as a false trigger and a wrong top route as interference', async () => {
  const report = await runEval([
    { prompt: 'please review my changes', expect: 'none' },
    { prompt: 'please review my changes', expect: 'ccc-plan' },
  ]);
  assert.strictEqual(report.falseTriggers.length, 1);
  assert.strictEqual(report.interference.length, 1);
  assert.strictEqual(report.wrongAutoRuns.length, 1);
  assert.strictEqual(report.pass, false);
});

test('route-eval exits 1 on a failing set and 2 on a malformed one', () => {
  const failing = tmpFile('cases.json', { cases: [{ prompt: 'please review my changes', expect: 'none' }] });
  const r = spawnSync(process.execPath, [EVAL, '--fixtures', failing], { encoding: 'utf8' });
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /falseTriggers: expected none, got ccc-review/);
  const malformed = spawnSync(process.execPath, [EVAL, '--fixtures', tmpFile('bad.json', { prompts: [] })], { encoding: 'utf8' });
  assert.strictEqual(malformed.status, 2);
  assert.strictEqual(spawnSync(process.execPath, [EVAL, '--bogus'], { encoding: 'utf8' }).status, 2);
});

test('route-eval flags a case that expects a route missing from the registry', async () => {
  const report = await runEval([{ prompt: 'please review my changes', expect: 'ccc-not-a-skill' }]);
  assert.strictEqual(report.unknown.length, 1);
  assert.strictEqual(report.pass, false);
});
