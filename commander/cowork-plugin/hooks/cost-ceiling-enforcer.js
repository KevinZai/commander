#!/usr/bin/env node
/**
 * cost-ceiling-enforcer.js
 * Hook: PreToolUse
 *
 * Enforces the session TOOL-CALL BUDGET ceiling (see cost-tracker.js — this
 * is an activity metric, not real dollars; "$10" == 1000 tool calls at the
 * $0.01/call budget-unit conversion).
 *
 * OFF BY DEFAULT. It runs only when a ceiling is set explicitly:
 *   CCC_COST_CEILING=<units>  (wins; 0 or "off" disables a configured ceiling)
 *   "costCeiling": <units>    in <lane config dir>/commander/config.json
 * Budget units: 5.00 == 500 tool calls.
 *
 * Behavior once set: warn-then-block.
 *   1st crossing → visible warning ("next tool call will be blocked").
 *   After that   → denies each tool call (PreToolUse permissionDecision deny,
 *                  with the reason shown to Claude and the user), UNLESS
 *                  CCC_COST_OVERRIDE=1. The turn continues; Claude can stop.
 * State is keyed by the stdin session_id (shared with cost-tracker.js).
 */
import { track } from '../lib/telemetry.mjs';
import { emitDeny, emitUser } from './lib/emit.mjs';
import { sessionKey } from './lib/session-key.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readablePath, stateDir } from '../lib/lane-state.js';

const CCC_DIR = stateDir();
const CONFIG_FILE = readablePath('config.json');

/** Ceiling from CCC_COST_CEILING: a positive number, 0 for off, or undefined when unset/invalid. */
function envCeiling(value) {
  if (value === undefined || value.trim() === '') return undefined;
  const v = value.trim().toLowerCase();
  if (v === 'off') return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

async function main() {
  track('hook_fired', { hook: 'PreToolUse', handler: 'cost-ceiling-enforcer' });
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    // Malformed payloads fail open; session_id keys the shared budget file.
    if (raw) input = JSON.parse(raw);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  const COST_FILE = join(CCC_DIR, 'sessions', `active-cost-${sessionKey(input)}.json`);

  try {
    // Explicit override — always allow, stay silent
    if (process.env.CCC_COST_OVERRIDE === '1') {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Explicit ceiling only: env first, then the lane config. Unset == off.
    let ceiling = envCeiling(process.env.CCC_COST_CEILING);
    const source = ceiling === undefined ? `"costCeiling" in ${CONFIG_FILE}` : 'CCC_COST_CEILING';
    if (ceiling === undefined) {
      try {
        const config = JSON.parse(await readFile(CONFIG_FILE, 'utf8'));
        if (typeof config.costCeiling === 'number' && config.costCeiling > 0) {
          ceiling = config.costCeiling;
        }
      } catch {
        // No config file — no ceiling
      }
    }
    if (!ceiling) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Read current session budget (session-keyed file from cost-tracker.js)
    let costData = null;
    try {
      costData = JSON.parse(await readFile(COST_FILE, 'utf8'));
    } catch {
      // No cost file yet — budget is 0, allow through
    }
    const currentCost = costData?.estimatedCost || 0;

    if (currentCost >= ceiling) {
      const ceilingCalls = Math.round(ceiling / 0.01);

      // Warn-then-block: first crossing emits a visible warning and lets the
      // call through; every subsequent call blocks until override/raise.
      if (costData && !costData.ceilingWarnedAt) {
        costData.ceilingWarnedAt = new Date().toISOString();
        try { await writeFile(COST_FILE, JSON.stringify(costData, null, 2)); } catch {}
        process.stdout.write(JSON.stringify(emitUser(
          `⚠️ CCC tool-call budget ceiling reached: ${costData.toolCalls} calls >= ${ceilingCalls}-call limit ` +
          `(budget unit $${ceiling.toFixed(2)}, not real spend). The NEXT tool call will be blocked — ` +
          `set CCC_COST_OVERRIDE=1, or raise or remove ${source}, to continue.`
        )) + '\n');
        return;
      }

      const reason = `CCC tool-call budget ceiling: ${Math.round(currentCost / 0.01)} calls >= ${ceilingCalls}-call limit ` +
        `(budget units $${currentCost.toFixed(2)} >= $${ceiling.toFixed(2)} — an activity metric, not real spend). ` +
        `This tool call was blocked. To continue: set CCC_COST_OVERRIDE=1, raise or remove ${source}, ` +
        `or start a new session.`;

      process.stdout.write(JSON.stringify(emitDeny(reason)) + '\n');
      return;
    }

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  } catch {
    // Fail open — never block on error
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
