#!/usr/bin/env node
// CC Commander — license validation library
// Validates Lemon Squeezy license keys, caches results for 24h.
// Fail-open: any error returns "starter" — never crashes the host session.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const COMMANDER_DIR = join(homedir(), '.claude', 'commander');
const LICENSE_FILE = join(COMMANDER_DIR, 'license.json');
const CACHE_FILE = join(COMMANDER_DIR, 'license-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const LS_VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate';

// Product ID → tier mapping. Populated once LS account is live.
// Format: { [productId]: "pro-monthly" | "pro-yearly" | "lifetime" }
const PRODUCT_TIER_MAP = {
  // Filled in during LS account setup (CC-663).
  // Keys are LS product_id strings from webhook/validation responses.
  // Example: '12345': 'pro-monthly'
};

// Variant ID → tier mapping (more specific than product).
const VARIANT_TIER_MAP = {
  // Example: '67890': 'lifetime'
};

/** @returns {Promise<string|null>} */
async function readLicenseKey() {
  // 1. Env var takes precedence (CI, scripted setups)
  if (process.env.CCC_PRO_LICENSE_KEY) {
    return process.env.CCC_PRO_LICENSE_KEY.trim();
  }

  // 2. License file
  try {
    const raw = await readFile(LICENSE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.license_key === 'string' && parsed.license_key.trim()) {
      return parsed.license_key.trim();
    }
  } catch {
    // Missing file or bad JSON — normal for Starter users
  }

  return null;
}

/** @returns {Promise<import('./license.js').LicenseCache|null>} */
async function readCache() {
  try {
    const raw = await readFile(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {import('./license.js').LicenseCache} cache */
async function writeCache(cache) {
  try {
    if (!existsSync(COMMANDER_DIR)) {
      await mkdir(COMMANDER_DIR, { recursive: true });
    }
    await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Derive tier string from a Lemon Squeezy validation response.
 * @param {object} lsResponse — parsed JSON from LS validate endpoint
 * @returns {"pro-monthly"|"pro-yearly"|"lifetime"}
 */
function extractTier(lsResponse) {
  const meta = lsResponse?.meta ?? {};
  const variantId = String(meta.variant_id ?? '');
  const productId = String(meta.product_id ?? '');

  if (variantId && VARIANT_TIER_MAP[variantId]) {
    return VARIANT_TIER_MAP[variantId];
  }
  if (productId && PRODUCT_TIER_MAP[productId]) {
    return PRODUCT_TIER_MAP[productId];
  }

  // Fallback: inspect variant name if present
  const variantName = (meta.variant_name ?? '').toLowerCase();
  if (variantName.includes('lifetime')) return 'lifetime';
  if (variantName.includes('year')) return 'pro-yearly';
  return 'pro-monthly';
}

/**
 * Call Lemon Squeezy validation endpoint.
 * @param {string} key
 * @returns {Promise<{valid: boolean, tier: string, expires_at: string|null, raw: object}|null>}
 *   null if the network call fails
 */
async function callLSValidate(key) {
  try {
    const res = await fetch(LS_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ license_key: key }),
      signal: AbortSignal.timeout(8000),
    });

    const json = await res.json();
    const valid = json?.valid === true || json?.activated === true;
    if (!valid) return { valid: false, tier: 'starter', expires_at: null, raw: json };

    const tier = extractTier(json);
    const expiresAt = json?.license_key?.expires_at ?? null;
    return { valid: true, tier, expires_at: expiresAt, raw: json };
  } catch {
    return null; // network error or timeout
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @typedef {"starter"|"pro-monthly"|"pro-yearly"|"lifetime"} LicenseTier
 *
 * @typedef {{
 *   validated_at: string,
 *   status: "active"|"invalid"|"starter",
 *   tier: LicenseTier,
 *   expires_at: string|null
 * }} LicenseCache
 *
 * @typedef {{
 *   tier: LicenseTier,
 *   status: "active"|"invalid"|"starter",
 *   validated_at: string,
 *   expires_at: string|null,
 *   from_cache: boolean
 * }} LicenseInfo
 */

/**
 * Returns true when the current license is an active Pro (any variant).
 * Fail-open: returns false on any error.
 * @returns {Promise<boolean>}
 */
export async function isPro() {
  try {
    const tier = await getLicenseTier();
    return tier === 'pro-monthly' || tier === 'pro-yearly' || tier === 'lifetime';
  } catch {
    return false;
  }
}

/**
 * Returns the current license tier.
 * Uses cached result if <24h old; re-validates otherwise.
 * @returns {Promise<LicenseTier>}
 */
export async function getLicenseTier() {
  try {
    const info = await _resolveInfo();
    return info.tier;
  } catch {
    return 'starter';
  }
}

/**
 * Returns the raw license key string, or null if none configured.
 * @returns {Promise<string|null>}
 */
export async function getLicenseKey() {
  try {
    return await readLicenseKey();
  } catch {
    return null;
  }
}

/**
 * Force-validates the license key against LS API and writes fresh cache.
 * Returns null when there is no key or validation fails.
 * @returns {Promise<LicenseInfo|null>}
 */
export async function validateAndCacheLicense() {
  const key = await readLicenseKey();
  if (!key) return null;

  const result = await callLSValidate(key);
  if (!result) {
    // LS API unreachable — return cached or null (don't downgrade)
    const cached = await readCache();
    if (cached && cached.status === 'active') {
      return { ...cached, from_cache: true };
    }
    return null;
  }

  const now = new Date().toISOString();

  if (!result.valid) {
    const cache = {
      validated_at: now,
      status: 'invalid',
      tier: 'starter',
      expires_at: null,
    };
    await writeCache(cache);
    return { ...cache, from_cache: false };
  }

  const cache = {
    validated_at: now,
    status: 'active',
    tier: result.tier,
    expires_at: result.expires_at,
  };
  await writeCache(cache);
  return { ...cache, from_cache: false };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Core resolution: cache-first, then live validate. */
async function _resolveInfo() {
  // Check if we have a valid unexpired cache
  const cache = await readCache();
  if (cache && cache.validated_at) {
    const age = Date.now() - new Date(cache.validated_at).getTime();
    if (age < CACHE_TTL_MS && cache.status === 'active') {
      return { ...cache, from_cache: true };
    }
  }

  // No fresh cache — validate live
  const info = await validateAndCacheLicense();
  if (info) return info;

  // No key or validation failed — starter
  return {
    tier: 'starter',
    status: 'starter',
    validated_at: new Date().toISOString(),
    expires_at: null,
    from_cache: false,
  };
}
