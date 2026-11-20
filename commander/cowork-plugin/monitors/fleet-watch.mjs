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
 * Reads the same markers as /ccc-fleet-viz (*-status.json, *-complete.json, worker-progress.jsonl in the
 * current run's owner-only directory, <config dir>/commander/fleet/runs/<run-id>/, resolved by
 * skills/ccc-fleet/lib/fleet-status.js) through that skill's collectFleetState(), the one parser for them. It
 * re-reads only when the run or the marker directory's listing or mtimes change, so an idle session costs one
 * stat every few seconds. Read-only: it never writes, moves or deletes a marker. Every error is swallowed; a
 * monitor that crashes would only go quiet.
 *
 * Its lines reach Claude as notifications, so a marker is untrusted input: only the MARKER_FIELDS allowlist
 * is parsed, a worker id must match SAFE_ID, a status must be one of the renderer's fixed values, and every
 * line is `[ccc-fleet] ` followed by fixed-shape JSON. No label, title, branch or error text is copied out.
 *
 * Usage: node fleet-watch.mjs [--state-dir=PATH] [--interval-ms=N] [--once]
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RENDERER = path.join(HERE, '..', 'skills', 'ccc-fleet-viz', 'lib', 'render-fleet-tree.js');
const FLEET_STATUS = path.join(HERE, '..', 'skills', 'ccc-fleet', 'lib', 'fleet-status.js');
const SETTLED = new Set(['done', 'failed']);
const KNOWN_STATUSES = new Set(['done', 'running', 'failed', 'waiting', 'unknown']);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const PREFIX = '[ccc-fleet] ';

/** The only marker fields the monitor parses: the worker id, its status, its exit code. */
export const MARKER_FIELDS = Object.freeze(['worker_id', 'workerId', 'id', 'status', 'state', 'phase', 'exit_code']);

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

/** A worker reduced to { id, status, exit_code }, or null when its id is not a plain safe token. */
export function watchRecord(worker) {
  if (!worker || typeof worker.id !== 'string' || !SAFE_ID.test(worker.id)) return null;
  return {
    id: worker.id,
    status: KNOWN_STATUSES.has(worker.status) ? worker.status : 'unknown',
    exit_code: Number.isInteger(worker.exitCode) ? worker.exitCode : null,
  };
}

/**
 * Lines to print for the change from `previous` (id -> status) to `state`. Pure, so it is unit-tested.
 * Returns { lines, statuses }.
 *
 * A worker whose id is not a safe token is never printed, but it still counts: it is tracked under an internal
 * key (never output) and its status holds the run open, so "settled" is not reported while it still runs.
 */
export function diffFleet(previous, state) {
  const lines = [];
  const statuses = new Map();
  const all = [];
  let changed = false;
  (state.workers || []).forEach((worker, index) => {
    const r = watchRecord(worker);
    if (r) { all.push(r); return; }
    const status = worker && KNOWN_STATUSES.has(worker.status) ? worker.status : 'unknown';
    const key = `\0unsafe:${worker && typeof worker.id === 'string' ? worker.id : index}`;
    statuses.set(key, status);
    if (previous.get(key) !== status) changed = true;
    all.push({ id: null, status });
  });
  for (const r of all) {
    if (r.id === null) continue;
    statuses.set(r.id, r.status);
    const before = previous.get(r.id);
    if (before === r.status) continue;
    changed = true;
    const line = { event: 'worker', id: r.id };
    if (before) line.from = before;
    line.status = r.status;
    if (r.exit_code !== null) line.exit_code = r.exit_code;
    lines.push(PREFIX + JSON.stringify(line));
  }
  const nowSettled = all.length > 0 && all.every((r) => SETTLED.has(r.status));
  if (changed && nowSettled) {
    const done = all.filter((r) => r.status === 'done').length;
    lines.push(PREFIX + JSON.stringify({ event: 'settled', done, failed: all.length - done, total: all.length, next: '/ccc-fleet-viz' }));
  }
  return { lines, statuses };
}

/** The current run's directory (fleet-status.js), or null when there is no run or it fails its checks. */
function currentRunDir() {
  try {
    return createRequire(import.meta.url)(FLEET_STATUS).currentRunDir();
  } catch {
    return null;
  }
}

async function main() {
  const explicitDir = arg('state-dir', null);
  const intervalMs = Math.max(500, Number(arg('interval-ms', '3000')) || 3000);
  const once = process.argv.includes('--once');
  const { collectFleetState } = await import(pathToFileURL(RENDERER).href);

  let stateDir;
  let signature = null;
  let statuses = new Map();
  for (;;) {
    const dir = explicitDir || currentRunDir();
    if (dir !== stateDir) {          // a new run started (or the old one went away): start fresh
      stateDir = dir;
      signature = null;
      statuses = new Map();
    }
    const next = stateDir ? markerSignature(stateDir) : '';
    if (next !== signature) {
      signature = next;
      if (next) {
        try {
          const diff = diffFleet(statuses, collectFleetState({ stateDir, fields: MARKER_FIELDS }));
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
