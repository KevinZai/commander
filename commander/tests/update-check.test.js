'use strict';

// ============================================================================
// CC Commander — update-check.js module tests (v7.3.0 W1)
// ============================================================================
// Covers: current/outdated/offline/malformed remote, cache read/write + TTL,
// semverCompare edge cases, surface-aware remediation text, and the
// require()-has-no-side-effects fix (mcp-server/index.js:157 bug).
// Run: node --test commander/tests/update-check.test.js
// ============================================================================

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MODULE_PATH = path.join(__dirname, '..', 'update-check.js');
const updateCheck = require(MODULE_PATH);

let TMP;
before(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-update-check-test-'));
});
after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ok */ }
});

function tmpCachePath(name) {
  return path.join(TMP, name || `cache-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

function fakeFetch(body, opts = {}) {
  return function fetchImpl() {
    if (opts.reject) return Promise.reject(new Error(opts.rejectMessage || 'network error'));
    return Promise.resolve(body);
  };
}

// ---------------------------------------------------------------------------
// require() has no side effects
// ---------------------------------------------------------------------------

describe('require() side effects', () => {
  it('requiring the module writes nothing to stdout/stderr', () => {
    // Regression test for the mcp-server/index.js:157 stdout-corruption bug:
    // require()-ing update-check.js used to run main() immediately, which
    // could print ANSI update text onto stdout — fatal for a JSON-RPC stdio
    // transport. Spawn a clean child that ONLY requires the module and
    // exits; any stdout output is a regression.
    const r = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(MODULE_PATH)}); process.exit(0);`], {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(r.status, 0);
    assert.equal((r.stdout || '').trim(), '', 'require() must not write to stdout');
  });

  it('exports checkForUpdate as a function', () => {
    assert.equal(typeof updateCheck.checkForUpdate, 'function');
  });
});

// ---------------------------------------------------------------------------
// checkForUpdate() — current / outdated / offline / malformed
// ---------------------------------------------------------------------------

