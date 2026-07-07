'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/add-fable-contract.js');
const SKILLS_DIR = path.join(ROOT, 'commander/cowork-plugin/skills');
const FABLE_METHOD_DOC = path.join(ROOT, 'commander/cowork-plugin/rules/fable-method.md');

const CONTRACT_LINE_RE = /^> ⚙️ \*\*Fable contract:\*\*/m;

// ── Doctrine file exists ──────────────────────────────────────────────────────
test('commander/cowork-plugin/rules/fable-method.md exists', function() {
  assert.ok(fs.existsSync(FABLE_METHOD_DOC), 'fable-method.md must exist — it is the doctrine every skill footer points to');
});

// ── --check mode passes on the live tree ──────────────────────────────────────
test('Live tree: all plugin skills carry the Fable contract footer (--check passes)', function() {
  try {
    execFileSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf-8' });
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    assert.fail(`add-fable-contract --check reported missing footers:\n${output}`);
  }
});

// ── Every plugin SKILL.md contains exactly ONE matching contract line ────────
test('Every plugin SKILL.md has exactly one Fable contract line', function() {
  const failures = [];
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  let scanned = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    scanned++;

    const content = fs.readFileSync(skillFile, 'utf-8');
    const matches = content.match(new RegExp(CONTRACT_LINE_RE.source, 'gm'));
    const count = matches ? matches.length : 0;

    if (count !== 1) {
      failures.push(`${entry.name}: found ${count} contract line(s), expected exactly 1`);
    }
  }

  assert.ok(scanned >= 60, `Expected to scan ≥60 plugin skills, only scanned ${scanned}`);
  assert.deepStrictEqual(failures, [], `Skills with wrong Fable contract line count:\n${failures.join('\n')}`);
});

// ── Idempotency: running the script twice produces no further changes ────────
test('add-fable-contract.js is idempotent (second run patches 0)', function() {
  const out = execFileSync(process.execPath, [SCRIPT], { encoding: 'utf-8' });
  assert.match(out, /Patched 0 skill\(s\)/, `Expected 0 patches on an already-compliant tree, got:\n${out}`);
});

// ── The footer text matches the exact contract string ─────────────────────────
test('Fable contract line uses the exact canonical wording', function() {
  const expected = '> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`';
  const sample = path.join(SKILLS_DIR, 'ccc-fable', 'SKILL.md');
  assert.ok(fs.existsSync(sample), 'ccc-fable/SKILL.md must exist');
  const content = fs.readFileSync(sample, 'utf-8');
  assert.ok(content.includes(expected), 'Contract line text must match canonical wording exactly');
});
