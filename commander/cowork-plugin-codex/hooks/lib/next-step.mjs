/**
 * next-step.mjs — pure "What next?" gate (CC-2062, slice 1).
 *
 * Decides whether a finished skill run earns a next-step menu and which three
 * options to show. No I/O, no clock reads, no env reads: the Stop /
 * SubagentStop hook (a later slice) passes `now`, `mode` and the persisted
 * `state` in and writes `state` back.
 *
 * Rate limits: at most one offer per run (dedup key `runId`), plus a global
 * cooldown between offers. CCC_ROUTE_MODE off/quiet/silent/none suppresses it.
 */

export const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000;
export const MAX_OPTIONS = 3;
const MAX_REMEMBERED_RUNS = 50;
const SUPPRESSED_MODES = new Set(['off', 'quiet', 'silent', 'none']);

// Ordered by recommendation: first entry is the recommended next step.
export const NEXT_GRAPH = {
  'ccc-build': ['ccc-testing', 'ccc-review', 'ccc-deploy-check'],
  'ccc-testing': ['ccc-review', 'ccc-deploy-check', 'ccc-build'],
  'ccc-qa': ['ccc-review', 'ccc-deploy-check', 'ccc-build'],
  'ccc-review': ['ccc-deploy-check', 'ccc-build', 'ccc-testing'],
  'ccc-deploy-check': ['ccc-ship', 'ccc-review', 'ccc-testing'],
};

export function normalizeSkill(skill) {
  if (typeof skill !== 'string') return '';
  return skill.trim().toLowerCase().replace(/^[/$]/, '').replace(/^commander:/, '');
}

export function isSuppressedMode(mode) {
  return typeof mode === 'string' && SUPPRESSED_MODES.has(mode.trim().toLowerCase());
}

export function nextOptions(skill, graph = NEXT_GRAPH) {
  const next = graph[normalizeSkill(skill)];
  if (!Array.isArray(next)) return [];
  const seen = new Set();
  const out = [];
  for (const s of next) {
    if (typeof s !== 'string' || seen.has(s)) continue;
    seen.add(s);
    out.push({ skill: s, recommended: out.length === 0 });
    if (out.length === MAX_OPTIONS) break;
  }
  return out;
}

/**
 * @param {{skill:string, runId:string, now:number, mode?:string,
 *          cooldownMs?:number, graph?:object,
 *          state?:{lastOfferAt?:number, offeredRuns?:string[]}}} input
 * @returns {{offer:boolean, reason:string, options:object[], state:object}}
 *   `state` is always returned and is the object to persist (input untouched).
 */
export function decideNextStep(input) {
  const { skill, runId, now, mode, graph } = input || {};
  const cooldownMs = Number.isFinite(input?.cooldownMs) ? input.cooldownMs : DEFAULT_COOLDOWN_MS;
  const prev = input?.state || {};
  const offeredRuns = Array.isArray(prev.offeredRuns) ? prev.offeredRuns.slice() : [];
  const state = { lastOfferAt: prev.lastOfferAt, offeredRuns };
  const skip = (reason) => ({ offer: false, reason, options: [], state });

  if (isSuppressedMode(mode)) return skip('mode-off');
  if (typeof runId !== 'string' || !runId) return skip('no-run-id');
  if (!Number.isFinite(now)) return skip('no-clock');
  if (offeredRuns.includes(runId)) return skip('already-offered');
  const options = nextOptions(skill, graph);
  if (options.length === 0) return skip('no-next-steps');
  if (Number.isFinite(prev.lastOfferAt) && now - prev.lastOfferAt < cooldownMs) return skip('cooldown');

  offeredRuns.push(runId);
  while (offeredRuns.length > MAX_REMEMBERED_RUNS) offeredRuns.shift();
  state.lastOfferAt = now;
  return { offer: true, reason: 'offer', options, state };
}
