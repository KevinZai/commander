"use strict";

var fs = require("fs");
var path = require("path");
var os = require("os");
var childProcess = require("child_process");
var queue = require("./queue");
var dream = require("./dream");

var LOG_FILE = path.join(os.homedir(), ".claude", "commander", "daemon-log.txt");
var PID_FILE = path.join(os.homedir(), ".claude", "commander", "daemon.pid");

function log(msg) {
  var line = new Date().toISOString() + " " + msg + "\n";
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line);
    // Rotate at 1MB
    try { if (fs.statSync(LOG_FILE).size > 1024 * 1024) { fs.renameSync(LOG_FILE, LOG_FILE + ".old"); } } catch (_) {}
  } catch (_) {}
  process.stdout.write("  [daemon] " + msg + "\n");
}

function tick(config) {
  var start = Date.now();
  var actions = [];

  // Keep queued work pending: interactive Remote Control cannot enforce this
  // daemon's existing $5 / 30-turn policy. Changing that policy is a user decision.
  var next = queue.getNext();
  if (next) {
    log("Queue held: interactive Remote Control cannot enforce the daemon's $5 / 30-turn caps. Queued tasks remain pending; decide a compatible policy before automatic dispatch.");
    actions.push({ type: "queue-held", task: next });
  }

  // 2. Check git status
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

  // 3. Check daemon budget (15s default)
  var elapsed = Date.now() - start;
  if (elapsed > config.budget) {
    log("Tick exceeded budget (" + elapsed + "ms > " + config.budget + "ms) — skipping dispatch");
    return;
  }


  if (actions.length === 0) {
    log("Tick: nothing to do");
  }
}

function runDream() {
  log("Dream: starting consolidation...");
  var result = dream.consolidate();
  log("Dream: " + result.stats.total + " lessons, " + result.stats.successRate + "% success, $" + result.stats.totalCost + " measured cost (" + result.stats.unknownCostSessions + " sessions unknown), " + result.archived + " archived");
  if (result.suggestions.length > 0) {
    result.suggestions.forEach(function (s) {
      log("Dream suggestion: " + s.suggestion);
    });
  }
  return result;
}

function start(config) {
  // Write PID file
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid));

  log("=== CCC Daemon started (PID " + process.pid + ") ===");
  log("Tick interval: " + (config.interval / 1000) + "s | Budget: " + (config.budget / 1000) + "s | Dream: " + (config.dreamInterval / 60000) + "min");

  // Tick loop
  var tickTimer = setInterval(function () { try { tick(config); } catch (e) { log("Tick error: " + e.message); } }, config.interval);

  // Dream loop
  var dreamTimer = setInterval(function () { try { runDream(); } catch (e) { log("Dream error: " + e.message); } }, config.dreamInterval);

  // Graceful shutdown
  function shutdown() {
    log("=== CCC Daemon shutting down ===");
    clearInterval(tickTimer);
    clearInterval(dreamTimer);
    try { fs.unlinkSync(PID_FILE); } catch (_) {}
    process.exit(0);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Initial tick
  tick(config);

  // Keep process alive
  process.stdin.resume();
}

function isRunning() {
  try {
    var pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim());
    process.kill(pid, 0); // Test if process exists
    return pid;
  } catch (_) {
    return false;
  }
}

function stop() {
  var pid = isRunning();
  if (!pid) return false;
  try { process.kill(pid, "SIGTERM"); return true; } catch (_) { return false; }
}

module.exports = { start: start, isRunning: isRunning, stop: stop, tick: tick, runDream: runDream, log: log };
