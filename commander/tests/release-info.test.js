'use strict';

// CC-2089: `ccc` resolves the installed plugin release and warns when the
// checkout it runs from is behind it. All fixtures live in temp dirs; no real
// Claude config dir is read or written.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var rel = require('../lib/release-info');

var KC = path.join(__dirname, '..', '..', 'bin', 'kc.js');
var PKG_VERSION = require('../../package.json').version;

function tmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj));
}

/** A config dir with an installed commander record (and optional manifest). */
function configWith(entries, manifestVersion) {
  var dir = tmp('ccc rel cfg ');
  var install = path.join(dir, 'plugins', 'cache', 'commander-hub', 'commander', 'x');
  fs.mkdirSync(install, { recursive: true });
  if (manifestVersion) writeJson(path.join(install, '.claude-plugin', 'plugin.json'), { version: manifestVersion });
  writeJson(path.join(dir, 'plugins', 'installed_plugins.json'), {
    version: 2,
    plugins: { 'commander@commander-hub': entries.map(function(e) { return Object.assign({ installPath: install }, e); }) },
  });
  return dir;
}

function checkout(version) {
  var root = tmp('ccc rel co ');
  writeJson(path.join(root, 'package.json'), { version: version });
  return root;
}

test('compareVersions orders numerically, not lexically', function() {
  assert.strictEqual(rel.compareVersions('8.1.10', '8.1.2'), 1);
  assert.strictEqual(rel.compareVersions('8.1.1', '8.1.2'), -1);
  assert.strictEqual(rel.compareVersions('8.1.2', '8.1.2'), 0);
  assert.strictEqual(rel.compareVersions('garbage', '8.1.2'), 0);
  assert.strictEqual(rel.compareVersions(null, '8.1.2'), 0);
});

test('checkout behind the installed plugin reports drift with an ff-only fix', function() {
  var cfg = configWith([{ scope: 'user', version: '8.1.2', gitCommitSha: 'a'.repeat(40) }]);
  var root = checkout('8.1.1');
  var info = rel.resolveRelease({ root: root, env: { CLAUDE_CONFIG_DIR: cfg } });
  assert.strictEqual(info.plugin.version, '8.1.2');
  assert.strictEqual(info.drift.length, 1);
  assert.strictEqual(info.drift[0].kind, 'checkout_behind_plugin');
  // no .git in the fixture: an npm-style install updates through npm
  assert.strictEqual(info.drift[0].fix, 'npm update -g cc-commander');
  assert.match(info.drift[0].message, /^ccc install 8\.1\.1 is behind/);
  fs.mkdirSync(path.join(root, '.git'));
  var gitFix = rel.resolveRelease({ root: root, env: { CLAUDE_CONFIG_DIR: cfg } }).drift[0];
  assert.match(gitFix.fix, /fetch origin main && git -C .* merge --ff-only origin\/main$/);
  assert.match(gitFix.message, /^ccc checkout 8\.1\.1/);
  var vr = rel.versionReport('Claude Code Commander', info);
  assert.strictEqual(vr.line, 'Claude Code Commander v8.1.1 (installed plugin v8.1.2)');
  assert.strictEqual(vr.warnings.length, 1);
  assert.match(vr.warnings[0], /^warning: ccc install 8\.1\.1 is behind the installed plugin 8\.1\.2\. Update: npm update -g cc-commander$/);
});

test('equal versions report no drift; checkout ahead is informational only', function() {
  var cfg = configWith([{ scope: 'user', version: '8.1.2' }]);
  assert.deepStrictEqual(rel.resolveRelease({ root: checkout('8.1.2'), env: { CLAUDE_CONFIG_DIR: cfg } }).drift, []);
  var ahead = rel.resolveRelease({ root: checkout('8.2.0'), env: { CLAUDE_CONFIG_DIR: cfg } });
  assert.strictEqual(ahead.drift[0].kind, 'plugin_behind_checkout');
  assert.deepStrictEqual(rel.versionReport('P', ahead).warnings, []);
});

test('installed plugin.json version wins over the record version', function() {
  var cfg = configWith([{ scope: 'user', version: '8.1.1' }], '8.1.2');
  assert.strictEqual(rel.installedPlugin(cfg).version, '8.1.2');
});

test('project-scope entry for the cwd wins over user scope', function() {
  var project = tmp('ccc rel proj ');
  var cfg = configWith([
    { scope: 'user', version: '8.1.0' },
    { scope: 'project', projectPath: project, version: '8.1.2' },
  ]);
  assert.strictEqual(rel.installedPlugin(cfg, project).version, '8.1.2');
  assert.strictEqual(rel.installedPlugin(cfg, tmp('ccc rel other ')).version, '8.1.0');
});

