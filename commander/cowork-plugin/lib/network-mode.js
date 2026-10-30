'use strict';
/**
 * Network mode: the one place that decides whether Commander may reach the
 * network. Every outbound call in hooks/ and lib/ asks this module first.
 *
 * Accepted env values (case-insensitive, same for all three variables):
 *   on:  "1", "true", "yes", "on"
 *   off: "0", "false", "no", "off"
 * Anything else (unset, empty, "maybe") is unset: the config file, then the
 * default, decides. CCC_TELEMETRY off beats the config file. CCC_OFFLINE off
 * does not override "offline": true in the config (the safe side wins).
 *
 *   CCC_OFFLINE=1 (or "offline": true in ~/.commander/config.json)
 *     short-circuits every outbound call: telemetry, the SessionStart update
 *     check and the CI ticker's `gh run list`.
 *   CCC_TELEMETRY=1 (or "telemetry": true in the config) opts in to anonymous
 *     usage events. Off by default; CCC_TELEMETRY=0 is an explicit off that
 *     beats the config file.
 *   CCC_CI_TICKER=1 opts in to the CI status lookup via the user's own `gh`.
 *
 * An unreadable or malformed config file counts as "not opted in".
 * CommonJS (like lane-state.js) so both the ESM hooks and the CJS CLI
 * (`ccc doctor`) can load it.
 */

var fs = require('fs');
var os = require('os');
var path = require('path');

function homeOf(env) {
  return env.HOME || env.USERPROFILE || os.homedir();
}

/** Path of ~/.commander/config.json for the given env (or options.homeDir). */
function configFile(env, options) {
  var e = env || process.env;
  var home = options && options.homeDir ? options.homeDir : homeOf(e);
  return path.join(home, '.commander', 'config.json');
}

/** Parsed config object, or {} when missing, unreadable or not an object. */
function readConfig(env, options) {
  try {
    var parsed = JSON.parse(fs.readFileSync(configFile(env, options), 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_e) {
    return {};
  }
}

/** true / false for a recognised on / off spelling, undefined otherwise. */
function envFlag(value) {
  if (typeof value !== 'string') return undefined;
  var v = value.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return undefined;
}

function isOffline(env, options) {
  var e = env || process.env;
  if (envFlag(e.CCC_OFFLINE) === true) return true;
  return readConfig(e, options).offline === true;
}

function isTelemetryEnabled(env, options) {
  var e = env || process.env;
  if (isOffline(e, options)) return false;
  var flag = envFlag(e.CCC_TELEMETRY);
  if (flag !== undefined) return flag;
  return readConfig(e, options).telemetry === true;
}

function isCiTickerEnabled(env, options) {
  var e = env || process.env;
  if (isOffline(e, options)) return false;
  return envFlag(e.CCC_CI_TICKER) === true;
}

/** { telemetry, offline, ciTicker } booleans for `ccc doctor`. */
function networkMode(env, options) {
  var e = env || process.env;
  return {
    telemetry: isTelemetryEnabled(e, options),
    offline: isOffline(e, options),
    ciTicker: isCiTickerEnabled(e, options),
  };
}

exports.configFile = configFile;
exports.envFlag = envFlag;
exports.readConfig = readConfig;
exports.isOffline = isOffline;
exports.isTelemetryEnabled = isTelemetryEnabled;
exports.isCiTickerEnabled = isCiTickerEnabled;
exports.networkMode = networkMode;
