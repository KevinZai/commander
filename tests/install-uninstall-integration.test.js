'use strict';
// CC-416: install.sh + uninstall.sh + install-remote.sh sandboxed integration tests.
//
// Every run uses a temp HOME (and CCC_BIN_DIR inside it), CC_NO_ANIMATION/CI, and
// --skip-deps, so the real ~/.claude, /usr/local/bin and the checkout's
// node_modules are never touched. Global npm installs are opt-in (--install-cli)
// and never requested here.
//
// Covered: dry run and verify, merge into an existing config, the install
// manifest (audit #01), an alternate CLAUDE_CONFIG_DIR with rendered hook paths
// (#22), jq preflight on a non-full tier (#22), uninstall keeping files created
// or changed after install and restoring replaced files (#01), an unchanged
// re-install, a tier switch, and install-remote.sh pinning and origin checks (#13).
//
// Run: node --test tests/install-uninstall-integration.test.js

const assert = require('node:assert');
const { test, after, before } = require('node:test');
const { spawnSync } = require('node:child_process');
const {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, readFileSync, lstatSync,
  readlinkSync, symlinkSync, copyFileSync, chmodSync,
} = require('node:fs');
const { join, delimiter } = require('node:path');
const { tmpdir } = require('node:os');

const REPO_ROOT = join(__dirname, '..');
const INSTALL_SH = join(REPO_ROOT, 'install.sh');
const UNINSTALL_SH = join(REPO_ROOT, 'uninstall.sh');
const INSTALL_REMOTE_SH = join(REPO_ROOT, 'install-remote.sh');
const QUIET = { CC_NO_COLOR: '1', CC_NO_ANIMATION: '1', CI: '1' };

let tempHome;

// Strip CLAUDE_CONFIG_DIR (and XDG_CONFIG_HOME, which older scripts honored)
// so install.sh / uninstall.sh fall back to $HOME/.claude inside the temp HOME,
// never the developer's or CI runner's real config dir. CCC_BIN_DIR keeps the
// ccc link inside the temp HOME.
function hermeticEnv(home, extra = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.CLAUDE_CONFIG_DIR;
  delete baseEnv.CCC_CONFIG_DIR;
  delete baseEnv.XDG_CONFIG_HOME;
  delete baseEnv.CCC_REF;
  return { ...baseEnv, HOME: home, CCC_BIN_DIR: join(home, 'bin'), ...QUIET, ...extra };
}

function makeEnv(extra = {}) {
  return hermeticEnv(tempHome, extra);
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

function run(script, home, args = [], extra = {}) {
  return spawnSync('bash', [script, ...args], {
    env: hermeticEnv(home, extra), encoding: 'utf8', timeout: 240_000, cwd: REPO_ROOT, input: '',
  });
}
const install = (home, args = [], extra = {}) => run(INSTALL_SH, home, ['--force', '--mode=essentials', '--skip-deps', ...args], extra);
const uninstall = (home, extra = {}) => run(UNINSTALL_SH, home, ['--force'], extra);
const ok = (res, what) => assert.strictEqual(res.status, 0, `${what} should exit 0, got ${res.status}\n${res.stdout.slice(-1500)}\n${res.stderr}`);
const readManifest = (claude) => JSON.parse(readFileSync(join(claude, 'commander', 'install-manifest.json'), 'utf8'));
const backupsIn = (dir) => readdirSync(dir).filter((n) => n.includes('.backup.'));
function withHome(prefix, fn) {
  const home = mkdtempSync(join(tmpdir(), prefix));
  try { return fn(home); } finally { rmSync(home, { recursive: true, force: true }); }
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
  assert.match(res.stdout, /--install-cli/);
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

  const res = runShell(INSTALL_SH, ['--dry-run', '--force']);

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

  const res = runShell(INSTALL_SH, ['--verify']);

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

  const res = runShell(INSTALL_SH, ['--verify']);

  // The verifier should report all the components we created. It still may
  // exit non-zero if `claude` CLI isn't on PATH, but the body should show
  // our seeded files as present.
  assert.match(res.stdout, /CLAUDE\.md exists/, 'CLAUDE.md should be detected');
  assert.match(res.stdout, /settings\.json/, 'settings.json should be reported');
  assert.match(res.stdout, /Skills directory/, 'Skills directory should be reported');
  assert.match(res.stdout, /Commands directory/, 'Commands directory should be reported');
});

