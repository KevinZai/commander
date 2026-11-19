'use strict';
// ccc CLI (bin/kc.js) filesystem and update safety: audit findings #01, #21 and #40.
//   - `--skills remove` reuses the install validator, stays inside the skills dir, and unlinks only
//     CC Commander's own links;
//   - `--skills tier` leaves links and directories it did not make;
//   - `--skills` follows CLAUDE_CONFIG_DIR;
//   - a failed npm update exits non-zero.
// Every run uses a temp HOME; nothing touches the real ~/.claude.
//
// Run: node --test tests/kc-cli-safety.test.js

const assert = require('node:assert');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, readFileSync, readlinkSync, symlinkSync, copyFileSync, chmodSync, lstatSync,
} = require('node:fs');
const { join, delimiter } = require('node:path');
const { tmpdir } = require('node:os');

const REPO_ROOT = join(__dirname, '..');
const KC = join(REPO_ROOT, 'bin', 'kc.js');
const SKILLS_SRC = join(REPO_ROOT, 'skills');

function env(home, extra = {}) {
  const e = { ...process.env, HOME: home, CC_NO_COLOR: '1', CC_NO_ANIMATION: '1', CI: '1', ...extra };
  if (!('CLAUDE_CONFIG_DIR' in extra)) delete e.CLAUDE_CONFIG_DIR;
  delete e.CCC_CONFIG_DIR;
  return e;
}
function kc(home, args, extra = {}, script = KC) {
  return spawnSync(process.execPath, [script, ...args], { env: env(home, extra), encoding: 'utf8', timeout: 60_000 });
}
function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), 'ccc-kc-'));
  try { return fn(home); } finally { rmSync(home, { recursive: true, force: true }); }
}
const isLink = (p) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };

