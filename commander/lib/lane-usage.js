'use strict';
/**
 * Per-lane usage reader (CC-2122). Fleet (FLT-257) writes the usage file
 * atomically every 5 minutes and right after a lane hits a limit; Commander
 * only reads it. lib/statusline-superfleet.sh applies the same rules in jq.
 *
 * File: $CCC_LANE_USAGE_FILE, else ~/.commander/lane-usage.json.
 * Shape: {<lane>: {fetchedAt, windows: [{id, kind, percent, resets_at}]}}.
 * The live lane-usage-cli.json spells resets_at as resetsAt; both are read.
 *
 * Never throws: a bad file is reported as {usage: null, reason}.
 */

var fs = require('fs');
var os = require('os');
var path = require('path');

var STALE_SECS = 30 * 60;

function usageFile(env) {
  env = env || process.env;
  if (env.CCC_LANE_USAGE_FILE) return path.resolve(env.CCC_LANE_USAGE_FILE);
  return path.join(env.HOME || os.homedir(), '.commander', 'lane-usage.json');
}

function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function num(v) {
  return typeof v === 'number' && isFinite(v) ? v : null;
}

function str(v) {
  return typeof v === 'string' && v ? v : null;
}

/** "weekly", "weekly:fable", kind "weekly_scoped": any 7-day window. */
function isWeekly(w) {
  return /^weekly/.test(w.id || '') || /^weekly/.test(w.kind || '');
}

function isSession(w) {
  return w.id === 'session' || w.kind === 'session';
}

/**
 * Usage for one lane: {usage, reason, file}.
 *   usage:  {lane, fetched_at, age_seconds, stale, five_hour, seven_day, windows[]} or null
 *   reason: null | 'missing' | 'unreadable' | 'malformed' | 'lane_absent'
 * five_hour is the session window's percent; seven_day is the highest weekly
 * percent (the binding weekly gate). A missing or unparseable fetchedAt counts
 * as stale. opts: {env, now (ms or Date)}.
 */
function readLaneUsage(laneName, opts) {
  opts = opts || {};
  var file = usageFile(opts.env);
  var text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    return { usage: null, reason: e && e.code === 'ENOENT' ? 'missing' : 'unreadable', file: file };
  }
  var data;
  try { data = JSON.parse(text); } catch (_e) { return { usage: null, reason: 'malformed', file: file }; }
  if (!isObject(data)) return { usage: null, reason: 'malformed', file: file };
  if (!Object.prototype.hasOwnProperty.call(data, laneName)) return { usage: null, reason: 'lane_absent', file: file };
  var entry = data[laneName];
  if (!isObject(entry) || !Array.isArray(entry.windows)) return { usage: null, reason: 'malformed', file: file };

  var windows = entry.windows.filter(isObject).map(function(w) {
    return {
      id: str(w.id),
      kind: str(w.kind),
      percent: num(w.percent),
      resets_at: str(w.resets_at) || str(w.resetsAt),
    };
  });
  var fetched = str(entry.fetchedAt);
  var t = fetched ? Date.parse(fetched) : NaN;
  var now = opts.now !== undefined ? new Date(opts.now).getTime() : Date.now();
  var age = isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 1000));
  var session = windows.filter(function(w) { return isSession(w) && w.percent !== null; })[0];
  var weekly = windows.filter(function(w) { return isWeekly(w) && w.percent !== null; })
    .map(function(w) { return w.percent; });
  return {
    usage: {
      lane: laneName,
      fetched_at: fetched,
      age_seconds: age,
      stale: age === null || age > STALE_SECS,
      five_hour: session ? session.percent : null,
      seven_day: weekly.length ? Math.max.apply(null, weekly) : null,
      windows: windows,
    },
    reason: null,
    file: file,
  };
}

function pct(v) {
  return v === null ? '?' : Math.floor(v) + '%';
}

function age(secs) {
  if (secs === null) return 'unknown age';
  if (secs < 60) return secs + 's ago';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  return Math.floor(secs / 3600) + 'h ago';
}

/**
 * One human line, e.g. "usage ai4: 5h 16%, 7d 21% (fetched 3m ago)",
 * "usage ai4: 5h 16%, 7d 21% (STALE, fetched 2h ago)" or
 * "usage ai4: none (missing /home/me/.commander/lane-usage.json)".
 */
function usageLine(laneName, usage, reason, file) {
  if (!usage) return 'usage ' + laneName + ': none (' + (reason || 'missing') + (file ? ' ' + file : '') + ')';
  return 'usage ' + laneName + ': 5h ' + pct(usage.five_hour) + ', 7d ' + pct(usage.seven_day) +
    ' (' + (usage.stale ? 'STALE, ' : '') + 'fetched ' + age(usage.age_seconds) + ')';
}

module.exports = {
  STALE_SECS: STALE_SECS,
  usageFile: usageFile,
  readLaneUsage: readLaneUsage,
  usageLine: usageLine,
};
