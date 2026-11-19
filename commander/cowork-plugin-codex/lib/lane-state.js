'use strict';
/**
 * Lane-aware Commander state for plugin hooks and readers.
 *
 * Several Claude config dirs ("lanes") run side by side (~/.claude,
 * ~/.claude-ai1..ai4, ~/.claude-guestnetworks). A shared ~/.claude/commander
 * lets their hooks clobber each other's state, so each lane keeps its own
 * <config dir>/commander. Precedence: CCC_CONFIG_DIR > CLAUDE_CONFIG_DIR >
 * ~/.claude, the same as commander/lib/lane.js. The plugin runs from its cache
 * dir without commander/lib, so this file mirrors that resolver;
 * commander/tests/lane-state.test.js keeps the two in step.
 *
 * Nothing is migrated or deleted: the read helpers fall back to the legacy
 * ~/.claude/commander copy only when the lane copy is absent (ENOENT). Any
 * other error keeps the lane path, so the caller's read fails closed.
 */

var fs = require('fs');
var os = require('os');
var path = require('path');

function envOf(env) {
  return env || process.env;
}

function homeOf(env) {
  return env.HOME || env.USERPROFILE || os.homedir();
}

var BLOCKED_LEAF = '.ccc-unresolvable-config-dir';

// Extended-length UNC: \\?\UNC\server\share is the root, not \\?\UNC\.
var EXT_UNC = /^([\\/]{2}[?.][\\/]UNC[\\/][^\\/]+[\\/][^\\/]+)(?:[\\/]|$)/i;

/**
 * A config dir resolved physically, one component at a time against the disk (like `cd -P` and the OS), so
 * /var/../x is /private/x on macOS and a symlink followed by .. climbs from the link's target. Only win32
 * splits on a backslash. A copy of resolvePhysical() in commander/lib/profile-path.js, the resolver install.sh
 * uses; commander/tests/lane-state.test.js keeps the two in step. Falls back to the lexical path only when the
 * input cannot be resolved at all (a drive-relative win32 path). A path with no `..` segment is kept as written
 * (same directory, the spelling callers expect).
 */
function physicalDir(p) {
  // Only a `..` segment can name a different directory than the lexical path; keep any other path as written.
  var dotdot = process.platform === 'win32' ? /(^|[\\/])\.\.([\\/]|$)/ : /(^|\/)\.\.(\/|$)/; // only win32 splits on a backslash
  if (!dotdot.test(String(p))) return path.resolve(p);
  var win = process.platform === 'win32';
  var P = win ? path.win32 : path.posix;
  var real = function(x) { return fs.realpathSync.native(x); };
  var rest, cur;
  if (P.isAbsolute(p)) {
    var m = win ? EXT_UNC.exec(p) : null;
    var root = m ? p.slice(0, m[0].length) : P.parse(p).root;
    rest = p.slice(root.length);
    try { cur = real(root); } catch (_e) { cur = root; }
  } else {
    if (win && /^[A-Za-z]:/.test(p)) return path.resolve(p);
    rest = p;
    try { cur = real(process.cwd()); } catch (_e) { cur = P.resolve(process.cwd()); }
  }
  // When the OS could not open the path (a non-directory in the middle, or any error but ENOENT), return a dir
  // under the component it stops at, so every path built from it fails the same way. (The path as written would
  // not do: path.join normalizes /etc/hosts/../ssh/commander to /etc/ssh/commander.) Same as blockedDir() in
  // commander/lib/profile-path.js.
  var blocked = function(x) { return P.join(x, BLOCKED_LEAF); };
  var isDir = function(x) { try { return fs.statSync(x).isDirectory(); } catch (_e) { return false; } };
  var parts = rest.split(win ? /[\\/]+/ : /\/+/).filter(Boolean), missing = 0;
  for (var i = 0; i < parts.length; i++) {
    var c = parts[i];
    if (c === '.') continue;
    if (c === '..') { cur = P.dirname(cur); if (missing) missing--; continue; }
    var next = P.join(cur, c);
    if (!missing) {
      var resolved = null, err = null;
      try { resolved = real(next); } catch (e) { err = e; }
      if (resolved !== null) {
        if (i < parts.length - 1 && !isDir(resolved)) return blocked(resolved);   // /etc/hosts/.. is ENOTDIR, not /etc
        cur = resolved;
        continue;
      }
      if (!err || err.code !== 'ENOENT') return blocked(next);                 // ENOTDIR, EACCES, ELOOP
      try { fs.lstatSync(next); return blocked(next); } catch (_e) { /* truly missing */ }   // a dangling link
    }
    missing++;
    cur = next;
  }
  return cur;
}

