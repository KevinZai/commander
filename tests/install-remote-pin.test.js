'use strict';
// install-remote.sh pins a release exactly: a CCC_REF that is not a commit is resolved only as the tag
// refs/tags/<ref> on the repository (peeled when annotated), fetched as that exact ref and checked against it.
// A branch, or a longer ref that merely ends in the same text, is refused before anything is fetched or
// installed. `ccc --update` applies the same rule (tests/kc-cli-safety.test.js). Codex review, round 3.
//
// Every run uses a temp HOME and a local file:// upstream; the installer is a stub.
// Run: node --test tests/install-remote-pin.test.js

const assert = require('node:assert');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, chmodSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const INSTALL_REMOTE_SH = join(__dirname, '..', 'install-remote.sh');

function makeUpstream(root) {
  const up = join(root, 'up');
  mkdirSync(join(up, 'bin'), { recursive: true });
  mkdirSync(join(up, 'commander'), { recursive: true });
  const git = (dir, ...a) => {
    const r = spawnSync('git', ['-C', dir, '-c', 'user.email=t@example.com', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  git(up, 'init', '-q');
  writeFileSync(join(up, 'package.json'), '{"version":"1.0.0"}\n');
  writeFileSync(join(up, 'install.sh'), '#!/bin/bash\necho "STUB INSTALL $*"\n');
  chmodSync(join(up, 'install.sh'), 0o755);
  writeFileSync(join(up, 'bin', 'kc.js'), '//\n');
  writeFileSync(join(up, 'commander', 'engine.js'), '// 1\n');
  git(up, 'add', '-A'); git(up, 'commit', '-qm', 'one'); git(up, 'tag', '-a', 'v1.0.0', '-m', 'v1.0.0');
  writeFileSync(join(up, 'commander', 'engine.js'), '// 2\n');
  git(up, 'commit', '-qam', 'two'); git(up, 'tag', 'v1.2.0');
  writeFileSync(join(up, 'commander', 'engine.js'), '// 3 (unreleased)\n');
  git(up, 'commit', '-qam', 'three');
  git(up, 'branch', 'release-candidate');             // mutable branch: never a valid pin
  git(up, 'tag', 'evil/refs/tags/v3.0.0');             // ends in refs/tags/v3.0.0 but is not that tag
  return { url: 'file://' + up, git, rev: (r) => git(up, 'rev-parse', r + '^{commit}') };
}

function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), 'ccc-remote-pin-'));
  try { return fn(home); } finally { rmSync(home, { recursive: true, force: true }); }
}
function run(home, extra) {
  const env = { ...process.env, HOME: home, CC_NO_COLOR: '1', CC_NO_ANIMATION: '1', CI: '1', ...extra };
  delete env.CLAUDE_CONFIG_DIR;
  delete env.CCC_CONFIG_DIR;
  if (!('CCC_REF' in extra)) delete env.CCC_REF;
  return spawnSync('bash', [INSTALL_REMOTE_SH], { env, encoding: 'utf8', timeout: 120_000, input: '' });
}

test('install-remote.sh refuses a branch or a look-alike ref on a fresh install', () => {
  withHome((home) => {
    const up = makeUpstream(home);
    for (const ref of ['release-candidate', 'v3.0.0']) {
      const dir = join(home, 'fresh-' + ref.replace(/\W/g, '_'));
      const r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir, CCC_REF: ref });
      assert.notStrictEqual(r.status, 0, ref);
      assert.match(r.stdout, /is not a release tag on/, ref);
      assert.doesNotMatch(r.stdout, /STUB INSTALL/, ref);
      assert.ok(!existsSync(dir), `${ref}: nothing was cloned`);
    }
  });
});

test('install-remote.sh pins lightweight and annotated tags exactly and refuses a branch on update', () => {
  withHome((home) => {
    const up = makeUpstream(home);
    const dir = join(home, '.cc-commander');
    const head = () => up.git(dir, 'rev-parse', 'HEAD');
    let r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir, CCC_REF: 'v1.2.0' });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual(head(), up.rev('v1.2.0'));
    assert.match(r.stdout, /STUB INSTALL --force/);

    r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir, CCC_REF: 'release-candidate' });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stdout, /is not a release tag on/);
    assert.doesNotMatch(r.stdout, /STUB INSTALL/);
    assert.strictEqual(head(), up.rev('v1.2.0'), 'existing checkout unchanged');

    r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir, CCC_REF: 'v1.0.0' });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual(head(), up.rev('v1.0.0'), 'annotated tag peeled');

    r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir, CCC_REF: up.rev('v1.2.0') });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual(head(), up.rev('v1.2.0'), 'a full commit SHA still works');
  });
});

// M10: the script installs the release it ships with unless told otherwise, and CCC_EXPECTED_COMMIT pins the
// exact commit: a mismatch stops before checkout or install.
test('install-remote.sh defaults to its embedded release; CCC_REF=latest picks the newest tag', () => {
  const shipped = require('../package.json').version;
  const src = require('node:fs').readFileSync(INSTALL_REMOTE_SH, 'utf8');
  assert.match(src, new RegExp('^CCC_SHIPPED_REF="v' + shipped.replace(/\./g, '\\.') + '"$', 'm'));
  withHome((home) => {
    const up = makeUpstream(home);
    const dir = join(home, '.cc-commander');
    let r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir });
    assert.match(r.stdout, new RegExp('Release: v' + shipped.replace(/\./g, '\\.')));
    assert.notStrictEqual(r.status, 0, 'the fixture repo has no such tag');
    r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir, CCC_REF: 'latest' });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual(up.git(dir, 'rev-parse', 'HEAD'), up.rev('v1.2.0'));
  });
});

test('install-remote.sh refuses a fetched commit other than CCC_EXPECTED_COMMIT', () => {
  withHome((home) => {
    const up = makeUpstream(home);
    const dir = join(home, '.cc-commander');
    let r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir, CCC_REF: 'v1.2.0', CCC_EXPECTED_COMMIT: up.rev('v1.0.0') });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stdout, /CCC_EXPECTED_COMMIT/);
    assert.doesNotMatch(r.stdout, /STUB INSTALL/);
    r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir, CCC_REF: 'v1.2.0', CCC_EXPECTED_COMMIT: 'not-a-sha' });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stdout, /CCC_EXPECTED_COMMIT must be a full 40-character commit/);
    r = run(home, { CCC_REPO_URL: up.url, CCC_INSTALL_DIR: dir, CCC_REF: 'v1.2.0', CCC_EXPECTED_COMMIT: up.rev('v1.2.0').toUpperCase() });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /STUB INSTALL/);
  });
});
