'use strict';
/**
 * `ccc checkin`: the CCC side of the Fleet check-in gate. One read-only call
 * reports versions, drift, the lane and health, so a Superfleet brief or the
 * Fleet dispatch gate can decide whether to proceed.
 *
 * Contract (schema 1) is documented in docs/FLEET-CHECKIN.md. Exit codes:
 * 0 ok (warnings allowed), 1 a blocking check failed, 3 no commander plugin.
 * No network calls and no writes; the only subprocess is `claude --version`
 * (skippable with --no-cli).
 */

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var lane = require('./lane');
var release = require('./release-info');
var diagnostics = require('../cowork-plugin/skills/ccc-doctor/lib/diagnostics');

var SCHEMA = 1;
// MCP Tasks need Claude Code 2.1.304+ (CC-2091 findings).
var CLI_FLOOR = '2.1.304';
var PLUGIN_ID = 'commander@commander-hub';

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_e) { return null; }
}

/**
 * Effective enabledPlugins value for commander, using Claude Code's settings
 * precedence (later wins): user <config dir>/settings.json, then the project's
 * .claude/settings.json, then .claude/settings.local.json.
 * Returns {value: true|false|null, source, unreadable[]}.
 */
function effectiveEnablement(configDir, cwd, pluginId) {
  var id = pluginId || PLUGIN_ID;
  var files = [path.join(configDir, 'settings.json')];
  if (cwd) {
    files.push(path.join(path.resolve(cwd), '.claude', 'settings.json'));
    files.push(path.join(path.resolve(cwd), '.claude', 'settings.local.json'));
  }
  var result = { value: null, source: null, unreadable: [] };
  var seen = {};
  files.forEach(function(file) {
    if (seen[file] || !fs.existsSync(file)) return;
    seen[file] = true;
    var json = readJson(file);
    if (!json || typeof json !== 'object') { result.unreadable.push(file); return; }
    var ep = json.enabledPlugins;
    if (ep && typeof ep === 'object' && Object.prototype.hasOwnProperty.call(ep, id)) {
      result.value = ep[id] === true;
      result.source = file;
    }
  });
  return result;
}

/** `claude --version` -> "2.1.309", or null when the binary is missing or slow. */
function claudeCliVersion(env) {
  var bin = env.CCC_CLAUDE_BIN || 'claude';
  try {
    var r = childProcess.spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 5000, env: env });
    if (r.status !== 0 || !r.stdout) return null;
    var m = /(\d+\.\d+\.\d+)/.exec(r.stdout);
    return m ? m[1] : null;
  } catch (_e) {
    return null;
  }
}

/**
 * Hook health for the lane's installed plugin, from the same functions
 * `ccc doctor` uses.
 * status: ok | warn (unregistered files, shared-state writers, a handler
 * without an ESM import) | fail (hooks.json missing or unparseable, a
 * registered handler missing, or a legacy require() that cannot load as ESM).
 */
function hooksHealth(plugin) {
  var dir = path.join(plugin.installPath, 'hooks');
  var report = diagnostics.hookChainReport(dir);
  var writers = report.loadable ? diagnostics.findSharedStateWriters(dir) : [];
  var status = 'ok';
  if (!report.loadable || report.missing.length || report.legacyRequire.length) status = 'fail';
  else if (report.unregistered.length || writers.length || report.noEsm.length) status = 'warn';
  return {
    status: status,
    hooks_dir: dir,
    loadable: report.loadable,
    registered: report.registered.length,
    unregistered: report.unregistered,
    missing: report.missing,
    legacy_require: report.legacyRequire,
    no_esm_import: report.noEsm,
    shared_state_writers: writers,
  };
}

function hooksMessage(h) {
  if (!h.loadable) return 'hooks.json missing, unparseable or malformed in ' + h.hooks_dir;
  var parts = [];
  if (h.missing.length) parts.push('missing handlers: ' + h.missing.join(', '));
  if (h.legacy_require.length) parts.push('require() in ESM handlers: ' + h.legacy_require.join(', '));
  if (h.unregistered.length) parts.push('unregistered: ' + h.unregistered.join(', '));
  if (h.no_esm_import.length) parts.push('no ESM import: ' + h.no_esm_import.join(', '));
  if (h.shared_state_writers.length) parts.push(h.shared_state_writers.length + ' hook(s) write the shared ~/.claude/commander instead of the lane dir');
  return parts.length ? parts.join('; ') : h.registered + ' handlers registered';
}

function check(id, status, message, blocking) {
  return { id: id, status: status, blocking: !!blocking && status === 'fail', message: message };
}

/**
 * Build the check-in object. opts: {root, env, cwd, cli: false to skip the
 * CLI probe, cliVersion: injected value for tests}.
 */
