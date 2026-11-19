'use strict';
// One profile path, one directory: install.sh, uninstall.sh and `ccc --skills` (bin/kc.js) resolve
// CLAUDE_CONFIG_DIR with the same physical resolver (`kc.js __profile-dir`), so they always act on the same
// directory. Codex review, HIGH 6:
//   - on POSIX a backslash is a file-name character: `team\blue` is not `team/blue`;
//   - a symlink followed by .. climbs from the link's target (cd -P), in the scripts and in the CLI alike;
//   - a path whose resolved form holds a newline, or that passes through a dangling link, is refused.
// Every run uses a temp HOME and CCC_BIN_DIR; nothing touches the real ~/.claude.
//
// Run: node --test tests/kc-profile-path.test.js

const assert = require('node:assert');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, symlinkSync, lstatSync, realpathSync, chmodSync,
} = require('node:fs');
const { join, delimiter } = require('node:path');
const { tmpdir } = require('node:os');

const REPO_ROOT = join(__dirname, '..');
const KC = join(REPO_ROOT, 'bin', 'kc.js');
const INSTALL_SH = join(REPO_ROOT, 'install.sh');
const UNINSTALL_SH = join(REPO_ROOT, 'uninstall.sh');
const posixOnly = { skip: process.platform === 'win32' };
const profilePath = require('../commander/lib/profile-path');

function env(home, extra = {}) {
  const e = { ...process.env, HOME: home, CCC_BIN_DIR: join(home, 'bin'), CC_NO_COLOR: '1', CC_NO_ANIMATION: '1', CI: '1' };
  delete e.CLAUDE_CONFIG_DIR;
  delete e.CCC_CONFIG_DIR;
  delete e.XDG_CONFIG_HOME;
  return { ...e, ...extra };
}
const kc = (home, args, extra) => spawnSync(process.execPath, [KC, ...args], { env: env(home, extra), encoding: 'utf8', timeout: 60_000 });
const sh = (script, home, args, extra) => spawnSync('bash', [script, ...args], { env: env(home, extra), encoding: 'utf8', timeout: 240_000, cwd: REPO_ROOT, input: '' });
const install = (home, cfg, more = []) => sh(INSTALL_SH, home, ['--force', '--mode=essentials', '--skip-deps', ...more], { CLAUDE_CONFIG_DIR: cfg });
const uninstall = (home, cfg) => sh(UNINSTALL_SH, home, ['--force'], { CLAUDE_CONFIG_DIR: cfg });
const ok = (r, what) => assert.strictEqual(r.status, 0, `${what}: exit ${r.status}\n${(r.stdout || '').slice(-1500)}\n${r.stderr}`);
const isLink = (p) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };
function withHome(fn) {
  // realpath: on macOS the temp dir is under /var -> /private/var, and the resolver reports physical paths.
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'ccc-profile-')));
  try { return fn(home); } finally { rmSync(home, { recursive: true, force: true }); }
}
const profileDir = (home, dir) => kc(home, ['__profile-dir', dir, home]);

test('__profile-dir keeps a POSIX backslash and resolves symlink/.. physically', posixOnly, () => {
  withHome((home) => {
    mkdirSync(join(home, 'team', 'blue'), { recursive: true });
    mkdirSync(`${home}/team\\blue`);
    mkdirSync(join(home, 'sub'));
    mkdirSync(join(home, 'x', 'y'), { recursive: true });
    symlinkSync(join(home, 'x', 'y'), join(home, 'sub', 'link'));

    let r = profileDir(home, `${home}/team\\blue`);
    ok(r, 'backslash profile');
    assert.strictEqual(r.stdout, `${home}/team\\blue`);

    r = profileDir(home, `${home}/sub/link/../prof`);   // raw string: join() would collapse the .. lexically
    ok(r, 'symlink/..');
    assert.strictEqual(r.stdout, join(home, 'x', 'prof'), 'climbs from the link target, not from sub/');

    r = profileDir(home, `${home}/sub/link/../..`);
    assert.strictEqual(r.status, 1, 'lands on home: refused');
    assert.match(r.stdout, /must not be \/, the home directory/);
  });
});

test('__profile-dir, install.sh, uninstall.sh and --skills refuse a profile that resolves through a newline or a dangling link', posixOnly, () => {
  withHome((home) => {
    const nlTarget = join(home, 'nl\n');
    mkdirSync(nlTarget);
    symlinkSync(nlTarget, join(home, 'nl-link'));
    symlinkSync(join(home, 'gone'), join(home, 'dangling'));
    for (const name of ['nl-link', 'dangling']) {
      const cfg = join(home, name);
      const r = profileDir(home, cfg);
      assert.strictEqual(r.status, 1, name);
      assert.match(r.stdout, /cannot be resolved safely/);
      for (const res of [install(home, cfg), uninstall(home, cfg)]) {
        assert.notStrictEqual(res.status, 0, `${name}: scripts must refuse`);
        assert.match(res.stdout, /cannot be resolved safely/);
      }
      const k = kc(home, ['--skills', 'install', 'ccc-seo'], { CLAUDE_CONFIG_DIR: cfg });
      assert.strictEqual(k.status, 1, `${name}: --skills must refuse`);
      assert.match(k.stderr, /cannot be resolved safely/);
    }
    assert.ok(!existsSync(join(home, 'nl')), 'the newline-stripped sibling was never created');
    assert.ok(!existsSync(join(home, 'gone')), 'the dangling target was never created');
    assert.ok(!existsSync(join(nlTarget, 'skills')), 'nothing written through the newline link');
  });
});

