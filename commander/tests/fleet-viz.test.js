'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const RENDERER_PATH = path.join(
  __dirname,
  '..',
  'cowork-plugin',
  'skills',
  'ccc-fleet-viz',
  'lib',
  'render-fleet-tree.js'
);

let collectFleetState;
let renderASCII;
let renderMermaid;

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-fleet-viz-test-'));
}

function writeStatus(root, workerId, payload) {
  fs.writeFileSync(
    path.join(root, workerId + '-status.json'),
    JSON.stringify(Object.assign({ worker_id: workerId }, payload), null, 2) + '\n',
    'utf8'
  );
}

function writeComplete(root, workerId, payload) {
  fs.writeFileSync(
    path.join(root, workerId + '-complete.json'),
    JSON.stringify(Object.assign({ worker_id: workerId }, payload), null, 2) + '\n',
    'utf8'
  );
}

test('load fleet tree renderer (ESM via dynamic import)', async () => {
  const mod = await import(pathToFileURL(RENDERER_PATH).href);
  collectFleetState = mod.collectFleetState;
  renderASCII = mod.renderASCII;
  renderMermaid = mod.renderMermaid;

  assert.equal(typeof collectFleetState, 'function');
  assert.equal(typeof renderASCII, 'function');
  assert.equal(typeof renderMermaid, 'function');
});

test('collectFleetState handles empty dir', () => {
  const root = mkTmp();
  const state = collectFleetState({ stateDir: root });

  assert.equal(state.kind, 'ccc-fleet');
  assert.equal(state.summary.total, 0);
  assert.deepEqual(state.workers, []);
  assert.deepEqual(state.skipped, []);
});

test('collectFleetState parses well-formed status markers', () => {
  const root = mkTmp();
  writeStatus(root, 'w2-marketing', {
    status: 'done',
    title: 'marketing',
    branch: 'claude/codex-w2-marketing',
    commit: 'a0a3cb8edcb8237cb8707486eb8efed3d3d581d9',
  });
  writeStatus(root, 'w1-build', {
    status: 'running',
    title: 'build',
    progress: 'tests in flight',
    eta_remaining_ms: 120000,
  });

  const state = collectFleetState({ stateDir: root });

  assert.equal(state.summary.total, 2);
  assert.equal(state.summary.done, 1);
  assert.equal(state.summary.running, 1);
  assert.deepEqual(
    state.workers.map((worker) => worker.id),
    ['w1-build', 'w2-marketing']
  );
  assert.equal(state.workers[1].branch, 'claude/codex-w2-marketing');
});

test('collectFleetState skips malformed markers without crashing', () => {
  const root = mkTmp();
  fs.writeFileSync(path.join(root, 'w1-status.json'), '{not json', 'utf8');
  writeStatus(root, 'w2-good', { status: 'waiting', blocked_by: 'W1' });

  const state = collectFleetState({ stateDir: root });

  assert.equal(state.summary.total, 1);
  assert.equal(state.workers[0].id, 'w2-good');
  assert.equal(state.skipped.length, 1);
  assert.match(state.skipped[0].file, /w1-status\.json$/);
});

test('renderASCII produces stable output for fixed input', () => {
  const state = {
    summary: { total: 4, done: 1, running: 1, failed: 1, waiting: 1, unknown: 0 },
    workers: [
      {
        id: 'w1-build',
        ordinal: 1,
        status: 'done',
        title: 'build',
        branch: 'claude/codex-w1-build',
        commit: '0019f10d8936bf0291ced8db682729c5afaed7ae',
        filesWritten: [],
        filesChanged: [],
      },
      {
        id: 'w2-imagery',
        ordinal: 2,
        status: 'running',
        title: 'imagery',
        progress: '3/6 images generated',
        eta: '4min',
        filesWritten: [],
        filesChanged: [],
      },
      {
        id: 'w3-improvements',
        ordinal: 3,
        status: 'failed',
        title: 'improvements',
        error: 'blocked: merge conflict',
        filesWritten: [],
        filesChanged: [],
      },
      {
        id: 'w4-e2e',
        ordinal: 4,
        status: 'waiting',
        title: 'e2e',
        blockedBy: 'W1',
        filesWritten: [],
        filesChanged: [],
      },
    ],
  };

  assert.equal(
    renderASCII(state),
    [
      '/ccc-fleet (orchestrator) — 4 workers, 1 done, 1 running, 1 failed',
      '├── ✅ W1 build        → claude/codex-w1-build @ 0019f10',
      '├── 🔄 W2 imagery      → 3/6 images generated, ETA ~4min',
      '├── ❌ W3 improvements → blocked: merge conflict',
      '└── ⏳ W4 e2e          → waiting on W1',
    ].join('\n')
  );
});

test('renderMermaid emits syntactically-valid Mermaid block', () => {
  const state = {
    workers: [
      { id: 'w1-build', ordinal: 1, status: 'done', title: 'build' },
      { id: 'w2-e2e', ordinal: 2, status: 'waiting', title: 'e2e' },
    ],
  };

  const output = renderMermaid(state);

  assert.match(output, /^```mermaid\ngraph TD\n/);
  assert.match(output, /fleet\["\/ccc-fleet orchestrator"\]/);
  assert.match(output, /fleet --> w1_build\["W1 build ✅"\]/);
  assert.match(output, /fleet --> w2_e2e\["W2 e2e ⏳"\]/);
  assert.match(output, /\n```$/);
});

test('round-trip status file written by writeStatus can be read by collectFleetState', () => {
  const root = mkTmp();
  writeStatus(root, 'w7-docs', {
    status: 'running',
    task: 'docs',
    progress_current: 2,
    progress_total: 5,
    progress_label: 'docs updated',
  });

  const state = collectFleetState({ stateDir: root });

  assert.equal(state.summary.total, 1);
  assert.equal(state.workers[0].id, 'w7-docs');
  assert.equal(state.workers[0].progressCurrent, 2);
  assert.equal(state.workers[0].progressTotal, 5);
  assert.equal(renderASCII(state).includes('2/5 docs updated'), true);
});

test('collectFleetState merges complete markers over status markers', () => {
  const root = mkTmp();
  writeStatus(root, 'w5-improvements', { status: 'running', task: 'improvements' });
  writeComplete(root, 'w5-improvements', {
    exit_code: 1,
    files_written: ['commander/tests/example.test.js'],
    commit_hash: 'db13e8496b0db429c161ab598b295173243cd6bf',
  });

  const state = collectFleetState({ stateDir: root });

  assert.equal(state.summary.failed, 1);
  assert.equal(state.workers[0].status, 'failed');
  assert.equal(state.workers[0].commit, 'db13e8496b0db429c161ab598b295173243cd6bf');
});
