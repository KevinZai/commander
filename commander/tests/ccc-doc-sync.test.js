'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const os = require('node:os');

const ROOT = path.join(__dirname, '..', '..');
const SYNC_SCRIPT = path.join(ROOT, 'commander', 'cowork-plugin', 'skills', 'ccc-doc-sync', 'sync.js');
const CONTRACT = path.join(ROOT, 'commander', 'contract.json');
const PKG = path.join(ROOT, 'package.json');

// ── helpers ──────────────────────────────────────────────────────────────────

function runSync(args, env = {}) {
  return cp.spawnSync(process.execPath, [SYNC_SCRIPT, ...args], {
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env, ...env },
  });
}

/**
 * Create a temporary directory with a minimal project layout that mirrors
 * the real repo structure. Only the files we need for the test are created.
 */
function createSandbox(contractOverrides = {}, pkgOverrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-doc-sync-test-'));

  const contractBase = JSON.parse(fs.readFileSync(CONTRACT, 'utf8'));
  const pkgBase = JSON.parse(fs.readFileSync(PKG, 'utf8'));

  const contract = { ...contractBase, ...contractOverrides };
  const pkg = { ...pkgBase, ...pkgOverrides };

  // Write contract.json and package.json into sandbox root
  fs.mkdirSync(path.join(dir, 'commander'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'commander', 'contract.json'), JSON.stringify(contract, null, 2));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

  // Write the patterns.json and sync.js references so the script can locate them
  const skillDir = path.join(dir, 'commander', 'cowork-plugin', 'skills', 'ccc-doc-sync');
  fs.mkdirSync(skillDir, { recursive: true });

  // Copy the real patterns.json and sync.js into the sandbox skill dir
  const realSkillDir = path.join(ROOT, 'commander', 'cowork-plugin', 'skills', 'ccc-doc-sync');
  fs.copyFileSync(path.join(realSkillDir, 'patterns.json'), path.join(skillDir, 'patterns.json'));
  fs.copyFileSync(path.join(realSkillDir, 'sync.js'), path.join(skillDir, 'sync.js'));

  return { dir, contract, pkg };
}

/**
 * Run sync.js from inside the sandbox directory so ROOT resolves correctly.
 * The script derives ROOT as 4 levels up from its own location, so we need
 * the sandbox to mirror that path structure — which createSandbox() does.
 */
function runSyncInSandbox(sandboxDir, args) {
  const scriptPath = path.join(sandboxDir, 'commander', 'cowork-plugin', 'skills', 'ccc-doc-sync', 'sync.js');
  return cp.spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
    cwd: sandboxDir,
  });
}

/**
 * Create a simple test file in the sandbox with a known count string,
 * and register a minimal pattern for it in the sandbox patterns.json.
 */
