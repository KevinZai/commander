// scripts/diagnose-ccc-sources.sh and scripts/reset-commander-install.sh,
// run against a temp HOME with a minimal PATH (fake tools only), never the
// real home directory.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIAGNOSE = path.join(ROOT, 'scripts', 'diagnose-ccc-sources.sh');
const RESET = path.join(ROOT, 'scripts', 'reset-commander-install.sh');

function sandbox() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-reset-'));
  const bin = path.join(home, 'fakebin');
  fs.mkdirSync(bin);
  fs.symlinkSync(process.execPath, path.join(bin, 'node'));
  // npm ls -g must not read the real global prefix.
  fs.writeFileSync(path.join(bin, 'npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  return { home, bin };
}

function git(cwd, ...args) {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'init.defaultBranch=main', ...args], { cwd, encoding: 'utf8' });
}

function makeCheckout(home, { dirty = false } = {}) {
  const dir = path.join(home, '.cc-commander');
  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'bin', 'kc.js'), '#!/usr/bin/env node\nconsole.log("8.1.7")\n', { mode: 0o755 });
  git(dir, 'init', '-q');
  git(dir, 'remote', 'add', 'origin', 'https://github.com/KevinZai/commander.git');
  git(dir, 'add', '.');
  git(dir, 'commit', '-qm', 'init');
  if (dirty) fs.writeFileSync(path.join(dir, 'notes.txt'), 'my local notes\n');
  return dir;
}

function run(script, args, sb) {
  const env = {
    HOME: sb.home,
    PATH: `${sb.bin}:/usr/bin:/bin`,
    TERM: 'dumb',
    CC_NO_COLOR: '1',
  };
  return spawnSync('bash', [script, ...args], { env, encoding: 'utf8', timeout: 30000 });
}

test('diagnose names the current checkout', () => {
  const sb = sandbox();
  try {
    const dir = makeCheckout(sb.home);
    fs.symlinkSync(path.join(dir, 'bin', 'kc.js'), path.join(sb.bin, 'ccc'));
    fs.mkdirSync(path.join(sb.home, '.claude', 'commander'), { recursive: true });
    const r = run(DIAGNOSE, [], sb);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Current CLI checkout: .*\.cc-commander/);
    assert.match(r.stdout, /Current CLI binary: /);
    assert.doesNotMatch(r.stdout, /LEGACY/);
    assert.doesNotMatch(r.stdout, /--full/);
  } finally {
    fs.rmSync(sb.home, { recursive: true, force: true });
  }
});

test('diagnose still flags a checkout of another repository as legacy', () => {
  const sb = sandbox();
  try {
    const dir = makeCheckout(sb.home);
    git(dir, 'remote', 'set-url', 'origin', 'https://example.com/someone/fork.git');
    const r = run(DIAGNOSE, [], sb);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /LEGACY trail: .*\.cc-commander/);
  } finally {
    fs.rmSync(sb.home, { recursive: true, force: true });
  }
});

