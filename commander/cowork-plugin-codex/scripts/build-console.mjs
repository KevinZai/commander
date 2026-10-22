#!/usr/bin/env node
/**
 * build-console.mjs (v7.4.0 Phase 1)
 *
 * The one entry point behind /ccc-console. Reads the composed console model
 * once, then renders EITHER surface from it:
 *
 *   --surface widget    (default) the inline visualize-MCP widget — 680px,
 *                       prompt bar, fixed-template chips. Local only.
 *   --surface artifact  a single-tab snapshot page in the Artifact page-contract
 *                       shape (title first, guarded theme tokens, 16px gutter),
 *                       for the Artifact tool to publish (buildDeckHtml).
 *
 * Like scripts/build-cockpit.mjs, every path resolves relative to THIS file
 * (import.meta.url) rather than process.cwd(), so it behaves the same run from
 * the repo root or from a marketplace plugin cache. It reads only the user's own
 * telemetry under ~/.claude/commander and writes only where told; it never
 * publishes anything — publishing is the skill's job, and it is consent-gated.
 *
 * Usage:
 *   node build-console.mjs [--tab overview|usage|safety|memory|history|launch]
 *                          [--surface widget|artifact]
 *                          [--out <path>]        # default: stdout
 *                          [--now <ISO>]         # pinned clock, for tests
 *                          [--no-recompute]      # skip the ccusage refresh
 *                          [--db]                # overview artifact only: live
 *                                                # task board read from the
 *                                                # artifact's shared db
 *                          [--emit-rows <path>]  # overview only: write the
 *                                                # `tasks` rows for ArtifactData
 *
 * Core free forever — no license check, no tier gating.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { readConsoleModel } from '../lib/console-model.js';
import { buildDeckHtml, buildTaskRows } from '../lib/console-render.js';
import { buildConsoleWidgetHtml } from '../lib/console-widget.js';

const WIDGET_TABS = new Set(['overview', 'usage', 'safety', 'memory', 'history', 'launch']);

// Console tab -> (deck tab, model section). 'launch' has no artifact form: it is
// a chip launcher, which degrades to nothing useful on a static page.
const ARTIFACT_TABS = Object.freeze({
  overview: { deckTab: 'mission-control', section: 'missionControl' },
  usage: { deckTab: 'usage', section: 'usage' },
  safety: { deckTab: 'safety', section: 'safety' },
  memory: { deckTab: 'memory', section: 'memory' },
  history: { deckTab: 'history', section: 'history' },
});

function parseArgs(argv) {
  const args = {
    tab: 'overview',
    surface: 'widget',
    outPath: null,
    now: undefined,
    recompute: true,
    db: false,
    rowsPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--tab') args.tab = argv[++index];
    else if (flag === '--surface') args.surface = argv[++index];
    else if (flag === '--out') args.outPath = argv[++index];
    else if (flag === '--now') args.now = argv[++index];
    else if (flag === '--no-recompute') args.recompute = false;
    else if (flag === '--db') args.db = true;
    else if (flag === '--emit-rows') args.rowsPath = argv[++index];
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
  if (args.db && (args.surface !== 'artifact' || args.tab !== 'overview')) {
    throw new Error('--db is only valid with --surface artifact --tab overview (the live task board)');
  }
  if (args.rowsPath !== null && (typeof args.rowsPath !== 'string' || args.tab !== 'overview')) {
    throw new Error('--emit-rows needs a path and --tab overview');
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
    // consoleBanner: every artifact this script emits is a "publish just this
    // tab" export — the four deck skills publish through here since v7.4.0 — so
    // each page says where the all-in-one view lives. The legacy build*Html()
    // entry points leave it off so their bytes stay pinned by the Phase 0
    // goldens; this is the one caller that opts in.
    // artifactContract: this is the one publish path, so it emits the Artifact
    // page-contract shape; the legacy build*Html() entry points do not.
    output = buildDeckHtml(model[section] || {}, {
      tab: deckTab,
      surface: 'artifact',
      now: args.now,
      consoleBanner: true,
      artifactContract: true,
      liveTasks: args.db,
    });
  }

  if (args.rowsPath) {
    const rowsTarget = path.resolve(args.rowsPath);
    fs.mkdirSync(path.dirname(rowsTarget), { recursive: true });
    const rows = buildTaskRows(model.missionControl || {}, { now: args.now });
    fs.writeFileSync(rowsTarget, `${JSON.stringify(rows, null, 2)}\n`);
    process.stderr.write(`build-console: wrote ${rows.rows.length} task rows to ${rowsTarget}\n`);
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
