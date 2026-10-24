'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stripVTControlCharacters } = require('node:util');

const STATUSLINE = path.join(__dirname, '..', 'lib', 'statusline.sh');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function fixture(t, { legacyVersion = '8.0.0', toolkitVersion = '7.0.0' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc statusline version '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'home dir');
  const config = path.join(root, 'claude config');
  const project = path.join(root, 'session project');
  const toolkit = path.join(root, 'toolkit checkout');
  fs.mkdirSync(home);
  fs.mkdirSync(project);
  fs.mkdirSync(path.join(toolkit, 'lib'), { recursive: true });
  fs.copyFileSync(STATUSLINE, path.join(toolkit, 'lib', 'statusline.sh'));
  if (legacyVersion) writeJson(path.join(home, 'clawd', 'projects', 'cc-commander', 'package.json'), { version: legacyVersion });
  if (toolkitVersion) writeJson(path.join(toolkit, 'package.json'), { version: toolkitVersion });
  return { home, config, project, toolkit };
}

function plugin(f, version, scope, projectPath) {
  const installPath = path.join(f.config, 'plugins', 'cache', 'commander-hub', 'commander', version);
  writeJson(path.join(installPath, '.claude-plugin', 'plugin.json'), { name: 'commander', version });
  return { scope, installPath, version, ...(projectPath ? { projectPath } : {}) };
}

function registry(f, plugins) {
  writeJson(path.join(f.config, 'plugins', 'installed_plugins.json'), { version: 2, plugins });
}

function runStatusline(f, env = {}) {
  const result = spawnSync('bash', ['lib/statusline.sh'], {
    cwd: f.toolkit,
    env: { PATH: process.env.PATH, HOME: f.home, CLAUDE_CONFIG_DIR: f.config, LC_ALL: 'C', ...env },
    encoding: 'utf8',
    timeout: 10_000,
    input: JSON.stringify({
      session_id: 'statusline-version-test',
      cwd: f.project,
      model: { id: 'test-model', display_name: 'Claude' },
      workspace: { current_dir: f.project, project_dir: f.project },
      cost: { total_cost_usd: 1.25, total_duration_ms: 300_000 },
      context_window: { used_percentage: 42, total_input_tokens: 12_000, total_output_tokens: 1600 },
      rate_limits: { five_hour: { used_percentage: 12 }, seven_day: { used_percentage: 25 } },
    }),
  });
  assert.ifError(result.error);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(result.stderr, '', 'status line must fail quietly');
  return stripVTControlCharacters(result.stdout);
}

test('installed Commander plugin.json wins over stale registry and toolkit versions', (t) => {
  const f = fixture(t);
  const entry = plugin(f, '9.4.2', 'user');
  registry(f, { 'commander@commander-hub': [{ ...entry, version: '9.4.0' }] });

  const output = runStatusline(f);
  assert.match(output, /^━━ CCC9\.4\.2\s/);
  assert.doesNotMatch(output, /CCC8\.0/);
});

test('matching project scope wins over user scope across Commander registry keys', (t) => {
  const f = fixture(t);
  registry(f, {
    'commander@commander-hub': [
      plugin(f, '9.6.1', 'project', path.join(f.home, 'other project')),
      plugin(f, '9.4.2', 'user'),
    ],
    'commander@another-marketplace': [plugin(f, '9.5.1', 'project', f.project)],
  });

  assert.match(runStatusline(f), /^━━ CCC9\.5\.1\s/);
});

test('user scope wins when project entries belong to another directory', (t) => {
  const f = fixture(t);
  registry(f, { 'commander@commander-hub': [
    plugin(f, '9.5.1', 'project', path.join(f.home, 'other project')),
    plugin(f, '9.4.2', 'user'),
  ] });

  assert.match(runStatusline(f), /^━━ CCC9\.4\.2\s/);
});

test('first Commander entry is used when no project or user scope matches', (t) => {
  const f = fixture(t);
  registry(f, {
    'other-commander@commander-hub': [plugin(f, '99.0.1', 'user')],
    'commander@commander-hub': [
      plugin(f, '9.4.2', 'local'),
      plugin(f, '9.5.1', 'project', path.join(f.home, 'other project')),
    ],
  });

  assert.match(runStatusline(f), /^━━ CCC9\.4\.2\s/);
});

for (const manifest of ['missing', 'malformed']) {
  test(`registry version is used quietly when plugin.json is ${manifest}`, (t) => {
    const f = fixture(t);
    const installPath = path.join(f.config, 'plugins', 'cache', 'commander-hub', 'commander', '9.4.2');
    registry(f, { 'commander@commander-hub': [{ scope: 'user', installPath, version: '9.4.2' }] });
    if (manifest === 'malformed') {
      fs.mkdirSync(path.join(installPath, '.claude-plugin'), { recursive: true });
      fs.writeFileSync(path.join(installPath, '.claude-plugin', 'plugin.json'), '{invalid');
    }

    assert.match(runStatusline(f), /^━━ CCC9\.4\.2\s/);
  });
}

test('default config directory is HOME/.claude when CLAUDE_CONFIG_DIR is unset', (t) => {
  const base = fixture(t);
  const f = { ...base, config: path.join(base.home, '.claude') };
  registry(f, { 'commander@commander-hub': [plugin(f, '9.4.2', 'user')] });

  assert.match(runStatusline(f, { CLAUDE_CONFIG_DIR: undefined }), /^━━ CCC9\.4\.2\s/);
});

test('missing installed_plugins.json falls back to the legacy package.json version', (t) => {
  assert.match(runStatusline(fixture(t)), /^━━ CCC8\.0\s/);
});

test('malformed installed_plugins.json falls back quietly to package.json', (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.config, 'plugins'), { recursive: true });
  fs.writeFileSync(path.join(f.config, 'plugins', 'installed_plugins.json'), '{invalid');

  assert.match(runStatusline(f), /^━━ CCC8\.0\s/);
});

test('registry without Commander falls back to package.json', (t) => {
  const f = fixture(t);
  registry(f, { 'other-commander@commander-hub': [plugin(f, '9.4.2', 'user')] });

  assert.match(runStatusline(f), /^━━ CCC8\.0\s/);
});

test('package.json next to the script remains the second fallback', (t) => {
  assert.match(runStatusline(fixture(t, { legacyVersion: null })), /^━━ CCC7\.0\s/);
});

test('label remains CC when no version is available', (t) => {
  assert.match(runStatusline(fixture(t, { legacyVersion: null, toolkitVersion: null })), /^━━ CC\s/);
});
