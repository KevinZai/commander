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

/** The lane's Claude config dir. */
function configDir(env) {
  env = envOf(env);
  if (env.CCC_CONFIG_DIR) return path.resolve(env.CCC_CONFIG_DIR);
  if (env.CLAUDE_CONFIG_DIR) return path.resolve(env.CLAUDE_CONFIG_DIR);
  return path.join(homeOf(env), '.claude');
}

/** Writable Commander state dir for this lane: <config dir>/commander. */
function stateDir(env) {
  return path.join(configDir(env), 'commander');
}

/** The pre-lane shared state dir (~/.claude/commander). */
function legacyStateDir(env) {
  return path.join(homeOf(envOf(env)), '.claude', 'commander');
}

// Lane path when it exists or fails with anything but ENOENT; else the legacy
// path when that exists; else the lane path (a fresh lane).
function preferLane(own, legacy) {
  try { fs.statSync(own); return own; } catch (e) { if (e.code !== 'ENOENT') return own; }
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

exports.configDir = configDir;
exports.stateDir = stateDir;
exports.legacyStateDir = legacyStateDir;
exports.readablePath = readablePath;
exports.readableStateDir = readableStateDir;
