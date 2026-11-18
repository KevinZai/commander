#!/usr/bin/env node
/**
 * fable-armed-nudge.js
 * Hook: SessionStart (via orchestrator run() export)
 *
 * Dual-mode: exports run({input,env,cwd}) for the SessionStart orchestrator,
 * and runs standalone via CLI tail when invoked directly.
 *
 * Reports the Commander Method state that /ccc-fable records under `fableMethod`
 * in the lane's state.json (readablePath: the lane copy, else the legacy
 * ~/.claude/commander copy). It used to print "Commander Method armed" at every
 * session start without reading that flag (Codex audit #37). Now, one line:
 *   armed:true   → the stored flag is on, and the posture is NOT yet applied in
 *                  this session (/ccc-fable on re-applies it; the gates are
 *                  instructions, not hook-enforced)
 *   armed:false  → off since <date>
 *   no flag      → not armed
 *   unreadable   → says so and points at /ccc-fable status
 * Always fail-open — never blocks the session start. Respects CCC_FABLE_NUDGE_DISABLE=1.
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { emitUser } from './lib/emit.mjs';
import { readablePath } from '../lib/lane-state.js';

const day = (iso) => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null);

/** { state: 'on'|'off'|'unset'|'unreadable', since: 'YYYY-MM-DD'|null } from the lane's state.json. */
export function readFableState(env = process.env) {
  let raw;
  try {
    raw = readFileSync(readablePath('state.json', env), 'utf8');
  } catch (err) {
    return { state: err && err.code === 'ENOENT' ? 'unset' : 'unreadable', since: null };
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { state: 'unreadable', since: null }; }
  const f = parsed && typeof parsed === 'object' ? parsed.fableMethod : null;
  if (!f || typeof f !== 'object' || typeof f.armed !== 'boolean') return { state: 'unset', since: null };
  return { state: f.armed ? 'on' : 'off', since: day(f.since) };
}

export function fableStateLine({ state, since }) {
  const at = since ? ` since ${since}` : '';
  switch (state) {
    case 'on':
      return `Commander Method flag: on${at} (stored; not yet applied this session) · /ccc-fable on to re-apply the 12 gates · /ccc-fable audit to self-check`;
    case 'off':
      return `Commander Method: off${at} · /ccc-fable on to arm`;
    case 'unreadable':
      return 'Commander Method: state.json unreadable, armed state unknown · /ccc-fable status';
    default:
      return 'Commander Method: not armed · /ccc-fable on to arm · rules/fable-method.md';
  }
}

/**
 * Pure-function entry for orchestrator (CC-414).
 * Returns the JSON output object instead of writing to stdout.
 */
export async function run({ env = process.env } = {}) {
  if (env.CCC_FABLE_NUDGE_DISABLE === '1') return { continue: true };
  try {
    return emitUser(fableStateLine(readFableState(env)));
  } catch {
    return { continue: true };
  }
}

// CLI tail — only runs when invoked directly, NOT on import (critical: prevents
// stdin hang when the orchestrator dynamically imports this module).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    const chunks = []; for await (const c of process.stdin) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    let input = {}; try { if (raw) input = JSON.parse(raw); } catch {}
    let res; try { res = await run({ input, env: process.env, cwd: process.cwd() }); }
    catch { res = { continue: true, suppressOutput: true }; }
    process.stdout.write(JSON.stringify(res || { continue: true }) + '\n');
  })();
}
