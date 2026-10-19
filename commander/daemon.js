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

var POLICY_FILE = path.join(os.homedir(), ".claude", "commander", "daemon-policy.json");
var DEFAULT_POLICY = {
  autoDispatch: false,          // opt-in: queued work stays pending until a policy file enables it
  maxEstimateUsd: 5,            // estimate admission ceiling (an estimate, not a runtime cap)
  maxTurns: 30,                 // watchdog: the supervisor ends the session past this many turns
  wallTimeoutMs: 45 * 60 * 1000, // supervisor ends the session at this wall-clock age
  maxRunning: 1,
  model: "sonnet",
  blockedDomains: [],           // regex strings matched against task text, item.domain and item.tags
  quota: null                   // { file, sessionPctMax, weeklyPctMax, maxAgeSec } fails closed when set
};

function loadPolicy() {
  try { return Object.assign({}, DEFAULT_POLICY, JSON.parse(fs.readFileSync(process.env.CCC_DAEMON_POLICY || POLICY_FILE, "utf8"))); }
  catch (_) { return Object.assign({}, DEFAULT_POLICY); }
}

function checkQuota(quota, now) {
  if (!quota) return null;
  try {
    var stat = fs.statSync(quota.file);
    if ((now - stat.mtimeMs) / 1000 > (quota.maxAgeSec || 600)) return "quota snapshot is stale";
    var data = JSON.parse(fs.readFileSync(quota.file, "utf8"));
    if (data.admit === false) return "quota snapshot denies admission";
    var sessionPct = Number(data.sessionPct), weeklyPct = Number(data.weeklyPct);
    if (!Number.isFinite(sessionPct) || !Number.isFinite(weeklyPct)) return "quota snapshot lacks session/weekly percentages";
    if (sessionPct >= (quota.sessionPctMax || 80)) return "session quota " + sessionPct + "% is at or above the limit";
    if (weeklyPct >= (quota.weeklyPctMax || 90)) return "weekly quota " + weeklyPct + "% is at or above the limit";
    return null;
  } catch (_) { return "quota snapshot is missing or unreadable"; }
}

// Returns null when the queued item may launch, otherwise the reason it is held.
function admit(item, policy, running, now) {
  if (!policy.autoDispatch) return "automatic dispatch is not enabled in " + POLICY_FILE;
  if (running >= policy.maxRunning) return running + " queued job(s) already running";
  var hay = [item.task, item.domain].concat(item.tags || []).join("\n");
  for (var i = 0; i < policy.blockedDomains.length; i++) {
    if (new RegExp(policy.blockedDomains[i], "im").test(hay)) return "domain blocked by policy (" + policy.blockedDomains[i] + ")";
  }
  var quota = checkQuota(policy.quota, now);
  if (quota) return quota;
  var check = require("./dispatcher").checkCostCeiling(item.task, { model: item.model || policy.model, maxTurns: policy.maxTurns }, policy.maxEstimateUsd);
  if (!check.allowed) return check.message || "estimate exceeds ceiling";
  if (check.estimate && check.estimate.estimateHigh > policy.maxEstimateUsd) return "estimate $" + check.estimate.estimateHigh + " exceeds the $" + policy.maxEstimateUsd + " ceiling";
  return null;
}

// Settle running queue items whose report reached a terminal status.
function reconcile() {
  var running = queue.listTasks("running");
  var open = 0;
  running.forEach(function (item) {
    var report = item.remote && item.remote.report;
    var text = "";
    try { text = report ? fs.readFileSync(report, "utf8") : ""; } catch (_) {}
    var match = text.match(/^Status: (done|blocked|failed) — ([^\r\n]+)/);
    if (match) {
      queue.updateStatus(item.id, match[1] === "done" ? "done" : "failed", match[1] === "done" ? { result: match[2] } : { error: match[1] + ": " + match[2] });
      log("Queue " + item.id + " " + match[1] + ": " + match[2]);
    } else open++;
  });
  return open;
}

function tick(config) {
  var start = Date.now();
  var actions = [];
  var policy = loadPolicy();
  var running = reconcile();

  var next = queue.getNext();
  if (next) {
    var reason = admit(next, policy, running, Date.now());
    if (reason) {
      log("Queue held: " + reason + ". Task " + next.id + " remains pending.");
      actions.push({ type: "queue-held", task: next, reason: reason });
    } else {
      try {
        var handle = require("./remote-session").start(next.task, {
          cwd: next.cwd, model: next.model || policy.model, name: "ccc-queue",
          maxTurns: policy.maxTurns, wallTimeoutMs: policy.wallTimeoutMs
        });
        queue.updateStatus(next.id, "running", { remote: { job: handle.job.job, report: handle.job.report, sessionId: handle.job.sessionId } });
        log("Queue " + next.id + " launched with Remote Control (" + policy.maxTurns + " turns / " + Math.round(policy.wallTimeoutMs / 60000) + " min bounds)");
        actions.push({ type: "queue-launched", task: next });
      } catch (e) {
        queue.updateStatus(next.id, "failed", { error: "launch failed: " + e.message });
        log("Queue " + next.id + " launch failed: " + e.message);
      }
    }
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

module.exports = { admit: admit, loadPolicy: loadPolicy, reconcile: reconcile, start: start, isRunning: isRunning, stop: stop, tick: tick, runDream: runDream, log: log };