function buildCheckin(opts) {
  opts = opts || {};
  var env = opts.env || process.env;
  var root = opts.root || path.resolve(__dirname, '..', '..');
  var ln = lane.resolveLane(env);
  var rel = release.resolveRelease({ root: root, env: env, cwd: opts.cwd });
  var cliVersion = opts.cli === false ? null
    : (opts.cliVersion !== undefined ? opts.cliVersion : claudeCliVersion(env));

  var checks = [];
  var next = [];
  var drift = rel.drift.slice();

  // Checks are keyed by the resolved record (commander@<marketplace>).
  var pluginId = (rel.plugin && rel.plugin.id) || PLUGIN_ID;
  if (!rel.plugin) {
    checks.push(check('plugin_installed', 'fail', 'no ' + PLUGIN_ID + ' record in ' + path.join(ln.configDir, 'plugins', 'installed_plugins.json'), true));
    next.push('claude plugin install ' + PLUGIN_ID);
  } else if (!rel.plugin.installed) {
    checks.push(check('plugin_installed', 'fail', 'plugin record ' + rel.plugin.version + ' points at a missing cache dir', true));
    next.push('claude plugin install ' + PLUGIN_ID);
  } else if (!rel.plugin.usable) {
    checks.push(check('plugin_installed', 'fail', 'plugin cache ' + rel.plugin.installPath + ' has no readable .claude-plugin/plugin.json or skills/ccc/SKILL.md', true));
    next.push('claude plugin install ' + PLUGIN_ID);
  } else {
    checks.push(check('plugin_installed', 'ok', pluginId + ' ' + rel.plugin.version));
  }

  var en = effectiveEnablement(ln.configDir, opts.cwd || process.cwd(), pluginId);
  if (en.unreadable.length) {
    checks.push(check('plugin_enabled', 'fail', 'unreadable settings: ' + en.unreadable.join(', '), true));
    next.push('fix the JSON in ' + en.unreadable[0]);
  } else if (en.value !== true) {
    checks.push(check('plugin_enabled', 'fail', pluginId + (en.value === false ? ' is disabled in ' + en.source : ' is not enabled in any settings file'), true));
    next.push('claude plugin enable ' + pluginId);
  } else {
    checks.push(check('plugin_enabled', 'ok', 'enabled in ' + en.source));
  }

  var behind = rel.drift.filter(function(d) { return d.kind === 'checkout_behind_plugin'; })[0];
  if (behind) {
    checks.push(check('ccc_checkout', 'warn', behind.message));
    next.push(behind.fix);
  } else {
    checks.push(check('ccc_checkout', 'ok', 'ccc ' + (rel.checkout.version || '?')));
  }

  if (opts.cli === false) {
    checks.push(check('claude_cli', 'skip', 'not probed (--no-cli)'));
  } else if (!cliVersion) {
    checks.push(check('claude_cli', 'warn', 'claude --version unavailable'));
  } else if (release.compareVersions(cliVersion, CLI_FLOOR) < 0) {
    checks.push(check('claude_cli', 'warn', 'claude ' + cliVersion + ' is below ' + CLI_FLOOR + ' (no MCP Tasks)'));
    drift.push({ kind: 'cli_below_floor', cli: cliVersion, floor: CLI_FLOOR, message: 'claude ' + cliVersion + ' < ' + CLI_FLOOR, fix: 'claude update' });
    next.push('claude update');
  } else {
    checks.push(check('claude_cli', 'ok', 'claude ' + cliVersion));
  }

  var hooks = rel.plugin && rel.plugin.usable ? hooksHealth(rel.plugin) : null;
  if (!hooks) {
    checks.push(check('hooks', 'skip', 'no usable plugin to inspect'));
  } else {
    checks.push(check('hooks', hooks.status, hooksMessage(hooks), true));
    if (hooks.status === 'fail') next.push('claude plugin install ' + pluginId);
  }

  checks.push(ln.known
    ? check('lane', 'ok', 'lane ' + ln.lane + ' (' + ln.source + ')')
    : check('lane', 'warn', 'config dir ' + ln.configDir + ' is not .claude or .claude-<lane>; lane "custom"'));

  var blocking = checks.some(function(c) { return c.blocking; });
  return {
    schema: SCHEMA,
    generated_at: (opts.now ? new Date(opts.now) : new Date()).toISOString(),
    ccc_version: rel.checkout.version,
    ccc_sha: rel.checkout.sha,
    plugin_version: rel.plugin ? rel.plugin.version : null,
    plugin_sha: rel.plugin ? rel.plugin.sha : null,
    cli_version: cliVersion,
    drift: drift,
    lane: {
      name: ln.lane,
      account: ln.account,
      config_dir: ln.configDir,
      state_dir: ln.stateDir,
      source: ln.source,
      known: ln.known,
    },
    hooks: hooks,
    health: { ok: !blocking, checks: checks },
    next: next,
  };
}

/** Exit code for a check-in: 0 ok, 3 plugin missing, 1 other blocking failure. */
function exitCode(result) {
  if (result.health.ok) return 0;
  var plugin = result.health.checks.filter(function(c) { return c.id === 'plugin_installed'; })[0];
  return plugin && plugin.blocking ? 3 : 1;
}

/** One human line, e.g. "CCC check-in OK: ccc 8.1.2, plugin 8.1.2, claude 2.1.309, lane ai4, 0 warnings". */
function summaryLine(result) {
  var warns = result.health.checks.filter(function(c) { return c.status === 'warn'; });
  var fails = result.health.checks.filter(function(c) { return c.status === 'fail'; });
  var head = 'CCC check-in ' + (result.health.ok ? 'OK' : 'BLOCKED') + ': ';
  var parts = [
    'ccc ' + (result.ccc_version || '?'),
    'plugin ' + (result.plugin_version || 'missing'),
    'claude ' + (result.cli_version || '?'),
    'lane ' + result.lane.name,
  ];
  var tail = fails.length
    ? fails.map(function(c) { return c.message; }).join('; ')
    : warns.length + ' warning' + (warns.length === 1 ? '' : 's') + (warns.length ? ' (' + warns.map(function(c) { return c.id; }).join(', ') + ')' : '');
  return head + parts.join(', ') + ', ' + tail;
}

module.exports = {
  SCHEMA: SCHEMA,
  CLI_FLOOR: CLI_FLOOR,
  buildCheckin: buildCheckin,
  exitCode: exitCode,
  summaryLine: summaryLine,
  claudeCliVersion: claudeCliVersion,
  effectiveEnablement: effectiveEnablement,
};
