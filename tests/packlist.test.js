'use strict';

// Release packlist contract (Codex audit #33/#38): the npm tarball must carry the
// licensing files and runtime assets the installer needs, and must not carry
// internal tests, paused Pro scaffolds or catalog archives. Asserts against the
// real `npm pack --dry-run --json` output, not against the `files` array.

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(REPO_ROOT, 'package.json'));

let packed = [];

test.before(() => {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  packed = parsed[0].files.map((f) => f.path.replace(/\\/g, '/'));
  assert.ok(packed.length > 0, 'npm pack reported no files');
});

test('packlist carries the licensing files and runtime assets', () => {
  for (const required of [
    'LICENSE',
    'NOTICE.md',
    'vendor/LICENSE',
    'docs/LICENSE-INTELLIGENCE.md',
    'settings.json.template',
    'install.sh',
    'package.json',
    'bin/kc.js',
    // Runtime asset used by skills/ccc-design/web-artifacts-builder/scripts/init-artifact.sh.
    'skills/ccc-design/web-artifacts-builder/scripts/shadcn-components.tar.gz',
  ]) {
    assert.ok(packed.includes(required), `missing from packlist: ${required}`);
  }
});

test('packlist keeps the Claude plugin and its generated Codex mirror', () => {
  assert.ok(packed.some((p) => p.startsWith('commander/cowork-plugin/')));
  assert.ok(packed.some((p) => p.startsWith('commander/cowork-plugin-codex/')));
  assert.ok(packed.includes('commander/cowork-plugin/.claude-plugin/plugin.json'));
});

test('packlist excludes internal tests, Pro scaffolds and catalog archives', () => {
  assert.deepEqual(
    packed.filter((p) => p.startsWith('commander/tests/')),
    [],
    'commander/tests must not ship'
  );
  assert.deepEqual(
    packed.filter((p) => p.startsWith('commander/cowork-plugin-pro/')),
    [],
    'paused Pro scaffolds must not ship'
  );
  assert.deepEqual(
    packed.filter((p) => p.endsWith('.zip')),
    [],
    'catalog archives must not ship'
  );
  assert.ok(!packed.some((p) => p.startsWith('node_modules/')));
});

test('package homepage is the product site', () => {
  assert.equal(pkg.homepage, 'https://commanderplugin.com');
});
