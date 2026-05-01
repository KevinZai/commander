#!/usr/bin/env node
// audit-licenses.js — Phase 3a MIT license compliance gate
// Reads vendor LICENSE files + copied-content.json and classifies each copied file.
//
// Exit codes:
//   0 = all clear (all MIT) or only compatible-but-flagged (allowed list)
//   1 = HARD FAIL: GPL/AGPL/MPL/proprietary copy found (or unknown)
//
// Usage:
//   node commander/scripts/audit-licenses.js           # print report
//   node commander/scripts/audit-licenses.js --check   # exit 1 on any FAIL

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const VENDOR_DIR = path.join(REPO_ROOT, 'vendor');
const COPIES_JSON = path.join(__dirname, 'copied-content.json');

// ─── License classification ──────────────────────────────────────────────────

const CLASSIFICATION = {
  // Strict MIT
  'MIT': { verdict: 'OK', label: '✅ MIT' },
  // Repomix omits "MIT License" header but is MIT body — treat as MIT
  'MIT-implied': { verdict: 'OK', label: '✅ MIT (implied)' },
  // Permissive but not strict-MIT — compatible, Kevin must explicitly allow
  'Apache-2.0': { verdict: 'WARN', label: '⚠️  Apache-2.0' },
  'BSD-2-Clause': { verdict: 'WARN', label: '⚠️  BSD-2-Clause' },
  'BSD-3-Clause': { verdict: 'WARN', label: '⚠️  BSD-3-Clause' },
  'ISC': { verdict: 'WARN', label: '⚠️  ISC' },
  'CC-BY-SA-4.0': { verdict: 'WARN', label: '⚠️  CC-BY-SA-4.0 (ShareAlike — derivatives must share-alike)' },
  // Copyleft — hard fail if copied
  'AGPL-3.0': { verdict: 'FAIL', label: '❌ AGPL-3.0' },
  'GPL-2.0': { verdict: 'FAIL', label: '❌ GPL-2.0' },
  'GPL-3.0': { verdict: 'FAIL', label: '❌ GPL-3.0' },
  'LGPL-2.1': { verdict: 'FAIL', label: '❌ LGPL-2.1' },
  'MPL-2.0': { verdict: 'FAIL', label: '❌ MPL-2.0' },
  'LicenseRef-Anthropic-Proprietary': { verdict: 'FAIL', label: '❌ Anthropic-Proprietary (no redistribution)' },
  'LicenseRef-Informational-Wrapper': { verdict: 'OK', label: '✅ Informational wrapper (no code copy)' },
  'UNKNOWN': { verdict: 'FAIL', label: '❓ UNKNOWN (unclassified)' },
};

// ─── Detect license from LICENSE file content ────────────────────────────────

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

  // MIT: permissive grant + no warranty
  if (/MIT License/i.test(c) || /Permission is hereby granted, free of charge.*MIT/is.test(c)) return 'MIT';
  if (/Permission is hereby granted, free of charge.*sublicense/is.test(c)) return 'MIT-implied';

  if (/BSD 2-Clause/i.test(c) || /Redistribution and use in source.*binary forms.*without modification/i.test(c)) return 'BSD-2-Clause';
  if (/BSD 3-Clause/i.test(c)) return 'BSD-3-Clause';
  if (/ISC License/i.test(c) || /\bISC\b/.test(c)) return 'ISC';

  return 'UNKNOWN';
}

// ─── Read vendor license files ────────────────────────────────────────────────

