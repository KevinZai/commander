// Integration coverage for the three CRITICAL build/check scripts under scripts/.
// Each script is exercised as a real subprocess via spawnSync — we never
// require() the script bodies, so this verifies the actual CLI contract that
// CI and humans rely on.
//
// Coverage:
//   1. scripts/build-from-registry.js  — --check happy path + --generate idempotency
//   2. scripts/audit-counts.js          — --check happy path + --json contract
//   3. scripts/check-version-parity.js  — --check happy path
//
// Drift simulation (non-zero exit when filesystem disagrees with manifest)
// is intentionally NOT covered here — the scripts are hard-coded to ROOT
// and would require either deep refactor or mutation of real repo files.
// Mutating real files (even with backup/restore) is fragile under parallel
// test runs and was explicitly disallowed for this slice. Tracking as a
// follow-up: build a tmp-fixture harness so each script can run against an
// isolated ROOT before adding the negative-path tests. See report.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const BUILD_REGISTRY = path.join(ROOT, 'scripts', 'build-from-registry.js');
const AUDIT_COUNTS = path.join(ROOT, 'scripts', 'audit-counts.js');
const CHECK_VERSION_PARITY = path.join(ROOT, 'scripts', 'check-version-parity.js');
const REGISTRY_YAML = path.join(ROOT, 'commander', 'core', 'registry.yaml');

function runScript(scriptPath, args, opts) {
  const o = Object.assign({ encoding: 'utf8', timeout: 30000 }, opts || {});
  return spawnSync(process.execPath, [scriptPath].concat(args || []), o);
}

// ─── build-from-registry.js ────────────────────────────────────────────────

test('build-from-registry.js --check exits 0 on clean state', function () {
  const r = runScript(BUILD_REGISTRY, ['--check']);
  assert.strictEqual(
    r.status,
    0,
    '--check should exit 0. stdout: ' + r.stdout + ' stderr: ' + r.stderr
  );
  assert.match(r.stdout, /PASS/, 'stdout should contain PASS');
  assert.match(
    r.stdout,
    /\d+ skills, \d+ agents/,
    'stdout should report counts in the PASS line'
  );
});

test('build-from-registry.js --generate is idempotent (run twice, identical output)', function () {
  // Snapshot current registry so we restore on exit (defence in depth — the
  // script is supposed to be idempotent, so this is also the assertion).
  assert.ok(fs.existsSync(REGISTRY_YAML), 'registry.yaml must exist before test');
  const original = fs.readFileSync(REGISTRY_YAML, 'utf8');

  try {
    const r1 = runScript(BUILD_REGISTRY, ['--generate']);
    assert.strictEqual(r1.status, 0, 'first --generate should exit 0. stderr: ' + r1.stderr);
    const afterFirst = fs.readFileSync(REGISTRY_YAML, 'utf8');

    const r2 = runScript(BUILD_REGISTRY, ['--generate']);
    assert.strictEqual(r2.status, 0, 'second --generate should exit 0. stderr: ' + r2.stderr);
    const afterSecond = fs.readFileSync(REGISTRY_YAML, 'utf8');

    assert.strictEqual(
      afterSecond,
      afterFirst,
      '--generate must be idempotent: two consecutive runs should produce byte-identical output'
    );

    // Sanity: stdout reports counts on a non-check run
    assert.match(r1.stdout, /Registry generated/, 'first run stdout should announce generation');
    assert.match(r1.stdout, /skills: \d+/, 'first run stdout should report skill count');
  } finally {
    // Restore exact pre-test bytes regardless of test outcome
    fs.writeFileSync(REGISTRY_YAML, original);
  }
});

// ─── audit-counts.js ───────────────────────────────────────────────────────

test('audit-counts.js --check exits 0 on clean state', function () {
  const r = runScript(AUDIT_COUNTS, ['--check']);
  assert.strictEqual(
    r.status,
    0,
    '--check should exit 0. stdout: ' + r.stdout + ' stderr: ' + r.stderr
  );
  assert.match(r.stdout, /PASS/, 'stdout should contain PASS');
});

test('audit-counts.js --json emits valid JSON with required keys', function () {
  const r = runScript(AUDIT_COUNTS, ['--json']);
  assert.strictEqual(r.status, 0, '--json should exit 0. stderr: ' + r.stderr);
  let data;
  assert.doesNotThrow(function () {
    data = JSON.parse(r.stdout);
  }, 'stdout should be valid JSON');
  for (const key of ['version', 'skillsCli', 'skillsDisk', 'commands', 'hooks', 'vendors']) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(data, key),
      'JSON output should have key: ' + key
    );
  }
  assert.ok(typeof data.version === 'string' && data.version.length > 0, 'version is non-empty string');
  assert.ok(typeof data.skillsCli === 'number', 'skillsCli is number');
  assert.ok(typeof data.vendors === 'number', 'vendors is number');
});

// ─── check-version-parity.js ───────────────────────────────────────────────

test('check-version-parity.js --check exits 0 when 4 manifests are in sync', function () {
  const r = runScript(CHECK_VERSION_PARITY, ['--check']);
  assert.strictEqual(
    r.status,
    0,
    '--check should exit 0. stdout: ' + r.stdout + ' stderr: ' + r.stderr
  );
  assert.match(r.stdout, /PASS/, 'stdout should contain PASS');
  assert.match(
    r.stdout,
    /All 4 manifests at \d+\.\d+\.\d+/,
    'stdout should announce all 4 manifests at a semver version'
  );
});

test('check-version-parity.js default (no --check) reports parity table', function () {
  const r = runScript(CHECK_VERSION_PARITY, []);
  assert.strictEqual(
    r.status,
    0,
    'default mode should exit 0 when in sync. stderr: ' + r.stderr
  );
  assert.match(r.stdout, /Version Parity Report/, 'stdout should include report header');
  assert.match(r.stdout, /Root version \(SSoT\)/, 'stdout should label SSoT');
  assert.match(r.stdout, /\[OK\s*\]/, 'stdout should include at least one OK row');
});
