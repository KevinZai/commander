/**
 * budget-config.mjs — is a tool-call ceiling configured? Read without the enforcer module, for when that
 * module failed or stalled. Used by the PreToolUse dispatcher's worker (pre-tool-use-worker.mjs).
 */
import { readFileSync } from 'node:fs';

const positive = (v) => v !== undefined && String(v).trim() !== '' && Number(v) > 0;

export async function budgetConfigured(env = process.env) {
  if (env.CCC_COST_OVERRIDE === '1') return false;
  const fromEnv = env.CCC_COST_CEILING !== undefined && String(env.CCC_COST_CEILING).trim() !== ''
    ? env.CCC_COST_CEILING : env.CLAUDE_PLUGIN_OPTION_COST_CEILING;
  if (fromEnv !== undefined && String(fromEnv).trim() !== '') return positive(fromEnv);
  try {
    const { readablePath } = await import(new URL('../../lib/lane-state.js', import.meta.url).href);
    const config = JSON.parse(readFileSync(readablePath('config.json'), 'utf8'));
    return typeof config.costCeiling === 'number' && config.costCeiling > 0;
  } catch (err) {
    // No config file: no ceiling. Anything else (unreadable config, broken module): assume one.
    return err?.code !== 'ENOENT';
  }
}