test('install.sh --clean and uninstall.sh act on the literal team\\blue profile, never team/blue', posixOnly, () => {
  withHome((home) => {
    const literal = `${home}/team\\blue`;
    const other = join(home, 'team', 'blue');
    mkdirSync(join(other, 'commands'), { recursive: true });
    writeFileSync(join(other, 'commands', 'mine.md'), 'mine');
    ok(install(home, literal, ['--clean']), 'clean install into team\\blue');
    assert.strictEqual(readFileSync(join(other, 'commands', 'mine.md'), 'utf8'), 'mine', 'the other profile is untouched');
    assert.ok(!existsSync(join(other, 'commander')), 'no manifest in the other profile');
    const m = JSON.parse(readFileSync(join(literal, 'commander', 'install-manifest.json'), 'utf8'));
    assert.strictEqual(m.claude_dir, literal);

    // The CLI resolves the same profile: its link is recorded in the installer's manifest (ownership holds).
    const k = kc(home, ['--skills', 'install', 'ccc-seo'], { CLAUDE_CONFIG_DIR: literal });
    ok(k, '--skills install');
    assert.ok(isLink(join(literal, 'skills', 'ccc-seo')) || existsSync(join(literal, 'skills', 'ccc-seo')));
    assert.ok(!existsSync(join(other, 'skills')), 'the CLI did not touch team/blue');

    ok(uninstall(home, literal), 'uninstall team\\blue');
    assert.ok(!existsSync(join(literal, 'commander', 'install-manifest.json')), 'manifest removed by uninstall');
    assert.strictEqual(readFileSync(join(other, 'commands', 'mine.md'), 'utf8'), 'mine', 'still untouched after uninstall');
  });
});

test('install.sh and --skills put a symlink/.. profile in the same physical directory', posixOnly, () => {
  withHome((home) => {
    mkdirSync(join(home, 'sub'));
    mkdirSync(join(home, 'x', 'y'), { recursive: true });
    symlinkSync(join(home, 'x', 'y'), join(home, 'sub', 'link'));
    const cfg = `${home}/sub/link/../prof`;
    const physical = join(home, 'x', 'prof');
    ok(install(home, cfg), 'install');
    assert.ok(existsSync(join(physical, 'commander', 'install-manifest.json')), 'installed into x/prof');
    assert.ok(!existsSync(join(home, 'sub', 'prof')), 'not into the lexical sub/prof');
    assert.strictEqual(JSON.parse(readFileSync(join(physical, 'commander', 'install-manifest.json'), 'utf8')).claude_dir, physical);

    ok(kc(home, ['--skills', 'remove', 'ccc-seo'], { CLAUDE_CONFIG_DIR: cfg }), '--skills remove');
    ok(kc(home, ['--skills', 'install', 'ccc-seo'], { CLAUDE_CONFIG_DIR: cfg }), '--skills install');
    assert.ok(isLink(join(physical, 'skills', 'ccc-seo')), 'the CLI links in x/prof too');
    assert.ok(!existsSync(join(home, 'sub', 'prof')), 'the CLI never used sub/prof');
    const rows = JSON.parse(readFileSync(join(physical, 'commander', 'install-manifest.json'), 'utf8')).entries
      .filter((e) => e.path === 'skills/ccc-seo');
    assert.strictEqual(rows.length, 1, 'the CLI updated the installer manifest, so both saw the same profile');
  });
});

// Codex review, round 2, finding 1: native Windows UNC profiles. The Node resolver decides absoluteness by the
// platform's rules; a non-root UNC profile is accepted and a share root is still refused. (win32 path rules with
// a stub filesystem on which nothing exists, so this runs on any host.)
test('checkProfileDir accepts a non-root UNC profile and refuses share and drive roots (win32 rules)', () => {
  const enoent = () => { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e; };
  const opts = { platform: 'win32', fs: { realpathSync: enoent, lstatSync: enoent }, cwd: 'C:\\work' };
  const home = 'C:\\Users\\me';
  for (const dir of ['\\\\server\\share\\team', '\\\\server\\share\\team\\', 'C:\\Profiles\\team', '\\\\?\\UNC\\server\\share\\team', '\\\\?\\C:\\Profiles\\team']) {
    const r = profilePath.checkProfileDir(dir, home, opts);
    assert.ok(r.ok, `${dir}: ${r.message}`);
    assert.strictEqual(r.path.replace(/\\$/, ''), dir.replace(/\\$/, ''), dir);
  }
  for (const dir of ['\\\\server\\share', '\\\\server\\share\\', '\\\\server', 'C:\\', 'C:', '\\\\?\\UNC\\server\\share', '\\\\?\\UNC\\server', '\\\\?\\C:\\',
    'C:\\Users', 'c:\\users\\ME', 'C:\\Users\\me\\x\\..']) {
    const r = profilePath.checkProfileDir(dir, home, opts);
    assert.ok(!r.ok, `${dir} must be refused`);
  }
  assert.strictEqual(profilePath.resolvePhysical('\\\\server\\share\\a\\..\\b', opts).path, '\\\\server\\share\\b', 'UNC prefix is not split or doubled');
});

