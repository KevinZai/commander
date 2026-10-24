'use strict';
/**
 * Lane awareness: which Claude config dir ("lane") this process serves, and
 * where its writable Commander state lives.
 *
 * Several config dirs run side by side (~/.claude, ~/.claude-ai1..ai4,
 * ~/.claude-guestnetworks); a shared ~/.claude/commander lets them clobber each
 * other's state. Precedence: CCC_CONFIG_DIR > CLAUDE_CONFIG_DIR > ~/.claude.
 * Each lane keeps its state in <config dir>/commander, the same path the status
 * line reads, so the default lane's ~/.claude/commander does not move.
 *
 * Nothing is migrated or deleted: readable() falls back to the legacy
 * ~/.claude/commander file until the lane writes its own copy.
 */

var fs = require('fs');
var os = require('os');
var path = require('path');

var MAX_LANE = 16; // same cap as the status line's lane hint
// Config dirs whose lane name differs from the dir suffix.
var ALIASES = { guestnetworks: { lane: 'ai5', account: 'guestnetworks' } };

function homeOf(env) {
  return env.HOME || os.homedir();
}

function sanitize(name) {
  return String(name).replace(/[^A-Za-z0-9._-]/g, '').slice(0, MAX_LANE);
}

/**
 * Resolve the lane for an environment (default process.env).
 * Returns {lane, account, configDir, stateDir, source, known}.
 *   source: 'CCC_CONFIG_DIR' | 'CLAUDE_CONFIG_DIR' | 'default'
 *   known:  false when the dir name is neither .claude nor .claude-<name>
 */
function resolveLane(env) {
  env = env || process.env;
  var source = 'default';
  var configDir = path.join(homeOf(env), '.claude');
  if (env.CCC_CONFIG_DIR) { source = 'CCC_CONFIG_DIR'; configDir = path.resolve(env.CCC_CONFIG_DIR); }
  else if (env.CLAUDE_CONFIG_DIR) { source = 'CLAUDE_CONFIG_DIR'; configDir = path.resolve(env.CLAUDE_CONFIG_DIR); }

  var base = path.basename(configDir);
  var lane = 'custom';
  var account = null;
  var known = true;
  var m = /^\.claude-(.+)$/.exec(base);
  if (base === '.claude') {
    lane = 'pri';
    account = 'primary';
  } else if (m && sanitize(m[1])) {
    var suffix = sanitize(m[1]);
    var alias = ALIASES[suffix];
    lane = alias ? alias.lane : suffix;
    account = alias ? alias.account : suffix;
  } else {
    known = false;
  }
  return {
    lane: lane,
    account: account,
    configDir: configDir,
    stateDir: path.join(configDir, 'commander'),
    source: source,
    known: known,
  };
}

/** The pre-lane shared state dir (~/.claude/commander). */
function legacyStateDir(env) {
  return path.join(homeOf(env || process.env), '.claude', 'commander');
}

/** Writable path for a state file in this lane. */
function statePath(name, env) {
  return path.join(resolveLane(env).stateDir, name);
}

/**
 * Path to read a state file from: the lane's own copy when it exists, else the
 * legacy shared copy when that exists, else the lane path (for a fresh lane).
 */
function readable(name, env) {
  var own = statePath(name, env);
  // Fall back to the legacy copy only when the lane copy is absent. Any other error (EACCES, ENOTDIR) keeps the lane
  // path so the caller's read fails and pause controls such as fleet-hold.json fail closed.
  try { fs.statSync(own); return own; } catch (e) { if (e.code !== 'ENOENT') return own; }
  var legacy = path.join(legacyStateDir(env), name);
  return fs.existsSync(legacy) ? legacy : own;
}

module.exports = {
  resolveLane: resolveLane,
  legacyStateDir: legacyStateDir,
  statePath: statePath,
  readable: readable,
};
