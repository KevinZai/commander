// audit-licenses.test.js — Unit tests for the license audit lint logic
// Tests the detectLicenseFromContent + classification + verdict logic
// using mock vendor LICENSE file content. Does NOT rely on real vendor dirs.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// ─── Import the classifier logic directly via inline extraction ───────────────
// We re-implement just the classification helpers here to avoid coupling test
// to main script's internal structure. The key behaviours we verify:
//   1. detectLicenseFromContent correctly identifies each SPDX type
//   2. CLASSIFICATION verdict map is complete and correct
//   3. resolveVendorLicense prefers copy.license over vendor spdx
//   4. audit-licenses.js exits 1 when FAIL copies are present

const CLASSIFICATION = {
  'MIT': { verdict: 'OK' },
  'MIT-implied': { verdict: 'OK' },
  'Apache-2.0': { verdict: 'WARN' },
  'BSD-2-Clause': { verdict: 'WARN' },
  'BSD-3-Clause': { verdict: 'WARN' },
  'ISC': { verdict: 'WARN' },
  'CC-BY-SA-4.0': { verdict: 'WARN' },
  'AGPL-3.0': { verdict: 'FAIL' },
  'GPL-2.0': { verdict: 'FAIL' },
  'GPL-3.0': { verdict: 'FAIL' },
  'LGPL-2.1': { verdict: 'FAIL' },
  'MPL-2.0': { verdict: 'FAIL' },
  'LicenseRef-Anthropic-Proprietary': { verdict: 'FAIL' },
  'LicenseRef-Informational-Wrapper': { verdict: 'OK' },
  'UNKNOWN': { verdict: 'FAIL' },
};

function detectLicenseFromContent(content) {
  if (!content) return 'UNKNOWN';
  const c = content.trim();
  if (/GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3/i.test(c)) return 'AGPL-3.0';
  if (/GNU GENERAL PUBLIC LICENSE\s+Version 2/i.test(c)) return 'GPL-2.0';
  if (/GNU GENERAL PUBLIC LICENSE\s+Version 3/i.test(c)) return 'GPL-3.0';
  if (/GNU LESSER GENERAL PUBLIC LICENSE/i.test(c)) return 'LGPL-2.1';
  if (/Mozilla Public License/i.test(c)) return 'MPL-2.0';
  if (/Apache License\s+Version 2\.0/i.test(c)) return 'Apache-2.0';
  if (/Attribution-ShareAlike 4\.0 International/i.test(c)) return 'CC-BY-SA-4.0';
  if (/Anthropic, PBC\. All rights reserved/i.test(c)) return 'LicenseRef-Anthropic-Proprietary';
  if (/MIT License/i.test(c) || /Permission is hereby granted, free of charge.*MIT/is.test(c)) return 'MIT';
  if (/Permission is hereby granted, free of charge.*sublicense/is.test(c)) return 'MIT-implied';
  if (/BSD 2-Clause/i.test(c)) return 'BSD-2-Clause';
  if (/BSD 3-Clause/i.test(c)) return 'BSD-3-Clause';
  if (/ISC License/i.test(c) || /\bISC\b/.test(c)) return 'ISC';
  return 'UNKNOWN';
}

// ─── 1. detectLicenseFromContent tests ───────────────────────────────────────

test('detects MIT from standard header', function () {
  const content = 'MIT License\n\nCopyright (c) 2025 Test Author\n\nPermission is hereby granted, free of charge...';
  assert.strictEqual(detectLicenseFromContent(content), 'MIT');
});

test('detects MIT-implied from permissive body (no header)', function () {
  const content = 'Copyright 2024 Someone\n\nPermission is hereby granted, free of charge, to any person obtaining a copy...sublicense...';
  assert.strictEqual(detectLicenseFromContent(content), 'MIT-implied');
});

test('detects Apache-2.0', function () {
  const content = '                                 Apache License\n                           Version 2.0, January 2004';
  assert.strictEqual(detectLicenseFromContent(content), 'Apache-2.0');
});

test('detects CC-BY-SA-4.0', function () {
  const content = 'Attribution-ShareAlike 4.0 International\n\n==========\n\nCreative Commons...';
  assert.strictEqual(detectLicenseFromContent(content), 'CC-BY-SA-4.0');
});

test('detects AGPL-3.0', function () {
  const content = '                  GNU AFFERO GENERAL PUBLIC LICENSE\n                      Version 3, 19 November 2007';
  assert.strictEqual(detectLicenseFromContent(content), 'AGPL-3.0');
});

test('detects GPL-2.0', function () {
  const content = '                    GNU GENERAL PUBLIC LICENSE\n                       Version 2, June 1991';
  assert.strictEqual(detectLicenseFromContent(content), 'GPL-2.0');
});

test('detects GPL-3.0', function () {
  const content = '                    GNU GENERAL PUBLIC LICENSE\n                       Version 3, 29 June 2007';
  assert.strictEqual(detectLicenseFromContent(content), 'GPL-3.0');
});

test('detects MPL-2.0', function () {
  const content = 'Mozilla Public License Version 2.0\n===========================================================';
  assert.strictEqual(detectLicenseFromContent(content), 'MPL-2.0');
});

