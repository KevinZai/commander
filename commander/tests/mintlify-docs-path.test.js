'use strict';

// #209: Mintlify's docs.json lives at mintlify-docs/docs.json, not at the
// repo root or docs/. The vendored Mintlify skill told agents to "Read
// docs.json in the project root", and the .claude/launch.json preview ran
// `mintlify dev` from the repo root, so both missed the real config.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SKILL_COPIES = [
  path.join(ROOT, '.agents', 'skills', 'mintlify', 'SKILL.md'),
  path.join(ROOT, 'skills', 'mintlify', 'SKILL.md'),
];

test('docs.json lives in mintlify-docs/, not the repo root or docs/', function () {
  assert.ok(fs.existsSync(path.join(ROOT, 'mintlify-docs', 'docs.json')), 'mintlify-docs/docs.json must exist');
  assert.ok(!fs.existsSync(path.join(ROOT, 'docs.json')), 'no docs.json at the repo root');
  assert.ok(!fs.existsSync(path.join(ROOT, 'docs', 'docs.json')), 'no docs.json in docs/');
  JSON.parse(fs.readFileSync(path.join(ROOT, 'mintlify-docs', 'docs.json'), 'utf8'));
});

test('Mintlify skill points at mintlify-docs/docs.json', function () {
  for (const p of SKILL_COPIES) {
    if (!fs.existsSync(p)) continue;
    const s = fs.readFileSync(p, 'utf8');
    const rel = path.relative(ROOT, p);
    assert.ok(!/docs\.json` in the project root/.test(s), rel + ' must not say docs.json is in the project root');
    assert.ok(s.includes('mintlify-docs/docs.json'), rel + ' must name mintlify-docs/docs.json');
  }
});

test('.claude/launch.json Mintlify preview runs from mintlify-docs/', function () {
  const p = path.join(ROOT, '.claude', 'launch.json');
  if (!fs.existsSync(p)) return;
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
  const entries = (cfg.configurations || []).filter(function (c) {
    return /mintlify/i.test(c.name || '') || (c.runtimeArgs || []).join(' ').includes('mintlify');
  });
  assert.ok(entries.length > 0, 'expected a Mintlify preview entry');
  for (const c of entries) {
    const cmd = [c.runtimeExecutable].concat(c.runtimeArgs || []).join(' ');
    assert.ok(cmd.includes('mintlify-docs') || (c.cwd || '').includes('mintlify-docs'), c.name + ' must run from mintlify-docs/: ' + cmd);
  }
});