// Audit #01: without a manifest (an install from before the manifest existed), uninstall removes only files
// identical to this checkout's sources and never deletes whole directories.
test('uninstall.sh without a manifest removes only files identical to the sources and keeps the rest', () => {
  const claudeDir = join(tempHome, '.claude');
  if (existsSync(claudeDir)) rmSync(claudeDir, { recursive: true, force: true });

  // A pre-manifest install: copies of real kit files
  mkdirSync(join(claudeDir, 'commands'), { recursive: true });
  mkdirSync(join(claudeDir, 'lib'), { recursive: true });
  copyFileSync(join(REPO_ROOT, 'commands', 'ccc-ao.md'), join(claudeDir, 'commands', 'ccc-ao.md'));
  copyFileSync(join(REPO_ROOT, 'lib', 'terminal-art.sh'), join(claudeDir, 'lib', 'terminal-art.sh'));
  writeFileSync(join(claudeDir, 'BIBLE.md'), '<!-- CC Commander v0.0.0 -->\n' + readFileSync(join(REPO_ROOT, 'BIBLE.md'), 'utf8'));
  // The user's own entries (must NOT be removed)
  mkdirSync(join(claudeDir, 'skills', 'demo-skill'), { recursive: true });
  writeFileSync(join(claudeDir, 'skills', 'demo-skill', 'SKILL.md'), 'mine');
  writeFileSync(join(claudeDir, 'commands', 'mine.md'), 'mine');
  writeFileSync(join(claudeDir, 'CHEATSHEET.md'), '# an older, edited cheatsheet\n');
  writeFileSync(join(claudeDir, 'CLAUDE.md'), '# user CLAUDE.md\n');
  writeFileSync(join(claudeDir, 'settings.json'), '{"model":"claude"}\n');

  // Backups are siblings of ~/.claude/ and are never touched
  const backupDir = join(tempHome, '.claude.backup.20260424120000');
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, 'old-config.txt'), 'old-data');

  const res = runShell(UNINSTALL_SH, ['--force']);
  ok(res, 'uninstall --force');

  assert.ok(!existsSync(join(claudeDir, 'commands', 'ccc-ao.md')), 'a kit copy is removed');
  assert.ok(!existsSync(join(claudeDir, 'lib')), 'lib/ holding only kit files is removed once empty');
  assert.ok(!existsSync(join(claudeDir, 'BIBLE.md')), 'the stamped BIBLE.md is recognized and removed');
  assert.strictEqual(readFileSync(join(claudeDir, 'skills', 'demo-skill', 'SKILL.md'), 'utf8'), 'mine');
  assert.strictEqual(readFileSync(join(claudeDir, 'commands', 'mine.md'), 'utf8'), 'mine');
  assert.ok(existsSync(join(claudeDir, 'CHEATSHEET.md')), 'a file that differs from the sources is kept');
  assert.ok(existsSync(join(claudeDir, 'CLAUDE.md')), 'CLAUDE.md must be preserved');
  assert.ok(existsSync(join(claudeDir, 'settings.json')), 'settings.json must be preserved');
  assert.ok(existsSync(join(backupDir, 'old-config.txt')), 'backup contents must survive');
});

test('uninstall.sh on empty HOME exits 0 cleanly', () => {
  withHome('ccc-install-empty-', (altHome) => {
    const res = uninstall(altHome);
    ok(res, 'uninstall on empty HOME');
    assert.match(res.stdout, /Nothing to uninstall|No kit components|Uninstall complete/i);
  });
});

test('uninstall.sh ignores XDG_CONFIG_HOME: ~/.config/{skills,commands,hooks} survive', () => {
  // XDG_CONFIG_HOME is the shared ~/.config root, not Claude Code's config dir
  // (https://code.claude.com/docs/en/env-vars: CLAUDE_CONFIG_DIR, default ~/.claude).
  withHome('ccc-install-xdg-', (altHome) => {
    const xdg = join(altHome, '.config');
    for (const dir of ['skills', 'commands', 'hooks']) {
      mkdirSync(join(xdg, dir), { recursive: true });
      writeFileSync(join(xdg, dir, 'other-tool.txt'), 'not ours');
    }
    const res = uninstall(altHome, { XDG_CONFIG_HOME: xdg });
    ok(res, 'uninstall');
    for (const dir of ['skills', 'commands', 'hooks']) {
      assert.ok(existsSync(join(xdg, dir, 'other-tool.txt')), `~/.config/${dir} must not be touched`);
    }
  });
});

// Audit P0 (2026-11-18): a non-interactive install (what install-remote.sh runs) merges into an existing
// config instead of deleting the user's own skills, commands and hooks, and backs up without transcripts.
test('install.sh --force merges into an existing ~/.claude without deleting user files', () => {
  withHome('ccc-install-merge-', (home) => {
    const claude = join(home, '.claude');
    mkdirSync(join(claude, 'skills', 'my-skill'), { recursive: true });
    mkdirSync(join(claude, 'commands'), { recursive: true });
    mkdirSync(join(claude, 'hooks'), { recursive: true });
    mkdirSync(join(claude, 'projects', 'p'), { recursive: true });
    writeFileSync(join(claude, 'skills', 'my-skill', 'SKILL.md'), 'mine');
    writeFileSync(join(claude, 'commands', 'mine.md'), 'mine');
    writeFileSync(join(claude, 'commands', 'ccc-ao.md'), 'my own ccc-ao');
    writeFileSync(join(claude, 'hooks', 'hooks.json'), '{"mine":1}');
    writeFileSync(join(claude, 'projects', 'p', 'session.jsonl'), 'transcript');
    const res = install(home);
    ok(res, 'install');
    assert.strictEqual(readFileSync(join(claude, 'skills', 'my-skill', 'SKILL.md'), 'utf8'), 'mine');
    assert.strictEqual(readFileSync(join(claude, 'commands', 'mine.md'), 'utf8'), 'mine');
    assert.strictEqual(readFileSync(join(claude, 'hooks', 'hooks.json'), 'utf8'), '{"mine":1}');
    assert.ok(existsSync(join(claude, 'hooks', 'hooks.commander.json')), 'Commander hooks config is written beside the user\'s');
    // A same-named file is replaced, but only after a file-level backup
    const backups = backupsIn(home);
    assert.strictEqual(backups.length, 1);
    assert.strictEqual(readFileSync(join(home, backups[0], 'commands', 'ccc-ao.md'), 'utf8'), 'my own ccc-ao');
    assert.ok(!existsSync(join(home, backups[0], 'projects')), 'the backup must not copy session transcripts');
    assert.ok(!existsSync(join(home, backups[0], 'skills')), 'the backup holds only replaced files');
    // The manifest lists what was written and not the user's files
    const m = readManifest(claude);
    const paths = new Set(m.entries.map((e) => e.path));
    assert.ok(paths.has('hooks/hooks.commander.json'));
    assert.ok(!paths.has('hooks/hooks.json') && !paths.has('commands/mine.md') && !paths.has('skills/my-skill/SKILL.md'));
    assert.strictEqual(m.entries.find((e) => e.path === 'commands/ccc-ao.md').backup, join(home, backups[0], 'commands', 'ccc-ao.md'));
  });
});

