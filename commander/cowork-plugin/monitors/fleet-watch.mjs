#!/usr/bin/env node
/**
 * fleet-watch.mjs — plugin monitor (monitors/monitors.json, `experimental.monitors`).
 *
 * Claude Code starts it the first time /ccc-fleet runs in a session and keeps it running until the session
 * ends; every line it prints reaches Claude as a notification
 * (code.claude.com/docs/en/plugins/components#monitors, read 2026-11-18). It prints one line when a fleet
 * worker changes status and one when the whole run settles, so the coordinator hears about a finished or
 * failed worker without polling /ccc-fleet-viz itself.
 *
 * Reads the same markers as /ccc-fleet-viz (/tmp/ccc-fleet/*-status.json, *-complete.json,
 * worker-progress.jsonl) through that skill's collectFleetState(), the one parser for them. It re-reads only
 * when the marker directory's listing or mtimes change, so an idle session costs one stat every few seconds.
 * Read-only: it never writes, moves or deletes a marker. Every error is swallowed; a monitor that crashes
 * would only go quiet.
 *
 * Usage: node fleet-watch.mjs [--state-dir=PATH] [--interval-ms=N] [--once]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RENDERER = path.join(HERE, '..', 'skills', 'ccc-fleet-viz', 'lib', 'render-fleet-tree.js');
const SETTLED = new Set(['done', 'failed']);

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/** A cheap fingerprint of the marker directory: file names, sizes and mtimes. '' when it does not exist. */
export function markerSignature(stateDir) {
  try {
    return fs.readdirSync(stateDir, { withFileTypes: true })
      .filter((e) => e.isFile() && /(-status\.json|-complete\.json|worker-progress\.jsonl)$/.test(e.name))
      .map((e) => {
        const st = fs.statSync(path.join(stateDir, e.name));
        return `${e.name}:${st.size}:${Math.trunc(st.mtimeMs)}`;
      })
      .sort()
      .join('|');
  } catch {
    return '';
  }
}

/**
 * Lines to print for the change from `previous` (id -> status) to `state`. Pure, so it is unit-tested.
 * Returns { lines, statuses }.
 */
export function diffFleet(previous, state) {
  const lines = [];
  const statuses = new Map();
  for (const w of state.workers || []) {
    statuses.set(w.id, w.status);
    const before = previous.get(w.id);
    if (before === w.status) continue;
    const label = w.label || w.title || w.id;
    const where = w.branch ? ` (${w.branch})` : '';
    const why = w.status === 'failed' && w.error ? `: ${String(w.error).slice(0, 160)}` : '';
    lines.push(`[ccc-fleet] ${label}${where}: ${before ? `${before} -> ` : ''}${w.status}${why}`);
  }
  const s = state.summary || {};
  const nowSettled = s.total > 0 && (state.workers || []).every((w) => SETTLED.has(w.status));
  if (lines.length && nowSettled) {
    lines.push(`[ccc-fleet] run settled: ${s.done || 0} done, ${s.failed || 0} failed of ${s.total}. Run /ccc-fleet-viz for the tree.`);
  }
  return { lines, statuses };
}

async function main() {
  const stateDir = arg('state-dir', '/tmp/ccc-fleet');
  const intervalMs = Math.max(500, Number(arg('interval-ms', '3000')) || 3000);
  const once = process.argv.includes('--once');
  const { collectFleetState } = await import(pathToFileURL(RENDERER).href);

  let signature = null;
  let statuses = new Map();
  for (;;) {
    const next = markerSignature(stateDir);
    if (next !== signature) {
      signature = next;
      if (next) {
        try {
          const diff = diffFleet(statuses, collectFleetState({ stateDir }));
          statuses = diff.statuses;
          for (const line of diff.lines) process.stdout.write(`${line}\n`);
        } catch { /* a half-written marker: try again on the next change */ }
      } else {
        statuses = new Map();   // the run's markers were cleared; a new run starts fresh
      }
    }
    if (once) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entry && entry === fileURLToPath(import.meta.url)) {
  main().catch(() => { process.exitCode = 0; });
}