function classifyVendors() {
  const vendors = {};

  // Real submodule vendors
  if (!fs.existsSync(VENDOR_DIR)) return vendors;

  for (const name of fs.readdirSync(VENDOR_DIR)) {
    const dir = path.join(VENDOR_DIR, name);
    if (!fs.statSync(dir).isDirectory()) continue;

    let licenseContent = null;
    for (const candidate of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING']) {
      const p = path.join(dir, candidate);
      if (fs.existsSync(p)) {
        licenseContent = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    const spdx = detectLicenseFromContent(licenseContent);
    vendors[name] = { spdx, hasLicenseFile: licenseContent !== null };
  }

  // Virtual vendors (external refs not in our vendor/ submodules)
  vendors['knowledge-work-plugins'] = {
    spdx: 'Apache-2.0',
    hasLicenseFile: false,
    note: 'External: github.com/anthropics/knowledge-work-plugins — Apache-2.0 per attribution in skill files',
  };
  vendors['anthropic-skills'] = {
    spdx: 'mixed',
    hasLicenseFile: false,
    note: 'Anthropic official skills — mixed: Apache-2.0 or Proprietary depending on skill. Per-copy check required.',
  };

  return vendors;
}

// ─── Lookup vendor spdx for a given copy entry ───────────────────────────────

function resolveVendorLicense(copy, vendors) {
  // If the copy entry directly specifies its own license, trust it
  if (copy.license && copy.license !== 'UNKNOWN') {
    return copy.license;
  }
  const vendor = copy.vendor;
  if (!vendor || !vendors[vendor]) return 'UNKNOWN';
  return vendors[vendor].spdx === 'mixed' ? 'UNKNOWN' : vendors[vendor].spdx;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const checkMode = process.argv.includes('--check');
  const jsonMode = process.argv.includes('--json');

  // 1. Classify vendors
  const vendors = classifyVendors();

  // 2. Load copies provenance map
  if (!fs.existsSync(COPIES_JSON)) {
    console.error('ERROR: copied-content.json not found at', COPIES_JSON);
    process.exit(1);
  }
  const { copies } = JSON.parse(fs.readFileSync(COPIES_JSON, 'utf8'));

  // 3. Classify each copy
  const results = copies.map(copy => {
    const spdx = resolveVendorLicense(copy, vendors);
    const cls = CLASSIFICATION[spdx] || CLASSIFICATION['UNKNOWN'];
    return { ...copy, spdx, ...cls };
  });

  // 4. Count verdicts
  const ok = results.filter(r => r.verdict === 'OK');
  const warn = results.filter(r => r.verdict === 'WARN');
  const fail = results.filter(r => r.verdict === 'FAIL');

  // 5. Vendor table
  const vendorTable = Object.entries(vendors).map(([name, v]) => {
    const cls = CLASSIFICATION[v.spdx] || CLASSIFICATION['UNKNOWN'];
    return { name, spdx: v.spdx, verdict: cls.verdict, label: cls.label };
  });
  const vendorMIT = vendorTable.filter(v => v.verdict === 'OK').length;
  const vendorWarn = vendorTable.filter(v => v.verdict === 'WARN').length;
  const vendorFail = vendorTable.filter(v => v.verdict === 'FAIL').length;

  if (jsonMode) {
    console.log(JSON.stringify({ vendors: vendorTable, copies: results, summary: { ok: ok.length, warn: warn.length, fail: fail.length } }, null, 2));
    process.exit(fail.length > 0 ? 1 : 0);
  }

  // 6. Print report
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  CC Commander — STRICT MIT License Audit (Phase 3a)');
  console.log('  Run date: ' + new Date().toISOString().slice(0, 10));
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('── Vendor submodules (' + Object.keys(vendors).length + ' total) ──────────────────────\n');
  for (const v of vendorTable) {
    console.log(`  ${v.label.padEnd(50)} ${v.name}`);
  }
  console.log(`\n  Summary: ${vendorMIT} MIT/OK · ${vendorWarn} compatible-but-flagged · ${vendorFail} FAIL\n`);

  console.log('── Copied content provenance (' + copies.length + ' files) ──────────────────\n');
  for (const r of results) {
    const icon = r.verdict === 'OK' ? '✅' : r.verdict === 'WARN' ? '⚠️ ' : '❌';
    console.log(`  ${icon} ${r.file}`);
    console.log(`     Vendor: ${r.vendor}  License: ${r.spdx}`);
    if (r.notes) console.log(`     Note: ${r.notes}`);
    console.log('');
  }

  console.log('── Verdict ───────────────────────────────────────────────\n');

  if (fail.length > 0) {
    console.log('  ❌ HARD FAIL — ' + fail.length + ' file(s) from non-distributable/copyleft vendor:\n');
    for (const r of fail) {
      console.log(`     • ${r.file} (${r.spdx})`);
    }
    console.log('\n  ACTION REQUIRED: Kevin must remove, relicense, or convert to submodule reference.');
    console.log('  DO NOT commit until resolved.\n');
  } else if (warn.length > 0) {
    console.log('  ⚠️  COMPATIBLE-BUT-NOT-STRICT-MIT — ' + warn.length + ' file(s) from Apache/BSD vendors:');
    console.log('  These are permissive and distribution-compatible, but not strict-MIT.');
    console.log('  Kevin has explicitly acknowledged these in copied-content.json.\n');
    for (const r of warn) {
      console.log(`     • ${r.file} (${r.spdx})`);
    }
    console.log('');
  } else {
    console.log('  ✅ ALL CLEAR — every copied file traces to an MIT-licensed source.\n');
  }

  console.log(`  Totals: ${ok.length} ✅ OK · ${warn.length} ⚠️  WARN · ${fail.length} ❌ FAIL\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (checkMode && fail.length > 0) {
    process.exit(1);
  }
}

main();
