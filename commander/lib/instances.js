'use strict';
/**
 * `ccc doctor --instances`: read-only audit of every Claude config dir in a
 * home directory (~/.claude, ~/.claude-<lane>). For each: lane, installed
 * commander plugin vs the latest known release (this checkout's package.json),
 * effective enablement, plugin hooks, and stale local ccc skill copies that
 * shadow the plugin.
 *
 * Nothing is written and no `claude` process is started. Dirs with neither
 * plugins/ nor projects/ are not Claude instances and are skipped.
 *
 * One row per lane name (lib/lane.js resolves names and aliases): when an
 * alias (.claude-guestnetworks -> ai5) and a plain dir (.claude-ai5) give the
 * same name, the aliased dir is the lane and the plain dir is listed under
 * `shadowed` instead of being audited as a second row.
 */

var fs = require('fs');
var os = require('os');
var path = require('path');

var lane = require('./lane');
var release = require('./release-info');
var checkin = require('./checkin');

var SCHEMA = 1;
var DIR_RE = /^\.claude(-.+)?$/;

/** true/false for a directory; the error code (e.g. 'EACCES') when it cannot be inspected. */
function dirState(p) {
  try { return fs.statSync(p).isDirectory(); } catch (e) { return e.code === 'ENOENT' || e.code === 'ENOTDIR' ? false : (e.code || 'EIO'); }
}

/** Config dirs under home that look like Claude instances, sorted. Throws when home is unreadable. */
function listInstanceDirs(home) {
  return fs.readdirSync(home)
    .filter(function(n) { return DIR_RE.test(n); })
    .map(function(n) { return path.join(home, n); })
    .filter(function(d) {
      // A Claude config dir has plugins/ or projects/; this skips look-alikes
      // such as claude-mem's ~/.claude-mem data dir.
      // A dir that cannot be inspected is kept so the audit reports it.
      var self = dirState(d);
      if (self !== true) return typeof self === 'string';
      var probes = [dirState(path.join(d, 'plugins')), dirState(path.join(d, 'projects'))];
      return probes.some(function(v) { return v !== false; });
    })
    .sort();
}

/**
 * Local skills/ccc and skills/ccc-* entries that are real copies, not symlinks.
 * Returns {copies[], error} where error is an errno code when skills/ (or an
 * entry) could not be inspected; a missing skills/ is an empty, clean scan.
 */
function staleSkillCopies(dir) {
  var skillsDir = path.join(dir, 'skills');
  var names;
  try { names = fs.readdirSync(skillsDir); } catch (e) {
    return { copies: [], error: e.code === 'ENOENT' ? null : (e.code || 'EIO') };
  }
  var error = null;
  var copies = names.filter(function(n) {
    if (n !== 'ccc' && n.indexOf('ccc-') !== 0) return false;
    try { return !fs.lstatSync(path.join(skillsDir, n)).isSymbolicLink(); } catch (e) { error = error || e.code || 'EIO'; return false; }
  }).sort();
  return { copies: copies, error: error };
}

function auditInstance(dir, home, latest) {
  var ln = lane.resolveLane({ HOME: home, CLAUDE_CONFIG_DIR: dir });
  try { fs.readdirSync(dir); } catch (e) {
    return {
      lane: ln.lane, account: ln.account, config_dir: dir, plugin_version: null, plugin_sha: null,
      enabled: null, hooks: false, stale_skills: [], status: 'gap', gaps: ['config dir unreadable: ' + e.code],
    };
  }
  var plugin = release.installedPlugin(dir, null);
  var en = checkin.effectiveEnablement(dir, null, plugin && plugin.id);
  var hooks = !!(plugin && plugin.installPath && fs.existsSync(path.join(plugin.installPath, 'hooks', 'hooks.json')));
  var scan = plugin ? staleSkillCopies(dir) : { copies: [], error: null };
  var stale = scan.copies;
  var gaps = [];
  if (!plugin) gaps.push('plugin not installed');
  else if (!plugin.installed) gaps.push('plugin cache dir missing');
  else if (!plugin.usable) gaps.push('plugin cache incomplete');
  if (plugin && latest && release.compareVersions(plugin.version, latest) < 0) gaps.push('plugin ' + plugin.version + ' behind ' + latest);
  if (en.unreadable.length) gaps.push('settings.json unreadable');
  else if (plugin && en.value !== true) gaps.push(en.value === false ? 'plugin disabled' : 'plugin not enabled');
  if (plugin && plugin.installed && !hooks) gaps.push('plugin hooks.json missing');
  if (scan.error) gaps.push('skills dir unreadable: ' + scan.error);
  if (stale.length) gaps.push(stale.length + ' stale local ccc skill cop' + (stale.length === 1 ? 'y' : 'ies'));
  return {
    lane: ln.lane,
    account: ln.account,
    config_dir: dir,
    plugin_version: plugin ? plugin.version : null,
    plugin_sha: plugin ? plugin.sha : null,
    enabled: en.unreadable.length ? null : en.value === true,
    hooks: hooks,
    stale_skills: stale,
    status: gaps.length ? 'gap' : 'ok',
    gaps: gaps,
  };
}

