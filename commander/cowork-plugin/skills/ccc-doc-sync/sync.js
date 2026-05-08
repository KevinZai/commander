#!/usr/bin/env node
'use strict';

/**
 * ccc-doc-sync/sync.js
 *
 * Reads contract.json + package.json for canonical counts/version.
 * Applies declarative patterns from patterns.json to each target file.
 *
 * Usage:
 *   node sync.js --check   (dry-run, exits 1 if any file has drift)
 *   node sync.js --apply   (writes changes, exits 0)
 *   node sync.js           (defaults to --check)
 */

const fs = require('node:fs');
const path = require('node:path');

// ── paths ────────────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..', '..', '..', '..'); // project root
const CONTRACT = path.join(ROOT, 'commander', 'contract.json');
const PKG = path.join(ROOT, 'package.json');
const PATTERNS_FILE = path.join(__dirname, 'patterns.json');

// ── args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CHECK = args.includes('--check') || !APPLY;

// ── load sources ─────────────────────────────────────────────────────────────
function loadSources() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT, 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  return {
    plugin_skills: String(contract.plugin_skills),
    specialist_agents: String(contract.specialist_agents),
    hook_handlers: String(contract.hook_handlers),
    version: pkg.version,
  };
}

// ── template interpolation ────────────────────────────────────────────────────
function interpolate(template, vars) {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => {
    if (!(key in vars)) throw new Error(`Unknown template var: ${key}`);
    return vars[key];
  });
}

// ── apply one replacement entry to content ────────────────────────────────────
function applyReplacement(content, entry, vars) {
  const flags = entry.flags || 'g';
  const re = new RegExp(entry.regex, flags);
  const replacement = interpolate(entry.template, vars);
  return content.replace(re, replacement);
}

// ── process one file ──────────────────────────────────────────────────────────
function processFile(fileConfig, vars, applyMode) {
  const absPath = path.join(ROOT, fileConfig.file);

  if (!fs.existsSync(absPath)) {
    return { file: fileConfig.file, status: 'MISSING', before: '', after: '', changed: false };
  }

  const original = fs.readFileSync(absPath, 'utf8');
  let updated = original;

  for (const entry of fileConfig.replacements) {
    try {
      updated = applyReplacement(updated, entry, vars);
    } catch (err) {
      return { file: fileConfig.file, status: 'ERROR', error: err.message, before: original, after: updated, changed: false };
    }
  }

  const changed = updated !== original;

  if (changed && applyMode) {
    fs.writeFileSync(absPath, updated, 'utf8');
  }

  return {
    file: fileConfig.file,
    status: changed ? (applyMode ? 'UPDATED' : 'DRIFT') : 'OK',
    changed,
    diffCount: changed ? countDiffs(original, updated) : 0,
  };
}

// ── count lines that changed ──────────────────────────────────────────────────
function countDiffs(before, after) {
  const bLines = before.split('\n');
  const aLines = after.split('\n');
  let count = 0;
  const max = Math.max(bLines.length, aLines.length);
  for (let i = 0; i < max; i++) {
    if (bLines[i] !== aLines[i]) count++;
  }
  return count;
}

// ── table rendering ───────────────────────────────────────────────────────────
function renderTable(results, vars) {
  const COL = { file: 52, status: 9, lines: 6 };
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  const header = `${pad('File', COL.file)} ${pad('Status', COL.status)} ${pad('Lines', COL.lines)}`;
  const sep = '─'.repeat(header.length);

  const lines = [
    '',
    '  ccc-doc-sync',
    `  Sources: contract.json plugin_skills=${vars.plugin_skills}  specialist_agents=${vars.specialist_agents}  hook_handlers=${vars.hook_handlers}  version=${vars.version}`,
    '',
    `  ${header}`,
    `  ${sep}`,
  ];

  for (const r of results) {
    const icon = r.status === 'OK' ? '✓' : r.status === 'UPDATED' ? '↑' : r.status === 'DRIFT' ? '⚠' : r.status === 'MISSING' ? '?' : '✗';
    const statusStr = `${icon} ${r.status}`;
    const linesStr = r.changed ? `+${r.diffCount}` : '-';
    lines.push(`  ${pad(r.file, COL.file)} ${pad(statusStr, COL.status)} ${pad(linesStr, COL.lines)}`);
  }

  lines.push(`  ${sep}`);

  const driftFiles = results.filter(r => r.status === 'DRIFT');
  const updatedFiles = results.filter(r => r.status === 'UPDATED');
  const missingFiles = results.filter(r => r.status === 'MISSING');
  const errorFiles = results.filter(r => r.status === 'ERROR');
  const okFiles = results.filter(r => r.status === 'OK');

  if (APPLY) {
    lines.push(`  ${updatedFiles.length} updated  ${okFiles.length} already-synced  ${missingFiles.length} missing  ${errorFiles.length} errors`);
  } else {
    lines.push(`  ${driftFiles.length} drift  ${okFiles.length} synced  ${missingFiles.length} missing  ${errorFiles.length} errors`);
  }

  lines.push('');
  return lines.join('\n');
}

// ── main ──────────────────────────────────────────────────────────────────────
function main() {
  const vars = loadSources();
  const { patterns } = JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));

  const results = patterns.map(fileConfig => processFile(fileConfig, vars, APPLY));

  process.stdout.write(renderTable(results, vars));

  const driftCount = results.filter(r => r.status === 'DRIFT').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  if (errorCount > 0) {
    const errors = results.filter(r => r.status === 'ERROR');
    process.stderr.write('\nErrors:\n');
    for (const e of errors) {
      process.stderr.write(`  ${e.file}: ${e.error}\n`);
    }
    process.exit(2);
  }

  if (CHECK && driftCount > 0) {
    process.stderr.write(`\n  FAIL: ${driftCount} file(s) have stale counts. Run --apply to fix.\n\n`);
    process.exit(1);
  }

  if (CHECK && driftCount === 0) {
    process.stdout.write('  PASS: all files are in sync\n\n');
    process.exit(0);
  }

  if (APPLY) {
    const updatedCount = results.filter(r => r.status === 'UPDATED').length;
    process.stdout.write(`  DONE: ${updatedCount} file(s) updated\n\n`);
    process.exit(0);
  }
}

main();
