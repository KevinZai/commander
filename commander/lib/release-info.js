'use strict';
/**
 * Release resolution for the `ccc` CLI: which Commander the checkout is, which
 * plugin release the active Claude config dir has installed, and the drift
 * between them.
 *
 * The CLI runs from a git checkout (a `ccc` shim execs bin/kc.js) while Claude
 * Code loads the plugin from its own cache. When the checkout falls behind,
 * `ccc --version` used to report the stale checkout as if it were current.
 *
 * Read-only and offline: no git or network calls; the checkout sha is read from
 * .git directly. Precedence for the installed record matches the status line:
 * project-scope entry for the cwd, then user scope, then any entry.
 */

var fs = require('fs');
var path = require('path');

var PLUGIN_KEY_RE = /^commander@/;

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_e) { return null; }
}

function isReadableFile(file) {
  try { fs.accessSync(file, fs.constants.R_OK); return fs.statSync(file).isFile(); } catch (_e) { return false; }
}

/** Numeric semver compare: 1 if a > b, -1 if a < b, 0 if equal or unparseable. */
function compareVersions(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return 0;
  var x = a.split(/[.+-]/).slice(0, 3).map(Number);
  var y = b.split(/[.+-]/).slice(0, 3).map(Number);
  if (x.some(isNaN) || y.some(isNaN)) return 0;
  for (var i = 0; i < 3; i++) {
    if ((x[i] || 0) > (y[i] || 0)) return 1;
    if ((x[i] || 0) < (y[i] || 0)) return -1;
  }
  return 0;
}

/** Resolve the git dir for a checkout or a linked worktree (`.git` file). */
function gitDirOf(root) {
  var dotGit = path.join(root, '.git');
  var st;
  try { st = fs.statSync(dotGit); } catch (_e) { return null; }
  if (st.isDirectory()) return dotGit;
  var m = /^gitdir:\s*(.+)\s*$/m.exec(fs.readFileSync(dotGit, 'utf8'));
  return m ? path.resolve(root, m[1].trim()) : null;
}

/** HEAD sha of a checkout without spawning git; null when unknown. */
function readGitSha(root) {
  try {
    var gitDir = gitDirOf(root);
    if (!gitDir) return null;
    var head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    if (/^[0-9a-f]{40}$/.test(head)) return head;
    var ref = /^ref:\s*(.+)$/.exec(head);
    if (!ref) return null;
    // Linked worktrees keep refs in the common dir.
    var commonDir = gitDir;
    try { commonDir = path.resolve(gitDir, fs.readFileSync(path.join(gitDir, 'commondir'), 'utf8').trim()); } catch (_e) {}
    var dirs = [gitDir, commonDir];
    for (var i = 0; i < dirs.length; i++) {
      try {
        var sha = fs.readFileSync(path.join(dirs[i], ref[1]), 'utf8').trim();
        if (/^[0-9a-f]{40}$/.test(sha)) return sha;
      } catch (_e) {}
    }
    var packed = '';
    try { packed = fs.readFileSync(path.join(commonDir, 'packed-refs'), 'utf8'); } catch (_e) { return null; }
    var lines = packed.split('\n');
    for (var j = 0; j < lines.length; j++) {
      var parts = lines[j].split(' ');
      if (parts[1] === ref[1] && /^[0-9a-f]{40}$/.test(parts[0])) return parts[0];
    }
  } catch (_e) {}
  return null;
}

function checkoutInfo(root) {
  var pkg = readJson(path.join(root, 'package.json')) || {};
  return { root: root, version: pkg.version || null, sha: readGitSha(root) };
}

/** Claude config dir the CLI is serving: CCC_CONFIG_DIR > CLAUDE_CONFIG_DIR > ~/.claude. */
function configDirFrom(env) {
  return require('./lane').resolveLane(env).configDir;
}

/**
 * The installed commander plugin record for a config dir, or null.
 * Returns {version, sha, installPath, scope, source} where version prefers the
 * installed plugin.json over the record.
 */
