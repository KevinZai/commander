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
 *   the plugin's `cost_ceiling` userConfig option (same values; used when the
 *                             variable is unset, lib/plugin-options.js)
 *   "costCeiling": <units>    in <lane config dir>/commander/config.json
 * Budget units: 5.00 == 500 tool calls.
 *
 * Behavior once set: warn-then-block.
 *   1st crossing → visible warning ("next tool call will be blocked").
 *   After that   → denies each tool call (PreToolUse permissionDecision deny,
 *                  with the reason shown to Claude and the user), UNLESS
 *                  CCC_COST_OVERRIDE=1. The turn continues; Claude can stop.
 * State is keyed by the stdin session_id (shared with cost-tracker.js). With a ceiling set, a budget
 * that cannot be read or checked blocks the call (fail closed).
 */
import { track } from '../lib/telemetry.mjs';
import { emitDeny, emitUser } from './lib/emit.mjs';
import { sessionKey } from './lib/session-key.mjs';
import { readFile } from 'node:fs/promises';
import { updateJson } from './lib/atomic-json.mjs';
import { join } from 'node:path';
import { readablePath, stateDir } from '../lib/lane-state.js';
import { setting, settingSource } from '../lib/plugin-options.js';
import { isMainModule } from './lib/code-mode.mjs';
import { envCeiling } from './orchestrator/budget-config.mjs';
import { readStdinJson } from './lib/session-key.mjs';

const CCC_DIR = stateDir();
const CONFIG_FILE = readablePath('config.json');


/** toolCalls and estimatedCost, when present, are what cost-tracker.js writes: a count and its unit cost. */
export function validCounter(c) {
  const count = (v) => Number.isInteger(v) && v >= 0;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  if ('toolCalls' in c && !count(c.toolCalls)) return false;
  if ('estimatedCost' in c && !(typeof c.estimatedCost === 'number' && Number.isFinite(c.estimatedCost) && c.estimatedCost >= 0)) return false;
  return true;
}

export async function run(input = {}) {
  track('hook_fired', { hook: 'PreToolUse', handler: 'cost-ceiling-enforcer' });

  const COST_FILE = join(CCC_DIR, 'sessions', `active-cost-${sessionKey(input)}.json`);
  let ceiling;

  try {
    // Explicit override — always allow, stay silent
    if (process.env.CCC_COST_OVERRIDE === '1') {
      return { continue: true };
    }

    // Explicit ceiling only: env first, then the lane config. Unset == off.
    ceiling = envCeiling(setting('cost_ceiling'));
    const from = settingSource('cost_ceiling');
    const source = ceiling === undefined ? `"costCeiling" in ${CONFIG_FILE}` : from === 'userConfig' ? 'the cost_ceiling plugin option' : 'CCC_COST_CEILING';
    if (ceiling === undefined) {
      try {
        const config = JSON.parse(await readFile(CONFIG_FILE, 'utf8'));
        if (typeof config.costCeiling === 'number' && config.costCeiling > 0) {
          ceiling = config.costCeiling;
        }
      } catch (err) {
        // No config file: no ceiling. Unreadable or malformed: the ceiling is unknown, so block (below).
        if (err?.code !== 'ENOENT') { ceiling = Infinity; throw err; }
      }
    }
    if (!ceiling) {
      return { continue: true };
    }

    // Read current session budget (session-keyed file from cost-tracker.js)
    let costData = null;
    try {
      costData = JSON.parse(await readFile(COST_FILE, 'utf8'));
    } catch (err) {
      // No cost file yet: the budget is 0. Any other failure means the count is unknown.
      if (err?.code !== 'ENOENT') throw err;
    }
    // A counter the tracker did not write (a damaged field) is unknown, not zero.
    if (costData && !validCounter(costData)) throw new Error('tool-call counter is damaged');
    const currentCost = costData?.estimatedCost || 0;

    if (currentCost >= ceiling) {
      const ceilingCalls = Math.round(ceiling / 0.01);

      // Warn-then-block: first crossing emits a visible warning and lets the
      // call through; every subsequent call blocks until override/raise.
      // Compare-and-set under the counter's lock: of two concurrent calls that
      // cross together, exactly one claims the warning and the other is denied.
      let claimedWarning = false;
      if (costData && !costData.ceilingWarnedAt) {
        // The warning counts only once its marker is written under the lock; any failure denies instead.
        try {
          let wanted = false;
          const r = await updateJson(COST_FILE, (current) => {
            if (current.ceilingWarnedAt) return undefined;
            wanted = true;
            return { ...current, ceilingWarnedAt: new Date().toISOString() };
          }, { strict: true, requireLock: true });
          claimedWarning = wanted && r.written && r.locked;
        } catch {}
      }
      if (claimedWarning) {
        return emitUser(
          `⚠️ CCC tool-call budget ceiling reached: ${costData.toolCalls} calls >= ${ceilingCalls}-call limit ` +
          `(budget unit $${ceiling.toFixed(2)}, not real spend). The NEXT tool call will be blocked — ` +
          `set CCC_COST_OVERRIDE=1, or raise or remove ${source}, to continue.`
        );
      }

      const reason = `CCC tool-call budget ceiling: ${Math.round(currentCost / 0.01)} calls >= ${ceilingCalls}-call limit ` +
        `(budget units $${currentCost.toFixed(2)} >= $${ceiling.toFixed(2)} — an activity metric, not real spend). ` +
        `This tool call was blocked. To continue: set CCC_COST_OVERRIDE=1, raise or remove ${source}, ` +
        `or start a new session.`;

      return emitDeny(reason);
    }

    return { continue: true };
  } catch (err) {
    // With a ceiling set, a budget that cannot be checked blocks the call; without one, nothing to enforce.
    if (ceiling) {
      return emitDeny(`CCC tool-call budget ceiling: could not check the budget (${err?.code || err?.message || 'error'}), ` +
        'so this call was blocked. Set CCC_COST_OVERRIDE=1 to continue.');
    }
    return { continue: true };
  }
}

// Standalone entry (hooks.json may still call this file directly); the PreToolUse dispatcher imports run() instead.
if (isMainModule(import.meta.url)) {
  readStdinJson().then(run).catch(() => ({ continue: true })).then((out) => {
    process.stdout.write(JSON.stringify(out) + '\n');
  });
}
