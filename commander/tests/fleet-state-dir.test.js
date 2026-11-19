// M4: fleet markers live in an owner-only per-run directory under the lane state dir
// (<config dir>/commander/fleet/runs/<run-id>, mode 0700), not a shared world-readable /tmp/ccc-fleet.
// Writers (fleet-status.js), the renderer (/ccc-fleet-viz) and the fleet-watch monitor resolve it the same way.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PLUGIN = path.join(__dirname, '..', 'cowork-plugin');
const fleet = require('../cowork-plugin/skills/ccc-fleet/lib/fleet-status.js');
const RENDERER = path.join(PLUGIN, 'skills', 'ccc-fleet-viz', 'lib', 'render-fleet-tree.js');
const POSIX = process.platform !== 'win32';
const quiet = { write() {} };

function lane(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-fleet-dir-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const env = { HOME: home, CCC_CONFIG_DIR: path.join(home, 'lane') };
  return { home, env, base: path.join(home, 'lane', 'commander', 'fleet') };
}

// macOS tmpdirs sit under /var -> /private/var: compare physical paths on both sides. The parent is
// resolved and the leaf kept, so a symlink leaf or an already-removed entry still compares by name.
function real(p) {
  return path.join(fs.realpathSync(path.dirname(p)), path.basename(p));
}
function samePath(actual, expected, msg) {
  assert.equal(real(actual), real(expected), msg);
}

function mode(p) {
  return fs.statSync(p).mode & 0o777;
}

test('startFleetRun creates an owner-only run dir under the lane state dir and points current at it', (t) => {
  const { env, base } = lane(t);
  const { runId, runDir } = fleet.startFleetRun({ env });
  assert.match(runId, /^[A-Za-z0-9._-]+$/);
  samePath(runDir, path.join(base, 'runs', runId));
  samePath(fleet.fleetBaseDir({ env }), base);
  samePath(fleet.currentRunDir({ env }), runDir);
  if (POSIX) {
    assert.equal(mode(base), 0o700, 'base dir');
    assert.equal(mode(path.join(base, 'runs')), 0o700, 'runs dir');
    assert.equal(mode(runDir), 0o700, 'run dir');
  }
  const second = fleet.startFleetRun({ env });
  assert.notEqual(second.runDir, runDir, 'every run gets its own directory');
  samePath(fleet.currentRunDir({ env }), second.runDir);
});

test('writers default to the current run and write owner-only files', (t) => {
  const { env } = lane(t);
  const { runDir } = fleet.startFleetRun({ env });
  fleet.emitFleetWorkerProgress({ worker_id: 'w1', status: 'running' }, { env, stream: quiet });
  const { markerPath } = fleet.writeCompletionMarker('w1', { exit_code: 0 }, { env });
  samePath(path.dirname(markerPath), runDir);
  const progress = path.join(runDir, 'worker-progress.jsonl');
  assert.ok(fs.existsSync(progress));
  if (POSIX) {
    assert.equal(mode(progress), 0o600);
    assert.equal(mode(markerPath), 0o600);
  }
  assert.deepEqual(fs.readdirSync(runDir).sort(), [`${fleet.markerStem('w1')}-complete.json`, 'worker-progress.jsonl']);
});

test('a writer with no run yet starts one', (t) => {
  const { env, base } = lane(t);
  assert.equal(fleet.currentRunDir({ env }), null);
  const { markerPath } = fleet.writeCompletionMarker('w9', { exit_code: 1 }, { env });
  const runDir = fleet.currentRunDir({ env });
  assert.ok(runDir && real(runDir).startsWith(real(path.join(base, 'runs')) + path.sep));
  samePath(path.dirname(markerPath), runDir);
});

test('a run dir that is group/world accessible is refused; writers move to a fresh run', { skip: !POSIX }, (t) => {
  const { env } = lane(t);
  const { runDir } = fleet.startFleetRun({ env });
  fs.chmodSync(runDir, 0o755);
  assert.equal(fleet.currentRunDir({ env }), null, 'reader refuses a widened dir');
  const { markerPath } = fleet.writeCompletionMarker('w1', { exit_code: 0 }, { env });
  assert.notEqual(path.dirname(markerPath), runDir, 'writer does not reuse it');
  assert.equal(mode(path.dirname(markerPath)), 0o700);
});