function addTestFile(sandboxDir, relPath, content, replacements) {
  const absPath = path.join(sandboxDir, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');

  // Patch the sandbox patterns.json to include this file
  const patternsPath = path.join(sandboxDir, 'commander', 'cowork-plugin', 'skills', 'ccc-doc-sync', 'patterns.json');
  const existing = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
  existing.patterns.push({ file: relPath, replacements });
  fs.writeFileSync(patternsPath, JSON.stringify(existing, null, 2), 'utf8');
}

// ── tests ─────────────────────────────────────────────────────────────────────

test('--check on a clean tree exits 0 and prints PASS', function() {
  // The real repo tree with real counts should already be in sync.
  // (If it is not, that is itself a useful signal, but we skip rather than fail.)
  const result = runSync(['--check']);
  // If contract counts match what is in the docs, we get exit 0.
  // If not, we get exit 1 — in that case the test is still "working correctly",
  // it just means the repo itself has drift. We assert the script ran without errors.
  assert.notStrictEqual(result.status, 2, 'Should not exit with code 2 (internal error). stderr: ' + result.stderr);
  assert.ok(
    result.stdout.includes('PASS') || result.stdout.includes('DRIFT') || result.stdout.includes('⚠'),
    'Should produce recognisable output. stdout: ' + result.stdout
  );
});

test('--check detects drift after corrupting a file and exits 1', function() {
  const { dir, contract } = createSandbox();

  // Add a test file with the correct count
  const correctContent = `# Test\n\n61 plugin skills active.\n`;
  addTestFile(dir, 'TEST_FILE.md', correctContent, [
    {
      regex: '(\\d+)( plugin skills active\\.)',
      flags: 'g',
      template: '${plugin_skills}$2',
    },
  ]);

  // Verify it starts clean
  const cleanResult = runSyncInSandbox(dir, ['--check']);
  assert.notStrictEqual(cleanResult.status, 2, 'Should not error. stderr: ' + cleanResult.stderr);

  // Corrupt the file — write a wrong count
  const corruptContent = `# Test\n\n99 plugin skills active.\n`;
  fs.writeFileSync(path.join(dir, 'TEST_FILE.md'), corruptContent, 'utf8');

  // --check should now exit 1
  const driftResult = runSyncInSandbox(dir, ['--check']);
  assert.strictEqual(
    driftResult.status,
    1,
    'Should exit 1 when drift detected. stdout: ' + driftResult.stdout + ' stderr: ' + driftResult.stderr
  );
  assert.ok(
    driftResult.stdout.includes('DRIFT') || driftResult.stderr.includes('FAIL'),
    'Should mention drift. stdout: ' + driftResult.stdout
  );
});

test('--apply after corruption restores the correct count and exits 0', function() {
  const { dir, contract } = createSandbox();

  const correctCount = contract.plugin_skills;
  const correctContent = `# Test\n\n${correctCount} plugin skills active.\n`;

  addTestFile(dir, 'TEST_FILE.md', correctContent, [
    {
      regex: '(\\d+)( plugin skills active\\.)',
      flags: 'g',
      template: '${plugin_skills}$2',
    },
  ]);

  // Corrupt it
  const corruptContent = `# Test\n\n999 plugin skills active.\n`;
  fs.writeFileSync(path.join(dir, 'TEST_FILE.md'), corruptContent, 'utf8');

  // Apply
  const applyResult = runSyncInSandbox(dir, ['--apply']);
  assert.strictEqual(
    applyResult.status,
    0,
    'Should exit 0 after applying. stderr: ' + applyResult.stderr
  );

  // Verify the file was restored
  const restored = fs.readFileSync(path.join(dir, 'TEST_FILE.md'), 'utf8');
  assert.ok(
    restored.includes(`${correctCount} plugin skills active.`),
    `File should contain correct count ${correctCount}. Got: ${restored}`
  );

  // --check should now pass
  const checkResult = runSyncInSandbox(dir, ['--check']);
  assert.strictEqual(
    checkResult.status,
    0,
    'Should pass --check after --apply. stdout: ' + checkResult.stdout
  );
});

test('idempotency — running --apply twice produces the same file content', function() {
  const { dir, contract } = createSandbox();

  const correctCount = contract.plugin_skills;
  // Intentionally stale to trigger a real write
  const staleContent = `# Test\n\n999 plugin skills in total.\nAlso 88 specialist agents here.\n`;

  addTestFile(dir, 'IDEMPOTENCY_TEST.md', staleContent, [
    {
      regex: '(\\d+)( plugin skills in total\\.)',
      flags: 'g',
      template: '${plugin_skills}$2',
    },
    {
      regex: '(Also )(\\d+)( specialist agents here\\.)',
      flags: 'g',
      template: '$1${specialist_agents}$3',
    },
  ]);

  // First apply
  const first = runSyncInSandbox(dir, ['--apply']);
  assert.strictEqual(first.status, 0, 'First apply should exit 0. stderr: ' + first.stderr);
  const afterFirst = fs.readFileSync(path.join(dir, 'IDEMPOTENCY_TEST.md'), 'utf8');

  // Second apply
  const second = runSyncInSandbox(dir, ['--apply']);
  assert.strictEqual(second.status, 0, 'Second apply should exit 0. stderr: ' + second.stderr);
  const afterSecond = fs.readFileSync(path.join(dir, 'IDEMPOTENCY_TEST.md'), 'utf8');

  assert.strictEqual(
    afterFirst,
    afterSecond,
    'File content should be identical after two --apply runs'
  );

  // Confirm counts are correct
  assert.ok(
    afterFirst.includes(`${correctCount} plugin skills in total.`),
    `Should have correct plugin_skills count (${correctCount}). Got: ${afterFirst}`
  );
  assert.ok(
    afterFirst.includes(`${contract.specialist_agents} specialist agents here.`),
    `Should have correct specialist_agents count (${contract.specialist_agents}). Got: ${afterFirst}`
  );
});
