#!/usr/bin/env node
'use strict';

/**
 * CC Commander — Fable Contract Footer
 *
 * Idempotent: appends a one-line Fable Method contract footer to every
 * commander/cowork-plugin/skills/*\/SKILL.md that doesn't already have one.
 * Safe to re-run — files already carrying the footer are skipped.
 *
 * Usage:
 *   node scripts/add-fable-contract.js          # apply
 *   node scripts/add-fable-contract.js --check  # dry-run, exits 1 if any file needs it
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SKILLS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');

var CONTRACT_LINE = '> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`';
var MARKER = 'Fable contract:';

function hasContract(content) {
  return content.indexOf(MARKER) !== -1;
}

function appendContract(content) {
  var trimmed = content.replace(/\s+$/, '');
  return trimmed + '\n\n---\n\n' + CONTRACT_LINE + '\n';
}

function main() {
  var checkOnly = process.argv.indexOf('--check') !== -1;
  var entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  var needsFix = [];
  var patched = [];

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (!entry.isDirectory()) continue;
    var skillPath = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;

    var content = fs.readFileSync(skillPath, 'utf8');
    if (hasContract(content)) continue;

    needsFix.push(entry.name);
    if (!checkOnly) {
      fs.writeFileSync(skillPath, appendContract(content), 'utf8');
      patched.push(entry.name);
    }
  }

  if (checkOnly) {
    if (needsFix.length > 0) {
      console.error('Missing Fable contract footer (' + needsFix.length + '):');
      needsFix.forEach(function (n) { console.error('  - ' + n); });
      process.exit(1);
    }
    console.log('PASS: all skills carry the Fable contract footer');
    return;
  }

  console.log('Patched ' + patched.length + ' skill(s):');
  patched.forEach(function (n) { console.log('  - ' + n); });
  console.log('Already compliant: ' + (entries.filter(function (e) { return e.isDirectory(); }).length - patched.length));
}

main();
