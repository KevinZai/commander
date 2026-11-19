'use strict';

// The directory a dispatch runs in. An imported project is bound by its
// absolute, symlink-resolved root: a relative path would resolve against
// whatever directory Commander is restarted from, and a project that has gone
// missing must stop the dispatch instead of silently running in the launch
// directory with another project's context.

var fs = require('fs');
var path = require('path');

// Absolute real path of an existing directory, or throws with the reason.
function normalizeRoot(dir, base) {
  if (dir == null || String(dir).trim() === '') throw new Error('No project directory given.');
  var abs = path.resolve(base || process.cwd(), String(dir));
  var real;
  try { real = fs.realpathSync(abs); } catch (_e) {
    throw new Error('Project directory does not exist: ' + abs);
  }
  if (!fs.statSync(real).isDirectory()) throw new Error('Project path is not a directory: ' + real);
  return real;
}

// Validate a stored root: it must be absolute (never re-resolved against the
// current directory) and still exist. Returns { dir } or { error }.
function checkStoredRoot(dir, label) {
  var what = label || 'Imported project';
  if (!path.isAbsolute(String(dir))) {
    return { dir: null, error: what + ' path is not absolute (' + dir + '); re-import it with Open project.' };
  }
  try { return { dir: normalizeRoot(dir), error: null }; } catch (e) {
    return { dir: null, error: what + ' is unavailable: ' + e.message + '. Re-import it or clear it before dispatching.' };
  }
}

// The active project's root from Commander state. No active project means
// { dir: null, error: null }: dispatches run in the launch directory by design.
function activeRoot(currentState) {
  var ap = currentState && currentState.activeProject;
  if (!ap || !ap.dir) return { dir: null, error: null };
  return checkStoredRoot(ap.dir, 'Imported project');
}

// The directory a session was bound to when it was dispatched. Sessions saved
// before binding fall back to the active project (still validated).
function sessionRoot(session, currentState) {
  if (session && session.projectDir) return checkStoredRoot(session.projectDir, 'Session project');
  return activeRoot(currentState);
}

module.exports = {
  normalizeRoot: normalizeRoot,
  checkStoredRoot: checkStoredRoot,
  activeRoot: activeRoot,
  sessionRoot: sessionRoot
};
