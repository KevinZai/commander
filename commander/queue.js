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
  fs.writeFileSync(fp, JSON.stringify(item, null, 2));
  return item;
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

module.exports = { addTask: addTask, getNext: getNext, updateStatus: updateStatus, listTasks: listTasks, clearDone: clearDone, QUEUE_DIR: QUEUE_DIR };
