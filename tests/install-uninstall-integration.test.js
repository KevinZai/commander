'use strict';
// CC-416: install.sh + uninstall.sh sandboxed integration test.
//
// Runs install.sh in --dry-run --force mode (the only non-interactive,
// non-destructive mode the script supports today) and verifies that:
//   1. The script exits 0
//   2. No artifacts leak into the temp HOME (dry-run promise)
//
// Then runs install.sh --verify against a hand-populated fake ~/.claude/
// to confirm the verifier picks up installed components, and finally runs
// uninstall.sh --force to confirm cleanup leaves CLAUDE.md + settings.json
// + backups intact.
//
// All filesystem state lives under a hermetic temp HOME — real ~/.claude/
// is never touched.
//
// Run: node --test tests/install-uninstall-integration.test.js

const assert = require('node:assert');
const { test, after, before } = require('node:test');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const REPO_ROOT = join(__dirname, '..');
const INSTALL_SH = join(REPO_ROOT, 'install.sh');
const UNINSTALL_SH = join(REPO_ROOT, 'uninstall.sh');

let tempHome;

function makeEnv(extra = {}) {
  // Sanitize PATH-related vars; keep PATH so bash + node remain reachable.
  return { ...process.env, HOME: tempHome, ...extra };
}

function runShell(scriptPath, args = [], opts = {}) {
  return spawnSync('bash', [scriptPath, ...args], {
    env: makeEnv(opts.env || {}),
    encoding: 'utf8',
    timeout: 60_000,
    cwd: REPO_ROOT,
    input: opts.input || '',
  });
}

before(() => {
  tempHome = mkdtempSync(join(tmpdir(), 'ccc-install-'));
});

after(() => {
  try {
    rmSync(tempHome, { recursive: true, force: true });
  } catch {
    // best effort
  }
});

test('install.sh --help exits 0 and prints usage', () => {
  const res = runShell(INSTALL_SH, ['--help']);
  assert.strictEqual(res.status, 0, `--help should exit 0, got ${res.status}: ${res.stderr}`);
  assert.match(res.stdout, /Usage:.*install\.sh/);
  assert.match(res.stdout, /--dry-run/);
  assert.match(res.stdout, /--verify/);
  assert.match(res.stdout, /--force/);
});

test('uninstall.sh --help exits 0 and prints usage', () => {
  const res = runShell(UNINSTALL_SH, ['--help']);
  assert.strictEqual(res.status, 0, `--help should exit 0, got ${res.status}: ${res.stderr}`);
  assert.match(res.stdout, /Usage:.*uninstall\.sh/);
  assert.match(res.stdout, /--force/);
});

test('install.sh --dry-run --force does not create ~/.claude/', () => {
  // Confirm temp HOME is clean
  const claudeDir = join(tempHome, '.claude');
  assert.ok(!existsSync(claudeDir), 'precondition: ~/.claude/ must not exist in temp HOME');

  // Disable colors/animations to keep output bounded.
  const res = runShell(INSTALL_SH, ['--dry-run', '--force'], {
    env: { CC_NO_COLOR: '1', CC_NO_ANIMATION: '1', CI: '1' },
  });

  assert.strictEqual(res.status, 0, `--dry-run --force should exit 0, got ${res.status}\nstderr: ${res.stderr}\nstdout (tail): ${res.stdout.slice(-500)}`);

  // Dry run must announce DRY RUN and exit before touching disk.
  assert.match(res.stdout, /DRY RUN|Nothing will be changed/i, 'should announce dry-run mode');

  // Verify nothing was actually written under tempHome/.claude
  assert.ok(!existsSync(claudeDir), '--dry-run must not create ~/.claude/');
});

test('install.sh --verify reports missing install in fresh HOME', () => {
  const claudeDir = join(tempHome, '.claude');
  // ensure clean
  if (existsSync(claudeDir)) rmSync(claudeDir, { recursive: true, force: true });

  const res = runShell(INSTALL_SH, ['--verify'], {
    env: { CC_NO_COLOR: '1', CC_NO_ANIMATION: '1', CI: '1' },
  });

  // --verify exits with the number of errors found; on a fresh HOME this
  // should be > 0 (CLAUDE.md, settings.json, skills, commands all missing).
  assert.notStrictEqual(res.status, 0, '--verify on empty HOME should report errors');
  assert.match(res.stdout, /VERIFICATION/, 'verify section header expected');
  assert.match(res.stdout, /missing|not found/i, 'verify should flag missing components');
});

test('install.sh --verify recognizes a hand-populated fake install', () => {
  const claudeDir = join(tempHome, '.claude');
  // Clean any prior state then build the minimum the verifier looks for.
  if (existsSync(claudeDir)) rmSync(claudeDir, { recursive: true, force: true });

  mkdirSync(join(claudeDir, 'skills', 'demo-skill'), { recursive: true });
  mkdirSync(join(claudeDir, 'commands'), { recursive: true });
  mkdirSync(join(claudeDir, 'hooks'), { recursive: true });
  mkdirSync(join(claudeDir, 'lib'), { recursive: true });
  writeFileSync(join(claudeDir, 'CLAUDE.md'), '# fake CLAUDE.md\n');
  writeFileSync(join(claudeDir, 'settings.json'), '{"model":"claude"}\n');
  writeFileSync(join(claudeDir, 'commands', 'cc.md'), '# cc\n');
  writeFileSync(join(claudeDir, 'hooks', 'hooks.json'), '{}\n');
  writeFileSync(join(claudeDir, 'lib', 'terminal-art.sh'), '# stub\n');
  writeFileSync(join(claudeDir, 'BIBLE.md'), '# fake bible\n');
  writeFileSync(join(claudeDir, 'CHEATSHEET.md'), '# fake cheatsheet\n');
  writeFileSync(join(claudeDir, 'SKILLS-INDEX.md'), '# fake index\n');

  const res = runShell(INSTALL_SH, ['--verify'], {
    env: { CC_NO_COLOR: '1', CC_NO_ANIMATION: '1', CI: '1' },
  });

  // The verifier should report all the components we created. It still may
  // exit non-zero if `claude` CLI isn't on PATH, but the body should show
  // our seeded files as present.
  assert.match(res.stdout, /CLAUDE\.md exists/, 'CLAUDE.md should be detected');
  assert.match(res.stdout, /settings\.json/, 'settings.json should be reported');
  assert.match(res.stdout, /Skills directory/, 'Skills directory should be reported');
  assert.match(res.stdout, /Commands directory/, 'Commands directory should be reported');
});

