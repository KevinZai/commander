"use strict";

var fs = require("fs");
var path = require("path");
var os = require("os");
var childProcess = require("child_process");
var queue = require("./queue");
var dream = require("./dream");
var dispatcher = require("./dispatcher");
var knowledge = require("./knowledge");

var LOG_FILE = path.join(os.homedir(), ".claude", "commander", "daemon-log.txt");
var PID_FILE = path.join(os.homedir(), ".claude", "commander", "daemon.pid");

// At most one claimed job is in flight per daemon process.
var inFlight = null;
// A finished job whose terminal status could not be written to the queue. No new job is claimed until it is
// recorded, and the job itself is never rerun (audit #12).
var unrecorded = null;

function log(msg) {
  var line = new Date().toISOString() + " " + msg + "\n";
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line);
    // Rotate at 1MB
    try { if (fs.statSync(LOG_FILE).size > 1024 * 1024) { fs.renameSync(LOG_FILE, LOG_FILE + ".old"); } } catch (_) {}
  } catch (_) {}
  if (!process.env.CCC_DAEMON_QUIET) process.stdout.write("  [daemon] " + msg + "\n");
}

/** Write a terminal status, retrying briefly. Returns true once the queue file holds it. */
function recordTerminal(id, status, extra) {
  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      queue.updateStatus(id, status, extra);
      return true;
    } catch (e) {
      log("Queue: could not record " + id + " as " + status + " (attempt " + attempt + ") — " + e.message);
    }
  }
  return false;
}

/** Retry a terminal status that an earlier tick could not write. True when nothing is left pending. */
function reconcileUnrecorded() {
  if (!unrecorded) return true;
  if (!recordTerminal(unrecorded.id, unrecorded.status, unrecorded.extra)) return false;
  log("Queue: " + unrecorded.id + " recorded as " + unrecorded.status + " (reconciled)");
  unrecorded = null;
  return true;
}

/**
 * Claim `job`, run it, and record its outcome exactly once.
 * Resolves (never rejects) with the terminal status: "done" or "failed", or "unrecorded" when the job finished
 * but its status could not be persisted. An unrecorded job is reconciled by a later tick, never rerun.
 */
function runJob(job) {
  var settled = false;
  function settle(status, extra) {
    if (settled) return status;
    settled = true;
    if (recordTerminal(job.id, status, extra)) return status;
    unrecorded = { id: job.id, status: status, extra: extra };
    return "unrecorded";
  }

  return Promise.resolve()
    .then(function () {
      return dispatcher.dispatchAsync(job.task, {
        model: "opus",
        maxTurns: 30,
        maxBudgetUsd: 5,
        bare: true,
        stream: false,
      });
    })
    .then(function (result) {
      var res = result || {};
      var cost = Number(res.cost_usd) || 0;
      var text = typeof res.result === "string" ? res.result : "";
      var recorded = settle("done", { result: text.slice(0, 500), cost: cost });
      try { knowledge.extractAndStore({ id: job.id, task: job.task, cost: cost }, text); } catch (_) {}
      if (recorded !== "done") {
        log("Queue: " + job.id + " finished but its status is not recorded yet; it will not be rerun");
        return recorded;
      }
      log("Queue: " + job.id + " completed ($" + cost.toFixed(2) + ")");
      return "done";
    })
    .catch(function (err) {
      var message = (err && err.message) || String(err);
      var recorded = settle("failed", { error: message });
      log("Queue: " + job.id + " failed — " + message + (recorded === "failed" ? "" : " (status not recorded yet)"));
      return recorded;
    });
}

/**
 * One daemon tick. Housekeeping runs first; a queued job is claimed only if
 * the tick is still within budget and no other job is in flight, and the
 * claimed job always reaches "done" or "failed".
 *
 * Returns a Promise of { actions, job, status } where status is the claimed
 * job's terminal status (or null when nothing was claimed).
 */