function installedPlugin(configDir, projectDir) {
  var rec = readJson(path.join(configDir, 'plugins', 'installed_plugins.json'));
  if (!rec || typeof rec !== 'object') return null;
  var plugins = rec.plugins && typeof rec.plugins === 'object' ? rec.plugins : rec;
  var entries = [];
  Object.keys(plugins).forEach(function(key) {
    if (!PLUGIN_KEY_RE.test(key)) return;
    var v = plugins[key];
    (Array.isArray(v) ? v : [v]).forEach(function(e) { if (e && typeof e === 'object') entries.push(Object.assign({ _key: key }, e)); });
  });
  if (entries.length === 0) return null;
  var project = projectDir ? path.resolve(projectDir) : null;
  // Same precedence as the status line; an install that belongs only to
  // another project is not this session's plugin.
  var pick = entries.filter(function(e) { return e.scope === 'project' && project && e.projectPath === project; })[0] ||
    entries.filter(function(e) { return e.scope === 'user'; })[0] ||
    entries.filter(function(e) { return !e.projectPath || e.projectPath === project; })[0];
  if (!pick) return null;
  var version = pick.version || null;
  var manifest = null;
  if (pick.installPath) {
    manifest = readJson(path.join(pick.installPath, '.claude-plugin', 'plugin.json'));
    if (manifest && typeof manifest.version === 'string') version = manifest.version;
  }
  return {
    id: pick._key,
    version: version,
    sha: pick.gitCommitSha || null,
    installPath: pick.installPath || null,
    installed: !!(pick.installPath && fs.existsSync(pick.installPath)),
    // usable = a readable manifest and the /ccc hub skill in the cache dir
    usable: !!(manifest && pick.installPath && isReadableFile(path.join(pick.installPath, 'skills', 'ccc', 'SKILL.md'))),
    scope: pick.scope || null,
  };
}

/**
 * Full resolution. opts: {root, env, cwd}.
 * drift[] items: {kind, checkout, plugin, message, fix}.
 */
function resolveRelease(opts) {
  opts = opts || {};
  var root = opts.root || path.resolve(__dirname, '..', '..');
  var configDir = configDirFrom(opts.env);
  var checkout = checkoutInfo(root);
  var plugin = installedPlugin(configDir, opts.cwd || process.cwd());
  var drift = [];
  if (plugin && !plugin.installed) {
    drift.push({
      kind: 'plugin_record_stale',
      checkout: checkout.version,
      plugin: plugin.version,
      message: 'installed_plugins.json lists commander ' + plugin.version + ' but its cache dir is missing',
      fix: 'claude plugin install commander@commander-hub',
    });
  } else if (plugin && plugin.version && checkout.version) {
    var cmp = compareVersions(checkout.version, plugin.version);
    if (cmp < 0) {
      // A git checkout fast-forwards (fetch first: origin/main may be stale);
      // an npm install has no .git and updates through npm, as `ccc --update` does.
      var isGit = !!gitDirOf(root);
      var q = JSON.stringify(root);
      drift.push({
        kind: 'checkout_behind_plugin',
        checkout: checkout.version,
        plugin: plugin.version,
        message: (isGit ? 'ccc checkout ' : 'ccc install ') + checkout.version + ' is behind the installed plugin ' + plugin.version,
        fix: isGit
          ? 'on a clean main: git -C ' + q + ' fetch origin main && git -C ' + q + ' merge --ff-only origin/main'
          : 'npm update -g cc-commander',
      });
    } else if (cmp > 0) {
      drift.push({
        kind: 'plugin_behind_checkout',
        checkout: checkout.version,
        plugin: plugin.version,
        message: 'installed plugin ' + plugin.version + ' is older than the ccc checkout ' + checkout.version,
        fix: 'claude plugin update commander@commander-hub',
      });
    }
  }
  return { configDir: configDir, checkout: checkout, plugin: plugin, drift: drift };
}

/** `ccc --version` text: line for stdout, warnings for stderr. */
function versionReport(product, info) {
  var line = product + ' v' + (info.checkout.version || '?');
  if (info.plugin && info.plugin.version) {
    line += info.plugin.installed
      ? ' (installed plugin v' + info.plugin.version + ')'
      : ' (plugin record v' + info.plugin.version + ', cache missing)';
  }
  var warnings = info.drift
    .filter(function(d) { return d.kind !== 'plugin_behind_checkout'; })
    .map(function(d) { return 'warning: ' + d.message + '. Update: ' + d.fix; });
  return { line: line, warnings: warnings };
}

module.exports = {
  compareVersions: compareVersions,
  readGitSha: readGitSha,
  checkoutInfo: checkoutInfo,
  configDirFrom: configDirFrom,
  installedPlugin: installedPlugin,
  resolveRelease: resolveRelease,
  versionReport: versionReport,
};
