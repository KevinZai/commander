'use strict';
/**
 * `ccc hold set|clear|show --json`: the one writer of fleet-hold.json, the
 * lane's pause control that `ccc next` reads (lib/next.js readHold).
 *
 * Schema (docs/FLEET-CHECKIN.md): {hold: boolean, until?: ISO, reason?: string,
 * set_at: ISO}. `hold:true` holds every new job; `until` alone defers new jobs
 * to that time; `hold:false` with no `until` is clear.
 *
 * Writes go to the lane's own state dir (CCC_CONFIG_DIR > CLAUDE_CONFIG_DIR >
 * ~/.claude), atomically: a temp file in the same dir, fsync, then rename. A
 * record is checked against readHold before it is written, so this command can
 * never leave a file that `ccc next` would read as malformed. `clear` writes
 * {hold:false} instead of removing the file, so a lane file also overrides a
 * legacy ~/.claude/commander hold. Exit 2 bad input, 1 write failed.
 */

var fs = require('fs');
var path = require('path');

var lane = require('./lane');
var nextLib = require('./next');

var SCHEMA = 1;
var FILE = 'fleet-hold.json';
var MAX_REASON = 160; // readHold truncates to this; refuse rather than lose text

function fail(code, message) {
  var err = new Error(message);
  err.exitCode = code;
  return err;
}

/**
 * Strict ISO 8601 date-time with an explicit zone (Z or +hh:mm). Each field is
 * range-checked first: Date.parse rolls 2027-02-30 over to March 2.
 */
function parseUntil(value, now) {
  var m = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!m) throw fail(2, '--until must be an ISO time with a zone, e.g. 2026-10-31T14:00:00Z');
  var n = m.map(function(x) { return x === undefined ? 0 : Number(x); });
  var monthDays = new Date(Date.UTC(n[1], n[2], 0)).getUTCDate(); // day 0 of the next month = last day of this one
  if (n[2] < 1 || n[2] > 12 || n[3] < 1 || n[3] > monthDays || n[4] > 23 || n[5] > 59 || n[6] > 59 || n[7] > 23 || n[8] > 59) {
    throw fail(2, '--until is not a valid time: ' + value);
  }
  var t = Date.parse(value);
  if (isNaN(t)) throw fail(2, '--until is not a valid time: ' + value);
  if (t <= now) throw fail(2, '--until is in the past: ' + value);
  return new Date(t).toISOString();
}

function checkReason(reason) {
  if (reason === undefined) return undefined;
  if (typeof reason !== 'string') throw fail(2, '--reason must be text');
  if (reason.length > MAX_REASON) throw fail(2, '--reason is longer than ' + MAX_REASON + ' characters');
  return reason;
}

function writeAtomic(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  var tmp = path.join(path.dirname(file), '.' + FILE + '.' + process.pid + '.' + Date.now() + '.tmp');
  var fd = fs.openSync(tmp, 'wx', 0o600);
  try {
    fs.writeSync(fd, JSON.stringify(record, null, 2) + '\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.renameSync(tmp, file);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (_e) { /* our own temp file */ }
    throw e;
  }
}

/** Current state for this lane, read the way `ccc next` reads it. */
function show(opts) {
  opts = opts || {};
  var env = opts.env || process.env;
  var now = opts.now !== undefined ? opts.now : Date.now();
  var l = lane.resolveLane(env);
  var file = lane.readable(FILE, env);
  var own = lane.statePath(FILE, env);
  var record = null;
  var exists = true;
  try { record = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') exists = false; }
  var r = nextLib.readHold(env, now);
  var state = !r ? 'clear' : r.action;
  if (r && r.invalid) state = 'invalid';
  return {
    schema: SCHEMA,
    lane: l.lane,
    file: file,
    source: !exists ? 'none' : file === own ? 'lane' : 'legacy',
    state: state,
    action: r ? r.action : 'proceed',
    when: r ? r.when : 'now',
    reason: r ? r.reason : null,
    record: record,
  };
}

/**
 * Write a hold. opts: {until?, reason?, env, now}. With `until` it defers new
 * jobs to that time; without it, it holds them until `clear`.
 */
function set(opts) {
  opts = opts || {};
  var env = opts.env || process.env;
  var now = opts.now !== undefined ? opts.now : Date.now();
  var record = { hold: opts.until === undefined };
  if (opts.until !== undefined) record.until = parseUntil(opts.until, now);
  var reason = checkReason(opts.reason);
  if (reason) record.reason = reason;
  record.set_at = new Date(now).toISOString();
  var r = nextLib.interpretHold(record, now);
  var want = record.hold ? 'hold' : 'defer';
  if (!r || r.action !== want || r.invalid) throw fail(2, 'refusing to write a hold that ccc next would not read as ' + want);
  writeAtomic(lane.statePath(FILE, env), record);
  return show({ env: env, now: now });
}

/** Clear the lane's hold: writes {hold:false} (never deletes the file). */
function clear(opts) {
  opts = opts || {};
  var env = opts.env || process.env;
  var now = opts.now !== undefined ? opts.now : Date.now();
  var record = { hold: false, set_at: new Date(now).toISOString() };
  writeAtomic(lane.statePath(FILE, env), record);
  return show({ env: env, now: now });
}

/** One-line text form for people. */
function render(r) {
  var head = 'ccc hold [' + r.lane + ']: ' + r.state;
  if (r.state === 'defer') head += ' until ' + r.when;
  if (r.reason) head += ' (' + r.reason + ')';
  return head + '\n  ' + (r.source === 'none' ? 'no ' + FILE + ' (' + r.file + ')' : r.source + ' file ' + r.file);
}

/**
 * Parse `hold <sub> [--until ISO] [--reason TEXT] [--json]` (args after `ccc`).
 * Throws exit-2 errors for anything it does not recognise, before any write.
 */
function parseArgs(args) {
  var sub = args[1];
  if (['set', 'clear', 'show'].indexOf(sub) < 0) throw fail(2, 'usage: ccc hold set [--until ISO] [--reason TEXT] | clear | show  [--json]');
  var out = { sub: sub, json: false };
  for (var i = 2; i < args.length; i++) {
    var a = args[i];
    if (a === '--json') { out.json = true; continue; }
    if (sub === 'set' && (a === '--until' || a === '--reason')) {
      if (i + 1 >= args.length || args[i + 1].indexOf('--') === 0) throw fail(2, a + ' needs a value');
      out[a.slice(2)] = args[++i];
      continue;
    }
    throw fail(2, 'unknown argument for ccc hold ' + sub + ': ' + a);
  }
  return out;
}

module.exports = {
  SCHEMA: SCHEMA,
  FILE: FILE,
  MAX_REASON: MAX_REASON,
  show: show,
  set: set,
  clear: clear,
  render: render,
  parseArgs: parseArgs,
};