test('a symlinked run dir or a traversal in the current pointer is refused', { skip: !POSIX }, (t) => {
  const { home, env, base } = lane(t);
  const { runId, runDir } = fleet.startFleetRun({ env });
  const elsewhere = fs.mkdtempSync(path.join(home, 'elsewhere-'));
  fs.rmSync(runDir, { recursive: true });
  fs.symlinkSync(elsewhere, runDir);
  assert.equal(fleet.currentRunDir({ env }), null, 'symlink refused');

  fs.writeFileSync(path.join(base, 'current'), '../../../elsewhere\n');
  assert.equal(fleet.currentRunDir({ env }), null, 'traversal refused');
  assert.ok(runId);
});

test('pruneFleetTmp removes run dirs older than a day, never the current run', (t) => {
  const { env, base } = lane(t);
  const old = fleet.startFleetRun({ env });
  const recent = fleet.startFleetRun({ env });
  const current = fleet.startFleetRun({ env });
  const dayAgo = (Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000;
  fs.utimesSync(old.runDir, dayAgo, dayAgo);
  fs.utimesSync(current.runDir, dayAgo, dayAgo);
  const { root, removed } = fleet.pruneFleetTmp({ env });
  samePath(root, path.join(base, 'runs'));
  assert.deepEqual(removed.map(real), [real(old.runDir)]);
  assert.ok(fs.existsSync(recent.runDir));
  assert.ok(fs.existsSync(current.runDir));
});

test('the renderer reads the current run by default and nothing when there is no run', async (t) => {
  const { env } = lane(t);
  const { collectFleetState } = await import(pathToFileURL(RENDERER).href);
  const empty = collectFleetState({ env });
  assert.equal(empty.stateDir, null);
  assert.equal(empty.summary.total, 0);

  const { runDir } = fleet.startFleetRun({ env });
  fleet.writeCompletionMarker('w1', { exit_code: 0 }, { env });
  const state = collectFleetState({ env });
  samePath(state.stateDir, runDir);
  assert.equal(state.summary.total, 1);
  assert.equal(state.workers[0].status, 'done');
});

test('no plugin source still reads or writes a shared /tmp/ccc-fleet', () => {
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
      if (!/\.(c?js|mjs|md|json|sh)$/.test(e.name)) continue;
      const src = fs.readFileSync(p, 'utf8');
      if (/\/tmp\/ccc-fleet|tmpdir\(\),\s*'ccc-fleet'/.test(src)) hits.push(path.relative(PLUGIN, p));
    }
  };
  walk(PLUGIN);
  assert.deepEqual(hits, []);
});

// Codex #302 delta2 HIGH 4: cleanup never follows a symlinked run store or recurses outside it.
test('pruneFleetTmp refuses a symlinked runs dir and leaves the linked directory alone', { skip: !POSIX }, (t) => {
  const { env, home, base } = lane(t);
  fleet.startFleetRun({ env });
  const outside = path.join(home, 'outside');
  fs.mkdirSync(path.join(outside, 'precious'), { recursive: true });
  fs.writeFileSync(path.join(outside, 'precious', 'data.txt'), 'keep');
  const dayAgo = (Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000;
  fs.utimesSync(path.join(outside, 'precious'), dayAgo, dayAgo);
  const runs = path.join(base, 'runs');
  fs.rmSync(runs, { recursive: true, force: true });
  fs.symlinkSync(outside, runs);
  assert.throws(() => fleet.pruneFleetTmp({ env }), /not a private directory|symlink/);
  assert.ok(fs.existsSync(path.join(outside, 'precious', 'data.txt')), 'linked content survives');
  // An explicit root that is a symlink is refused the same way.
  assert.throws(() => fleet.pruneFleetTmp({ root: runs }), /symlink|not a directory/);
  assert.ok(fs.existsSync(path.join(outside, 'precious', 'data.txt')));
});

test('pruneFleetTmp removes an old symlinked entry as a link, never its target', { skip: !POSIX }, (t) => {
  const { env, home, base } = lane(t);
  fleet.startFleetRun({ env });
  const outside = path.join(home, 'outside2');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'data.txt'), 'keep');
  const link = path.join(base, 'runs', 'old-link');
  fs.symlinkSync(outside, link);
  const dayAgo = (Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000;
  fs.lutimesSync(link, dayAgo, dayAgo);
  const { removed } = fleet.pruneFleetTmp({ env });
  assert.deepEqual(removed.map(real), [real(link)]);
  assert.ok(!fs.existsSync(link));
  assert.ok(fs.existsSync(path.join(outside, 'data.txt')), 'target content survives');
});

