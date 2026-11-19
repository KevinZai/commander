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
test('explicit high-tier requests auto-run a visible skill and offer a hidden or side-effect one', async () => {
  const s = await import(SCORER);
  const manual = new Set(s.loadRoutes().filter((r) => r.manual || r.sideEffect).map((r) => r.id));
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
  for (const overrides of [{ manual: true }, { kind: 'agent' }, { sideEffect: true }]) {
    assert.strictEqual(s.tierFor([{ ...request[0], route: { ...review, ...overrides } }]), 'medium');
  }
  // Side-effect skills never auto-run in any mode (audit finding 10: ccc-fleet in auto).
  for (const mode of ['auto', 'always']) {
    assert.strictEqual(s.tierFor([{ ...request[0], route: { ...review, sideEffect: true } }], mode), 'medium');
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

test('a negated directive never routes; a described failure still does', async () => {
  const s = await import(SCORER);
  const fires = (p) => s.tierFor(s.scoreRoutes(p), 'auto') !== 'low';
  for (const p of ['do not deploy to vercel', 'skip the code review, how long does the build take',
    "don't write a changelog, what changed in the last release", 'avoid deploying on fridays, is that a common rule',
    "we don't want to deploy, what is in the vercel config"]) {
    assert.ok(!fires(p), `negated prompt fired: ${p}`);
  }
  // The clause after a contrast marker is still the request.
  assert.strictEqual(s.scoreRoutes("review this pr but don't deploy it")[0].route.id, 'ccc-review');
  assert.strictEqual(s.scoreRoutes("don't deploy, just review the code changes in this pr")[0].route.id, 'ccc-review');
  // Problem descriptions are not directives.
  assert.strictEqual(s.stripNegated("the tests don't work on my machine"), "the tests don't work on my machine");
  assert.strictEqual(s.stripNegated("login is not working, it doesn't work"), "login is not working, it doesn't work");
  assert.strictEqual(s.stripNegated("i don't know why it fails, debug it"), "i don't know why it fails, debug it");
  // Mid-sentence, subject-led negations (Fable review of #302).
  for (const p of ['You should not write unit tests here', 'You must not deploy to vercel', "Let's not deploy to vercel today",
    'It is not necessary to write unit tests for this', "you don't need to write a changelog", 'Don\u2019t write unit tests for my code']) {
    assert.ok(!fires(p), `negated prompt fired: ${p}`);
  }
  // Double negation, a spaced dash and a new imperative clause end the negated span.
  assert.strictEqual(s.scoreRoutes("don't skip the unit tests - write unit tests for auth")[0].route.id, 'ccc-testing');
  assert.strictEqual(s.scoreRoutes('Skip deployment, then write unit tests for my code')[0].route.id, 'ccc-testing');
  assert.strictEqual(s.scoreRoutes('Skip deployment, write unit tests for my code')[0].route.id, 'ccc-testing');
  assert.strictEqual(s.stripNegated("don't deploy, build or test anything").trim(), '', 'a bare list stays negated');
  // Codex delta2 M1/M7: a comma list of prohibited actions closed by "or <verb>" stays negated.
  // Codex delta3 NM3: the list is closed by ", or"/", nor" and any verb (not a fixed verb list); an "or"
  // without a comma belongs to the new clause, so that clause is still a request.
  for (const p of ['Do not write documentation, write unit tests for my code, or deploy anything',
    'Never deploy, add the tests, nor ship the release',
    'Do not write documentation, write unit tests for my code, or publish a release']) {
    assert.ok(!fires(p), `prohibited list fired: ${p}`);
  }
  // Codex delta4: ", or" closes the list only before a verb; before a preposition or adverb ("in", "with",
  // "if") it continues the new clause. Without the comma the "or" is ambiguous and reads as a request.
  for (const p of ['Skip deployment, write unit tests for my code or run integration tests',
    "don't deploy, write unit tests for my code or run the audit",
    'Do not write documentation, write unit tests for my code in Python, or in JavaScript if you prefer',
    'Skip deployment, write unit tests for my code with pytest, or with jest if you prefer',
    'Do not write documentation, write unit tests for my code or deploy anything']) {
    assert.strictEqual(s.scoreRoutes(p)[0].route.id, 'ccc-testing', p);
  }
  assert.strictEqual(s.stripNegated('i must have broken it, debug the test'), 'i must have broken it, debug the test');
  // Length is kept, so offsets into the text stay valid.
  const text = 'do not deploy. review the pr';
  assert.strictEqual(s.stripNegated(text).length, text.length);
  assert.match(s.stripNegated(text), /^ +\. review the pr$/);
});

test('normalizePrompt blanks double-quoted spans and reuses the task quoting rules', async () => {
  const s = await import(SCORER);
  assert.strictEqual(s.normalizePrompt('what does "deploy to production" mean'), 'what does mean');
  assert.strictEqual(s.normalizePrompt('what does “run a security audit” mean'), 'what does mean');
  // Blockquotes and indented code are quoted material, as in worker tasks.
  assert.strictEqual(s.normalizePrompt('> deploy the app now\n\nwhat is this log line'), 'what is this log line');
  assert.strictEqual(s.normalizePrompt('explain this:\n\n    npm run deploy\n\nplease'), 'explain this: please');
  // A paste longer than the task window cannot push the request out.
  const paste = `<pasted_content>${'x '.repeat(3000)}</pasted_content>\nreview this pr`;
  assert.strictEqual(s.normalizePrompt(paste), 'review this pr');
  // Apostrophes are not quotes.
  assert.strictEqual(s.normalizePrompt("it's the user's build"), "it's the user's build");
});

test('worker tasks apply the same negation rules as prompts (route-task path)', async () => {
  const s = await import(SCORER);
  const routes = s.loadRoutes();
  const top = (t) => (s.scoreTask(t, routes)[0] || {}).route?.id;
  assert.notStrictEqual(top('Don\u2019t write unit tests for my code'), 'ccc-testing');
  assert.notStrictEqual(top('You should not write unit tests here'), 'ccc-testing');
  assert.strictEqual(top('Skip deployment, then write unit tests for my code'), 'ccc-testing');
  assert.strictEqual(top("don't skip the unit tests - write unit tests for auth"), 'ccc-testing');
});
