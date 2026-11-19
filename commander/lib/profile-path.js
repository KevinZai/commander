'use strict';
/**
 * The one physical resolver for a Claude profile (config dir) path.
 *
 * install.sh and uninstall.sh (through `kc.js __profile-dir`), `ccc --skills`
 * and the lane resolver (lib/lane.js, so check-in, hold and `next`) all resolve
 * CLAUDE_CONFIG_DIR / CCC_CONFIG_DIR here, so they act on the same directory.
 * The plugin's lib/lane-state.js ships without commander/lib and carries a copy
 * of resolvePhysical(); commander/tests/lane-state.test.js keeps them in step.
 *
 * Resolution is one component at a time against the disk, like `cd -P` and
 * like the OS itself: a symlink followed by .. climbs from the link's target,
 * so /var/../x is /private/x on macOS. Only win32 treats a backslash as a
 * separator; on POSIX `team\blue` is one directory name. Only the part after
 * the root is split, so a drive or UNC prefix is never joined onto itself.
 */

var fs = require('fs');
var path = require('path');

var UNSAFE = /[\u0000-\u001f\u007f]/;
// Extended-length UNC: \\?\UNC\server\share is the root, not \\?\UNC\.
var EXT_UNC = /^([\\/]{2}[?.][\\/]UNC[\\/][^\\/]+[\\/][^\\/]+)(?:[\\/]|$)/i;
// win32 spellings that are a root or above one: X:\, \\server, \\server\share, \\?\X:\, \\?\UNC[\server[\share]].
var WIN_ROOTISH = [
  /^[A-Za-z]:[\\/]*$/,
  /^[\\/]{2}[^\\/?.][^\\/]*([\\/]+[^\\/]+)?[\\/]*$/,
  /^[\\/]{2}[?.][\\/]+[A-Za-z]:[\\/]*$/,
  /^[\\/]{2}[?.][\\/]+UNC([\\/]+[^\\/]+){0,2}[\\/]*$/i,
  /^[\\/]+$/,
];

function flavor(opts) {
  var platform = (opts && opts.platform) || process.platform;
  return { win: platform === 'win32', P: platform === 'win32' ? path.win32 : path.posix };
}

function rootOf(p, f) {
  if (f.win) {
    var m = EXT_UNC.exec(p);
    if (m) return p.slice(0, m[0].length);
  }
  return f.P.parse(p).root;
}

/**
 * Resolve a profile path physically. Returns { path, problem }: path is the
 * physical path (null only for empty input or a drive-relative win32 path);
 * problem is null, or 'control' (a control character such as a newline in the
 * input or the result, which shell command substitution could strip),
 * 'dangling' (a component is a dangling symlink), 'notdir' (an existing
 * component with more path after it is not a directory: /etc/hosts/../ssh is
 * ENOTDIR to the OS, not /etc/ssh) or 'unresolvable' (any error but ENOENT,
 * such as EACCES or ELOOP). For 'notdir' and 'unresolvable' the path is the
 * input as written (made absolute, not normalized), and `blocked` is the
 * component the OS stops at; a lenient caller that must still build paths
 * builds them under blocked (see blockedDir), where every access fails the way
 * the OS fails the original, instead of joining onto the written path, which
 * path.join would normalize into another directory (/etc/hosts/../ssh/x is
 * /etc/ssh/x to path.join).
 * opts: { platform, fs, cwd } for tests.
 */