test('an install that belongs only to another project is not used', function() {
  var cfg = configWith([{ scope: 'project', projectPath: tmp('ccc rel elsewhere '), version: '9.0.0' }]);
  assert.strictEqual(rel.installedPlugin(cfg, tmp('ccc rel here ')), null);
  assert.deepStrictEqual(rel.resolveRelease({ root: checkout('8.1.1'), env: { CLAUDE_CONFIG_DIR: cfg }, cwd: tmp('ccc rel here2 ') }).drift, []);
});

test('missing or malformed installed_plugins.json means no plugin and no drift', function() {
  var empty = tmp('ccc rel empty ');
  var info = rel.resolveRelease({ root: checkout('8.1.1'), env: { CLAUDE_CONFIG_DIR: empty } });
  assert.strictEqual(info.plugin, null);
  assert.deepStrictEqual(info.drift, []);
  var bad = tmp('ccc rel bad ');
  fs.mkdirSync(path.join(bad, 'plugins'));
  fs.writeFileSync(path.join(bad, 'plugins', 'installed_plugins.json'), '{not json');
  assert.strictEqual(rel.installedPlugin(bad), null);
});

test('CCC_CONFIG_DIR overrides CLAUDE_CONFIG_DIR; default is HOME/.claude', function() {
  assert.strictEqual(rel.configDirFrom({ CCC_CONFIG_DIR: '/a b/c', CLAUDE_CONFIG_DIR: '/x' }), path.resolve('/a b/c'));
  assert.strictEqual(rel.configDirFrom({ CLAUDE_CONFIG_DIR: '/x' }), path.resolve('/x'));
  assert.strictEqual(rel.configDirFrom({ HOME: '/h' }), path.join('/h', '.claude'));
});

test('readGitSha reads loose refs, packed refs and linked worktrees without git', function() {
  var sha = 'b'.repeat(40);
  var root = tmp('ccc rel git ');
  fs.mkdirSync(path.join(root, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(root, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(root, '.git', 'packed-refs'), '# pack-refs\n' + sha + ' refs/heads/main\n');
  assert.strictEqual(rel.readGitSha(root), sha);
  var loose = 'c'.repeat(40);
  fs.writeFileSync(path.join(root, '.git', 'refs', 'heads', 'main'), loose + '\n');
  assert.strictEqual(rel.readGitSha(root), loose);
  // linked worktree: .git file -> gitdir with commondir
  var wt = tmp('ccc rel wt ');
  var wtGit = path.join(root, '.git', 'worktrees', 'wt');
  fs.mkdirSync(wtGit, { recursive: true });
  fs.writeFileSync(path.join(wtGit, 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(wtGit, 'commondir'), '../..\n');
  fs.writeFileSync(path.join(wt, '.git'), 'gitdir: ' + wtGit + '\n');
  assert.strictEqual(rel.readGitSha(wt), loose);
  assert.strictEqual(rel.readGitSha(tmp('ccc rel nogit ')), null);
});

test('ccc --version prints the installed plugin and warns on stderr when behind', function() {
  var cfg = configWith([{ scope: 'user', version: '999.0.0' }]);
  var r = childProcess.spawnSync(process.execPath, [KC, '--version'], {
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: cfg, CCC_CONFIG_DIR: '' }),
  });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim(), 'Claude Code Commander v' + PKG_VERSION + ' (installed plugin v999.0.0)');
  assert.match(r.stderr, /is behind the installed plugin 999\.0\.0/);
});

test('a stale record whose cache dir is gone is reported, not treated as installed', function() {
  var cfg = configWith([{ scope: 'user', version: '9.0.0', installPath: path.join(tmp('ccc rel gone '), 'missing') }]);
  var info = rel.resolveRelease({ root: checkout('8.1.1'), env: { CLAUDE_CONFIG_DIR: cfg } });
  assert.strictEqual(info.plugin.installed, false);
  assert.deepStrictEqual(info.drift.map(function(d) { return d.kind; }), ['plugin_record_stale']);
  var vr = rel.versionReport('P', info);
  assert.strictEqual(vr.line, 'P v8.1.1 (plugin record v9.0.0, cache missing)');
  assert.deepStrictEqual(vr.warnings, ['warning: installed_plugins.json lists commander 9.0.0 but its cache dir is missing. Update: claude plugin install commander@commander-hub']);
});