/**
 * Split instance dirs into one dir per lane name and the dirs it shadows.
 * The aliased dir wins a name clash; otherwise the first dir (sorted) wins.
 * Unknown ("custom") lanes never clash.
 */
function uniqueLanes(dirs, home) {
  var keep = [];
  var shadowed = [];
  var byLane = {};
  dirs.forEach(function(d) {
    var ln = lane.resolveLane({ HOME: home, CLAUDE_CONFIG_DIR: d });
    var prev = ln.known ? byLane[ln.lane] : null;
    if (!prev) {
      if (ln.known) byLane[ln.lane] = { dir: d, aliased: ln.aliased };
      keep.push(d);
    } else if (ln.aliased && !prev.aliased) {
      keep[keep.indexOf(prev.dir)] = d;
      shadowed.push({ lane: ln.lane, config_dir: prev.dir, by: d });
      byLane[ln.lane] = { dir: d, aliased: true };
    } else {
      shadowed.push({ lane: ln.lane, config_dir: d, by: prev.dir });
    }
  });
  return { dirs: keep, shadowed: shadowed };
}

/** opts: {home, root}. latest = the checkout's package.json version. */
function auditInstances(opts) {
  opts = opts || {};
  var home = opts.home || process.env.HOME || os.homedir();
  var root = opts.root || path.resolve(__dirname, '..', '..');
  var latest = release.checkoutInfo(root).version;
  var instances = [];
  var shadowed = [];
  var error = null;
  try {
    var lanes = uniqueLanes(listInstanceDirs(home), home);
    shadowed = lanes.shadowed;
    instances = lanes.dirs.map(function(d) { return auditInstance(d, home, latest); });
  } catch (e) {
    error = 'cannot read ' + home + ': ' + e.code;
  }
  return {
    schema: SCHEMA,
    host: os.hostname(),
    home: home,
    latest: latest,
    ok: !error && instances.every(function(i) { return i.status === 'ok'; }),
    error: error,
    instances: instances,
    shadowed: shadowed,
  };
}

/** Markdown table for humans and for posting. */
function renderTable(result) {
  var lines = [
    '| Lane | Config dir | Plugin | Enabled | Hooks | Stale ccc copies | Status |',
    '|---|---|---|---|---|---|---|',
  ];
  result.instances.forEach(function(i) {
    lines.push('| ' + [
      i.lane,
      '`' + i.config_dir.replace(result.home, '~') + '`',
      i.plugin_version || 'none',
      i.enabled === null ? '?' : (i.enabled ? 'yes' : 'no'),
      i.hooks ? 'yes' : 'no',
      i.stale_skills.length ? i.stale_skills.join(', ') : '-',
      i.status === 'ok' ? 'ok' : 'GAP: ' + i.gaps.join('; '),
    ].join(' | ') + ' |');
  });
  var tilde = function(p) { return '`' + p.replace(result.home, '~') + '`'; };
  (result.shadowed || []).forEach(function(s) {
    lines.push('', 'note: ' + tilde(s.config_dir) + ' not audited: lane ' + s.lane + ' is ' + tilde(s.by) + ' (lanes.aliases in ~/.commander/config.json)');
  });
  if (result.error) lines.push('', 'ERROR: ' + result.error);
  lines.push('');
  lines.push('latest ' + (result.latest || '?') + ' · ' + result.instances.length + ' instances · ' +
    result.instances.filter(function(i) { return i.status !== 'ok'; }).length + ' with gaps');
  return lines.join('\n');
}

module.exports = {
  SCHEMA: SCHEMA,
  listInstanceDirs: listInstanceDirs,
  staleSkillCopies: staleSkillCopies,
  auditInstance: auditInstance,
  auditInstances: auditInstances,
  uniqueLanes: uniqueLanes,
  renderTable: renderTable,
};