// Audit #22: an alternate profile gets its own files, and hook commands point at its hooks dir.
test('install.sh honors CLAUDE_CONFIG_DIR and renders hook paths for it', () => {
  withHome('ccc-install-cfgdir-', (home) => {
    const cfg = join(home, 'claude-work');
    const res = install(home, [], { CLAUDE_CONFIG_DIR: cfg });
    ok(res, 'install');
    assert.ok(!existsSync(join(home, '.claude')), 'the default ~/.claude must not be created');
    assert.ok(existsSync(join(cfg, 'commands', 'ccc-ao.md')));
    assert.ok(existsSync(join(cfg, 'hooks', 'careful-guard.js')));
    const m = readManifest(cfg);
    assert.strictEqual(m.claude_dir, cfg);
    const hooks = JSON.parse(readFileSync(join(cfg, 'hooks', 'hooks.json'), 'utf8'));
    const commands = Object.values(hooks.hooks).flat().flatMap((g) => g.hooks.map((h) => h.command));
    const nodeCommands = commands.filter((c) => c.startsWith('node '));
    assert.ok(nodeCommands.length >= 10);
    for (const c of nodeCommands) {
      assert.ok(c.startsWith(`node "${join(cfg, 'hooks')}/`), `hook command must use the target dir: ${c}`);
      assert.ok(!c.includes('~/.claude') && !c.includes('$HOME'), c);
      const file = /"([^"]+)"/.exec(c)[1];
      assert.ok(existsSync(file), `hook script must exist: ${file}`);
    }
    const link = join(home, 'bin', 'ccc');
    assert.strictEqual(readlinkSync(link), join(REPO_ROOT, 'bin', 'ccc.js'));

    // The same profile uninstalls cleanly, leaving the default profile alone
    ok(uninstall(home, { CLAUDE_CONFIG_DIR: cfg }), 'uninstall');
    assert.ok(!existsSync(join(cfg, 'commands')) && !existsSync(join(cfg, 'skills')) && !existsSync(join(cfg, 'hooks')));
    assert.ok(existsSync(join(cfg, 'CLAUDE.md')), 'CLAUDE.md must be preserved');
    assert.ok(!existsSync(link), 'the ccc link the install made is removed');
  });
});