function tick(config) {
  config = config || {};
  var budget = typeof config.budget === "number" ? config.budget : 15000;
  var start = Date.now();
  var actions = [];

  // 1. Check git status
  try {
    var gitStatus = childProcess.execSync("git status --porcelain 2>/dev/null", { encoding: "utf8", timeout: 5000 }).trim();
    if (gitStatus) {
      var lines = gitStatus.split("\n").length;
      if (lines > 10) {
        log("Git: " + lines + " uncommitted changes — consider committing");
        actions.push({ type: "git-warning", files: lines });
      }
    }
  } catch (_) {}

  // 2. Budget and capacity are checked before a job is claimed, so a skipped
  //    tick leaves the job pending for the next one.
  var elapsed = Date.now() - start;
  if (elapsed > budget) {
    log("Tick exceeded budget (" + elapsed + "ms > " + budget + "ms) — skipping dispatch");
    return Promise.resolve({ actions: actions, job: null, status: null, skipped: "budget" });
  }
  if (inFlight) {
    log("Queue: " + inFlight.id + " still running — not claiming another job");
    return Promise.resolve({ actions: actions, job: null, status: null, skipped: "busy" });
  }
  if (!reconcileUnrecorded()) {
    return Promise.resolve({ actions: actions, job: null, status: null, skipped: "unrecorded" });
  }

  // 3. Claim and run the next queued task
  var next = queue.getNext();
  if (!next) {
    if (actions.length === 0) log("Tick: nothing to do");
    return Promise.resolve({ actions: actions, job: null, status: null });
  }

  log("Queue: processing " + next.id + " — " + String(next.task).slice(0, 60));
  queue.updateStatus(next.id, "running");
  actions.push({ type: "queue", task: next });
  inFlight = next;
  return runJob(next).then(function (status) {
    inFlight = null;
    return { actions: actions, job: next, status: status };
  });
}

function runDream() {
  log("Dream: starting consolidation...");
  var result = dream.consolidate();
  log("Dream: " + result.stats.total + " lessons, " + result.stats.successRate + "% success, $" + result.stats.totalCost + " total cost, " + result.archived + " archived");
  if (result.suggestions.length > 0) {
    result.suggestions.forEach(function (s) {
      log("Dream suggestion: " + s.suggestion);
    });
  }
  return result;
}

// ─── Process identity ──────────────────────────────────────────
// The PID file records the daemon's pid with its start time and command line.
// stop() and isRunning() only trust a pid whose live identity matches, so a
// recycled pid that now belongs to another process is never signalled.

/**
 * { startTime, command } for a live pid, or null when it cannot be read.
 * Linux reads /proc (start time in clock ticks since boot); elsewhere `ps`.
 */
function processIdentity(pid) {
  pid = Number(pid);
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    var stat = fs.readFileSync("/proc/" + pid + "/stat", "utf8");
    // Field 2 (comm) is parenthesised and may contain spaces: split after it.
    var rest = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    var startTime = rest[19]; // field 22 overall
    var command = fs.readFileSync("/proc/" + pid + "/cmdline", "utf8").split("\0").filter(Boolean).join(" ");
    if (startTime && command) return { startTime: "proc:" + startTime, command: command };
  } catch (_) {}
  try {
    var lstart = childProcess.execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] }).trim();
    var cmd = childProcess.execFileSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (lstart && cmd) return { startTime: "ps:" + lstart, command: cmd };
  } catch (_) {}
  return null;
}

function writePidFile(pidFile) {
  pidFile = pidFile || PID_FILE;
  var identity = processIdentity(process.pid) || {};
  var record = { pid: process.pid, startTime: identity.startTime || null, command: identity.command || null };
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  fs.writeFileSync(pidFile, JSON.stringify(record));
  return record;
}

function readPidFile(pidFile) {
  try {
    var raw = fs.readFileSync(pidFile || PID_FILE, "utf8").trim();
    if (/^\d+$/.test(raw)) return { pid: parseInt(raw, 10), startTime: null, command: null, legacy: true };
    var rec = JSON.parse(raw);
    if (!rec || !Number.isInteger(rec.pid)) return null;
    return { pid: rec.pid, startTime: rec.startTime || null, command: rec.command || null, legacy: false };
  } catch (_) {
    return null;
  }
}

