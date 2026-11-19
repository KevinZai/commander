/**
 * budget-config.mjs — is a tool-call ceiling configured? The one parser of the ceiling setting, shared by
 * cost-ceiling-enforcer.js and by the PreToolUse dispatcher when that handler failed or stalled, so both read
 * the same values the same way: CCC_COST_CEILING (then the cost_ceiling plugin option) as a positive number,
 * 0 or "off" for off; an unset or invalid value falls through to "costCeiling" in the lane config.json.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Ceiling from the env or plugin option: a number >= 0 (0 is off), or undefined when unset or invalid. */
export function envCeiling(value) {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  const v = String(value).trim().toLowerCase();
  if (v === 'off') return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export async function budgetConfigured(env = process.env) {
  if (env.CCC_COST_OVERRIDE === '1') return false;
  try {
    const fromEnv = envCeiling(require('../../lib/plugin-options.js').setting('cost_ceiling', env));
    if (fromEnv !== undefined) return fromEnv > 0;
    const { readablePath } = require('../../lib/lane-state.js');
    const config = JSON.parse(readFileSync(readablePath('config.json', env), 'utf8'));
    return typeof config.costCeiling === 'number' && config.costCeiling > 0;
  } catch (err) {
    // No config file: no ceiling. Anything else (unreadable config, broken module): assume one.
    return err?.code !== 'ENOENT';
  }
}
