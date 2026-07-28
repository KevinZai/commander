#!/usr/bin/env node
/**
 * build-console.mjs (v7.4.0 Phase 1)
 *
 * The one entry point behind /ccc-console. Reads the composed console model
 * once, then renders EITHER surface from it:
 *
 *   --surface widget    (default) the inline visualize-MCP widget — 680px,
 *                       prompt bar, fixed-template chips. Local only.
 *   --surface artifact  a single-tab snapshot page, byte-identical to what the
 *                       matching deck skill publishes today (buildDeckHtml).
 *
 * Like scripts/build-cockpit.mjs, every path resolves relative to THIS file
 * (import.meta.url) rather than process.cwd(), so it behaves the same run from
 * the repo root or from a marketplace plugin cache. It reads only the user's own
 * telemetry under ~/.claude/commander and writes only where told; it never
 * publishes anything — publishing is the skill's job, and it is consent-gated.
 *
 * Usage:
 *   node build-console.mjs [--tab overview|usage|safety|launch]
 *                          [--surface widget|artifact]
 *                          [--out <path>]        # default: stdout
 *                          [--now <ISO>]         # pinned clock, for tests
 *                          [--no-recompute]      # skip the ccusage refresh
 *
 * Core free forever — no license check, no tier gating.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { readConsoleModel } from '../lib/console-model.js';
import { buildDeckHtml } from '../lib/console-render.js';
import { buildConsoleWidgetHtml } from '../lib/console-widget.js';

const WIDGET_TABS = new Set(['overview', 'usage', 'safety', 'launch']);

// Console tab -> (deck tab, model section). 'launch' has no artifact form: it is
// a chip launcher, which degrades to nothing useful on a static page.
const ARTIFACT_TABS = Object.freeze({
  overview: { deckTab: 'mission-control', section: 'missionControl' },
  usage: { deckTab: 'usage', section: 'usage' },
  safety: { deckTab: 'safety', section: 'safety' },
});

function parseArgs(argv) {
  const args = { tab: 'overview', surface: 'widget', outPath: null, now: undefined, recompute: true };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--tab') args.tab = argv[++index];
    else if (flag === '--surface') args.surface = argv[++index];
    else if (flag === '--out') args.outPath = argv[++index];
    else if (flag === '--now') args.now = argv[++index];
    else if (flag === '--no-recompute') args.recompute = false;
    else throw new Error(`unknown argument "${flag}"`);
  }
  if (!WIDGET_TABS.has(args.tab)) {
    throw new Error(`unknown tab "${args.tab}" (expected: ${[...WIDGET_TABS].join(', ')})`);
  }
  if (args.surface !== 'widget' && args.surface !== 'artifact') {
    throw new Error(`unknown surface "${args.surface}" (expected: widget, artifact)`);
  }
  if (args.surface === 'artifact' && !Object.hasOwn(ARTIFACT_TABS, args.tab)) {
    throw new Error(`tab "${args.tab}" has no artifact form — it is a chip launcher, widget only`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const model = await readConsoleModel({ now: args.now, recompute: args.recompute });

  let output;
  if (args.surface === 'widget') {
    output = buildConsoleWidgetHtml(model, { tab: args.tab, now: args.now });
  } else {
    const { deckTab, section } = ARTIFACT_TABS[args.tab];
    // A null section means that reader threw (console-model.js records it in
    // model.errors and keeps going). Render the deck's own zero-state from an
    // empty model rather than crashing the publish — same fail-open contract
    // the decks already have for a machine with no telemetry.
    output = buildDeckHtml(model[section] || {}, { tab: deckTab, now: args.now });
  }

  if (args.outPath) {
    const target = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, output);
    process.stderr.write(`build-console: wrote ${target}\n`);
  } else {
    process.stdout.write(output);
  }

  for (const entry of model.errors || []) {
    process.stderr.write(`build-console: section "${entry.section}" unavailable — ${entry.message}\n`);
  }
}

// Only run when invoked as a script — importing this module (parseArgs is unit
// tested) must not read telemetry or write files as a side effect.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`build-console: ${message}\n`);
    process.exitCode = 1;
  });
}

export { ARTIFACT_TABS, parseArgs };
