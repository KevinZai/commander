'use strict';

// Codex #302 delta2 HIGH 3 and the imported-project cwd finding: a session is
// bound to the absolute root of the project it was dispatched for. Headless
// builds, resume and the YOLO loop run there; a missing or relative root stops
// the dispatch instead of silently running in the launch directory, and the
// project context and the cwd always come from the same root.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-project-root-'));
process.env.CCC_CONFIG_DIR = path.join(tmp, 'config');
delete process.env.LINEAR_API_KEY;
delete process.env.CCC_TMUX_SESSION;

var projectRoot = require('../lib/project-root');
var state = require('../state');
var dispatcher = require('../dispatcher');
var Engine = require('../engine');

function mkProject(name) {
  var dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# ' + name + '\n');
  return fs.realpathSync(dir);
}

var dirA = mkProject('project-a');
var dirB = mkProject('project-b');

function stubDispatch() {
  var calls = [];
  var fake = function(task, options) {
    calls.push({ task: task, options: options || {} });
    var p = Promise.resolve({ result: 'ok', session_id: 'claude-1', cost_usd: 0 });
    return p;
  };
  dispatcher.dispatch = fake;
  dispatcher.dispatchWithRetry = fake;
  return calls;
}

function quietEngine() {
  var e = new Engine();
  e.rl = { close: function() {} }; // never open a readline on the runner's stdin
  e.ask = async function() { return ''; };
  e.pause = async function() {};
  return e;
}

async function quietly(fn) {
  var write = process.stdout.write;
  var out = '';
  process.stdout.write = function(chunk) { out += String(chunk); return true; };
  try { await fn(); } finally { process.stdout.write = write; }
  return out;
}

test('normalizeRoot returns the absolute real path and rejects a missing directory', function() {
  assert.strictEqual(projectRoot.normalizeRoot('project-a', tmp), dirA);
  assert.throws(function() { projectRoot.normalizeRoot(path.join(tmp, 'gone')); }, /does not exist/);
});

test('a relative stored root is refused, never re-resolved against the current directory', function() {
  var r = projectRoot.activeRoot({ activeProject: { dir: 'project-a', name: 'a' } });
  assert.strictEqual(r.dir, null);
  assert.match(r.error, /not absolute/);
});

test('a missing stored root is an error, not a fallback to the launch directory', function() {
  var r = projectRoot.activeRoot({ activeProject: { dir: path.join(tmp, 'gone'), name: 'gone' } });
  assert.strictEqual(r.dir, null);
  assert.match(r.error, /unavailable/);
  assert.deepStrictEqual(projectRoot.activeRoot({}), { dir: null, error: null });
});

test('headless build binds the session to the project root and sends that project\'s context', async function() {
  state.updateState({ activeProject: { dir: dirA, name: 'project-a' }, user: { level: 'power' } });
  var calls = stubDispatch();
  await quietly(function() { return quietEngine().executeBuild('add a health endpoint'); });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].options.cwd, dirA);
  assert.ok(calls[0].task.indexOf('(' + dirA + ')') !== -1, 'project context names the same root as the cwd');
  var session = state.listSessions().find(function(s) { return /health endpoint/.test(s.task); });
  assert.strictEqual(session.projectDir, dirA);
});

test('headless build with a missing imported project dispatches nothing', async function() {
  state.updateState({ activeProject: { dir: path.join(tmp, 'gone'), name: 'gone' }, user: { level: 'power' } });
  var calls = stubDispatch();
  var out = await quietly(function() { return quietEngine().executeBuild('add a ready endpoint'); });
  assert.strictEqual(calls.length, 0, 'no dispatch into the launch directory');
  assert.match(out, /unavailable/);
});

test('resume runs in the session\'s bound root even after another project is imported', async function() {
  state.updateState({ activeProject: { dir: dirB, name: 'project-b' } });
  var session = state.createSession({ task: 'resume me', project: null });
  state.updateSession(session.id, { projectDir: dirA, claudeSessionId: 'abc-123' });
  var calls = stubDispatch();
  await quietly(function() { return quietEngine().resumeSession(state.getSession(session.id)); });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].options.cwd, dirA);
  assert.strictEqual(calls[0].options.resume, 'abc-123');
});

test('resume refuses when the bound root is gone', async function() {
  var session = state.createSession({ task: 'resume gone', project: null });
  state.updateSession(session.id, { projectDir: path.join(tmp, 'gone'), claudeSessionId: 'abc-124' });
  var calls = stubDispatch();
  var out = await quietly(function() { return quietEngine().resumeSession(state.getSession(session.id)); });
  assert.strictEqual(calls.length, 0);
  assert.match(out, /unavailable/);
});

test('a legacy session without a bound root resumes in the active project', async function() {
  state.updateState({ activeProject: { dir: dirB, name: 'project-b' } });
  var session = state.createSession({ task: 'legacy', project: null });
  state.updateSession(session.id, { claudeSessionId: 'abc-125' });
  var calls = stubDispatch();
  await quietly(function() { return quietEngine().resumeSession(state.getSession(session.id)); });
  assert.strictEqual(calls[0].options.cwd, dirB);
});

test('the YOLO loop and open-project store and use the absolute root', function() {
  var src = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
  var yolo = src.slice(src.indexOf('async yoloLoop()'));
  assert.match(yolo, /var yoloRoot = dispatchRoot\(\);/, 'YOLO resolves the project root once');
  assert.match(yolo, /cwd: yoloRoot\.dir/, 'YOLO cycles run in the project root');
  var infra = fs.readFileSync(path.join(__dirname, '..', 'actions', 'infra.js'), 'utf8');
  assert.match(infra, /normalizeRoot\(project\.dir\)/, 'open_project stores the absolute root');
});
