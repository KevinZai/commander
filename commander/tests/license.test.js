// CC Commander — license validation tests
// Run: node --test commander/tests/license.test.js

'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

// We test the ESM module via dynamic import inside each async test.
const LICENSE_MOD = path.join(__dirname, '..', 'cowork-plugin', 'lib', 'license.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create a temp dir that mocks ~/.claude/commander */
function makeTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-license-test-'));
}

/** Patch HOME so the module reads from a temp dir. Returns cleanup fn. */
function patchHome(tmpDir, licenseObj, cacheObj) {
  const origHome = process.env.HOME;
  const origKey = process.env.CCC_PRO_LICENSE_KEY;

  const commanderDir = path.join(tmpDir, '.claude', 'commander');
  fs.mkdirSync(commanderDir, { recursive: true });

  if (licenseObj !== undefined) {
    fs.writeFileSync(
      path.join(commanderDir, 'license.json'),
      typeof licenseObj === 'string' ? licenseObj : JSON.stringify(licenseObj)
    );
  }
  if (cacheObj !== undefined) {
    fs.writeFileSync(
      path.join(commanderDir, 'license-cache.json'),
      JSON.stringify(cacheObj)
    );
  }

  process.env.HOME = tmpDir;
  delete process.env.CCC_PRO_LICENSE_KEY;

  return function cleanup() {
    process.env.HOME = origHome;
    if (origKey !== undefined) process.env.CCC_PRO_LICENSE_KEY = origKey;
    else delete process.env.CCC_PRO_LICENSE_KEY;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  };
}

/** Import license module fresh (ESM with cache busted via query string trick) */
async function importLicense() {
  // Node ESM module cache is keyed by resolved URL — append timestamp to bust it
  return await import(`${LICENSE_MOD}?t=${Date.now()}`);
}

