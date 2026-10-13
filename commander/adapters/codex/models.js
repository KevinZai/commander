#!/usr/bin/env node

/**
 * Codex Adapter - Model Registry
 *
 * Single source of truth for every OpenAI Codex-CLI model CC Commander
 * knows how to route to. `translate.js` (remapModel) and
 * `scripts/check-codex-models.js` (the smoke test) both consume this list
 * instead of hardcoding model IDs.
 *
 * Sources (docs/reference/platform-facts-2026-10.md §3.1, fetched 2026-10-13):
 *   - learn.chatgpt.com/docs/models and /docs/changelog: GPT-6 Astra is the
 *     flagship (picker default since Codex 0.153.4, 2026-09-05); GPT-6.1 Sol
 *     is the catalog default since 0.161.0 (2026-10-07); GPT-6 Sol and
 *     GPT-6 Luna shipped 2026-09-22 and replace gpt-5.4 / gpt-5.5 and
 *     gpt-5.4-mini; GPT-5.6 Sol/Terra/Luna remain served as the previous
 *     generation; gpt-5.5 retires from Codex on 2026-10-14.
 *   - gpt-5.4 and gpt-5.4-mini retired 2026-08-31 and are not listed.
 *   - Every id below answered `codex exec -m <id> "reply with exactly: OK"`
 *     on the local codex CLI (ChatGPT OAuth) on 2026-10-13.
 *
 * Commander routing (v8): deep/verify -> gpt-6-astra; default executor ->
 * gpt-6.1-sol; bounded implementation -> gpt-6-sol; mechanical/bulk ->
 * gpt-6-luna.
 *
 * @typedef {Object} CodexModelEntry
 * @property {string} id - Codex CLI model identifier (`codex exec -m <id>`).
 * @property {'flagship'|'balanced'|'light'} tier - Capability/cost tier.
 * @property {'6.1'|'6'|'5.6'|'5.5'} family - Model generation.
 * @property {'deep'|'default'|'bounded'|'bulk'} [role] - Commander routing
 *   role for current entries.
 * @property {'current'|'legacy'|'retiring'} status - Lifecycle status.
 *   Only `current` entries are routing targets; the rest are fallbacks.
 * @property {boolean} [default] - True on the Codex catalog default.
 * @property {string} [retires] - ISO date the model leaves Codex.
 * @property {string} verified - ISO date this id was last confirmed to run
 *   on the local codex CLI (OAuth).
 * @property {string|null} fallback - Next-best `id` in this registry to try
 *   if this one is unavailable/rate-limited. `null` = no further fallback.
 */

const VERIFIED = '2026-10-13';

/** @type {CodexModelEntry[]} */
export const CODEX_MODEL_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'gpt-6-astra',
    tier: 'flagship',
    family: '6',
    role: 'deep',
    status: 'current',
    verified: VERIFIED,
    fallback: 'gpt-6.1-sol',
  }),
  Object.freeze({
    id: 'gpt-6.1-sol',
    tier: 'balanced',
    family: '6.1',
    role: 'default',
    status: 'current',
    default: true,
    verified: VERIFIED,
    fallback: 'gpt-6-sol',
  }),
  Object.freeze({
    id: 'gpt-6-sol',
    tier: 'balanced',
    family: '6',
    role: 'bounded',
    status: 'current',
    verified: VERIFIED,
    fallback: 'gpt-5.6-sol',
  }),
  Object.freeze({
    id: 'gpt-6-luna',
    tier: 'light',
    family: '6',
    role: 'bulk',
    status: 'current',
    verified: VERIFIED,
    fallback: 'gpt-5.6-luna',
  }),
  Object.freeze({
    id: 'gpt-5.6-sol',
    tier: 'flagship',
    family: '5.6',
    status: 'legacy',
    verified: VERIFIED,
    fallback: 'gpt-5.6-terra',
  }),
  Object.freeze({
    id: 'gpt-5.6-terra',
    tier: 'balanced',
    family: '5.6',
    status: 'legacy',
    verified: VERIFIED,
    fallback: 'gpt-5.6-luna',
  }),
  Object.freeze({
    id: 'gpt-5.6-luna',
    tier: 'light',
    family: '5.6',
    status: 'legacy',
    verified: VERIFIED,
    fallback: null,
  }),
  Object.freeze({
    id: 'gpt-5.5',
    tier: 'flagship',
    family: '5.5',
    status: 'retiring',
    retires: '2026-10-14',
    verified: VERIFIED,
    fallback: null,
  }),
]);

/** Commander's Codex routing roles, mapped to registry ids. */
export const CODEX_ROUTING = Object.freeze({
  deep: 'gpt-6-astra',
  default: 'gpt-6.1-sol',
  bounded: 'gpt-6-sol',
  bulk: 'gpt-6-luna',
});

const BY_ID = new Map(CODEX_MODEL_REGISTRY.map((entry) => [entry.id, entry]));

/** Look up a single registry entry by exact Codex model id. */
export function getModelEntry(id) {
  return BY_ID.get(id) ?? null;
}

/** All registry entries for a given family (e.g. '6', '5.6'). */
export function getModelsByFamily(family) {
  return CODEX_MODEL_REGISTRY.filter((entry) => entry.family === family);
}

/** The registry entry flagged as the Codex catalog default. */
export function getDefaultModel() {
  return CODEX_MODEL_REGISTRY.find((entry) => entry.default === true) ?? null;
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

const CLAUDE_TIER_PATTERNS = [
  [/^(fable|claude-fable-.+)$/, 'deep'],
  [/^(opus|claude-opus-.+)$/, 'default'],
  [/^(sonnet|claude-sonnet-.+)$/, 'bounded'],
  [/^(haiku|claude-haiku-.+)$/, 'bulk'],
];

/**
 * Map a Claude alias (`fable`, `opus`, `sonnet`, `haiku`) or full Claude id
 * (`claude-opus-5-5`, ...) to the Codex model id for the matching role.
 * Unknown or empty input resolves to the default role.
 */
export function resolveClaudeTier(aliasOrId) {
  const value = typeof aliasOrId === 'string' ? aliasOrId.trim().toLowerCase() : '';
  for (const [pattern, role] of CLAUDE_TIER_PATTERNS) {
    if (pattern.test(value)) return CODEX_ROUTING[role];
  }
  return CODEX_ROUTING.default;
}

export default CODEX_MODEL_REGISTRY;