test('--skills remove unlinks only CC Commander links inside the skills dir', () => {
  withHome((home) => {
    const skills = join(home, '.claude', 'skills');
    mkdirSync(skills, { recursive: true });
    const elsewhere = join(home, 'my-own-skill');
    mkdirSync(elsewhere);
    symlinkSync(elsewhere, join(skills, 'foreign')); // the user's own link
    mkdirSync(join(skills, 'mine'));

    let r = kc(home, ['--skills', 'install', 'ccc-seo']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(readlinkSync(join(skills, 'ccc-seo')), join(SKILLS_SRC, 'ccc-seo'));

    r = kc(home, ['--skills', 'remove', 'foreign']);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /links outside CC Commander's skills/);
    assert.ok(isLink(join(skills, 'foreign')), 'a foreign link is kept');

    r = kc(home, ['--skills', 'remove', 'mine']);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /not a symlink/);

    for (const bad of ['../outside', '..', 'Foo', 'a/b', '%2e%2e']) {
      r = kc(home, ['--skills', 'remove', bad]);
      assert.strictEqual(r.status, 1, `remove ${bad} must be rejected`);
      assert.match(r.stderr, /Invalid skill name/);
    }

    r = kc(home, ['--skills', 'remove', 'ccc-seo']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(!existsSync(join(skills, 'ccc-seo')));
    assert.deepStrictEqual(readdirSync(skills).sort(), ['foreign', 'mine']);
  });
});

test('--skills remove refuses a link that points outside the skills dir', () => {
  withHome((home) => {
    const skills = join(home, '.claude', 'skills');
    mkdirSync(skills, { recursive: true });
    // Named like a kit skill, but pointing somewhere else entirely
    symlinkSync(join(home, 'not-commander'), join(skills, 'ccc-seo'));
    const r = kc(home, ['--skills', 'remove', 'ccc-seo']);
    assert.strictEqual(r.status, 1);
    assert.ok(isLink(join(skills, 'ccc-seo')));
  });
});

test('--skills tier keeps links and directories CC Commander did not make', () => {
  withHome((home) => {
    const skills = join(home, '.claude', 'skills');
    mkdirSync(skills, { recursive: true });
    symlinkSync(join(home, 'elsewhere'), join(skills, 'foreign'));
    mkdirSync(join(skills, 'mine'));
    symlinkSync(join(SKILLS_SRC, 'ccc-seo'), join(skills, 'ccc-seo'));
    const r = kc(home, ['--skills', 'tier', 'essential']);
    assert.strictEqual(r.status, 0, r.stderr);
    // ccc-seo stays in the essential tier, so its link is kept in place rather than removed and re-made
    assert.match(r.stdout, /Removed: 0 skill\(s\) \(1 link\(s\) not made by CC Commander kept\)/);
    assert.ok(isLink(join(skills, 'foreign')));
    assert.ok(lstatSync(join(skills, 'mine')).isDirectory());
    assert.strictEqual(readlinkSync(join(skills, 'ccc-seo')), join(SKILLS_SRC, 'ccc-seo'), 'tier skill relinked');
  });
});

test('--skills follows CLAUDE_CONFIG_DIR and records links in an existing install manifest', () => {
  withHome((home) => {
    const cfg = join(home, 'claude-work');
    mkdirSync(join(cfg, 'commander'), { recursive: true });
    const manifest = join(cfg, 'commander', 'install-manifest.json');
    writeFileSync(manifest, JSON.stringify({ schema: 1, claude_dir: cfg, entries: [], dirs: [] }));
    let r = kc(home, ['--skills', 'install', 'ccc-seo'], { CLAUDE_CONFIG_DIR: cfg });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(isLink(join(cfg, 'skills', 'ccc-seo')));
    assert.ok(!existsSync(join(home, '.claude')), 'the default profile is not touched');
    const entries = JSON.parse(readFileSync(manifest, 'utf8')).entries;
    assert.deepStrictEqual(entries, [{ group: 'skills', path: 'skills/ccc-seo', type: 'symlink', target: join(SKILLS_SRC, 'ccc-seo') }]);
    r = kc(home, ['--skills', 'remove', 'ccc-seo'], { CLAUDE_CONFIG_DIR: cfg });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.deepStrictEqual(JSON.parse(readFileSync(manifest, 'utf8')).entries, []);
  });
});

// Audit P2: a skill link that displaced the user's own entry carries a backup reference. Removal restores it,
// and a tier switch that keeps the skill keeps the reference.
test('--skills remove and tier restore or carry the displaced original', () => {
  withHome((home) => {
    const claude = join(home, '.claude');
    const skills = join(claude, 'skills');
    mkdirSync(join(claude, 'commander'), { recursive: true });
    mkdirSync(skills, { recursive: true });
    const backupDir = join(home, '.claude.backup.1', 'skills');
    mkdirSync(backupDir, { recursive: true });
    symlinkSync(join(home, 'my-seo'), join(backupDir, 'ccc-seo')); // the user's original link, backed up
    symlinkSync(join(home, 'my-abtest'), join(backupDir, 'ab-test-setup'));
    symlinkSync(join(SKILLS_SRC, 'ccc-seo'), join(skills, 'ccc-seo'));
    symlinkSync(join(SKILLS_SRC, 'ab-test-setup'), join(skills, 'ab-test-setup'));
    const manifest = join(claude, 'commander', 'install-manifest.json');
    writeFileSync(manifest, JSON.stringify({ schema: 1, claude_dir: claude, dirs: [], entries: [
      { group: 'skills', path: 'skills/ccc-seo', type: 'symlink', target: join(SKILLS_SRC, 'ccc-seo'), backup: join(backupDir, 'ccc-seo') },
      { group: 'skills', path: 'skills/ab-test-setup', type: 'symlink', target: join(SKILLS_SRC, 'ab-test-setup'), backup: join(backupDir, 'ab-test-setup') },
    ] }));
    const essential = JSON.parse(readFileSync(join(SKILLS_SRC, '_tiers.json'), 'utf8')).tiers.essential.skills;
    assert.ok(essential.includes('ccc-seo'));

    let r = kc(home, ['--skills', 'tier', 'essential']);
    assert.strictEqual(r.status, 0, r.stderr);
    const seo = JSON.parse(readFileSync(manifest, 'utf8')).entries.find((e) => e.path === 'skills/ccc-seo');
    assert.strictEqual(seo.backup, join(backupDir, 'ccc-seo'), 'tier switch keeps the backup reference');
    assert.ok(!essential.includes('ab-test-setup'));
    assert.strictEqual(readlinkSync(join(skills, 'ab-test-setup')), join(home, 'my-abtest'), 'dropped skill: original restored');

    r = kc(home, ['--skills', 'remove', 'ccc-seo']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(readlinkSync(join(skills, 'ccc-seo')), join(home, 'my-seo'), 'removal restores the original');
    assert.ok(!JSON.parse(readFileSync(manifest, 'utf8')).entries.some((e) => e.path === 'skills/ccc-seo'));
  });
});

// Audit #01: a skills/ dir linked to shared dotfiles is never pruned through.
test('--skills remove and tier refuse a symlinked skills dir', () => {
  withHome((home) => {
    const shared = join(home, 'dotfiles', 'skills');
    mkdirSync(shared, { recursive: true });
    mkdirSync(join(home, '.claude'), { recursive: true });
    symlinkSync(join(SKILLS_SRC, 'ccc-seo'), join(shared, 'ccc-seo'));
    symlinkSync(shared, join(home, '.claude', 'skills'));
    let r = kc(home, ['--skills', 'remove', 'ccc-seo']);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /refusing to remove through it/);
    r = kc(home, ['--skills', 'tier', 'essential']);
    assert.strictEqual(r.status, 1);
    assert.ok(isLink(join(shared, 'ccc-seo')), 'the shared link is kept');
  });
});

test('--update exits non-zero when npm update fails', () => {
  withHome((home) => {
    // A copy of the CLI outside any git checkout takes the npm update path
    const pkg = join(home, 'pkg');
    mkdirSync(join(pkg, 'bin'), { recursive: true });
    copyFileSync(KC, join(pkg, 'bin', 'kc.js'));
    const fakeBin = join(home, 'fake-bin');
    mkdirSync(fakeBin);
    writeFileSync(join(fakeBin, 'npm'), '#!/bin/sh\necho "npm ERR! simulated failure" >&2\nexit 1\n');
    chmodSync(join(fakeBin, 'npm'), 0o755);
    const r = kc(home, ['--update'], { PATH: fakeBin + delimiter + process.env.PATH }, join(pkg, 'bin', 'kc.js'));
    assert.strictEqual(r.status, 1, `expected exit 1, got ${r.status}\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /npm update failed/);
  });
});

// Codex review of #298: an alias into the checkout under another name is the user's link, and a tier switch
// records the new tier so the next install keeps it.
test('--skills tier keeps a renamed alias into the checkout and records the tier in the manifest', () => {
  withHome((home) => {
    const claude = join(home, '.claude');
    const skills = join(claude, 'skills');
    mkdirSync(skills, { recursive: true });
    mkdirSync(join(claude, 'commander'), { recursive: true });
    const manifest = join(claude, 'commander', 'install-manifest.json');
    writeFileSync(manifest, JSON.stringify({ schema: 1, claude_dir: claude, tier: 'essential', entries: [], dirs: [] }));
    symlinkSync(join(SKILLS_SRC, 'ccc-seo'), join(skills, 'my-seo'));
    const r = kc(home, ['--skills', 'tier', 'recommended']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(isLink(join(skills, 'my-seo')), 'alias kept');
    assert.strictEqual(JSON.parse(readFileSync(manifest, 'utf8')).tier, 'recommended');
  });
});

// Codex review of #298: --skills install checks containment before it links, and a copied manifest is not updated.
test('--skills install refuses a symlinked skills dir and leaves a foreign manifest unchanged', () => {
  withHome((home) => {
    const claude = join(home, '.claude');
    const shared = join(home, 'shared-skills');
    mkdirSync(shared, { recursive: true });
    mkdirSync(join(claude, 'commander'), { recursive: true });
    symlinkSync(shared, join(claude, 'skills'));
    let r = kc(home, ['--skills', 'install', 'ccc-seo']);
    assert.notStrictEqual(r.status, 0, 'must refuse');
    assert.deepStrictEqual(readdirSync(shared), [], 'nothing linked into the shared dir');

    rmSync(join(claude, 'skills'));
    const manifest = join(claude, 'commander', 'install-manifest.json');
    const foreign = JSON.stringify({ schema: 1, claude_dir: join(home, 'other'), entries: [], dirs: [] });
    writeFileSync(manifest, foreign);
    r = kc(home, ['--skills', 'install', 'ccc-seo']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(readFileSync(manifest, 'utf8'), foreign, 'foreign manifest untouched');
  });
});

// CC-2186: on POSIX a backslash is a file-name character, so a sibling profile named "<home>\"
// is its own directory, not the home directory with a trailing separator.
test('--skills accepts a POSIX profile whose name ends in a backslash', { skip: process.platform === 'win32' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'ccc-kc-'));
  try {
    const home = join(root, 'home');
    const cfg = `${home}\\`;
    mkdirSync(home);
    mkdirSync(cfg);
    const r = kc(home, ['--skills', 'install', 'ccc-seo'], { CLAUDE_CONFIG_DIR: cfg });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stderr, /home directory/);
    assert.ok(isLink(join(cfg, 'skills', 'ccc-seo')));
    assert.ok(!existsSync(join(home, 'skills')), 'the home directory is untouched');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Codex review, HIGH 7: profile B holding a copy of profile A's manifest gets no authority from it. The
// ownership check runs before any row or backup reference is consumed.
test('--skills remove and tier ignore a manifest copied from another profile', () => {
  withHome((home) => {
    const a = join(home, 'profile-a');
    const b = join(home, 'profile-b');
    const userTarget = join(home, 'user-seo');
    mkdirSync(userTarget);
    const backupDir = join(home, 'a-backup');
    mkdirSync(backupDir);
    symlinkSync(join(home, 'a-original'), join(backupDir, 'ab-test-setup'));
    const manifestA = JSON.stringify({ schema: 1, claude_dir: a, dirs: [], entries: [
      { group: 'skills', path: 'skills/ccc-seo', type: 'symlink', target: userTarget },
      { group: 'skills', path: 'skills/ab-test-setup', type: 'symlink', target: join(SKILLS_SRC, 'ab-test-setup'), backup: join(backupDir, 'ab-test-setup') },
    ] });
    for (const p of [a, b]) mkdirSync(join(p, 'commander'), { recursive: true });
    writeFileSync(join(a, 'commander', 'install-manifest.json'), manifestA);
    writeFileSync(join(b, 'commander', 'install-manifest.json'), manifestA);   // copied into B
    mkdirSync(join(b, 'skills'));
    symlinkSync(userTarget, join(b, 'skills', 'ccc-seo'));                    // same target A recorded
    symlinkSync(join(SKILLS_SRC, 'ab-test-setup'), join(b, 'skills', 'ab-test-setup'));

    let r = kc(home, ['--skills', 'remove', 'ccc-seo'], { CLAUDE_CONFIG_DIR: b });
    assert.strictEqual(r.status, 1, 'A\'s row must not authorize removing B\'s link');
    assert.match(r.stderr, /links outside CC Commander's skills/);
    assert.ok(isLink(join(b, 'skills', 'ccc-seo')));

    r = kc(home, ['--skills', 'remove', 'ab-test-setup'], { CLAUDE_CONFIG_DIR: b });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(!isLink(join(b, 'skills', 'ab-test-setup')), 'A\'s backup is not restored into B');
    assert.doesNotMatch(r.stdout, /restored/);

    r = kc(home, ['--skills', 'tier', 'essential'], { CLAUDE_CONFIG_DIR: b });
    assert.ok(isLink(join(b, 'skills', 'ccc-seo')) && readlinkSync(join(b, 'skills', 'ccc-seo')) === userTarget, 'tier keeps B\'s own link');
    assert.strictEqual(readFileSync(join(b, 'commander', 'install-manifest.json'), 'utf8'), manifestA, 'copied manifest untouched');
    assert.strictEqual(readFileSync(join(a, 'commander', 'install-manifest.json'), 'utf8'), manifestA, 'A untouched');
  });
});

// Codex review, MEDIUM 5: a tier name is an own key of _tiers.json, never a prototype member, and so is every
// tier it includes; an invalid one changes nothing.
test('--skills tier refuses prototype names before removing any link', () => {
  withHome((home) => {
    const skills = join(home, '.claude', 'skills');
    mkdirSync(skills, { recursive: true });
    symlinkSync(join(SKILLS_SRC, 'ccc-seo'), join(skills, 'ccc-seo'));
    for (const bad of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const r = kc(home, ['--skills', 'tier', bad]);
      assert.strictEqual(r.status, 1, bad);
      assert.match(r.stderr, /Unknown tier/);
      assert.ok(isLink(join(skills, 'ccc-seo')), `${bad}: managed link kept`);
    }
  });
});

test('--skills tier refuses an include of an unknown or prototype tier, and an include cycle', () => {
  withHome((home) => {
    const pkg = join(home, 'pkg');
    mkdirSync(join(pkg, 'bin'), { recursive: true });
    copyFileSync(KC, join(pkg, 'bin', 'kc.js'));
    symlinkSync(join(REPO_ROOT, 'commander'), join(pkg, 'commander'));   // the shared profile resolver
    mkdirSync(join(pkg, 'skills', 'alpha'), { recursive: true });
    writeFileSync(join(pkg, 'skills', '_tiers.json'), JSON.stringify({ tiers: {
      proto: { skills: [], includes: ['constructor'] },
      missing: { skills: [], includes: ['nope'] },
      loop: { skills: [], includes: ['loop2'] },
      loop2: { skills: [], includes: ['loop'] },
    } }));
    const skills = join(home, '.claude', 'skills');
    mkdirSync(skills, { recursive: true });
    symlinkSync(join(pkg, 'skills', 'alpha'), join(skills, 'alpha'));
    for (const tier of ['proto', 'missing', 'loop']) {
      const r = kc(home, ['--skills', 'tier', tier], {}, join(pkg, 'bin', 'kc.js'));
      assert.strictEqual(r.status, 1, `${tier}: ${r.stdout}${r.stderr}`);
      assert.match(r.stderr, /Unknown tier|includes itself/);
      assert.ok(isLink(join(skills, 'alpha')), `${tier}: managed link kept`);
    }
  });
});

// Codex review, HIGH 8: a subcommand's argument values never reach the global flag scans.
test('ccc next does not let an argument value select another command', () => {
  withHome((home) => {
    // A copy of the CLI outside any git checkout: if --update were selected it would run the fake npm.
    const pkg = join(home, 'pkg');
    mkdirSync(join(pkg, 'bin'), { recursive: true });
    copyFileSync(KC, join(pkg, 'bin', 'kc.js'));
    symlinkSync(join(REPO_ROOT, 'commander'), join(pkg, 'commander'));
    const fakeBin = join(home, 'fake-bin');
    mkdirSync(fakeBin);
    const marker = join(home, 'npm-ran');
    writeFileSync(join(fakeBin, 'npm'), `#!/bin/sh\ntouch "${marker}"\n`);
    chmodSync(join(fakeBin, 'npm'), 0o755);
    const extra = { PATH: fakeBin + delimiter + process.env.PATH };
    for (const argv of [['next', '--description', '--update'], ['next', '--title', '--help'], ['next', '--title', '--skills', 'tier', 'constructor']]) {
      const r = spawnSync(process.execPath, [join(pkg, 'bin', 'kc.js'), ...argv], { env: env(home, extra), encoding: 'utf8', input: '', timeout: 60_000 });
      assert.ok(!existsSync(marker), `${argv.join(' ')}: the updater must not run`);
      assert.doesNotMatch(r.stdout, /CC Commander — Update|Usage: {2}ccc|Switched to tier|Unknown tier/, argv.join(' '));
    }
  });
});

// Codex review, MEDIUM 7: on a detached checkout, --update applies install-remote.sh's checks and takes the
// release tag from origin, never from local tags.
function makeUpdateUpstream(root) {
  const up = join(root, 'up');
  mkdirSync(join(up, 'bin'), { recursive: true });
  mkdirSync(join(up, 'commander'), { recursive: true });
  const git = (dir, ...a) => {
    const r = spawnSync('git', ['-C', dir, '-c', 'user.email=t@example.com', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  git(up, 'init', '-q');
  copyFileSync(KC, join(up, 'bin', 'kc.js'));
  writeFileSync(join(up, 'install.sh'), '#!/bin/bash\necho "STUB INSTALL $*"\n');
  writeFileSync(join(up, 'commander', 'engine.js'), '// 1\n');
  git(up, 'add', '-A'); git(up, 'commit', '-qm', 'one'); git(up, 'tag', '-a', 'v1.0.0', '-m', 'v1.0.0');
  writeFileSync(join(up, 'commander', 'engine.js'), '// 2\n');
  git(up, 'commit', '-qam', 'two'); git(up, 'tag', 'v1.2.0');
  writeFileSync(join(up, 'commander', 'engine.js'), '// 3 (unreleased)\n');
  git(up, 'commit', '-qam', 'three');
  git(up, 'branch', 'release-candidate');              // a mutable branch, never a valid pin
  const url = 'file://' + up;
  const clone = (dir) => {
    const r = spawnSync('git', ['clone', '-q', url, dir], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    git(dir, 'checkout', '-q', '--detach', 'v1.0.0');
  };
  return { url, git, clone, rev: (r) => git(up, 'rev-parse', r + '^{commit}') };
}

test('--update on a detached checkout ignores local-only tags and applies install-remote checks', () => {
  withHome((home) => {
    const up = makeUpdateUpstream(home);
    const dir = join(home, 'ccc');
    up.clone(dir);
    up.git(dir, 'tag', 'v9.9.9');                       // local-only (or withdrawn) tag, higher than any release
    const update = (extra = {}) => spawnSync(process.execPath, [join(dir, 'bin', 'kc.js'), '--update'],
      { env: env(home, { CCC_REPO_URL: up.url, ...extra }), encoding: 'utf8', timeout: 60_000 });
    const head = () => up.git(dir, 'rev-parse', 'HEAD');

    let r = update({ CCC_REF: 'v9.9.9' });
    assert.strictEqual(r.status, 1, 'a tag origin does not have is refused');
    assert.doesNotMatch(r.stdout, /STUB INSTALL/);
    assert.strictEqual(head(), up.rev('v1.0.0'));

    writeFileSync(join(dir, 'commander', 'engine.js'), '// local edit\n');
    r = update();
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /has local changes/);
    assert.doesNotMatch(r.stdout, /STUB INSTALL/);
    up.git(dir, 'checkout', '-q', '--', 'commander/engine.js');

    up.git(dir, 'remote', 'set-url', 'origin', 'https://example.com/someone-else/commander.git');
    r = update();
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /Refusing to update it/);
    assert.doesNotMatch(r.stdout, /STUB INSTALL/);
    up.git(dir, 'remote', 'set-url', 'origin', up.url);

    r = update();
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual(head(), up.rev('v1.2.0'), 'the newest tag on origin, not the local v9.9.9');
    assert.match(r.stdout, /STUB INSTALL --force/);
  });
});

// Codex review, round 2, finding 4: a CCC_REF that is not a commit must be a tag on origin. A branch name is
// refused before anything is fetched or checked out; lightweight and annotated tags are pinned exactly.
test('--update refuses a branch as CCC_REF and pins lightweight and annotated tags exactly', () => {
  withHome((home) => {
    const up = makeUpdateUpstream(home);
    const dir = join(home, 'ccc');
    up.clone(dir);
    const update = (extra = {}) => spawnSync(process.execPath, [join(dir, 'bin', 'kc.js'), '--update'],
      { env: env(home, { CCC_REPO_URL: up.url, ...extra }), encoding: 'utf8', timeout: 60_000 });
    const head = () => up.git(dir, 'rev-parse', 'HEAD');

    let r = update({ CCC_REF: 'release-candidate' });
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /is not a release tag on/);
    assert.doesNotMatch(r.stdout, /STUB INSTALL/);
    assert.strictEqual(head(), up.rev('v1.0.0'), 'HEAD unchanged');

    r = update({ CCC_REF: 'v1.2.0' });                  // lightweight tag
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual(head(), up.rev('v1.2.0'));
    assert.match(r.stdout, /STUB INSTALL --force/);

    r = update({ CCC_REF: 'v1.0.0' });                  // annotated tag, peeled
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual(head(), up.rev('v1.0.0'));
  });
});