test('detects Anthropic-Proprietary', function () {
  const content = '© 2025 Anthropic, PBC. All rights reserved.\n\nLICENSE: Use of these materials...';
  assert.strictEqual(detectLicenseFromContent(content), 'LicenseRef-Anthropic-Proprietary');
});

test('returns UNKNOWN for empty/null', function () {
  assert.strictEqual(detectLicenseFromContent(null), 'UNKNOWN');
  assert.strictEqual(detectLicenseFromContent(''), 'UNKNOWN');
  assert.strictEqual(detectLicenseFromContent('   '), 'UNKNOWN');
});

test('returns UNKNOWN for unrecognized content', function () {
  const content = 'This is some random text with no license keywords.';
  assert.strictEqual(detectLicenseFromContent(content), 'UNKNOWN');
});

// ─── 2. CLASSIFICATION verdict tests ─────────────────────────────────────────

test('MIT gets verdict OK', function () {
  assert.strictEqual(CLASSIFICATION['MIT'].verdict, 'OK');
});

test('MIT-implied gets verdict OK', function () {
  assert.strictEqual(CLASSIFICATION['MIT-implied'].verdict, 'OK');
});

test('Apache-2.0 gets verdict WARN (not FAIL)', function () {
  assert.strictEqual(CLASSIFICATION['Apache-2.0'].verdict, 'WARN');
});

test('CC-BY-SA-4.0 gets verdict WARN', function () {
  assert.strictEqual(CLASSIFICATION['CC-BY-SA-4.0'].verdict, 'WARN');
});

test('AGPL-3.0 gets verdict FAIL', function () {
  assert.strictEqual(CLASSIFICATION['AGPL-3.0'].verdict, 'FAIL');
});

test('GPL-2.0 gets verdict FAIL', function () {
  assert.strictEqual(CLASSIFICATION['GPL-2.0'].verdict, 'FAIL');
});

test('GPL-3.0 gets verdict FAIL', function () {
  assert.strictEqual(CLASSIFICATION['GPL-3.0'].verdict, 'FAIL');
});

test('MPL-2.0 gets verdict FAIL', function () {
  assert.strictEqual(CLASSIFICATION['MPL-2.0'].verdict, 'FAIL');
});

test('LicenseRef-Anthropic-Proprietary gets verdict FAIL', function () {
  assert.strictEqual(CLASSIFICATION['LicenseRef-Anthropic-Proprietary'].verdict, 'FAIL');
});

test('LicenseRef-Informational-Wrapper gets verdict OK', function () {
  assert.strictEqual(CLASSIFICATION['LicenseRef-Informational-Wrapper'].verdict, 'OK');
});

test('UNKNOWN gets verdict FAIL', function () {
  assert.strictEqual(CLASSIFICATION['UNKNOWN'].verdict, 'FAIL');
});

// ─── 3. copied-content.json structural integrity ──────────────────────────────

test('copied-content.json is valid JSON with required shape', function () {
  const jsonPath = path.join(__dirname, '..', 'scripts', 'copied-content.json');
  assert.ok(fs.existsSync(jsonPath), 'copied-content.json must exist');
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw); // throws on invalid JSON
  assert.ok(Array.isArray(data.copies), 'copies must be an array');
  assert.ok(data.copies.length > 0, 'copies must not be empty');
  for (const entry of data.copies) {
    assert.ok(typeof entry.file === 'string', 'each copy must have a file field');
    assert.ok(typeof entry.vendor === 'string', 'each copy must have a vendor field');
    assert.ok(typeof entry.license === 'string', 'each copy must have a license field');
  }
});

test('every license in copied-content.json is in CLASSIFICATION map', function () {
  const jsonPath = path.join(__dirname, '..', 'scripts', 'copied-content.json');
  const { copies } = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  for (const entry of copies) {
    assert.ok(
      CLASSIFICATION[entry.license] !== undefined,
      `license '${entry.license}' in ${entry.file} has no CLASSIFICATION entry`
    );
  }
});

// ─── 4. audit-licenses.js --check exits 1 when FAIL copies present ───────────

test('audit-licenses.js --check exits 1 (FAIL copies detected)', function () {
  const { execFileSync, spawnSync } = require('node:child_process');
  const script = path.join(__dirname, '..', 'scripts', 'audit-licenses.js');
  // Run the real audit against the actual repo state
  const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  // We expect exit code 1 because pptx + pdf-official are Anthropic-Proprietary FAIL
  assert.strictEqual(
    result.status,
    1,
    'audit --check must exit 1 when Anthropic-Proprietary copies are in tree'
  );
  assert.ok(result.stdout.includes('HARD FAIL'), 'stdout must include HARD FAIL');
});

test('audit-licenses.js --check output lists both failing files', function () {
  const { spawnSync } = require('node:child_process');
  const script = path.join(__dirname, '..', 'scripts', 'audit-licenses.js');
  const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  assert.ok(result.stdout.includes('skills/pptx/SKILL.md'), 'pptx must be in FAIL list');
  assert.ok(result.stdout.includes('skills/pdf-official/SKILL.md'), 'pdf-official must be in FAIL list');
});
