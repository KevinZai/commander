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
    writeFileSync(manifest, JSON.stringify({ schema: 1, entries: [], dirs: [] }));
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
    writeFileSync(manifest, JSON.stringify({ schema: 1, dirs: [], entries: [
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
    writeFileSync(manifest, JSON.stringify({ schema: 1, tier: 'essential', entries: [], dirs: [] }));
    symlinkSync(join(SKILLS_SRC, 'ccc-seo'), join(skills, 'my-seo'));
    const r = kc(home, ['--skills', 'tier', 'recommended']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(isLink(join(skills, 'my-seo')), 'alias kept');
    assert.strictEqual(JSON.parse(readFileSync(manifest, 'utf8')).tier, 'recommended');
  });
});