// Codex #302 delta2 MEDIUM 1: overlapping runs in one lane keep their own markers.
test('a worker started with run A writes to run A even after run B becomes current', (t) => {
  const { env } = lane(t);
  const a = fleet.startFleetRun({ env });
  const b = fleet.startFleetRun({ env });
  samePath(fleet.currentRunDir({ env }), b.runDir);
  const { markerPath } = fleet.writeCompletionMarker('w1', { exit_code: 0 }, { env, runId: a.runId });
  samePath(path.dirname(markerPath), a.runDir);
  fleet.emitFleetWorkerProgress({ worker_id: 'w1', status: 'complete' }, { env, runId: a.runId, stream: quiet });
  assert.ok(fs.existsSync(path.join(a.runDir, fleet.PROGRESS_FILE)));
  assert.ok(!fs.existsSync(path.join(b.runDir, `${fleet.markerStem('w1')}-complete.json`)));
  // The run id also travels in the worker's environment.
  const viaEnv = fleet.writeCompletionMarker('w2', { exit_code: 0 }, { env: { ...env, CCC_FLEET_RUN_ID: a.runId } });
  samePath(path.dirname(viaEnv.markerPath), a.runDir);
});

test('an unknown or invalid run id fails instead of falling back to the current run', (t) => {
  const { env } = lane(t);
  const b = fleet.startFleetRun({ env });
  assert.throws(() => fleet.writeCompletionMarker('w1', { exit_code: 0 }, { env, runId: 'no-such-run' }), /run/);
  assert.throws(() => fleet.writeCompletionMarker('w1', { exit_code: 0 }, { env, runId: '../escape' }), /runId/);
  assert.ok(!fs.existsSync(path.join(b.runDir, `${fleet.markerStem('w1')}-complete.json`)));
});

// Codex #302 delta3 NM1: a worker id that needs encoding keeps its logical id in the completion payload, so
// its progress and completion merge into one worker and the run settles. Only the filename is encoded.
test('a worker id with a space settles: logical id in the payload, encoded only for the filename', async (t) => {
  const { env } = lane(t);
  const { runDir } = fleet.startFleetRun({ env });
  fleet.emitFleetWorkerProgress({ worker_id: 'documentation worker', status: 'running' }, { env, stream: quiet });
  const { markerPath, payload } = fleet.writeCompletionMarker('documentation worker', { exit_code: 0 }, { env });
  assert.equal(payload.worker_id, 'documentation worker');
  assert.equal(JSON.parse(fs.readFileSync(markerPath, 'utf8')).worker_id, 'documentation worker');
  assert.match(path.basename(markerPath), /^[0-9a-f]{32}-complete\.json$/);
  const { collectFleetState } = await import(pathToFileURL(RENDERER).href);
  const state = collectFleetState({ stateDir: runDir });
  assert.deepEqual(state.workers.map((w) => [w.id, w.status]), [['documentation worker', 'done']]);
  const { diffFleet } = await import(pathToFileURL(path.join(PLUGIN, 'monitors', 'fleet-watch.mjs')).href);
  const { lines } = diffFleet(new Map(), state);
  assert.ok(lines.some((l) => l.includes('"event":"settled"') && l.includes('"done":1')), lines.join('\n'));
});