test('--full refuses a dirty checkout', () => {
  const sb = sandbox();
  try {
    const dir = makeCheckout(sb.home, { dirty: true });
    // Without --remove-checkout the checkout is always kept.
    let r = run(RESET, ['--full'], sb);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(fs.existsSync(path.join(dir, 'notes.txt')), 'checkout kept without --remove-checkout');
    assert.match(r.stdout, /--remove-checkout/);

    // With --remove-checkout but an archive that does not verify, it is kept too.
    fs.writeFileSync(path.join(sb.bin, 'tar'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    r = run(RESET, ['--full', '--remove-checkout'], sb);
    assert.notEqual(r.status, 0);
    assert.ok(fs.existsSync(path.join(dir, 'notes.txt')), 'dirty checkout kept when its archive fails');
  } finally {
    fs.rmSync(sb.home, { recursive: true, force: true });
  }
});

test('--remove-checkout archives a dirty checkout before removing it', () => {
  const sb = sandbox();
  try {
    const dir = makeCheckout(sb.home, { dirty: true });
    const r = run(RESET, ['--full', '--remove-checkout'], sb);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(!fs.existsSync(dir), 'checkout removed');
    const backups = fs.readdirSync(path.join(sb.home, '.claude', 'backups'));
    const archive = path.join(sb.home, '.claude', 'backups', backups[0], 'cc-commander-checkout.tar.gz');
    const listing = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' });
    assert.match(listing, /\.cc-commander\/notes\.txt/);
  } finally {
    fs.rmSync(sb.home, { recursive: true, force: true });
  }
});

test('command files are backed up before removal', () => {
  const sb = sandbox();
  try {
    const cmds = path.join(sb.home, '.claude', 'commands');
    fs.mkdirSync(cmds, { recursive: true });
    fs.writeFileSync(path.join(cmds, 'ccc.md'), 'edited by me\n');
    fs.writeFileSync(path.join(cmds, 'commander-x.md'), 'x\n');
    fs.writeFileSync(path.join(cmds, 'other.md'), 'keep\n');
    const r = run(RESET, ['--full'], sb);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(!fs.existsSync(path.join(cmds, 'ccc.md')));
    assert.ok(fs.existsSync(path.join(cmds, 'other.md')));
    const backups = fs.readdirSync(path.join(sb.home, '.claude', 'backups'));
    const saved = path.join(sb.home, '.claude', 'backups', backups[0], 'commands');
    assert.equal(fs.readFileSync(path.join(saved, 'ccc.md'), 'utf8'), 'edited by me\n');
    assert.ok(fs.existsSync(path.join(saved, 'commander-x.md')));
  } finally {
    fs.rmSync(sb.home, { recursive: true, force: true });
  }
});

test('a failed command-file backup aborts before removal', () => {
  const sb = sandbox();
  try {
    const cmds = path.join(sb.home, '.claude', 'commands');
    fs.mkdirSync(cmds, { recursive: true });
    fs.writeFileSync(path.join(cmds, 'ccc.md'), 'edited by me\n');
    fs.writeFileSync(path.join(sb.bin, 'cp'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    const r = run(RESET, ['--full'], sb);
    assert.notEqual(r.status, 0);
    assert.ok(fs.existsSync(path.join(cmds, 'ccc.md')), 'command file kept when its backup fails');
  } finally {
    fs.rmSync(sb.home, { recursive: true, force: true });
  }
});

// Codex #302 H10: a clean checkout still holds ignored files and local-only commits; it is archived before removal.
test('--remove-checkout archives a clean checkout with an ignored .env and a local-only commit', () => {
  const sb = sandbox();
  try {
    const dir = makeCheckout(sb.home);
    fs.writeFileSync(path.join(dir, '.gitignore'), '.env\n');
    git(dir, 'add', '.gitignore');
    git(dir, 'commit', '-qm', 'local only');
    fs.writeFileSync(path.join(dir, '.env'), 'SECRET=1\n');
    assert.equal(git(dir, 'status', '--porcelain'), '', 'the checkout is clean by porcelain');
    const r = run(RESET, ['--full', '--remove-checkout'], sb);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(!fs.existsSync(dir), 'checkout removed');
    assert.match(r.stdout, /commit\(s\) on no remote/);
    const backups = fs.readdirSync(path.join(sb.home, '.claude', 'backups'));
    const archive = path.join(sb.home, '.claude', 'backups', backups[0], 'cc-commander-checkout.tar.gz');
    const listing = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' });
    assert.match(listing, /\.cc-commander\/\.env/);
    assert.match(listing, /\.cc-commander\/\.git\//);
  } finally {
    fs.rmSync(sb.home, { recursive: true, force: true });
  }
});

test('a clean checkout is kept when its archive fails', () => {
  const sb = sandbox();
  try {
    const dir = makeCheckout(sb.home);
    fs.writeFileSync(path.join(sb.bin, 'tar'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    const r = run(RESET, ['--full', '--remove-checkout'], sb);
    assert.notEqual(r.status, 0);
    assert.ok(fs.existsSync(path.join(dir, 'bin', 'kc.js')), 'clean checkout kept when its archive fails');
  } finally {
    fs.rmSync(sb.home, { recursive: true, force: true });
  }
});

// Codex #302 H10: commands of the current install are not legacy.
test('diagnose and reset leave the current install\'s commands alone', () => {
  const sb = sandbox();
  try {
    const cmds = path.join(sb.home, '.claude', 'commands');
    fs.mkdirSync(cmds, { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'commands', 'ccc-audit.md'), path.join(cmds, 'ccc-audit.md'));
    fs.writeFileSync(path.join(cmds, 'ccc-recorded.md'), 'recorded by the manifest\n');
    fs.writeFileSync(path.join(cmds, 'ccc-old-thing.md'), 'from v1\n');
    fs.mkdirSync(path.join(sb.home, '.claude', 'commander'), { recursive: true });
    fs.writeFileSync(path.join(sb.home, '.claude', 'commander', 'install-manifest.json'),
      JSON.stringify({ entries: [{ group: 'commands', type: 'file', path: 'commands/ccc-recorded.md' }] }));
    const d = run(DIAGNOSE, [], sb);
    assert.equal(d.status, 0, d.stderr);
    assert.match(d.stdout, /LEGACY user command: .*ccc-old-thing\.md/);
    assert.doesNotMatch(d.stdout, /LEGACY user command: .*ccc-audit\.md/);
    assert.doesNotMatch(d.stdout, /LEGACY user command: .*ccc-recorded\.md/);
    assert.match(d.stdout, /2 command file\(s\) from the current CC Commander install/);
    const r = run(RESET, ['--full'], sb);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(!fs.existsSync(path.join(cmds, 'ccc-old-thing.md')), 'legacy command removed');
    assert.ok(fs.existsSync(path.join(cmds, 'ccc-audit.md')), 'shipped command kept');
    assert.ok(fs.existsSync(path.join(cmds, 'ccc-recorded.md')), 'manifest-recorded command kept');
    assert.match(r.stdout, /Keeping 2 command file\(s\) of the current install/);
  } finally {
    fs.rmSync(sb.home, { recursive: true, force: true });
  }
});