/** The lane's Claude config dir (physical; see physicalDir). */
function configDir(env) {
  env = envOf(env);
  if (env.CCC_CONFIG_DIR) return physicalDir(env.CCC_CONFIG_DIR);
  if (env.CLAUDE_CONFIG_DIR) return physicalDir(env.CLAUDE_CONFIG_DIR);
  return physicalDir(path.join(homeOf(env), '.claude'));
}

/** Writable Commander state dir for this lane: <config dir>/commander. */
function stateDir(env) {
  return path.join(configDir(env), 'commander');
}

/** The pre-lane shared state dir (~/.claude/commander). */
function legacyStateDir(env) {
  return path.join(homeOf(envOf(env)), '.claude', 'commander');
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

// Lane path when it exists or fails with anything but ENOENT; else the legacy
// path when that exists; else the lane path (a fresh lane).
function preferLane(own, legacy) {
  try { fs.statSync(own); return own; } catch (e) { if (e.code !== 'ENOENT') return own; }
  if (danglingAlong(own)) return own;
  return fs.existsSync(legacy) ? legacy : own;
}

/** Path to read a state file (relative to the state dir) from. */
function readablePath(rel, env) {
  return preferLane(path.join(stateDir(env), rel), path.join(legacyStateDir(env), rel));
}

/** State dir to read logs from: the lane's, else the legacy one while the lane has none. */
function readableStateDir(env) {
  return preferLane(stateDir(env), legacyStateDir(env));
}

/**
 * The per-plugin data dir the host exports to hook processes: Claude Code's
 * ${CLAUDE_PLUGIN_DATA} (~/.claude/plugins/data/<id>/, kept across plugin
 * updates, removed on uninstall) or Codex's PLUGIN_DATA. '' when neither is
 * set (tests, the CLI, older hosts).
 */
function pluginDataDir(env) {
  env = envOf(env);
  var dir = env.CLAUDE_PLUGIN_DATA || env.PLUGIN_DATA || '';
  return dir ? path.resolve(dir) : '';
}

/**
 * Where hooks write hook-private state that no other Commander surface reads
 * (once-per-day nudge markers, routing state, the CI ticker cache): the plugin
 * data dir when the host provides one, else the lane state dir as before.
 * Shared state (session records, analytics logs, config.json) stays in
 * stateDir() because the CLI, the HUD mod and skills read it from there.
 */
function hookDataDir(env) {
  return pluginDataDir(env) || stateDir(env);
}

/**
 * Path to read a hook-private file from: the plugin data copy when it exists;
 * otherwise the copy an earlier release wrote to the lane (or legacy
 * ~/.claude/commander) dir; otherwise the plugin data path (a fresh install).
 * Nothing is moved or deleted.
 */
function readableHookDataPath(rel, env) {
  var dir = pluginDataDir(env);
  if (!dir) return readablePath(rel, env);
  var own = path.join(dir, rel);
  try { fs.statSync(own); return own; } catch (e) { if (e.code !== 'ENOENT') return own; }
  if (danglingAlong(own)) return own;
  var earlier = readablePath(rel, env);
  return fs.existsSync(earlier) ? earlier : own;
}

exports.configDir = configDir;
exports.stateDir = stateDir;
exports.legacyStateDir = legacyStateDir;
exports.readablePath = readablePath;
exports.readableStateDir = readableStateDir;
exports.pluginDataDir = pluginDataDir;
exports.hookDataDir = hookDataDir;
exports.readableHookDataPath = readableHookDataPath;
