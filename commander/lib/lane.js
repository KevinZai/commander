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
 *
 * This is THE lane-name resolver: `ccc doctor --instances`, `ccc statusline
 * sync`, check-ins and state paths all call resolveLane(). The status line
 * (lib/statusline.sh, a standalone copy with no node) applies the same rules
 * and reads the same config; tests/statusline-lane.test.js keeps it in step.
 *
 * Aliases map a config dir suffix (.claude-<suffix>) to a lane name whose dir
 * is named differently. DEFAULT_ALIASES is overlaid by
 * ~/.commander/config.json {"lanes": {"aliases": {"<suffix>": "<lane>"}}};
 * map a suffix to itself to undo a default.
 */

var fs = require('fs');
var os = require('os');
var path = require('path');
var profilePath = require('./profile-path');

var MAX_LANE = 16; // same cap as the status line's lane hint
// Config dirs whose lane name differs from the dir suffix. Mirrored by the
// default case in lib/statusline.sh ccc_lane_alias().
var DEFAULT_ALIASES = Object.freeze({ guestnetworks: 'ai5' });

/**
 * The config dir. A path with a `..` segment is resolved physically, like the OS and the installer
 * (lib/profile-path.js), so /var/../x is /private/x on macOS; any other path is kept as written, which
 * names the same directory and keeps the spelling callers and `~` shortening expect. Falls back to the
 * lexical path when it cannot be resolved (empty or drive-relative).
 */
// Only win32 treats a backslash as a separator.
var DOTDOT = process.platform === 'win32' ? /(^|[\\/])\.\.([\\/]|$)/ : /(^|\/)\.\.(\/|$)/;
// A path the OS cannot open (through a non-directory, EACCES, ELOOP) becomes a dir under the component it stops
// at, so every state path built from it fails the same way instead of path.join normalizing it elsewhere.
function physicalConfigDir(raw) {
  if (!DOTDOT.test(String(raw))) {
    var dir = path.resolve(raw);
    return { dir: dir, problem: danglingAlong(dir) ? 'dangling' : null };
  }
  var r = profilePath.resolvePhysical(raw);
  var blocked = profilePath.blockedDir(r);
  if (blocked) return { dir: blocked, problem: r.problem };
  return { dir: r.path || path.resolve(raw), problem: r.problem || null };
}

function homeOf(env) {
  return env.HOME || os.homedir();
}

function sanitize(name) {
  return String(name).replace(/[^A-Za-z0-9._-]/g, '').slice(0, MAX_LANE);
}

/**
 * Suffix -> lane aliases for an environment: DEFAULT_ALIASES overlaid by
 * lanes.aliases in <HOME>/.commander/config.json. A missing or malformed file
 * keeps the defaults; keys that are not already sanitized names and values
 * that sanitize to nothing are ignored.
 */
function laneAliases(env) {
  env = env || process.env;
  var out = Object.assign({}, DEFAULT_ALIASES);
  var cfg = null;
  try { cfg = JSON.parse(fs.readFileSync(path.join(homeOf(env), '.commander', 'config.json'), 'utf8')); } catch (_e) { return out; }
  var a = cfg && cfg.lanes && cfg.lanes.aliases;
  if (!a || typeof a !== 'object' || Array.isArray(a)) return out;
  Object.keys(a).forEach(function(k) {
    var v = typeof a[k] === 'string' ? sanitize(a[k]) : '';
    if (k && k === sanitize(k) && v) out[k] = v;
  });
  return out;
}

/**
 * Resolve the lane for an environment (default process.env).
 * Returns {lane, account, configDir, stateDir, source, known, aliased, problem}.
 *   source:  'CCC_CONFIG_DIR' | 'CLAUDE_CONFIG_DIR' | 'default'
 *   known:   false when the dir name is neither .claude nor .claude-<name>
 *   aliased: true when an alias renamed the lane (account keeps the suffix)
 */
function resolveLane(env) {
  env = env || process.env;
  var source = 'default';
  var raw = path.join(homeOf(env), '.claude');
  if (env.CCC_CONFIG_DIR) { source = 'CCC_CONFIG_DIR'; raw = env.CCC_CONFIG_DIR; }
  else if (env.CLAUDE_CONFIG_DIR) { source = 'CLAUDE_CONFIG_DIR'; raw = env.CLAUDE_CONFIG_DIR; }
  // configDir is physical, resolved by the installer's resolver (lib/profile-path.js), so check-in, hold and
  // `ccc next` read the directory install.sh wrote: /var/../x is /private/x on macOS, as the OS opens it. The
  // lane name comes from the path as written, so ~/.claude-ai1 linked to a dotfiles dir is still lane ai1.
  var phys = physicalConfigDir(raw);
  var configDir = phys.dir;
  var base = path.basename(path.resolve(raw));
  var lane = 'custom';
  var account = null;
  var known = true;
  var aliased = false;
  var m = /^\.claude-(.+)$/.exec(base);
  if (base === '.claude') {
    lane = 'pri';
    account = 'primary';
  } else if (m && sanitize(m[1])) {
    var suffix = sanitize(m[1]);
    var aliases = laneAliases(env);
    aliased = Object.prototype.hasOwnProperty.call(aliases, suffix) && aliases[suffix] !== suffix;
    lane = aliased ? aliases[suffix] : suffix;
    account = suffix;
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
    aliased: aliased,
    problem: phys.problem, // the resolver's problem ('notdir', 'unresolvable', 'dangling', 'control'); else null
  };
}

/**
 * Is a missing path missing only because a link on the way points nowhere (or the path is such a link)?
 * Then it names a profile that is broken, not absent, and must not fall back to the legacy copy.
 */
function danglingAlong(p) {
  for (var cur = p; ; cur = path.dirname(cur)) {
    try {
      if (fs.lstatSync(cur).isSymbolicLink()) { try { fs.statSync(cur); } catch (e) { return true; } }
      return false; // the nearest existing component resolves
    } catch (_e) { /* missing: look one level up */ }
    if (path.dirname(cur) === cur) return false;
  }
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
  if (danglingAlong(own)) return own;
  var legacy = path.join(legacyStateDir(env), name);
  return fs.existsSync(legacy) ? legacy : own;
}

module.exports = {
  DEFAULT_ALIASES: DEFAULT_ALIASES,
  laneAliases: laneAliases,
  resolveLane: resolveLane,
  legacyStateDir: legacyStateDir,
  statePath: statePath,
  readable: readable,
};
