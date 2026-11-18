'use strict';
/**
 * Plugin options: the values a user sets through the plugin's `userConfig`
 * (`.claude-plugin/plugin.json`, `/config`, `claude plugin configure commander`).
 *
 * Claude Code exports each saved option to hook processes as
 * CLAUDE_PLUGIN_OPTION_<KEY> (key uppercased); sensitive options come from the
 * platform's credential store, never from settings.json.
 * Source: code.claude.com/docs/en/plugins-reference#user-configuration (2026-11-18).
 *
 * Backwards compatibility: every option has the environment variable it
 * replaces. When that variable is set, it wins, exactly as before; the option
 * applies when the variable is unset. Codex, the CLI and older Claude Code
 * builds export no options, so they keep reading the variables alone.
 *
 * CommonJS (like lane-state.js and network-mode.js) so ESM hooks and the CJS
 * CLI can both load it.
 */

/** userConfig key -> the environment variables that set the same thing, first wins. */
var LEGACY_ENV = Object.freeze({
  telemetry: Object.freeze(['CCC_TELEMETRY']),
  offline: Object.freeze(['CCC_OFFLINE']),
  cost_ceiling: Object.freeze(['CCC_COST_CEILING']),
  mcp_url: Object.freeze(['CCC_MCP_URL']),
  mcp_token: Object.freeze(['CCC_MCP_TOKEN', 'COMMANDER_TOKEN']),
});

function present(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/** Name of the variable Claude Code exports for a userConfig key. */
function optionEnvName(key) {
  return 'CLAUDE_PLUGIN_OPTION_' + String(key).toUpperCase();
}

/** The saved userConfig value for `key` as a string, or undefined when unset or empty. */
function pluginOption(key, env) {
  var e = env || process.env;
  var value = e[optionEnvName(key)];
  return present(value) ? value : undefined;
}

/**
 * The effective value for `key`: its legacy environment variable when set,
 * else the userConfig option, else undefined. Returns a string.
 */
function setting(key, env) {
  var e = env || process.env;
  var names = LEGACY_ENV[key] || [];
  for (var i = 0; i < names.length; i++) {
    if (present(e[names[i]])) return e[names[i]];
  }
  return pluginOption(key, e);
}

/** Where the effective value came from: 'env:<NAME>', 'userConfig' or undefined. */
function settingSource(key, env) {
  var e = env || process.env;
  var names = LEGACY_ENV[key] || [];
  for (var i = 0; i < names.length; i++) {
    if (present(e[names[i]])) return 'env:' + names[i];
  }
  return pluginOption(key, e) === undefined ? undefined : 'userConfig';
}

exports.LEGACY_ENV = LEGACY_ENV;
exports.optionEnvName = optionEnvName;
exports.pluginOption = pluginOption;
exports.setting = setting;
exports.settingSource = settingSource;
