'use strict';
// scripts/propagate-release.js: docs/release.json mirrors package.json and contract.json.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'propagate-release.js');
const { build, render } = require(SCRIPT);

test('release.json carries the package version and the contract counts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'commander', 'contract.json'), 'utf8'));
  const release = build();
  assert.equal(release.version, pkg.version);
  assert.equal(release.tag, `v${pkg.version}`);
  assert.equal(release.counts.plugin_skills, contract.plugin_skills);
  assert.equal(release.counts.ecosystem_skills, contract.ecosystem_skills);
  assert.equal(release.counts.hook_handlers, contract.hook_handlers);
});

test('the committed docs/release.json is current (--check passes)', () => {
  const res = spawnSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.equal(fs.readFileSync(path.join(ROOT, 'docs', 'release.json'), 'utf8'), render(build()));
});