// Audit #02: the marketplace dedup edits the resolved target profile, never the default one,
// and an already-clean map is "nothing to do" (success), not a failure.
test('install.sh dedups extraKnownMarketplaces in the alternate profile only, and a clean map exits 0', () => {
  withHome('ccc-install-dedup-', (home) => {
    const cfg = join(home, 'claude-alt');
    const stale = JSON.stringify({
      extraKnownMarketplaces: {
        'ccc-marketplace': { source: { source: 'github', repo: 'KevinZai/commander' } },
        'commander-marketplace': { source: { source: 'github', repo: 'kevinzai/commander' } },
        'other-market': { source: { source: 'git', url: 'https://example.invalid/x.git' } },
      },
    }, null, 2);
    mkdirSync(cfg, { recursive: true });
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(join(cfg, 'settings.json'), stale);
    writeFileSync(join(home, '.claude', 'settings.json'), stale);

    ok(install(home, [], { CLAUDE_CONFIG_DIR: cfg }), 'first install');
    const alt = JSON.parse(readFileSync(join(cfg, 'settings.json'), 'utf8')).extraKnownMarketplaces;
    assert.ok(!('ccc-marketplace' in alt) && !('commander-marketplace' in alt), 'stale entries removed from the target profile');
    assert.ok(alt['commander-hub'] && alt['other-market'], 'canonical and unrelated entries kept');
    assert.strictEqual(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'), stale, 'default profile must be untouched');

    // Nothing left to dedup: the upgrade must still succeed
    ok(install(home, [], { CLAUDE_CONFIG_DIR: cfg }), 'second install with a clean marketplace map');
    assert.deepStrictEqual(JSON.parse(readFileSync(join(cfg, 'settings.json'), 'utf8')).extraKnownMarketplaces, alt);
  });
});

// Audit #22: without jq a non-full tier would leave an empty catalog. It must fail before anything changes.
test('install.sh fails early when a non-full tier needs jq and jq is missing', () => {
  withHome('ccc-install-nojq-', (home) => {
    // A PATH that mirrors the current one, minus jq
    const shim = join(home, 'path-without-jq');
    mkdirSync(shim);
    for (const dir of (process.env.PATH || '').split(delimiter)) {
      let names = [];
      try { names = readdirSync(dir); } catch { continue; }
      for (const n of names) {
        if (n === 'jq' || existsSync(join(shim, n))) continue;
        try { symlinkSync(join(dir, n), join(shim, n)); } catch { /* best effort */ }
      }
    }
    const claude = join(home, '.claude');
    mkdirSync(join(claude, 'skills', 'my-skill'), { recursive: true });
    writeFileSync(join(claude, 'skills', 'my-skill', 'SKILL.md'), 'mine');
    const res = install(home, ['--skills=essential'], { PATH: shim });
    assert.notStrictEqual(res.status, 0, 'install must fail without jq');
    assert.match(res.stdout, /jq is required for --skills=essential/);
    assert.match(res.stdout, /Nothing was changed/);
    assert.deepStrictEqual(readdirSync(claude).sort(), ['skills']);
    assert.deepStrictEqual(readdirSync(join(claude, 'skills')), ['my-skill']);
    assert.deepStrictEqual(backupsIn(home), []);
    assert.ok(!existsSync(join(home, 'bin')), 'the ccc link must not be created');
  });
});

// Audit #01: uninstall removes only manifest entries that are unchanged, restores replaced files, and keeps
// anything created or edited after install.
test('uninstall.sh keeps files created or changed after install and restores replaced files', () => {
  withHome('ccc-install-keep-', (home) => {
    const claude = join(home, '.claude');
    mkdirSync(join(claude, 'commands'), { recursive: true });
    writeFileSync(join(claude, 'commands', 'ccc-aside.md'), 'my version');
    ok(install(home, ['--skills=essential']), 'install');
    assert.notStrictEqual(readFileSync(join(claude, 'commands', 'ccc-aside.md'), 'utf8'), 'my version');

    // After install: a new skill, a new command, an edited kit command
    mkdirSync(join(claude, 'skills', 'later-skill'), { recursive: true });
    writeFileSync(join(claude, 'skills', 'later-skill', 'SKILL.md'), 'later');
    writeFileSync(join(claude, 'commands', 'later.md'), 'later');
    writeFileSync(join(claude, 'commands', 'ccc-audit.md'), 'edited by me');

    const res = uninstall(home);
    ok(res, 'uninstall');
    assert.match(res.stdout, /kept because they changed since install/);
    assert.strictEqual(readFileSync(join(claude, 'skills', 'later-skill', 'SKILL.md'), 'utf8'), 'later');
    assert.strictEqual(readFileSync(join(claude, 'commands', 'later.md'), 'utf8'), 'later');
    assert.strictEqual(readFileSync(join(claude, 'commands', 'ccc-audit.md'), 'utf8'), 'edited by me');
    assert.strictEqual(readFileSync(join(claude, 'commands', 'ccc-aside.md'), 'utf8'), 'my version', 'replaced file restored');
    assert.deepStrictEqual(readdirSync(join(claude, 'commands')).sort(), ['ccc-aside.md', 'ccc-audit.md', 'later.md']);
    assert.deepStrictEqual(readdirSync(join(claude, 'skills')), ['later-skill'], 'kit skill links removed, skills/ kept');
    assert.ok(!existsSync(join(claude, 'hooks')), 'hooks/ created by the install and emptied is removed');
    assert.ok(!existsSync(join(claude, 'commander', 'install-manifest.json')), 'the manifest is removed');
    assert.ok(existsSync(join(claude, 'CLAUDE.md')) && existsSync(join(claude, 'settings.json')));
  });
});

test('install.sh re-run with no changes writes nothing and backs up nothing', () => {
  withHome('ccc-install-rerun-', (home) => {
    const claude = join(home, '.claude');
    ok(install(home), 'first install');
    const first = readManifest(claude);
    const res = install(home);
    ok(res, 'second install');
    assert.match(res.stdout, /0 written, \d+ unchanged, 0 replaced/);
    assert.deepStrictEqual(backupsIn(home), [], 'no backup when nothing is replaced');
    const second = readManifest(claude);
    assert.deepStrictEqual(second.entries, first.entries);
    assert.deepStrictEqual(second.dirs, first.dirs);
    assert.strictEqual(second.installed_at, first.installed_at);
  });
});

test('install.sh tier switch removes the previous tier\'s unchanged entries and keeps the user\'s', () => {
  withHome('ccc-install-tier-', (home) => {
    const claude = join(home, '.claude');
    ok(install(home, ['--skills=full']), 'full install');
    assert.ok(lstatSync(join(claude, 'skills', 'ccc-seo')).isDirectory());
    writeFileSync(join(claude, 'skills', 'ccc-seo', 'MY-NOTES.md'), 'mine'); // the user's file inside a kit skill
    const res = install(home, ['--skills=essential']);
    ok(res, 'essential install');
    const m = readManifest(claude);
    assert.strictEqual(m.tier, 'essential');
    const essential = JSON.parse(readFileSync(join(REPO_ROOT, 'skills', '_tiers.json'), 'utf8')).tiers.essential.skills;
    const linked = essential.find((s) => s !== 'ccc-seo');
    assert.strictEqual(readlinkSync(join(claude, 'skills', linked)), join(REPO_ROOT, 'skills', linked));
    assert.strictEqual(readFileSync(join(claude, 'skills', 'ccc-seo', 'MY-NOTES.md'), 'utf8'), 'mine');
    assert.match(res.stdout, /ccc-seo \(a directory of yours is in the way/);
    // Audit P2: the skill must still work; its body is kept and stays recorded, not pruned from under the note
    assert.strictEqual(readFileSync(join(claude, 'skills', 'ccc-seo', 'SKILL.md'), 'utf8'),
      readFileSync(join(REPO_ROOT, 'skills', 'ccc-seo', 'SKILL.md'), 'utf8'));
    assert.ok(m.entries.some((e) => e.path === join('skills', 'ccc-seo', 'SKILL.md')), 'kept copy stays in the manifest');
    const fullOnly = readdirSync(join(REPO_ROOT, 'skills')).find((s) => !s.startsWith('_') && !essential.includes(s) && !existsSync(join(claude, 'skills', s)));
    assert.ok(fullOnly, 'a skill outside the essential tier was removed');
  });
});

// Every file and link under dir, with its content or link target, for before/after comparison.
function snapshotTree(dir) {
  const out = {};
  const walk = (d, rel) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      const st = lstatSync(p);
      if (st.isDirectory()) walk(p, rel + n + '/');
      else out[rel + n] = st.isSymbolicLink() ? 'link:' + readlinkSync(p) : readFileSync(p, 'utf8');
    }
  };
  walk(dir, '');
  return out;
}

