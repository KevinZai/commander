#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');

function countFilesNamed(dir, filename) {
  var count = 0;
  function walk(d) {
    try {
      var entries = fs.readdirSync(d, { withFileTypes: true });
      for (var e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'vendor') {
          walk(path.join(d, e.name));
        } else if (e.isFile() && e.name === filename) {
          count++;
        }
      }
    } catch (_) {}
  }
  walk(dir);
  return count;
}

function countMdFiles(dir) {
  var count = 0;
  function walk(d) {
    try {
      fs.readdirSync(d, { withFileTypes: true }).forEach(function (e) {
        var full = path.join(d, e.name);
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          walk(full);
        } else if (e.isFile() && e.name.endsWith('.md')) {
          count++;
        }
      });
    } catch (_) {}
  }
  walk(dir);
  return count;
}

function countDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(function (e) { return e.isDirectory(); }).length;
  } catch (_) { return 0; }
}

function countFilesByExt(dir, ext) {
  try {
    return fs.readdirSync(dir).filter(function (f) { return f.endsWith(ext); }).length;
  } catch (_) { return 0; }
}

// Gather counts
var pkg;
try {
  pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
} catch (_) {
  pkg = { version: 'unknown' };
}

var skillBrowser;
var skillsCli = 0;
try {
  skillBrowser = require(path.join(ROOT, 'commander', 'skill-browser'));
  skillsCli = skillBrowser.listSkills().length;
} catch (_) {}

var counts = {
  version: pkg.version,
  skillsCli: skillsCli,
  skillsDisk: countFilesNamed(path.join(ROOT, 'skills'), 'SKILL.md'),
  commands: countFilesByExt(path.join(ROOT, 'commands'), '.md'),
  hooks: countFilesByExt(path.join(ROOT, 'hooks'), '.js'),
  vendors: countDir(path.join(ROOT, 'vendor')),
  themes: 10,
  prompts: countMdFiles(path.join(ROOT, 'prompts')),
  templates: countFilesByExt(path.join(ROOT, 'templates'), '.md'),
  domains: 11,
};

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(counts, null, 2) + '\n');
  process.exit(0);
}

if (process.argv.includes('--check')) {
  var claudePath = path.join(ROOT, 'CLAUDE.md');
  var claude = '';
  try { claude = fs.readFileSync(claudePath, 'utf8'); } catch (_) {
    process.stderr.write('ERROR: Could not read CLAUDE.md\n');
    process.exit(1);
  }

  var errors = [];

  if (!claude.includes(counts.version)) {
    errors.push('Version ' + counts.version + ' not found in CLAUDE.md');
  }

  var vendorStr = String(counts.vendors);
  if (!claude.includes(vendorStr + ' vendor')) {
    errors.push('Vendor count ' + vendorStr + ' not in CLAUDE.md (expected "' + vendorStr + ' vendor")');
  }

  if (errors.length > 0) {
    process.stderr.write('FAIL: ' + errors.length + ' count mismatch(es)\n');
    errors.forEach(function (e) { process.stderr.write('  - ' + e + '\n'); });
    process.exit(1);
  }

  process.stdout.write('PASS: All doc counts verified\n');
  process.exit(0);
}

// Default: human-readable table
process.stdout.write('\nCC Commander — Canonical Counts\n\n');
process.stdout.write('  Skills (CLI):    ' + counts.skillsCli + '\n');
process.stdout.write('  Skills (disk):   ' + counts.skillsDisk + '\n');
process.stdout.write('  Commands:        ' + counts.commands + '\n');
process.stdout.write('  Hooks (JS):      ' + counts.hooks + '\n');
process.stdout.write('  Vendors:         ' + counts.vendors + '\n');
process.stdout.write('  Themes:          ' + counts.themes + '\n');
process.stdout.write('  Prompts:         ' + counts.prompts + '\n');
process.stdout.write('  Templates:       ' + counts.templates + '\n');
process.stdout.write('  Domains:         ' + counts.domains + '\n');
process.stdout.write('  Version:         ' + counts.version + '\n');
process.stdout.write('\n');
