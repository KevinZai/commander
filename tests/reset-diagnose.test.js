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