/**
 * Verify the recorded daemon. Returns { ok, pid, reason }.
 * ok is true only when the pid is alive and its current start time and
 * command line both equal the recorded ones.
 */
function verifyDaemon(options) {
  var opts = options || {};
  var rec = readPidFile(opts.pidFile);
  if (!rec) return { ok: false, pid: null, reason: "no-pid-file" };
  if (rec.legacy || !rec.startTime || !rec.command) return { ok: false, pid: rec.pid, reason: "unverifiable-pid-file" };
  var identityOf = opts.identity || processIdentity;
  var live = identityOf(rec.pid);
  if (!live) return { ok: false, pid: rec.pid, reason: "not-running" };
  if (live.startTime !== rec.startTime || live.command !== rec.command) {
    return { ok: false, pid: rec.pid, reason: "identity-mismatch" };
  }
  return { ok: true, pid: rec.pid, reason: "verified" };
}

function start(config) {
  writePidFile();

  log("=== CCC Daemon started (PID " + process.pid + ") ===");
  log("Tick interval: " + (config.interval / 1000) + "s | Budget: " + (config.budget / 1000) + "s | Dream: " + (config.dreamInterval / 60000) + "min");

  function safeTick() {
    try {
      tick(config).catch(function (e) { log("Tick error: " + e.message); });
    } catch (e) {
      log("Tick error: " + e.message);
    }
  }

  // Tick loop
  var tickTimer = setInterval(safeTick, config.interval);

  // Dream loop
  var dreamTimer = setInterval(function () { try { runDream(); } catch (e) { log("Dream error: " + e.message); } }, config.dreamInterval);

  // Graceful shutdown
  function shutdown() {
    log("=== CCC Daemon shutting down ===");
    clearInterval(tickTimer);
    clearInterval(dreamTimer);
    try {
      var rec = readPidFile();
      if (rec && rec.pid === process.pid) fs.unlinkSync(PID_FILE);
    } catch (_) {}
    process.exit(0);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Initial tick
  safeTick();

  // Keep process alive
  process.stdin.resume();
}

/**
 * Why a new daemon must not start, or null when it may. A verified daemon blocks; so does a live process
 * recorded by a legacy (bare pid) or otherwise unverifiable PID file, since it may be an older daemon still
 * consuming the queue (audit #36). Returns { pid, reason }.
 */
function startBlocker(options) {
  var opts = options || {};
  var v = verifyDaemon(opts);
  if (v.ok) return { pid: v.pid, reason: "running" };
  if (v.reason === "unverifiable-pid-file") {
    var alive = opts.isAlive || function (pid) {
      try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; }
    };
    if (v.pid !== process.pid && alive(v.pid)) return { pid: v.pid, reason: "unverifiable-live" };
  }
  return null;
}

/** The verified daemon pid, or false. */
function isRunning(options) {
  var v = verifyDaemon(options);
  return v.ok ? v.pid : false;
}

/**
 * SIGTERM the recorded daemon only after verifying its identity. A stale or
 * mismatched PID file is left alone (and reported on stderr) rather than
 * signalling whatever process now holds that pid.
 */
function stop(options) {
  var opts = options || {};
  var v = verifyDaemon(opts);
  if (!v.ok) {
    if (v.reason === "identity-mismatch" || v.reason === "unverifiable-pid-file") {
      process.stderr.write("  [daemon] Not signalling PID " + v.pid + ": " + v.reason + ". Remove " + (opts.pidFile || PID_FILE) + " if the daemon is gone.\n");
    }
    return false;
  }
  var kill = opts.kill || process.kill.bind(process);
  try { kill(v.pid, "SIGTERM"); return true; } catch (_) { return false; }
}

function _resetForTests() { inFlight = null; unrecorded = null; }

module.exports = {
  start: start,
  isRunning: isRunning,
  startBlocker: startBlocker,
  stop: stop,
  tick: tick,
  runJob: runJob,
  runDream: runDream,
  log: log,
  processIdentity: processIdentity,
  writePidFile: writePidFile,
  readPidFile: readPidFile,
  verifyDaemon: verifyDaemon,
  PID_FILE: PID_FILE,
  _resetForTests: _resetForTests,
};
