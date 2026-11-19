#!/usr/bin/env node
// audit-licenses.js — Phase 3a MIT license compliance gate
// Reads vendor LICENSE files + copied-content.json and classifies each copied file.
//
// Exit codes:
//   0 = all clear (all MIT) or only compatible-but-flagged (allowed list)
//   1 = HARD FAIL: GPL/AGPL/MPL/proprietary copy found (or unknown), or a copy
//       whose license is unverified ships in the npm package
//
// Usage:
//   node commander/scripts/audit-licenses.js           # print report
//   node commander/scripts/audit-licenses.js --check   # exit 1 on any FAIL
//   --copies <file>     read this provenance map instead of copied-content.json
//   --packlist <file>   read `npm pack --dry-run --json` output from a file
//                       instead of running npm pack (fixtures, offline runs)
//
// An unverified (LicenseRef-Unverified) or UNKNOWN copy that appears in the
// package file list FAILS: it would be redistributed. An unverified copy that
// is not packaged only warns. When the file list cannot be computed, every
// unverified copy is treated as packaged (fail closed).

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
  'LicenseRef-Unverified': { verdict: 'WARN', label: '⚠️  Unverified (upstream unreachable, no license text shipped)' },
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

// ─── Package file list ───────────────────────────────────────────────────────

// Licenses whose redistribution we cannot vouch for: shipping one is a FAIL.
const UNVERIFIED_SPDX = new Set(['LicenseRef-Unverified', 'UNKNOWN']);

function parseArgs(argv) {
  const opts = { check: false, json: false, copies: COPIES_JSON, packlist: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') opts.check = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--copies' || a === '--packlist') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(a + ' needs a file path');
      opts[a.slice(2)] = path.resolve(value);
    } else throw new Error('unknown argument: ' + a);
  }
  return opts;
}

// One spelling per repo file: POSIX separators, normalized, no leading "./".
// Both the packlist and copies.json go through it, so "./skills/x" and
// "skills/x" compare equal (Codex #302 H15).
function canonicalPath(p) {
  const posix = path.posix.normalize(String(p).replace(/\\/g, '/'));
  return posix.replace(/^(?:\.\/)+/, '');
}

// Accepts `npm pack --dry-run --json` output ([{ files: [{ path }] }]) or a
// plain array of paths. Returns a Set of canonical repo-relative paths. Any
// other shape ({}, an entry without files[], a non-string path) throws, so an
// unreadable list is treated as "unknown" and every unverified copy as packaged.
function packlistFromJson(parsed) {
  if (!Array.isArray(parsed) && !(parsed && typeof parsed === 'object' && Array.isArray(parsed.files))) {
    throw new Error('packlist must be an array of paths or npm pack --json output');
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const files = new Set();
  for (const entry of entries) {
    if (typeof entry === 'string') files.add(canonicalPath(entry));
    else if (entry && typeof entry === 'object' && Array.isArray(entry.files)) {
      for (const f of entry.files) {
        if (!f || typeof f.path !== 'string') throw new Error('packlist file entry without a string path');
        files.add(canonicalPath(f.path));
      }
    } else throw new Error('packlist entry is neither a path nor { files: [...] }');
  }
  return files;
}

// Returns { files: Set|null, source, error? }. null files means "unknown".
function loadPacklist(packlistFile) {
  if (packlistFile) {
    try {
      return { files: packlistFromJson(JSON.parse(fs.readFileSync(packlistFile, 'utf8'))), source: packlistFile };
    } catch (err) {
      return { files: null, source: packlistFile, error: err.message };
    }
  }
  const { spawnSync } = require('node:child_process');
  const r = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  if (r.status !== 0 || r.error) {
    return { files: null, source: 'npm pack --dry-run', error: r.error ? r.error.message : 'exit ' + r.status };
  }
  try {
    return { files: packlistFromJson(JSON.parse(r.stdout)), source: 'npm pack --dry-run' };
  } catch (err) {
    return { files: null, source: 'npm pack --dry-run', error: err.message };
  }
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error('audit-licenses: ' + err.message);
    process.exit(2);
  }
  const checkMode = opts.check;
  const jsonMode = opts.json;

  // 1. Classify vendors
  const vendors = classifyVendors();

  // 2. Load copies provenance map
  if (!fs.existsSync(opts.copies)) {
    console.error('ERROR: copies provenance map not found at', opts.copies);
    process.exit(1);
  }
  const { copies } = JSON.parse(fs.readFileSync(opts.copies, 'utf8'));

  // 3. Classify each copy
  const classified = copies.map(copy => {
    let spdx = resolveVendorLicense(copy, vendors);
    // An unverified copy must say why (upstream gone, no license text); without a reason it counts as unknown.
    if (spdx === 'LicenseRef-Unverified' && !/unreachable|404|no license text/i.test(copy.notes || '')) spdx = 'UNKNOWN';
    if (!CLASSIFICATION[spdx]) spdx = 'UNKNOWN';
    return { ...copy, spdx };
  });

  // 3b. A copy we cannot vouch for fails when it ships. The file list is only
  // computed when such a copy exists, so a clean tree never runs npm pack.
  const needsPacklist = classified.some(c => UNVERIFIED_SPDX.has(c.spdx));
  const packlist = needsPacklist ? loadPacklist(opts.packlist) : { files: null, source: 'not needed' };
  if (needsPacklist && !packlist.files) {
    console.error('audit-licenses: could not read the package file list (' + packlist.source + ': ' + packlist.error + '); treating every unverified copy as packaged.');
  }
  const results = classified.map(copy => {
    const packaged = needsPacklist && UNVERIFIED_SPDX.has(copy.spdx)
      ? (packlist.files ? packlist.files.has(canonicalPath(copy.file)) : true)
      : undefined;
    const cls = CLASSIFICATION[copy.spdx];
    if (copy.spdx === 'LicenseRef-Unverified' && packaged) {
      return { ...copy, packaged, verdict: 'FAIL', label: '❌ Unverified license in the npm package' };
    }
    return packaged === undefined ? { ...copy, ...cls } : { ...copy, packaged, ...cls };
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
      console.log(`     • ${r.file} (${r.spdx}${r.packaged ? ', packaged' : ''})`);
    }
    console.log('\n  ACTION REQUIRED: Kevin must remove, relicense, or convert to submodule reference.');
    console.log('  DO NOT commit until resolved.\n');
  } else if (warn.length > 0) {
    const unverified = warn.filter(r => r.spdx === 'LicenseRef-Unverified');
    const permissive = warn.filter(r => r.spdx !== 'LicenseRef-Unverified');
    if (permissive.length > 0) {
      console.log('  ⚠️  COMPATIBLE-BUT-NOT-STRICT-MIT — ' + permissive.length + ' file(s) from Apache/BSD vendors:');
      console.log('  These are permissive and distribution-compatible, but not strict-MIT.');
      console.log('  Kevin has explicitly acknowledged these in copied-content.json.\n');
      for (const r of permissive) console.log(`     • ${r.file} (${r.spdx})`);
      console.log('');
    }
    if (unverified.length > 0) {
      console.log('  ❓ LICENSE UNVERIFIED — ' + unverified.length + ' file(s) whose upstream is unreachable and that ship no license text.');
      console.log('  Not in the npm package, so nothing is redistributed yet; packaging one fails --check.');
      console.log('  Recover the license, rewrite the file, or remove it.\n');
      for (const r of unverified) console.log(`     • ${r.file} (${r.spdx})`);
      console.log('');
    }
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
