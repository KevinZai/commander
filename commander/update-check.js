#!/usr/bin/env node
'use strict';

/**
 * update-check.js — reusable version-freshness module.
 *
 * Exports `checkForUpdate()` as a pure(ish) async function — requiring this
 * module has ZERO side effects (no stdout writes, no process.exit). The CLI
 * behavior (colored terminal output, `--remote-only` bare-version mode) only
 * runs when the file is executed directly (`require.main === module`).
 *
 * This fixes the mcp-server/index.js:157 stdout-corruption bug: `require()`
 * used to trigger main() immediately, writing ANSI text onto the MCP
 * stdio JSON-RPC stream.
 */

var fs = require('fs');
var path = require('path');
var os = require('os');
var pkg = require('../package.json');

var LOCAL_VERSION = pkg.version;
var DEFAULT_REMOTE_URL = 'https://raw.githubusercontent.com/KevinZai/commander/main/package.json';
var DEFAULT_CACHE_PATH = path.join(os.homedir(), '.claude', 'commander', 'update-cache.json');
var DEFAULT_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
var DEFAULT_TIMEOUT_MS = 3000;
var MARKETPLACE = 'commander-hub';
var PLUGIN_ID = 'commander';

function isValidVersion(v) {
  return typeof v === 'string' && /^\d+\.\d+\.\d+/.test(v);
}