test('uninstall.sh --force removes kit components but preserves CLAUDE.md, settings.json, and backups', () => {
  const claudeDir = join(tempHome, '.claude');
  // Clean any prior state then re-seed.
  if (existsSync(claudeDir)) rmSync(claudeDir, { recursive: true, force: true });

  // Seed installed components
  mkdirSync(join(claudeDir, 'skills', 'demo-skill'), { recursive: true });
  mkdirSync(join(claudeDir, 'commands'), { recursive: true });
  mkdirSync(join(claudeDir, 'hooks'), { recursive: true });
  mkdirSync(join(claudeDir, 'lib'), { recursive: true });
  mkdirSync(join(claudeDir, 'templates'), { recursive: true });
  writeFileSync(join(claudeDir, 'BIBLE.md'), '# fake\n');
  writeFileSync(join(claudeDir, 'CHEATSHEET.md'), '# fake\n');
  writeFileSync(join(claudeDir, 'SKILLS-INDEX.md'), '# fake\n');

  // Seed user-personal files (must NOT be removed)
  writeFileSync(join(claudeDir, 'CLAUDE.md'), '# user CLAUDE.md\n');
  writeFileSync(join(claudeDir, 'settings.json'), '{"model":"claude"}\n');

  // Seed a backup directory at the location uninstall.sh expects:
  // it looks for "$CLAUDE_DIR.backup.*" — i.e. siblings of ~/.claude/, not children.
  const backupDir = join(tempHome, '.claude.backup.20260424120000');
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, 'old-config.txt'), 'old-data');

  const res = runShell(UNINSTALL_SH, ['--force'], {
    env: { CC_NO_COLOR: '1', CC_NO_ANIMATION: '1', CI: '1' },
  });

  assert.strictEqual(res.status, 0, `uninstall --force should exit 0, got ${res.status}\nstderr: ${res.stderr}\nstdout: ${res.stdout}`);

  // Kit components removed
  assert.ok(!existsSync(join(claudeDir, 'skills')), 'skills/ must be removed');
  assert.ok(!existsSync(join(claudeDir, 'commands')), 'commands/ must be removed');
  assert.ok(!existsSync(join(claudeDir, 'hooks')), 'hooks/ must be removed');
  assert.ok(!existsSync(join(claudeDir, 'lib')), 'lib/ must be removed');
  assert.ok(!existsSync(join(claudeDir, 'templates')), 'templates/ must be removed');
  assert.ok(!existsSync(join(claudeDir, 'BIBLE.md')), 'BIBLE.md must be removed');
  assert.ok(!existsSync(join(claudeDir, 'CHEATSHEET.md')), 'CHEATSHEET.md must be removed');
  assert.ok(!existsSync(join(claudeDir, 'SKILLS-INDEX.md')), 'SKILLS-INDEX.md must be removed');

  // Personal files preserved
  assert.ok(existsSync(join(claudeDir, 'CLAUDE.md')), 'CLAUDE.md must be preserved');
  assert.ok(existsSync(join(claudeDir, 'settings.json')), 'settings.json must be preserved');

  // Backup preserved
  assert.ok(existsSync(backupDir), 'backup directory must be preserved');
  assert.ok(existsSync(join(backupDir, 'old-config.txt')), 'backup contents must survive');
});

test('uninstall.sh on empty HOME exits 0 cleanly', () => {
  // Use a fresh sub-temp so the previous test does not interfere.
  const altHome = mkdtempSync(join(tmpdir(), 'ccc-install-empty-'));
  try {
    const res = spawnSync('bash', [UNINSTALL_SH, '--force'], {
      env: { ...process.env, HOME: altHome, CC_NO_COLOR: '1', CC_NO_ANIMATION: '1', CI: '1' },
      encoding: 'utf8',
      timeout: 30_000,
      cwd: REPO_ROOT,
    });
    assert.strictEqual(res.status, 0, `uninstall on empty HOME should exit 0, got ${res.status}\nstderr: ${res.stderr}`);
    assert.match(res.stdout, /Nothing to uninstall|No kit components|Uninstall complete/i);
  } finally {
    try { rmSync(altHome, { recursive: true, force: true }); } catch {}
  }
});

// Note: A full "real install → real uninstall" round-trip is intentionally
// NOT exercised here because install.sh has external side effects we cannot
// safely run in a hermetic sandbox:
//   - npm install -g @anthropic-ai/claude-code (when claude is missing)
//   - npm install -g context-mode
//   - ln -sf … /usr/local/bin/ccc (requires write access outside HOME)
//   - cc_matrix_rain animation (slow, terminal-only)
// The dry-run + verify + hand-seeded uninstall cover the contract surface.
// A non-interactive --sandbox flag in install.sh would unlock the full
// round-trip; tracked in CC-416 follow-up.
//
// See readdirSync for unused-import lint suppression: the symbol is reserved
// for future expansion to inventory artifacts created by a sandboxed install.
void readdirSync;
