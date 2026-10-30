'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { collect, render } = require('../scripts/render-skill-table.js');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'render-skill-table.js');

test('SKILLS-INDEX.md skill table matches the plugin skill frontmatter', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--check', 'SKILLS-INDEX.md'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('table marks hidden skills as on demand', () => {
  const skills = collect();
  const table = render(skills);
  const onDemand = skills.filter((s) => s.onDemand).length;
  assert.ok(onDemand > 0 && onDemand < skills.length);
  assert.equal((table.match(/\| on demand \|$/gm) || []).length, onDemand);
  assert.equal((table.match(/\| visible \|$/gm) || []).length, skills.length - onDemand);
});