function semverCompare(a, b) {
  var pa = String(a).split('.').map(Number);
  var pb = String(b).split('.').map(Number);
  for (var i = 0; i < 3; i++) {
    var na = pa[i] || 0;
    var nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function readCache(cachePath, ttlMs) {
  try {
    var data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (
      typeof data.timestamp === 'number' &&
      Date.now() - data.timestamp < ttlMs &&
      isValidVersion(data.remoteVersion)
    ) {
      return data.remoteVersion;
    }
  } catch (_) {
    // Missing/malformed cache — treat as a miss, never throw.
  }
  return null;
}

function writeCache(cachePath, remoteVersion) {
  try {
    var dir = path.dirname(cachePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({ remoteVersion: remoteVersion, timestamp: Date.now() }));
  } catch (_) {
    // Best-effort — a failed cache write just means we re-fetch next time.
  }
}

/**
 * Default fetch implementation — bounded by an AbortController timeout.
 * Returns the raw response body text. Callers may inject `fetchImpl` for
 * deterministic tests (offline / malformed / slow-network simulation).
 */
function defaultFetchImpl(url, timeoutMs) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
  return fetch(url, { signal: controller.signal })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .finally(function () { clearTimeout(timer); });
}

/**
 * checkForUpdate — compare the local version against a remote manifest.
 *
 * @param {object} opts
 * @param {string} [opts.localVersion]  - defaults to this package's version
 * @param {string} [opts.remoteUrl]     - JSON manifest URL with a `version` field
 * @param {string} [opts.cachePath]     - where to persist the last-known remote version
 * @param {number} [opts.ttlMs]         - cache freshness window (default 4h)
 * @param {number} [opts.timeoutMs]     - fetch timeout (default 3000ms)
 * @param {function} [opts.fetchImpl]   - (url, timeoutMs) => Promise<string>
 * @returns {Promise<{status: 'current'|'outdated'|'unknown', latest: string|null, installed: string}>}
 *   Never rejects — any failure (offline, timeout, malformed JSON/version)
 *   resolves to status: 'unknown'.
 */
function checkForUpdate(opts) {
  opts = opts || {};
  var localVersion = opts.localVersion || LOCAL_VERSION;
  var remoteUrl = opts.remoteUrl || DEFAULT_REMOTE_URL;
  var cachePath = opts.cachePath || DEFAULT_CACHE_PATH;
  var ttlMs = typeof opts.ttlMs === 'number' ? opts.ttlMs : DEFAULT_TTL_MS;
  var timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  var fetchImpl = opts.fetchImpl || defaultFetchImpl;

  var cached = readCache(cachePath, ttlMs);
  var fetchPromise = cached
    ? Promise.resolve(cached)
    : Promise.resolve()
        .then(function () { return fetchImpl(remoteUrl, timeoutMs); })
        .then(function (body) {
          var parsed = JSON.parse(body);
          if (!isValidVersion(parsed.version)) throw new Error('Invalid remote version format');
          writeCache(cachePath, parsed.version);
          return parsed.version;
        });

  return fetchPromise
    .then(function (remoteVersion) {
      return {
        status: semverCompare(remoteVersion, localVersion) > 0 ? 'outdated' : 'current',
        latest: remoteVersion,
        installed: localVersion,
      };
    })
    .catch(function () {
      return { status: 'unknown', latest: null, installed: localVersion };
    });
}

/**
 * Surface-aware remediation text. Marketplace-installed users must NOT be
 * told to `git pull` (there is no git checkout to pull into) — they get the
 * sanctioned 3-step marketplace-update sequence. A verified dev git clone
 * gets `git pull` instead. Unknown surface leads with the marketplace
 * sequence since Desktop is the primary distribution surface.
 */
function detectSurface(scriptDir) {
  scriptDir = scriptDir || __dirname;
  var normalized = scriptDir.split(path.sep).join('/');
  if (normalized.indexOf('/.claude/plugins/') !== -1) return 'marketplace';
  try {
    var cur = scriptDir;
    for (var i = 0; i < 6; i++) {
      if (fs.existsSync(path.join(cur, '.git'))) return 'dev-clone';
      var parent = path.dirname(cur);
      if (parent === cur) break;
      cur = parent;
    }
  } catch (_) {}
  return 'unknown';
}

function remediationText(opts) {
  opts = opts || {};
  var surface = opts.surface || detectSurface();
  var marketplace = opts.marketplace || MARKETPLACE;
  var plugin = opts.plugin || PLUGIN_ID;

  var marketplaceSteps = [
    '1. claude plugin marketplace update ' + marketplace,
    '2. claude plugin update ' + plugin,
    '3. Restart Claude Code / Cowork Desktop to apply',
    'Tip: set "autoUpdate": true on the "' + marketplace + '" entry in ' +
      '~/.claude/plugins/known_marketplaces.json (or use the /plugin menu, if offered) to skip step 1 next time.',
  ].join('\n');

  var devCloneSteps = [
    '1. cd into your commander checkout',
    '2. git pull origin main',
    '3. npm install (picks up any new dependencies)',
  ].join('\n');

  if (surface === 'dev-clone') return devCloneSteps;
  if (surface === 'marketplace') return marketplaceSteps;
  // Unknown surface: lead with the marketplace path (primary distribution
  // surface) but mention the dev-clone alternative for source checkouts.
  return marketplaceSteps + '\n\n(Running from a source checkout instead? git pull origin main && npm install.)';
}

module.exports = {
  checkForUpdate: checkForUpdate,
  semverCompare: semverCompare,
  remediationText: remediationText,
  detectSurface: detectSurface,
  LOCAL_VERSION: LOCAL_VERSION,
  DEFAULT_REMOTE_URL: DEFAULT_REMOTE_URL,
  DEFAULT_CACHE_PATH: DEFAULT_CACHE_PATH,
  DEFAULT_TTL_MS: DEFAULT_TTL_MS,
};

// ─── CLI tail — only runs when invoked directly, never on require() ───────
if (require.main === module) {
  var remoteOnly = process.argv.indexOf('--remote-only') !== -1;

  checkForUpdate()
    .then(function (result) {
      if (remoteOnly) {
        // Bare-version output for shell callers (e.g. ccc-tuneup's probe
        // script). Print NOTHING and exit non-zero on failure so a caller's
        // `$(... || echo n/a)` fallback fires cleanly — no ANSI, no prose.
        if (result.status === 'unknown' || !result.latest) {
          process.exitCode = 1;
          return;
        }
        process.stdout.write(result.latest + '\n');
        return;
      }

      if (result.status === 'outdated') {
        process.stdout.write('\n  \x1b[33m⬆ CC Commander update available: v' + result.installed + ' → v' + result.latest + '\x1b[0m\n');
        var lines = remediationText().split('\n');
        for (var i = 0; i < lines.length; i++) {
          process.stdout.write('  \x1b[2m' + lines[i] + '\x1b[0m\n');
        }
        process.stdout.write('\n');
      }
      // status 'current' or 'unknown': silent, matching the pre-existing
      // silent-on-failure / silent-when-current CLI behavior.
    })
    .catch(function () {
      if (remoteOnly) process.exitCode = 1;
      // Non-remote-only mode stays silent on unexpected errors too.
    });
}
