'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const BENCH = path.join(ROOT, 'scripts', 'perf-bench.js');

test('perf bench harness runs and emits valid JSON', () => {
  const result = spawnSync(process.execPath, [BENCH, '--bench=C'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
  });

  assert.equal(result.status, 0, 'bench should exit 0. stderr: ' + result.stderr);

  let parsed;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(result.stdout);
  }, 'stdout should be valid JSON');

  assert.equal(parsed.schemaVersion, 1);
  assert.ok(parsed.benches.C, 'Bench C result should be present');
  assert.equal(parsed.benches.C.status, 'ok');
  assert.equal(typeof parsed.benches.C.stats.p50, 'number');
});