// Audit #01: a skills/, commands/ or hooks/ dir linked to a shared dotfiles dir. Identical stock copies there must
// not be adopted into the manifest, and uninstall must never delete or rewrite anything through the link.
test('install.sh and uninstall.sh leave a symlinked shared dotfiles dir intact', () => {
  withHome('ccc-install-dotfiles-', (home) => {
    const claude = join(home, '.claude');
    const shared = join(home, 'dotfiles');
    for (const d of ['commands', 'hooks', 'skills']) mkdirSync(join(shared, d), { recursive: true });
    // Stock copies identical to the checkout, plus the user's own files
    copyFileSync(join(REPO_ROOT, 'commands', 'ccc-ao.md'), join(shared, 'commands', 'ccc-ao.md'));
    copyFileSync(join(REPO_ROOT, 'hooks', 'careful-guard.js'), join(shared, 'hooks', 'careful-guard.js'));
    writeFileSync(join(shared, 'commands', 'mine.md'), 'mine');
    writeFileSync(join(shared, 'hooks', 'my-hook.js'), '// mine');
    mkdirSync(join(shared, 'skills', 'my-skill'));
    writeFileSync(join(shared, 'skills', 'my-skill', 'SKILL.md'), 'mine');
    mkdirSync(claude, { recursive: true });
    symlinkSync(join(shared, 'commands'), join(claude, 'commands'));
    symlinkSync(join(shared, 'hooks'), join(claude, 'hooks'));
    symlinkSync(join(shared, 'skills'), join(claude, 'skills'));
    const snapshot = () => snapshotTree(shared);
    const before = snapshot();

    const res = install(home, ['--skills=essential']);
    ok(res, 'install');
    assert.match(res.stdout, /a parent is a symlink or file; left alone/);
    assert.deepStrictEqual(snapshot(), before, 'install must not write into the shared dotfiles dir');
    const m = readManifest(claude);
    const viaLink = m.entries.filter((e) => e.path && /^(commands|hooks|skills)\//.test(e.path));
    assert.deepStrictEqual(viaLink, [], 'nothing under a symlinked parent is recorded');
    assert.ok(m.entries.length > 0, 'entries outside the linked dirs are still recorded');

    ok(uninstall(home), 'uninstall');
    assert.deepStrictEqual(snapshot(), before, 'uninstall must leave the shared dotfiles intact');
    for (const d of ['commands', 'hooks', 'skills']) assert.ok(lstatSync(join(claude, d)).isSymbolicLink(), d + ' link kept');
  });
});

// Audit #01: a manifest written before the user moved a dir to shared dotfiles. Uninstall must not follow the new link.
test('uninstall.sh keeps manifest entries whose parent became a symlink to shared dotfiles', () => {
  withHome('ccc-install-dotfiles-later-', (home) => {
    const claude = join(home, '.claude');
    ok(install(home, ['--skills=essential']), 'install');
    const recorded = readManifest(claude).entries.filter((e) => e.path && e.path.startsWith('commands/'));
    assert.ok(recorded.length > 0, 'commands were recorded by the install');
    // The user moves commands/ into dotfiles and links it back
    const shared = join(home, 'dotfiles', 'commands');
    mkdirSync(join(home, 'dotfiles'), { recursive: true });
    spawnSync('mv', [join(claude, 'commands'), shared]);
    symlinkSync(shared, join(claude, 'commands'));
    const before = snapshotTree(shared);
    assert.ok(Object.keys(before).length >= recorded.length);

    const res = uninstall(home);
    ok(res, 'uninstall');
    assert.deepStrictEqual(snapshotTree(shared), before, 'files reached through the link are kept');
    for (const e of recorded) {
      assert.strictEqual(readFileSync(join(shared, e.path.slice('commands/'.length)), 'utf8'),
        readFileSync(join(REPO_ROOT, e.path), 'utf8'));
    }
    assert.ok(lstatSync(join(claude, 'commands')).isSymbolicLink());

    // A re-install over the linked dir records nothing there either
    ok(install(home, ['--skills=essential']), 're-install');
    assert.deepStrictEqual(readManifest(claude).entries.filter((e) => e.path && e.path.startsWith('commands/')), []);
    assert.deepStrictEqual(snapshotTree(shared), before);
  });
});

// Audit #01: an identical preexisting file in a real dir is not adopted, so uninstall keeps it.
test('install.sh does not adopt an identical preexisting file; uninstall keeps it', () => {
  withHome('ccc-install-noadopt-', (home) => {
    const claude = join(home, '.claude');
    mkdirSync(join(claude, 'commands'), { recursive: true });
    copyFileSync(join(REPO_ROOT, 'commands', 'ccc-ao.md'), join(claude, 'commands', 'ccc-ao.md'));
    const res = install(home, ['--skills=essential']);
    ok(res, 'install');
    assert.match(res.stdout, /identical file\(s\) already present were left as yours/);
    assert.ok(!readManifest(claude).entries.some((e) => e.path === 'commands/ccc-ao.md'));
    ok(uninstall(home), 'uninstall');
    assert.strictEqual(readFileSync(join(claude, 'commands', 'ccc-ao.md'), 'utf8'), readFileSync(join(REPO_ROOT, 'commands', 'ccc-ao.md'), 'utf8'));
  });
});

// An unattended --force run (install-remote.sh, ccc --update) never opts the user into the full tier.
function tierSkills(tier) {
  const tiers = JSON.parse(readFileSync(join(REPO_ROOT, 'skills', '_tiers.json'), 'utf8')).tiers;
  const out = new Set(tiers[tier].skills || []);
  for (const inc of tiers[tier].includes || []) for (const s of tiers[inc].skills || []) out.add(s);
  if (tier === 'recommended') for (const s of (tiers.domain && tiers.domain.skills) || []) out.add(s);
  return out;
}

test('install.sh --force without --skills installs the essential tier into a fresh config dir', () => {
  withHome('ccc-install-unattended-', (home) => {
    const cfg = join(home, 'claude-fresh');
    const res = run(INSTALL_SH, home, ['--force', '--skip-deps'], { CLAUDE_CONFIG_DIR: cfg });
    ok(res, 'unattended install');
    assert.strictEqual(readManifest(cfg).tier, 'essential');
    const allowed = tierSkills('essential');
    const installed = readdirSync(join(cfg, 'skills')).filter((n) => !n.startsWith('_'));
    assert.ok(installed.length > 0, 'essential skills are installed');
    for (const n of installed) assert.ok(allowed.has(n), `only essential-tier skills are installed, found ${n}`);
    for (const pack of ['science-pack', 'specialist-pack', 'addyosmani-pack', 'threejs-pack']) {
      assert.ok(!existsSync(join(cfg, 'skills', pack)), `${pack} must not be installed without opting in`);
    }
    assert.ok(installed.every((n) => !/-pack$/.test(n)), 'no optional skill packs');
  });
});

test('install.sh --force without --skills keeps the tier the previous install recorded', () => {
  withHome('ccc-install-keeptier-', (home) => {
    const claude = join(home, '.claude');
    ok(install(home, ['--skills=recommended']), 'recommended install');
    const before = readdirSync(join(claude, 'skills')).sort();
    const res = install(home); // the update path: install.sh --force, no --skills
    ok(res, 'update');
    assert.match(res.stdout, /Skill tier: recommended \(kept from the previous install/);
    assert.strictEqual(readManifest(claude).tier, 'recommended');
    assert.deepStrictEqual(readdirSync(join(claude, 'skills')).sort(), before);
    const allowed = tierSkills('recommended');
    for (const n of before.filter((x) => !x.startsWith('_'))) assert.ok(allowed.has(n), n);
  });
});

// Audit #13: install-remote.sh checks out a named tag or commit from the expected origin and prints the commit.
function makeUpstream(root) {
  const up = join(root, 'up');
  mkdirSync(join(up, 'bin'), { recursive: true });
  mkdirSync(join(up, 'commander'), { recursive: true });
  const git = (...a) => {
    const r = spawnSync('git', ['-C', up, '-c', 'user.email=t@example.com', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  git('init', '-q');
  writeFileSync(join(up, 'package.json'), '{"version":"1.0.0"}\n');
  writeFileSync(join(up, 'install.sh'), '#!/bin/bash\necho "STUB INSTALL $*"\n');
  chmodSync(join(up, 'install.sh'), 0o755);
  writeFileSync(join(up, 'bin', 'kc.js'), '//\n');
  writeFileSync(join(up, 'commander', 'engine.js'), '// 1\n');
  git('add', '-A'); git('commit', '-qm', 'one'); git('tag', '-a', 'v1.0.0', '-m', 'v1.0.0');
  writeFileSync(join(up, 'commander', 'engine.js'), '// 2\n');
  git('commit', '-qam', 'two'); git('tag', 'v1.2.0');
  writeFileSync(join(up, 'commander', 'engine.js'), '// 3 (unreleased)\n');
  git('commit', '-qam', 'three');
  return { url: 'file://' + up, rev: (r) => git('rev-parse', r + '^{commit}') };
}

test('install-remote.sh installs the newest release tag, or CCC_REF, and prints the commit', () => {
  withHome('ccc-remote-', (home) => {
    const upstream = makeUpstream(home);
    const dir = join(home, '.cc-commander');
    const env = { CCC_REPO_URL: upstream.url, CCC_INSTALL_DIR: dir };
    let res = run(INSTALL_REMOTE_SH, home, [], env);
    ok(res, 'install-remote');
    const head = () => spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
    assert.strictEqual(head(), upstream.rev('v1.2.0'), 'the newest release tag, not the unreleased tip');
    assert.ok(res.stdout.includes('Commit: ' + upstream.rev('v1.2.0')));
    assert.match(res.stdout, /STUB INSTALL --force/);
    assert.doesNotMatch(res.stdout, /integrity verified/);

    res = run(INSTALL_REMOTE_SH, home, [], { ...env, CCC_REF: 'v1.0.0' });
    ok(res, 'install-remote with CCC_REF');
    assert.strictEqual(head(), upstream.rev('v1.0.0'), 'annotated tag pinned');
  });
});

test('install-remote.sh refuses a checkout whose origin is not the expected repository', () => {
  withHome('ccc-remote-origin-', (home) => {
    const upstream = makeUpstream(home);
    const dir = join(home, '.cc-commander');
    ok(run(INSTALL_REMOTE_SH, home, [], { CCC_REPO_URL: upstream.url, CCC_INSTALL_DIR: dir }), 'install-remote');
    spawnSync('git', ['-C', dir, 'remote', 'set-url', 'origin', 'https://example.com/someone-else/commander.git']);
    const res = run(INSTALL_REMOTE_SH, home, [], { CCC_REPO_URL: upstream.url, CCC_INSTALL_DIR: dir, CCC_REF: 'v1.0.0' });
    assert.notStrictEqual(res.status, 0);
    assert.match(res.stdout, /Refusing to update it/);
    assert.doesNotMatch(res.stdout, /STUB INSTALL/);

    const bad = run(INSTALL_REMOTE_SH, home, [], { CCC_REPO_URL: upstream.url, CCC_INSTALL_DIR: join(home, 'other'), CCC_REF: '--upload-pack=x' });
    assert.notStrictEqual(bad.status, 0);
    assert.match(bad.stdout, /CCC_REF must be a tag or commit/);
  });
});

// Codex review of #298: --clean clears only what the chosen mode reinstalls.
test('install.sh --clean --mode=config leaves skills, commands and hooks in place', () => {
  withHome('ccc-install-clean-config-', (home) => {
    const claude = join(home, '.claude');
    for (const d of ['skills', 'commands', 'hooks']) {
      mkdirSync(join(claude, d), { recursive: true });
      writeFileSync(join(claude, d, 'mine.txt'), 'mine');
    }
    ok(run(INSTALL_SH, home, ['--force', '--mode=config', '--skip-deps', '--clean']), 'clean config install');
    for (const d of ['skills', 'commands', 'hooks']) {
      assert.strictEqual(readFileSync(join(claude, d, 'mine.txt'), 'utf8'), 'mine', d + ' kept');
    }
  });
});

// Codex review of #298: a profile path that resolves to the home directory is refused.
test('install.sh refuses a CLAUDE_CONFIG_DIR that resolves to the home directory', () => {
  withHome('ccc-install-home-alias-', (home) => {
    symlinkSync(home, join(home, 'alias'));
    for (const dir of [home + '/', join(home, 'alias')]) {
      const res = run(INSTALL_SH, home, ['--force', '--mode=config', '--skip-deps', '--clean'], { CLAUDE_CONFIG_DIR: dir });
      assert.notStrictEqual(res.status, 0, 'must refuse ' + dir);
      assert.match(res.stdout + res.stderr, /Invalid CLAUDE_DIR|must not be \/, the home directory/);
    }
  });
});

// Codex review of #298: a manifest reached through a symlink, or copied from another profile, is refused.
test('install.sh and uninstall.sh refuse a shared or copied install manifest and change nothing', () => {
  withHome('ccc-install-manifest-owner-', (home) => {
    const claude = join(home, '.claude');
    const other = join(home, 'other-profile');
    ok(install(home, [], { CLAUDE_CONFIG_DIR: other }), 'install into the other profile');
    const otherManifest = readFileSync(join(other, 'commander', 'install-manifest.json'), 'utf8');

    // Copied profile: the manifest still names the other profile.
    mkdirSync(join(claude, 'commander'), { recursive: true });
    writeFileSync(join(claude, 'commander', 'install-manifest.json'), otherManifest);
    for (const res of [install(home), uninstall(home)]) {
      assert.notStrictEqual(res.status, 0, 'copied manifest must be refused');
      assert.match(res.stdout + res.stderr, /written for .*other-profile/);
    }
    assert.strictEqual(readFileSync(join(claude, 'commander', 'install-manifest.json'), 'utf8'), otherManifest);

    // Shared state: commander/ is a symlink to the other profile's directory.
    rmSync(join(claude, 'commander'), { recursive: true, force: true });
    symlinkSync(join(other, 'commander'), join(claude, 'commander'));
    for (const res of [install(home), uninstall(home)]) {
      assert.notStrictEqual(res.status, 0, 'symlinked commander dir must be refused');
      assert.match(res.stdout + res.stderr, /symlink or not a directory/);
    }
    assert.strictEqual(readFileSync(join(other, 'commander', 'install-manifest.json'), 'utf8'), otherManifest, 'other profile untouched');
  });
});

// Codex review of #298, second round.
test('install.sh refuses an unknown --mode before touching anything', () => {
  withHome('ccc-install-badmode-', (home) => {
    const claude = join(home, '.claude');
    mkdirSync(join(claude, 'skills'), { recursive: true });
    writeFileSync(join(claude, 'skills', 'mine.txt'), 'mine');
    const res = run(INSTALL_SH, home, ['--force', '--mode=confg', '--skip-deps', '--clean']);
    assert.notStrictEqual(res.status, 0);
    assert.match(res.stdout + res.stderr, /unknown --mode=confg/);
    assert.strictEqual(readFileSync(join(claude, 'skills', 'mine.txt'), 'utf8'), 'mine');
  });
});

test('install.sh refuses a not-yet-existing CLAUDE_CONFIG_DIR that resolves to home or a parent of it', () => {
  withHome('ccc-install-dotdot-', (home) => {
    for (const dir of [join(home, 'new', '..'), join(home, 'a', 'b', '..', '..', '..')]) {
      const res = run(INSTALL_SH, home, ['--force', '--mode=config', '--skip-deps'], { CLAUDE_CONFIG_DIR: dir });
      assert.notStrictEqual(res.status, 0, 'must refuse ' + dir);
    }
  });
});

test('install.sh --clean works with a trailing slash on a custom CLAUDE_CONFIG_DIR', () => {
  withHome('ccc-install-trailing-', (home) => {
    const cfg = join(home, 'profiles', 'work');
    mkdirSync(join(cfg, 'commands'), { recursive: true });
    writeFileSync(join(cfg, 'commands', 'old.md'), 'old');
    ok(run(INSTALL_SH, home, ['--force', '--mode=essentials', '--skip-deps', '--clean'], { CLAUDE_CONFIG_DIR: cfg + '/' }), 'clean install');
    assert.ok(!existsSync(join(cfg, 'commands', 'old.md')), 'old command cleared (and backed up)');
  });
});

test('install.sh and uninstall.sh refuse a manifest that does not name its profile', () => {
  withHome('ccc-install-noowner-', (home) => {
    const claude = join(home, '.claude');
    mkdirSync(join(claude, 'commander'), { recursive: true });
    const m = JSON.stringify({ schema: 1, entries: [], dirs: [] });
    writeFileSync(join(claude, 'commander', 'install-manifest.json'), m);
    for (const res of [install(home), uninstall(home)]) {
      assert.notStrictEqual(res.status, 0);
      assert.match(res.stdout + res.stderr, /does not record which profile/);
    }
  });
});

// Codex review of #298, third round: a symlink followed by .. is resolved against the disk, not lexically, and
// the installer acts on the resolved path. home/sub/link -> home/x, so home/sub/link/.. is home itself.
test('install.sh and uninstall.sh refuse a symlink-then-.. path that lands on home', () => {
  withHome('ccc-install-symdotdot-', (home) => {
    mkdirSync(join(home, 'sub'), { recursive: true });
    mkdirSync(join(home, 'x'), { recursive: true });
    mkdirSync(join(home, 'skills'), { recursive: true });
    writeFileSync(join(home, 'skills', 'mine.txt'), 'mine');
    symlinkSync(join(home, 'x'), join(home, 'sub', 'link'));
    const dir = home + '/sub/link/..';   // a raw string: join() would collapse the .. before the installer sees it
    const res = run(INSTALL_SH, home, ['--force', '--mode=essentials', '--skip-deps', '--clean'], { CLAUDE_CONFIG_DIR: dir });
    assert.notStrictEqual(res.status, 0, 'install must refuse');
    const un = run(UNINSTALL_SH, home, ['--force'], { CLAUDE_CONFIG_DIR: dir });
    assert.notStrictEqual(un.status, 0, 'uninstall must refuse');
    assert.strictEqual(readFileSync(join(home, 'skills', 'mine.txt'), 'utf8'), 'mine');
  });
});

// Review of 11cd33c: a ~/.claude that is a symlink to a dotfiles folder resolves there, and --clean still works.
test('install.sh --clean works when ~/.claude is a symlink to a dotfiles folder', () => {
  withHome('ccc-install-dotfiles-clean-', (home) => {
    const real = join(home, 'dotfiles', 'claude');
    mkdirSync(join(real, 'commands'), { recursive: true });
    writeFileSync(join(real, 'commands', 'old.md'), 'old');
    symlinkSync(real, join(home, '.claude'));
    ok(run(INSTALL_SH, home, ['--force', '--mode=essentials', '--skip-deps', '--clean']), 'clean install through the link');
    assert.ok(!existsSync(join(real, 'commands', 'old.md')), 'old command cleared (and backed up)');
    assert.ok(lstatSync(join(home, '.claude')).isSymbolicLink(), 'the ~/.claude link itself is kept');
  });
});