describe('checkForUpdate()', () => {
  it('resolves status "outdated" when remote > local', async () => {
    const result = await updateCheck.checkForUpdate({
      localVersion: '7.2.0',
      cachePath: tmpCachePath(),
      fetchImpl: fakeFetch(JSON.stringify({ version: '7.3.0' })),
    });
    assert.equal(result.status, 'outdated');
    assert.equal(result.latest, '7.3.0');
    assert.equal(result.installed, '7.2.0');
  });

  it('resolves status "current" when remote === local', async () => {
    const result = await updateCheck.checkForUpdate({
      localVersion: '7.2.0',
      cachePath: tmpCachePath(),
      fetchImpl: fakeFetch(JSON.stringify({ version: '7.2.0' })),
    });
    assert.equal(result.status, 'current');
    assert.equal(result.latest, '7.2.0');
  });

  it('resolves status "current" when remote < local (ahead of main, e.g. beta)', async () => {
    const result = await updateCheck.checkForUpdate({
      localVersion: '7.3.0',
      cachePath: tmpCachePath(),
      fetchImpl: fakeFetch(JSON.stringify({ version: '7.2.0' })),
    });
    assert.equal(result.status, 'current');
  });

  it('resolves status "unknown" on network failure (offline)', async () => {
    const result = await updateCheck.checkForUpdate({
      localVersion: '7.2.0',
      cachePath: tmpCachePath(),
      fetchImpl: fakeFetch(null, { reject: true, rejectMessage: 'ENOTFOUND' }),
    });
    assert.equal(result.status, 'unknown');
    assert.equal(result.latest, null);
    assert.equal(result.installed, '7.2.0');
  });

  it('resolves status "unknown" on malformed JSON body', async () => {
    const result = await updateCheck.checkForUpdate({
      localVersion: '7.2.0',
      cachePath: tmpCachePath(),
      fetchImpl: fakeFetch('not json{{{'),
    });
    assert.equal(result.status, 'unknown');
  });

  it('resolves status "unknown" when remote version field is invalid', async () => {
    const result = await updateCheck.checkForUpdate({
      localVersion: '7.2.0',
      cachePath: tmpCachePath(),
      fetchImpl: fakeFetch(JSON.stringify({ version: 'not-a-semver' })),
    });
    assert.equal(result.status, 'unknown');
  });

  it('never rejects — always resolves even on a throwing fetchImpl', async () => {
    await assert.doesNotReject(
      updateCheck.checkForUpdate({
        localVersion: '7.2.0',
        cachePath: tmpCachePath(),
        fetchImpl: () => { throw new Error('synchronous throw'); },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Cache behavior
// ---------------------------------------------------------------------------

describe('checkForUpdate() caching', () => {
  it('writes a cache file on a successful live fetch', async () => {
    const cachePath = tmpCachePath();
    await updateCheck.checkForUpdate({
      localVersion: '7.2.0',
      cachePath,
      fetchImpl: fakeFetch(JSON.stringify({ version: '7.3.0' })),
    });
    assert.ok(fs.existsSync(cachePath));
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    assert.equal(cached.remoteVersion, '7.3.0');
    assert.equal(typeof cached.timestamp, 'number');
  });

  it('reuses a fresh cache without calling fetchImpl', async () => {
    const cachePath = tmpCachePath();
    fs.writeFileSync(cachePath, JSON.stringify({ remoteVersion: '9.9.9', timestamp: Date.now() }));
    let fetchCalled = false;
    const result = await updateCheck.checkForUpdate({
      localVersion: '7.2.0',
      cachePath,
      fetchImpl: () => { fetchCalled = true; return Promise.resolve(JSON.stringify({ version: '1.0.0' })); },
    });
    assert.equal(fetchCalled, false, 'fetchImpl must not be called when cache is fresh');
    assert.equal(result.latest, '9.9.9');
    assert.equal(result.status, 'outdated');
  });

  it('ignores a stale (expired TTL) cache and re-fetches', async () => {
    const cachePath = tmpCachePath();
    fs.writeFileSync(cachePath, JSON.stringify({ remoteVersion: '1.0.0', timestamp: Date.now() - 100000 }));
    const result = await updateCheck.checkForUpdate({
      localVersion: '7.2.0',
      cachePath,
      ttlMs: 1000, // cache is already 100s old — stale
      fetchImpl: fakeFetch(JSON.stringify({ version: '7.4.0' })),
    });
    assert.equal(result.latest, '7.4.0');
  });

  it('ignores a malformed cache file and re-fetches', async () => {
    const cachePath = tmpCachePath();
    fs.writeFileSync(cachePath, 'not { valid json');
    const result = await updateCheck.checkForUpdate({
      localVersion: '7.2.0',
      cachePath,
      fetchImpl: fakeFetch(JSON.stringify({ version: '7.5.0' })),
    });
    assert.equal(result.latest, '7.5.0');
  });
});

// ---------------------------------------------------------------------------
// semverCompare
// ---------------------------------------------------------------------------

describe('semverCompare()', () => {
  it('returns 1 when a > b', () => {
    assert.equal(updateCheck.semverCompare('7.3.0', '7.2.0'), 1);
    assert.equal(updateCheck.semverCompare('8.0.0', '7.9.9'), 1);
    assert.equal(updateCheck.semverCompare('7.2.1', '7.2.0'), 1);
  });
  it('returns -1 when a < b', () => {
    assert.equal(updateCheck.semverCompare('7.1.0', '7.2.0'), -1);
  });
  it('returns 0 when equal', () => {
    assert.equal(updateCheck.semverCompare('7.2.0', '7.2.0'), 0);
  });
});

// ---------------------------------------------------------------------------
// remediationText() — surface-aware (marketplace users must NOT see git pull)
// ---------------------------------------------------------------------------

describe('remediationText()', () => {
  it('marketplace surface gets the 3-step sequence, never git pull', () => {
    const text = updateCheck.remediationText({ surface: 'marketplace' });
    assert.match(text, /claude plugin marketplace update commander-hub/);
    assert.match(text, /claude plugin update commander/);
    assert.match(text, /[Rr]estart/);
    assert.doesNotMatch(text, /git pull/);
  });

  it('dev-clone surface gets git pull, not the marketplace sequence', () => {
    const text = updateCheck.remediationText({ surface: 'dev-clone' });
    assert.match(text, /git pull/);
    assert.doesNotMatch(text, /claude plugin marketplace update/);
  });

  it('detectSurface finds a marketplace install via path substring', () => {
    const surface = updateCheck.detectSurface('/Users/x/.claude/plugins/marketplaces/commander-hub/commander/cowork-plugin');
    assert.equal(surface, 'marketplace');
  });

  it('detectSurface finds a dev git clone via a real .git directory', () => {
    // This repo's own commander/ dir is itself inside a git checkout.
    const surface = updateCheck.detectSurface(path.join(__dirname, '..'));
    assert.equal(surface, 'dev-clone');
  });
});

// ---------------------------------------------------------------------------
// CLI --remote-only mode (used by ccc-tuneup's probe script)
// ---------------------------------------------------------------------------

describe('CLI --remote-only', () => {
  it('exits non-zero and prints nothing when offline (no CCC_UPDATE_CHECK_URL override reachable)', () => {
    const r = spawnSync(process.execPath, [MODULE_PATH, '--remote-only'], {
      encoding: 'utf8',
      timeout: 6000,
      env: { ...process.env, HOME: TMP, USERPROFILE: TMP },
    });
    // Real network call in a test sandbox is nondeterministic (may succeed
    // or fail depending on egress) — assert the CONTRACT, not the outcome:
    // on success, stdout is exactly a bare semver + newline and exit 0; on
    // failure, stdout is empty and exit is non-zero. Never both.
    if (r.status === 0) {
      assert.match(r.stdout, /^\d+\.\d+\.\d+.*\n$/);
    } else {
      assert.equal((r.stdout || '').trim(), '');
    }
  });
});
