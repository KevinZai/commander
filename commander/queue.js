"use strict";

var fs = require("fs");
var path = require("path");
var os = require("os");

var QUEUE_DIR = path.join(os.homedir(), ".claude", "commander", "queue");

function ensureDir() {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

function addTask(task, priority) {
  ensureDir();
  priority = priority || 3;
  var id = "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  var item = {
    id: id,
    task: task,
    priority: priority,
    status: "pending",
    created: new Date().toISOString(),
    started: null,
    completed: null,
    result: null,
    cost: 0,
    error: null,
  };
  fs.writeFileSync(path.join(QUEUE_DIR, id + ".json"), JSON.stringify(item, null, 2));
  return item;
}

function getNext() {
  ensureDir();
  var files = fs.readdirSync(QUEUE_DIR).filter(function (f) { return f.endsWith(".json"); });
  var pending = [];
  files.forEach(function (f) {
    try {
      var item = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), "utf8"));
      if (item.status === "pending") pending.push(item);
    } catch (_) {}
  });
  if (pending.length === 0) return null;
  pending.sort(function (a, b) { return a.priority - b.priority || new Date(a.created) - new Date(b.created); });
  return pending[0];
}

function updateStatus(id, status, extra) {
  var fp = path.join(QUEUE_DIR, id + ".json");
  if (!fs.existsSync(fp)) return null;
  var item = JSON.parse(fs.readFileSync(fp, "utf8"));
  item.status = status;
  if (status === "running") item.started = new Date().toISOString();
  if (status === "done" || status === "failed") item.completed = new Date().toISOString();
  if (extra) {
    if (extra.result) item.result = extra.result;
    if (extra.cost) item.cost = extra.cost;
    if (extra.error) item.error = extra.error;
    if (extra.remote) item.remote = extra.remote;
  }
  var temp = fp + "." + process.pid + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(item, null, 2));
  fs.renameSync(temp, fp);
  return item;
}

// Claim before any launch side effect. A competing daemon must re-read under the lock.
function claimTask(id) {
  var lock = path.join(QUEUE_DIR, id + ".claim");
  var fd;
  try { fd = fs.openSync(lock, "wx", 0o600); }
  catch (error) { if (error.code === "EEXIST") return null; throw error; }
  try {
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid }));
    var item = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, id + ".json"), "utf8"));
    if (item.status !== "pending") return null;
    return updateStatus(id, "running");
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

// Never take over an interrupted claim: settle it as failed after its owner exits.
function recoverClaims(now) {
  listTasks("pending").forEach(function (item) {
    var lock = path.join(QUEUE_DIR, item.id + ".claim");
    var stat;
    try { stat = fs.statSync(lock); } catch (_) { return; }
    if (now - stat.mtimeMs < 120000) return;
    var owner;
    try { owner = JSON.parse(fs.readFileSync(lock, "utf8")); } catch (_) {}
    if (owner && Number.isInteger(owner.pid) && owner.pid > 0) {
      try { process.kill(owner.pid, 0); return; }
      catch (error) { if (error.code !== "ESRCH") return; }
    }
    updateStatus(item.id, "failed", { error: "Daemon exited during queue claim; inspect before retrying" });
  });
}

function listTasks(statusFilter) {
  ensureDir();
  var files = fs.readdirSync(QUEUE_DIR).filter(function (f) { return f.endsWith(".json"); });
  var tasks = [];
  files.forEach(function (f) {
    try {
      var item = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), "utf8"));
      if (!statusFilter || item.status === statusFilter) tasks.push(item);
    } catch (_) {}
  });
  tasks.sort(function (a, b) { return a.priority - b.priority; });
  return tasks;
}

function clearDone() {
  ensureDir();
  var files = fs.readdirSync(QUEUE_DIR).filter(function (f) { return f.endsWith(".json"); });
  var cleared = 0;
  files.forEach(function (f) {
    try {
      var item = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), "utf8"));
      if (item.status === "done" || item.status === "failed") {
        fs.unlinkSync(path.join(QUEUE_DIR, f));
        cleared++;
      }
    } catch (_) {}
  });
  return cleared;
}

module.exports = { recoverClaims: recoverClaims, claimTask: claimTask, addTask: addTask, getNext: getNext, updateStatus: updateStatus, listTasks: listTasks, clearDone: clearDone, QUEUE_DIR: QUEUE_DIR };
