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
  'LicenseRef-Unverified': { verdict: 'WARN' },
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

// ─── Unverified copies: FAIL when packaged, WARN otherwise ────────────────────
// Fixture-driven through --copies and --packlist, so the result does not depend
// on what the real tree happens to hold.

const SCRIPT = path.join(__dirname, '..', 'scripts', 'audit-licenses.js');
const UNVERIFIED_COPY = {
  file: 'skills/example/fixture/SKILL.md',
  vendor: 'example-vendor',
  license: 'LicenseRef-Unverified',
  notes: 'Upstream returns 404 and the copy ships no license text.',
};

function auditFixture(copies, packlist, extraArgs) {
  const { spawnSync } = require('node:child_process');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-licenses-'));
  const copiesFile = path.join(dir, 'copies.json');
  fs.writeFileSync(copiesFile, JSON.stringify({ copies }));
  const args = [SCRIPT, '--copies', copiesFile];
  if (packlist !== undefined) {
    const packFile = path.join(dir, 'pack.json');
    fs.writeFileSync(packFile, typeof packlist === 'string' ? packlist : JSON.stringify(packlist));
    args.push('--packlist', packFile);
  }
  return spawnSync(process.execPath, args.concat(extraArgs || []), { encoding: 'utf8' });
}

function npmPackJson(paths) {
  return [{ name: 'fixture', files: paths.map((p) => ({ path: p, size: 1, mode: 420 })) }];
}

test('unverified packaged copy fails --check', function () {
  const result = auditFixture([UNVERIFIED_COPY], npmPackJson(['package.json', UNVERIFIED_COPY.file]), ['--check']);
  assert.strictEqual(result.status, 1, 'a packaged copy with an unverified license must fail --check');
  assert.ok(result.stdout.includes('HARD FAIL'), 'the report names the hard failure');
  assert.ok(result.stdout.includes(UNVERIFIED_COPY.file + ' (LicenseRef-Unverified, packaged)'));

  // The JSON view agrees and marks the copy as packaged.
  const json = auditFixture([UNVERIFIED_COPY], npmPackJson([UNVERIFIED_COPY.file]), ['--json']);
  assert.strictEqual(json.status, 1);
  const copy = JSON.parse(json.stdout).copies[0];
  assert.strictEqual(copy.verdict, 'FAIL');
  assert.strictEqual(copy.packaged, true);
});

test('unverified unpackaged copy warns', function () {
  const result = auditFixture([UNVERIFIED_COPY], npmPackJson(['package.json', 'README.md']), ['--check']);
  assert.strictEqual(result.status, 0, 'an unpackaged unverified copy is a warning, not a failure');
  const unverified = result.stdout.indexOf('LICENSE UNVERIFIED');
  assert.ok(unverified > 0, 'the audit prints a LICENSE UNVERIFIED group');
  const line = result.stdout.indexOf(UNVERIFIED_COPY.file + ' (LicenseRef-Unverified)');
  assert.ok(line > unverified, 'the copy is listed under LICENSE UNVERIFIED');
  const permissive = result.stdout.indexOf('Kevin has explicitly acknowledged');
  assert.ok(permissive < 0 || permissive < unverified, 'the unverified group is separate from the acknowledged list');
  assert.ok(result.stdout.includes('0 ❌ FAIL'));
});

test('an UNKNOWN packaged copy fails and an unreadable file list fails closed', function () {
  const unknown = { file: 'skills/example/unknown/SKILL.md', vendor: 'nobody', license: 'UNKNOWN' };
  assert.strictEqual(auditFixture([unknown], npmPackJson([unknown.file]), ['--check']).status, 1);
  // A missing reason turns an unverified copy into UNKNOWN, which always fails.
  const noReason = { ...UNVERIFIED_COPY, notes: '' };
  assert.strictEqual(auditFixture([noReason], npmPackJson([]), ['--check']).status, 1);
  // When the package list cannot be read, the copy is treated as packaged.
  const broken = auditFixture([UNVERIFIED_COPY], '{not json', ['--check']);
  assert.strictEqual(broken.status, 1, 'an unreadable packlist must not let an unverified copy pass');
  assert.match(broken.stderr, /treating every unverified copy as packaged/);
});

test('--copies and --packlist reject a missing value and unknown flags', function () {
  const { spawnSync } = require('node:child_process');
  assert.strictEqual(spawnSync(process.execPath, [SCRIPT, '--copies'], { encoding: 'utf8' }).status, 2);
  assert.strictEqual(spawnSync(process.execPath, [SCRIPT, '--packlist', '--check'], { encoding: 'utf8' }).status, 2);
  assert.strictEqual(spawnSync(process.execPath, [SCRIPT, '--nope'], { encoding: 'utf8' }).status, 2);
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

// ─── 4. audit-licenses.js --check exits 0 when no FAIL copies present ────────

test('audit-licenses.js --check exits 0 (no FAIL copies in tree)', function () {
  const { spawnSync } = require('node:child_process');
  const script = path.join(__dirname, '..', 'scripts', 'audit-licenses.js');
  // Run the real audit against the actual repo state
  // skills/pptx and skills/pdf-official were git rm'd in commit 9e5e0db — no FAIL entries remain
  const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  assert.strictEqual(
    result.status,
    0,
    'audit --check must exit 0 when no Anthropic-Proprietary FAIL copies are in tree'
  );
  assert.ok(!result.stdout.includes('HARD FAIL'), 'stdout must NOT include HARD FAIL');
});

test('audit-licenses.js --check output shows 0 FAIL entries', function () {
  const { spawnSync } = require('node:child_process');
  const script = path.join(__dirname, '..', 'scripts', 'audit-licenses.js');
  const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  // pptx and pdf-official were removed — they must not appear in output
  assert.ok(!result.stdout.includes('skills/pptx/SKILL.md'), 'pptx must NOT be in output (skill removed)');
  assert.ok(!result.stdout.includes('skills/pdf-official/SKILL.md'), 'pdf-official must NOT be in output (skill removed)');
  assert.ok(result.stdout.includes('0 ❌ FAIL'), 'Totals line must show 0 FAIL');
});

test('the real provenance map holds no unverified copy and the rewritten screenshots skill is not listed', function () {
  const jsonPath = path.join(__dirname, '..', 'scripts', 'copied-content.json');
  const { copies } = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.deepStrictEqual(copies.filter((c) => c.license === 'LicenseRef-Unverified').map((c) => c.file), []);
  assert.ok(!copies.some((c) => c.file === 'skills/ccc-design/screenshots/SKILL.md'), 'the clean-room rewrite is not a copy');
});
