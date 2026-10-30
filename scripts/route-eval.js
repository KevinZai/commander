#!/usr/bin/env node
/**
 * route-eval.js — the routing eval as one command (`npm run eval:routes`).
 *
 * Runs the labelled prompt set (commander/tests/fixtures/routing-prompts.json)
 * through the same scorer the UserPromptSubmit hook uses and gates on:
 *   recall          >= 90%  labelled prompt: expected route is top, tier medium/high
 *   false triggers  0       a "none" prompt surfaced any route
 *   interference    0       a labelled prompt surfaced a different top route
 *   wrong auto-runs 0       the high tier fired anything but the expected skill
 *   missed auto-runs 0      a minTier "high" prompt only reached medium or low
 *   silent routes   0       a route with labelled cases fired on none of them
 *                           (aggregate recall can hide one skill drifting dark)
 * Prompts marked maxTier "medium" (topic mentions) are kept out of recall.
 *
 * Re-run after editing route-hints.json or a skill/agent description, and after
 * a model upgrade together with a live check of how the model acts on the
 * <ccc-route> block. Offline: no model calls, no network, no writes.
 *
 * Usage:
 *   node scripts/route-eval.js                     # report; exit 1 if a gate fails
 *   node scripts/route-eval.js --json              # machine-readable report
 *   node scripts/route-eval.js --fixtures <file>   # a different labelled set
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const SCORER = path.join(ROOT, 'commander', 'cowork-plugin', 'hooks', 'lib', 'route-scorer.mjs');
const FIXTURES = path.join(ROOT, 'commander', 'tests', 'fixtures', 'routing-prompts.json');
const GATES = { recall: 0.9, falseTriggers: 0, interference: 0, wrongAutoRuns: 0, missedAutoRuns: 0, silentRoutes: 0 };

/**
 * Evaluate labelled cases against routes (default: the checked-in registry).
 * Returns per-gate counts, the offending cases and `failures` (empty = pass).
 */
async function evaluate(cases, routes) {
  const s = await import(pathToFileURL(SCORER).href);
  const registry = routes || s.loadRoutes();
  const known = new Set(registry.map((r) => r.id));
  const report = { cases: cases.length, labelled: 0, none: 0, hits: 0, misses: [], falseTriggers: [], interference: [], wrongAutoRuns: [], missedAutoRuns: [], silentRoutes: [], unknown: [] };
  const perRoute = new Map();
  for (const c of cases) {
    const candidates = s.skipReason(c.prompt) ? [] : s.scoreRoutes(c.prompt, registry);
    const tier = s.tierFor(candidates, 'auto');
    const top = candidates[0] ? candidates[0].route.id : null;
    const fired = tier !== 'low';
    const row = { prompt: c.prompt, expect: c.expect, top, tier };
    if (c.expect === 'none') {
      report.none += 1;
      if (fired) report.falseTriggers.push(row);
      continue;
    }
    if (!known.has(c.expect)) report.unknown.push(row);
    if (fired && top !== c.expect) report.interference.push(row);
    if (tier === 'high' && (top !== c.expect || c.maxTier === 'medium')) report.wrongAutoRuns.push(row);
    if (c.minTier === 'high' && !(tier === 'high' && top === c.expect)) report.missedAutoRuns.push(row);
    if (c.maxTier) continue;
    report.labelled += 1;
    const hit = fired && top === c.expect;
    perRoute.set(c.expect, (perRoute.get(c.expect) || 0) + (hit ? 1 : 0));
    if (hit) report.hits += 1;
    else report.misses.push(row);
  }
  report.silentRoutes = [...perRoute].filter(([, hits]) => hits === 0).map(([id]) => id).sort();
  report.recall = report.labelled ? report.hits / report.labelled : 0;
  const failures = [];
  if (report.unknown.length) failures.push(`${report.unknown.length} case(s) expect a route that is not in the registry`);
  if (report.recall < GATES.recall) failures.push(`recall ${(report.recall * 100).toFixed(1)}% < ${GATES.recall * 100}%`);
  if (report.falseTriggers.length > GATES.falseTriggers) failures.push(`${report.falseTriggers.length} false trigger(s)`);
  if (report.interference.length > GATES.interference) failures.push(`${report.interference.length} wrong-route fire(s)`);
  if (report.wrongAutoRuns.length > GATES.wrongAutoRuns) failures.push(`${report.wrongAutoRuns.length} wrong auto-run(s)`);
  if (report.missedAutoRuns.length > GATES.missedAutoRuns) failures.push(`${report.missedAutoRuns.length} missed auto-run(s)`);
  if (report.silentRoutes.length > GATES.silentRoutes) failures.push(`route(s) that never fired: ${report.silentRoutes.join(', ')}`);
  report.failures = failures;
  report.pass = failures.length === 0;
  return report;
}

function loadCases(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data || !Array.isArray(data.cases)) throw new Error(`${file}: expected {"cases": [...]}`);
  return data.cases;
}

function parseArgs(argv) {
  const args = { json: false, fixtures: FIXTURES };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--fixtures' && argv[i + 1]) args.fixtures = path.resolve(argv[(i += 1)]);
    else throw new Error(`unknown argument ${argv[i]} (use --json or --fixtures <file>)`);
  }
  return args;
}

async function main() {
  let args;
  let report;
  try {
    args = parseArgs(process.argv.slice(2));
    report = await evaluate(loadCases(args.fixtures));
  } catch (err) {
    console.error(`route-eval: ${err.message}`);
    process.exit(2);
  }
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`route-eval: ${report.labelled} labelled, ${report.none} none — recall ${(report.recall * 100).toFixed(1)}%, `
      + `false triggers ${report.falseTriggers.length}, interference ${report.interference.length}, wrong auto-runs ${report.wrongAutoRuns.length}, missed auto-runs ${report.missedAutoRuns.length}, silent routes ${report.silentRoutes.length}`);
    for (const key of ['unknown', 'misses', 'falseTriggers', 'interference', 'wrongAutoRuns', 'missedAutoRuns']) {
      for (const r of report[key]) console.log(`  ${key}: expected ${r.expect}, got ${r.top || '-'} (${r.tier}) <- "${r.prompt}"`);
    }
    console.log(report.pass ? '✅ routing gates pass' : `❌ ${report.failures.join('; ')}`);
  }
  process.exit(report.pass ? 0 : 1);
}

if (require.main === module) main();

module.exports = { evaluate, loadCases, GATES, FIXTURES };