test('install.sh and uninstall.sh accept whatever absolute path the Node resolver returns, including UNC', posixOnly, () => {
  withHome((home) => {
    const fakeBin = join(home, 'fake-bin');
    mkdirSync(fakeBin);
    const stub = (out, code) => {
      writeFileSync(join(fakeBin, 'node'), `#!/bin/bash\nprintf '%s' '${out}'\nexit ${code}\n`);
      chmodSync(join(fakeBin, 'node'), 0o755);
    };
    const extra = { PATH: fakeBin + delimiter + process.env.PATH, CLAUDE_CONFIG_DIR: join(home, 'cfg') };
    stub('\\\\server\\share\\team', 0);
    let r = sh(UNINSTALL_SH, home, ['--help'], extra);
    ok(r, 'uninstall.sh with a UNC profile');
    assert.ok(r.stdout.includes('\\\\server\\share\\team/commander/install-manifest.json'), r.stdout);
    ok(sh(INSTALL_SH, home, ['--help'], extra), 'install.sh with a UNC profile');
    stub('CLAUDE_DIR must not be /, the home directory or one of its parents: x resolves to \\\\server\\share', 1);
    for (const script of [INSTALL_SH, UNINSTALL_SH]) {
      r = sh(script, home, ['--help'], extra);
      assert.notStrictEqual(r.status, 0, 'a refusal from the resolver stops the script');
      assert.match(r.stdout, /must not be \//);
    }
  });
});

// Codex review, round 2, finding 2: install, check-in, hold and `ccc next` resolve one profile to one directory.
// A symlink followed by .. (the Linux analogue of /var/.. on macOS) is resolved physically everywhere.
test('install, check-in, hold and next agree on a symlink/.. profile', posixOnly, () => {
  withHome((home) => {
    mkdirSync(join(home, 'sub'));
    mkdirSync(join(home, 'x', 'y'), { recursive: true });
    symlinkSync(join(home, 'x', 'y'), join(home, 'sub', 'link'));
    const cfg = `${home}/sub/link/../.claude-ai4`;     // raw: join() would collapse the .. lexically
    const physical = join(home, 'x', '.claude-ai4');
    const lexical = join(home, 'sub', '.claude-ai4');
    ok(install(home, cfg), 'install');
    assert.ok(existsSync(join(physical, 'commander', 'install-manifest.json')));

    // The plugin record Claude Code would write into the installed profile.
    const pluginDir = join(physical, 'plugins', 'cache', 'commander-hub', 'commander', '8.1.2');
    mkdirSync(join(pluginDir, '.claude-plugin'), { recursive: true });
    writeFileSync(join(pluginDir, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '8.1.2' }));
    mkdirSync(join(pluginDir, 'skills', 'ccc'), { recursive: true });
    writeFileSync(join(pluginDir, 'skills', 'ccc', 'SKILL.md'), 'x');
    writeFileSync(join(physical, 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: {
      'commander@commander-hub': [{ scope: 'user', version: '8.1.2', installPath: pluginDir }] } }));

    const extra = { CLAUDE_CONFIG_DIR: cfg };
    const ci = kc(home, ['checkin', '--json', '--no-cli'], extra);
    const lane = JSON.parse(ci.stdout).lane;
    assert.strictEqual(lane.config_dir, physical, 'check-in reads the installed profile');
    assert.strictEqual(lane.name, 'ai4');

    ok(kc(home, ['hold', 'set', '--reason', 'parity', '--json'], extra), 'hold set');
    assert.ok(existsSync(join(physical, 'commander', 'fleet-hold.json')), 'hold written to the installed profile');

    const nx = kc(home, ['next', '--kind', 'code', '--title', 'anything', '--json'], extra);
    ok(nx, 'next finds the plugin installed in that profile');
    assert.strictEqual(JSON.parse(nx.stdout).action, 'hold', 'next reads the hold written there');
    assert.ok(!existsSync(lexical), 'nothing used the lexical sub/.claude-ai4');

    const laneState = require('../commander/cowork-plugin/lib/lane-state.js');
    assert.strictEqual(laneState.configDir({ HOME: home, CLAUDE_CONFIG_DIR: cfg }), physical, 'plugin hooks agree');
  });
});
