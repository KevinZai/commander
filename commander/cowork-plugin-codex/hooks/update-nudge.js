#!/usr/bin/env node
/**
 * update-nudge.js
 * Hook: SessionStart (async: true — never blocks session startup)
 *
 * Compares the installed plugin.json version against GitHub main and tells
 * the MODEL (not a direct terminal print) to surface an update nudge, once
 * per 24h. Silent on ANY failure — offline, malformed JSON, missing
 * plugin.json, fetch timeout, cache-write failure — never surfaces as an
 * error and never blocks the session.
 *
 * Self-contained by design: does NOT import commander/update-check.js.
 * That module lives outside cowork-plugin/ and is not guaranteed to ship
 * in every plugin bundle (e.g. a slimmed mirror for another surface), and
 * every other hook in this directory is already self-contained with zero
 * imports beyond hooks/lib/*.mjs.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { emitModel, emitSilent } from './lib/emit.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REMOTE_URL = 'https://raw.githubusercontent.com/KevinZai/commander/main/commander/cowork-plugin/.claude-plugin/plugin.json';
const FETCH_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — also the "don't repeat the nudge" window
const MARKETPLACE = 'commander-hub';
const PLUGIN_ID = 'commander';

// STRICT full-string match — nothing but digits and dots. The remote value is
// attacker-controllable (a compromised GitHub manifest), and whatever passes
// here is interpolated into model-facing context: an unanchored pattern would
// let `7.4.0<arbitrary instructions>` through as a prompt-injection vector.
// Prerelease/suffixed versions are deliberately rejected too (treated as
// unknown → silent) — release versions in this repo are always plain X.Y.Z.
function isValidVersion(v) {
  return typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v);
}

function semverGt(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return true;
    if (na < nb) return false;
  }
  return false;
}

/**
 * Resolve this plugin's own root directory. This file lives at
 * <pluginRoot>/hooks/update-nudge.js, so the path-relative fallback is
 * simply one directory up.
 *
 * Fallback chain (per platform verification): CLAUDE_PLUGIN_ROOT is the
 * env var Claude Code sets for hook processes; PLUGIN_ROOT is a secondary
 * alias some runtimes set; path-relative-to-script is the last resort and
 * always works since the file's location relative to plugin root is fixed.
 */
function resolvePluginRoot(env) {
  if (env.CLAUDE_PLUGIN_ROOT) return env.CLAUDE_PLUGIN_ROOT;
  if (env.PLUGIN_ROOT) return env.PLUGIN_ROOT;
  return dirname(__dirname);
}

function cacheFilePath(env) {
  const home = env.HOME || env.USERPROFILE || homedir();
  return join(home, '.claude', 'commander', 'update-nudge.json');
}

async function readLocalVersion(env) {
  const pluginRoot = resolvePluginRoot(env);
  const raw = await readFile(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8');
  const parsed = JSON.parse(raw);
  if (!isValidVersion(parsed.version)) throw new Error('invalid local plugin version');
  return parsed.version;
}

async function readCache(env) {
  try {
    const raw = await readFile(cacheFilePath(env), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(env, data) {
  try {
    const file = cacheFilePath(env);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(data));
  } catch {
    // Best-effort — a failed cache write just means we re-check next session.
  }
}

function defaultFetchText(url, timeoutMs) {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs) }).then((res) => {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  });
}

function nudgeMessage(installed, latest) {
  return [
    `⬆️ CC Commander v${latest} is available (installed v${installed}).`,
    `Tell the user: run "claude plugin marketplace update ${MARKETPLACE} && claude plugin update ${PLUGIN_ID}", then restart Claude Code / Cowork Desktop to apply.`,
    `Tip for next time: set "autoUpdate": true on the "${MARKETPLACE}" entry in ~/.claude/plugins/known_marketplaces.json (or use the /plugin menu, if offered) to skip the marketplace-update step.`,
  ].join(' ');
}

/**
 * Core logic, testable: pass env / fetchText / now for deterministic tests
 * (offline, fresh-cache-skips-fetch, outdated-emits-context, current-silent).
 */
export async function run({ env = process.env, fetchText = defaultFetchText, now = Date.now } = {}) {
  try {
    const localVersion = await readLocalVersion(env);
    const cache = await readCache(env);
    const nowMs = now();

    // Fresh cache (same installed version, within TTL) — we already checked
    // AND already nudged (if applicable) within this window. Stay silent
    // and skip the network call entirely.
    const fresh =
      cache &&
      typeof cache.checkedAt === 'number' &&
      cache.checkedAt <= nowMs && // a future timestamp (clock skew, tampered cache) is stale, not immortal
      cache.installed === localVersion &&
      // A cache whose `latest` isn't a strict X.Y.Z is a legacy/poisoned
      // artifact of a pre-validation version — never honor it as fresh;
      // fall through to a re-fetch, which overwrites it with clean values
      // (self-healing) while downstream readers (suggest-ticker) also
      // re-validate on read.
      isValidVersion(cache.latest) &&
      nowMs - cache.checkedAt < CACHE_TTL_MS;

    if (fresh) return emitSilent();

    let remoteVersion;
    try {
      const body = await fetchText(REMOTE_URL, FETCH_TIMEOUT_MS);
      const parsed = JSON.parse(body);
      if (!isValidVersion(parsed.version)) throw new Error('invalid remote version');
      remoteVersion = parsed.version;
    } catch {
      // Offline / timeout / malformed remote — silent, retry next session.
      // Deliberately NOT cached, so a transient outage doesn't lock in a
      // stale non-verdict for 24h.
      return emitSilent();
    }

    const outdated = semverGt(remoteVersion, localVersion);
    // `status` is the cross-hook contract (suggest-ticker.js keys on
    // status === 'outdated'); the `outdated` boolean is kept alongside for
    // any reader that predates the contract.
    await writeCache(env, {
      installed: localVersion,
      latest: remoteVersion,
      outdated,
      status: outdated ? 'outdated' : 'current',
      checkedAt: nowMs,
    });

    if (!outdated) return emitSilent();

    return emitModel('SessionStart', nudgeMessage(localVersion, remoteVersion));
  } catch {
    return emitSilent();
  }
}

// CLI tail — only runs when invoked directly (never on import).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    // Drain stdin per hook protocol (this hook doesn't need the payload).
    for await (const _chunk of process.stdin) { /* discard */ }
    let res;
    try {
      res = await run({});
    } catch {
      res = emitSilent();
    }
    process.stdout.write(JSON.stringify(res) + '\n');
  })();
}
