#!/usr/bin/env node

/**
 * Codex Adapter - Model Registry
 *
 * Single source of truth for every OpenAI Codex-CLI model CC Commander
 * knows how to route to. `translate.js` (remapModel) and
 * `scripts/check-codex-models.js` (the smoke test) both consume this list
 * instead of hardcoding model IDs.
 *
 * Tier positioning for the GPT-5.6 family (Sol / Terra / Luna) is INFERRED
 * from public launch coverage of the 2026-07-09 ChatGPT Work / GPT-5.6
 * rollout (OpenAI Help Center + press coverage — see PR description for
 * citations): Sol = flagship/deep-reasoning, Terra = balanced/everyday
 * default, Luna = fast + lowest-cost. `codex exec -m <id>` availability for
 * all three was verified live against the local codex CLI (OAuth) on
 * 2026-07-10 — see `scripts/check-codex-models.js`.
 *
 * @typedef {Object} CodexModelEntry
 * @property {string} id - Codex CLI model identifier (`codex exec -m <id>`).
 * @property {'flagship'|'balanced'|'light'} tier - Capability/cost tier.
 * @property {'5.6'|'5.5'|'5.4'} family - Model generation.
 * @property {string} verified - ISO date this id was last confirmed to run
 *   on the local codex CLI (OAuth).
 * @property {string|null} fallback - Next-best `id` in this registry to try
 *   if this one is unavailable/rate-limited. `null` = no further fallback.
 */

/** @type {CodexModelEntry[]} */
export const CODEX_MODEL_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'gpt-5.6-sol',
    tier: 'flagship',
    family: '5.6',
    verified: '2026-07-10',
    fallback: 'gpt-5.5',
  }),
  Object.freeze({
    id: 'gpt-5.6-terra',
    tier: 'balanced',
    family: '5.6',
    verified: '2026-07-10',
    fallback: 'gpt-5.5',
  }),
  Object.freeze({
    id: 'gpt-5.6-luna',
    tier: 'light',
    family: '5.6',
    verified: '2026-07-10',
    fallback: 'gpt-5.4-mini',
  }),
  Object.freeze({
    id: 'gpt-5.5',
    tier: 'flagship',
    family: '5.5',
    verified: '2026-04-24',
    fallback: 'gpt-5.4',
  }),
  Object.freeze({
    id: 'gpt-5.4',
    tier: 'balanced',
    family: '5.4',
    verified: '2026-04-24',
    fallback: 'gpt-5.4-mini',
  }),
  Object.freeze({
    id: 'gpt-5.4-mini',
    tier: 'light',
    family: '5.4',
    verified: '2026-04-24',
    fallback: null,
  }),
]);

const BY_ID = new Map(CODEX_MODEL_REGISTRY.map((entry) => [entry.id, entry]));

/** Look up a single registry entry by exact Codex model id. */
export function getModelEntry(id) {
  return BY_ID.get(id) ?? null;
}

/** All registry entries for a given family (e.g. '5.6'). */
export function getModelsByFamily(family) {
  return CODEX_MODEL_REGISTRY.filter((entry) => entry.family === family);
}

/**
 * Resolve a chain of ids by following `fallback` links starting at `id`.
 * Includes `id` itself first. Guards against cycles / unknown ids.
 */
export function getFallbackChain(id) {
  const chain = [];
  const seen = new Set();
  let current = id;

  while (current && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    const entry = getModelEntry(current);
    current = entry?.fallback ?? null;
  }

  return chain;
}

export default CODEX_MODEL_REGISTRY;