/** Install a mock fetch that returns the given response body */
function mockFetch(responseBody, shouldThrow = false) {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => {
    if (shouldThrow) throw new Error('Network error');
    return {
      json: async () => responseBody,
    };
  };
  return () => { globalThis.fetch = orig; };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('isPro()', () => {
  it('returns false when no license file exists', async () => {
    const tmp = makeTempHome();
    const cleanup = patchHome(tmp, undefined, undefined);
    const restoreFetch = mockFetch({}, false);
    try {
      const { isPro } = await importLicense();
      const result = await isPro();
      assert.equal(result, false);
    } finally {
      restoreFetch();
      cleanup();
    }
  });

  it('returns false when license file has invalid JSON', async () => {
    const tmp = makeTempHome();
    const cleanup = patchHome(tmp, 'not valid json {{', undefined);
    const restoreFetch = mockFetch({}, false);
    try {
      const { isPro } = await importLicense();
      const result = await isPro();
      assert.equal(result, false);
    } finally {
      restoreFetch();
      cleanup();
    }
  });

  it('returns true when valid cached license exists and is not expired', async () => {
    const tmp = makeTempHome();
    const validCache = {
      validated_at: new Date().toISOString(), // just now — well within 24h
      status: 'active',
      tier: 'pro-monthly',
      expires_at: null,
    };
    const cleanup = patchHome(tmp, { license_key: 'test-key-123' }, validCache);
    // fetch should NOT be called (cache is fresh), but we mock it anyway
    const restoreFetch = mockFetch({ valid: true }, false);
    try {
      const { isPro } = await importLicense();
      const result = await isPro();
      assert.equal(result, true);
    } finally {
      restoreFetch();
      cleanup();
    }
  });
});

describe('getLicenseTier()', () => {
  it('returns "starter" when no license exists', async () => {
    const tmp = makeTempHome();
    const cleanup = patchHome(tmp, undefined, undefined);
    const restoreFetch = mockFetch({}, false);
    try {
      const { getLicenseTier } = await importLicense();
      const tier = await getLicenseTier();
      assert.equal(tier, 'starter');
    } finally {
      restoreFetch();
      cleanup();
    }
  });

  it('returns "lifetime" when cache says lifetime', async () => {
    const tmp = makeTempHome();
    const validCache = {
      validated_at: new Date().toISOString(),
      status: 'active',
      tier: 'lifetime',
      expires_at: null,
    };
    const cleanup = patchHome(tmp, { license_key: 'lk-lifetime' }, validCache);
    const restoreFetch = mockFetch({}, false);
    try {
      const { getLicenseTier } = await importLicense();
      const tier = await getLicenseTier();
      assert.equal(tier, 'lifetime');
    } finally {
      restoreFetch();
      cleanup();
    }
  });
});

describe('validateAndCacheLicense()', () => {
  it('returns null when no license key is configured', async () => {
    const tmp = makeTempHome();
    const cleanup = patchHome(tmp, undefined, undefined);
    const restoreFetch = mockFetch({}, false);
    try {
      const { validateAndCacheLicense } = await importLicense();
      const result = await validateAndCacheLicense();
      assert.equal(result, null);
    } finally {
      restoreFetch();
      cleanup();
    }
  });

  it('writes cache file on successful validation', async () => {
    const tmp = makeTempHome();
    const cleanup = patchHome(tmp, { license_key: 'valid-key-abc' }, undefined);
    const restoreFetch = mockFetch({
      valid: true,
      activated: true,
      meta: { product_id: '99999', variant_id: '11111', variant_name: 'Pro Monthly' },
      license_key: { expires_at: null },
    });
    try {
      const { validateAndCacheLicense } = await importLicense();
      const info = await validateAndCacheLicense();

      assert.ok(info !== null, 'should return LicenseInfo');
      assert.equal(info.status, 'active');
      assert.equal(info.tier, 'pro-monthly');

      // Verify cache file was written
      const cacheFile = path.join(tmp, '.claude', 'commander', 'license-cache.json');
      assert.ok(fs.existsSync(cacheFile), 'cache file should exist');
      const written = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      assert.equal(written.status, 'active');
      assert.equal(written.tier, 'pro-monthly');
      assert.ok(written.validated_at, 'validated_at should be set');
    } finally {
      restoreFetch();
      cleanup();
    }
  });
});

describe('cache TTL', () => {
  it('re-validates when cache is older than 24h', async () => {
    const tmp = makeTempHome();
    // Cache written 25 hours ago
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const staleCache = {
      validated_at: oldDate,
      status: 'active',
      tier: 'pro-yearly',
      expires_at: null,
    };
    const cleanup = patchHome(tmp, { license_key: 'stale-key' }, staleCache);

    let fetchCallCount = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCallCount++;
      return {
        json: async () => ({
          valid: true,
          activated: true,
          meta: { variant_name: 'Pro Yearly' },
          license_key: { expires_at: null },
        }),
      };
    };

    try {
      const { getLicenseTier } = await importLicense();
      const tier = await getLicenseTier();
      assert.equal(tier, 'pro-yearly');
      assert.equal(fetchCallCount, 1, 'should have called LS API once to re-validate');
    } finally {
      globalThis.fetch = origFetch;
      cleanup();
    }
  });
});

describe('LS API failure handling', () => {
  it('returns "starter" without crashing when fetch throws', async () => {
    const tmp = makeTempHome();
    const cleanup = patchHome(tmp, { license_key: 'some-key' }, undefined);
    const restoreFetch = mockFetch(null, true); // throws on fetch
    try {
      const { getLicenseTier, isPro } = await importLicense();
      const tier = await getLicenseTier();
      const pro = await isPro();
      assert.equal(tier, 'starter');
      assert.equal(pro, false);
    } finally {
      restoreFetch();
      cleanup();
    }
  });

  it('preserves active cached tier when LS API is down', async () => {
    const tmp = makeTempHome();
    // Recent-enough cache but still active
    const recentCache = {
      validated_at: new Date().toISOString(),
      status: 'active',
      tier: 'lifetime',
      expires_at: null,
    };
    const cleanup = patchHome(tmp, { license_key: 'some-key' }, recentCache);
    // fetch will throw — but cache is fresh so it should not even be called
    const restoreFetch = mockFetch(null, true);
    try {
      const { getLicenseTier } = await importLicense();
      const tier = await getLicenseTier();
      assert.equal(tier, 'lifetime');
    } finally {
      restoreFetch();
      cleanup();
    }
  });
});
