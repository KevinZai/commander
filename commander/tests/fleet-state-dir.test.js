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
  return { home, env, base: path.join(fs.realpathSync(home), 'lane', 'commander', 'fleet') };
}

function mode(p) {
  return fs.statSync(p).mode & 0o777;
}

test('startFleetRun creates an owner-only run dir under the lane state dir and points current at it', (t) => {
  const { env, base } = lane(t);
  const { runId, runDir } = fleet.startFleetRun({ env });
  assert.match(runId, /^[A-Za-z0-9._-]+$/);
  assert.equal(runDir, path.join(base, 'runs', runId));
  assert.equal(fleet.fleetBaseDir({ env }), base);
  assert.equal(fleet.currentRunDir({ env }), runDir);
  if (POSIX) {
    assert.equal(mode(base), 0o700, 'base dir');
    assert.equal(mode(path.join(base, 'runs')), 0o700, 'runs dir');
    assert.equal(mode(runDir), 0o700, 'run dir');
  }
  const second = fleet.startFleetRun({ env });
  assert.notEqual(second.runDir, runDir, 'every run gets its own directory');
  assert.equal(fleet.currentRunDir({ env }), second.runDir);
});

test('writers default to the current run and write owner-only files', (t) => {
  const { env } = lane(t);
  const { runDir } = fleet.startFleetRun({ env });
  fleet.emitFleetWorkerProgress({ worker_id: 'w1', status: 'running' }, { env, stream: quiet });
  const { markerPath } = fleet.writeCompletionMarker('w1', { exit_code: 0 }, { env });
  assert.equal(path.dirname(markerPath), runDir);
  const progress = path.join(runDir, 'worker-progress.jsonl');
  assert.ok(fs.existsSync(progress));
  if (POSIX) {
    assert.equal(mode(progress), 0o600);
    assert.equal(mode(markerPath), 0o600);
  }
  assert.deepEqual(fs.readdirSync(runDir).sort(), ['w1-complete.json', 'worker-progress.jsonl']);
});

test('a writer with no run yet starts one', (t) => {
  const { env, base } = lane(t);
  assert.equal(fleet.currentRunDir({ env }), null);
  const { markerPath } = fleet.writeCompletionMarker('w9', { exit_code: 1 }, { env });
  const runDir = fleet.currentRunDir({ env });
  assert.ok(runDir && runDir.startsWith(path.join(base, 'runs') + path.sep));
  assert.equal(path.dirname(markerPath), runDir);
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
  assert.equal(root, path.join(base, 'runs'));
  assert.deepEqual(removed, [old.runDir]);
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
  assert.equal(state.stateDir, runDir);
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