// Codex #302 delta4 fleet IDs: the exact worker id string is the logical key everywhere; only the filename is
// derived from it, as sha256(id) hex truncated to 32 characters. No id can collide with another id's filename
// (`a b` vs `a_b-c8687a08`, `W1` vs `w1` on a case-insensitive volume), and the filename length is bounded.
test('completion marker filenames are collision-free and keep the exact id in the payload', (t) => {
  const { env } = lane(t);
  const ids = ['a b', 'a_b', 'a_b-c8687a08', 'build', ' build ', 'W1', 'w1'];
  const markers = ids.map((id, i) => fleet.writeCompletionMarker(id, { exit_code: i }, { env }));
  const names = markers.map((m) => path.basename(m.markerPath).toLowerCase());
  assert.equal(new Set(names).size, ids.length, `distinct even case-folded: ${names.join(', ')}`);
  for (const [i, m] of markers.entries()) {
    assert.match(path.basename(m.markerPath), /^[0-9a-f]{32}-complete\.json$/);
    assert.equal(JSON.parse(fs.readFileSync(m.markerPath, 'utf8')).worker_id, ids[i], 'payload keeps the exact id');
  }
});

test('a very long worker id still gets a filename under 255 bytes, temp file included', (t) => {
  const { env } = lane(t);
  const { runDir } = fleet.startFleetRun({ env });
  const id = `w-${'\u00e9'.repeat(400)}-${'x'.repeat(300)}`;
  const { markerPath, payload } = fleet.writeCompletionMarker(id, { exit_code: 0 }, { env });
  assert.equal(payload.worker_id, id);
  assert.ok(Buffer.byteLength(path.basename(markerPath)) < 100, path.basename(markerPath));
  assert.deepEqual(fs.readdirSync(runDir), [path.basename(markerPath)], 'no temp file left behind');
});

test('ids that differ only by surrounding whitespace stay separate workers in the renderer', async (t) => {
  const { env } = lane(t);
  const { runDir } = fleet.startFleetRun({ env });
  fleet.emitFleetWorkerProgress({ worker_id: 'build', status: 'running' }, { env, stream: quiet });
  fleet.emitFleetWorkerProgress({ worker_id: ' build ', status: 'running' }, { env, stream: quiet });
  fleet.writeCompletionMarker(' build ', { exit_code: 0 }, { env });
  const { collectFleetState } = await import(pathToFileURL(RENDERER).href);
  const state = collectFleetState({ stateDir: runDir });
  const byId = Object.fromEntries(state.workers.map((w) => [JSON.stringify(w.id), w.status]));
  assert.deepEqual(byId, { '"build"': 'running', '" build "': 'done' });
});

test('a worker id with regex metacharacters renders without throwing', async (t) => {
  const { env } = lane(t);
  const { runDir } = fleet.startFleetRun({ env });
  for (const id of ['a(b', 'x[y', 'w*+?', 'c\\']) fleet.writeCompletionMarker(id, { exit_code: 0 }, { env });
  const { collectFleetState, renderASCII, renderMermaid } = await import(pathToFileURL(RENDERER).href);
  const state = collectFleetState({ stateDir: runDir });
  assert.equal(state.workers.length, 4);
  const ascii = renderASCII(state);
  assert.match(ascii, /a\(b/);
  assert.doesNotThrow(() => renderMermaid(state));
});

// Codex #302 delta3 NM2: appending to a run's progress file does not change the directory's mtime, so cleanup
// ages a run by the newest marker inside it; an overlapping run that is still writing is never pruned.
test('pruneFleetTmp keeps an old-looking run whose markers are still being written', (t) => {
  const { env } = lane(t);
  const active = fleet.startFleetRun({ env });
  const finished = fleet.startFleetRun({ env });
  fleet.startFleetRun({ env }); // a later run is current
  const dayAgo = (Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000;
  fleet.writeCompletionMarker('w1', { exit_code: 0 }, { env, runId: finished.runId });
  for (const f of fs.readdirSync(finished.runDir)) fs.utimesSync(path.join(finished.runDir, f), dayAgo, dayAgo);
  fs.utimesSync(finished.runDir, dayAgo, dayAgo);
  fleet.emitFleetWorkerProgress({ worker_id: 'w1', status: 'running' }, { env, runId: active.runId, stream: quiet });
  fs.utimesSync(active.runDir, dayAgo, dayAgo); // the append is recent; the directory mtime is old
  const { removed } = fleet.pruneFleetTmp({ env });
  assert.deepEqual(removed.map(real), [real(finished.runDir)]);
  assert.ok(fs.existsSync(path.join(active.runDir, fleet.PROGRESS_FILE)), 'the still-active run survives');
});
