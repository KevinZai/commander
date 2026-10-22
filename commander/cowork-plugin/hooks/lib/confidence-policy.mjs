/**
 * confidence-policy.mjs — maps a confidence score to an action.
 *
 * Pure function, no I/O. Consumes the { confidence, suggestions } shape from
 * confidence.mjs (suggestions may carry an optional numeric `score`).
 *
 *   high   (>= 0.8, one clear winner)  -> run   : invoke the skill, announce in one line
 *   medium (0.4 - 0.8, or top two close) -> menu : native picker, recommended first
 *   low    (< 0.4)                      -> silent
 *
 * CCC_ROUTE_MODE: off = always silent; suggest (default) = never auto-run, a
 * high score shows the menu; auto = high runs the skill.
 */

export const HIGH = 0.8;
export const LOW = 0.4;
export const CLOSE_MARGIN = 0.1;
export const MODES = ['off', 'suggest', 'auto'];

export function resolveMode(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return MODES.includes(v) ? v : 'suggest';
}

/** Menu surface by host: claude-code | codex | text. */
export function resolveSurface(env = {}) {
  if (env.PLUGIN_ROOT) return 'codex';
  if (env.CLAUDE_PLUGIN_ROOT || env.CLAUDECODE) return 'claude-code';
  return 'text';
}

const MAX_OPTIONS = { 'claude-code': 4, codex: 3, text: 4 };

function isCloseCall(suggestions) {
  const [a, b] = suggestions;
  if (!a || !b || typeof a.score !== 'number' || typeof b.score !== 'number') return false;
  return a.score - b.score < CLOSE_MARGIN;
}

export function decide({ confidence, suggestions = [] } = {}, env = {}) {
  const mode = resolveMode(env.CCC_ROUTE_MODE);
  const surface = resolveSurface(env);
  const silent = { action: 'silent', mode, surface, skill: null, options: [] };
  const score = Number(confidence);

  if (mode === 'off' || !Number.isFinite(score) || score < LOW || suggestions.length === 0) {
    return silent;
  }

  const closeCall = isCloseCall(suggestions);
  const top = suggestions[0];
  if (score >= HIGH && !closeCall && mode === 'auto') {
    return { action: 'run', mode, surface, skill: top.skill, options: [] };
  }

  // Leave a slot for "Other / just answer" on the numbered-list surface.
  const max = MAX_OPTIONS[surface] - (surface === 'text' ? 1 : 0);
  const options = suggestions.slice(0, max).map((s, i) => ({
    skill: s.skill,
    reason: s.reason,
    recommended: i === 0,
  }));
  return { action: 'menu', mode, surface, skill: top.skill, options };
}