function resolvePhysical(p, opts) {
  opts = opts || {};
  var f = flavor(opts);
  var P = f.P;
  var xfs = opts.fs || fs;
  var real = function(x) { return xfs.realpathSync.native ? xfs.realpathSync.native(x) : xfs.realpathSync(x); };
  if (typeof p !== 'string' || !p) return { path: null, problem: 'empty' };
  var problem = UNSAFE.test(p) ? 'control' : null;
  var rest, cur;
  if (P.isAbsolute(p)) {
    var root = rootOf(p, f);
    rest = p.slice(root.length);
    try { cur = real(root); } catch (_e) { cur = root; }
  } else {
    if (f.win && /^[A-Za-z]:/.test(p)) return { path: null, problem: 'drive-relative' };
    rest = p;
    var cwd = opts.cwd || process.cwd();
    try { cur = real(cwd); } catch (_e) { cur = P.resolve(cwd); }
  }
  var asWritten = P.isAbsolute(p) ? p : (cur.slice(-1) === P.sep ? cur : cur + P.sep) + p;
  var isDir = function(x) { try { return xfs.statSync(x).isDirectory(); } catch (_e) { return false; } };
  var parts = rest.split(f.win ? /[\\/]+/ : /\/+/).filter(Boolean), missing = 0;
  for (var i = 0; i < parts.length; i++) {
    var c = parts[i];
    if (c === '.') continue;
    // After a missing component, .. climbs back through the missing ones; once none are left, the path is
    // physical again and later components are resolved against the disk.
    if (c === '..') { cur = P.dirname(cur); if (missing) missing--; continue; }
    var next = P.join(cur, c);
    if (!missing) {
      var resolved = null, err = null;
      try { resolved = real(next); } catch (e) { err = e; }
      if (resolved !== null) {
        if (i < parts.length - 1 && !isDir(resolved)) return { path: asWritten, problem: problem || 'notdir', blocked: resolved };
        cur = resolved;
        continue;
      }
      // Only ENOENT means "missing from here"; any other error (ENOTDIR, EACCES, ELOOP) is not a path to act on.
      if (!err || err.code !== 'ENOENT') return { path: asWritten, problem: problem || 'unresolvable', blocked: next };
      try { xfs.lstatSync(next); problem = problem || 'dangling'; } catch (_e) { /* truly missing */ }
    }
    missing++;
    cur = next;
  }
  if (UNSAFE.test(cur)) problem = problem || 'control';
  return { path: cur, problem: problem };
}

/** A dir under the component the OS stops at: any path built under it fails as the original path does. */
var BLOCKED_LEAF = '.ccc-unresolvable-config-dir';
function blockedDir(r, opts) {
  return r && r.blocked ? flavor(opts).P.join(r.blocked, BLOCKED_LEAF) : null;
}

/** The physical path, or null when it cannot be represented or reached safely (see resolvePhysical). */
function physicalProfilePath(p, opts) {
  var r = resolvePhysical(p, opts);
  return r.problem ? null : r.path;
}

function isRootPath(p, opts) {
  var f = flavor(opts);
  if (f.win && WIN_ROOTISH.some(function(re) { return re.test(p); })) return true;
  var trim = function(s) { return s.length > 1 ? s.replace(f.win ? /[\\/]+$/ : /\/+$/, '') || s.slice(0, 1) : s; };
  return trim(p) === trim(rootOf(p, f));
}

/**
 * The installer's guard: { ok: true, path } for a profile that resolves safely to an absolute directory that is
 * not a root, the home directory or one of its parents; else { ok: false, message }.
 */
function checkProfileDir(dir, home, opts) {
  var f = flavor(opts);
  var r = resolvePhysical(dir, opts);
  if (!r.path || r.problem) {
    return { ok: false, message: 'the config dir ' + JSON.stringify(dir || '') + ' cannot be resolved safely: it is empty, holds or resolves to a control character such as a newline, or passes through a dangling symlink, a non-directory or an unreadable component (' + (r.problem || 'empty') + ')' };
  }
  var h = physicalProfilePath(home, opts);
  if (!h) return { ok: false, message: 'the home directory cannot be resolved' };
  if (!f.P.isAbsolute(r.path)) return { ok: false, message: 'the config dir ' + dir + ' did not resolve to an absolute path (' + r.path + ')' };
  var fold = f.win || ((opts && opts.platform) || process.platform) === 'darwin';
  var norm = function(s) { s = s.replace(f.win ? /[\\/]+$/ : /\/+$/, ''); return fold ? s.toLowerCase() : s; };
  var d = norm(r.path), hm = norm(h), sep = f.P.sep;
  // The input is checked as written too: win32 reads a bare \\server as \server, a root-relative path.
  if (isRootPath(dir, opts) || isRootPath(r.path, opts) || d === hm || (hm + sep).indexOf(d + sep) === 0) {
    return { ok: false, message: 'CLAUDE_DIR must not be /, the home directory or one of its parents: ' + dir + ' resolves to ' + r.path };
  }
  return { ok: true, path: r.path };
}

module.exports = {
  resolvePhysical: resolvePhysical,
  blockedDir: blockedDir,
  BLOCKED_LEAF: BLOCKED_LEAF,
  physicalProfilePath: physicalProfilePath,
  isRootPath: isRootPath,
  checkProfileDir: checkProfileDir,
};
