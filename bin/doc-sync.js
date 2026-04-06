#!/usr/bin/env node
'use strict';

/**
 * doc-sync.js — Checks that all docs have matching counts.
 * Run: node bin/doc-sync.js
 * CI: add to prepublishOnly or GitHub Actions
 * Returns exit code 1 if any doc is stale.
 */

var fs = require('fs');
var path = require('path');
var skillBrowser = require('../commander/skill-browser');

var skillCount = skillBrowser.listSkills().length;
var vendorCount = fs.readdirSync(path.join(__dirname, '..', 'vendor')).filter(function(f) { return f !== 'LICENSE' && !f.startsWith('.'); }).length;
var adventureCount = fs.readdirSync(path.join(__dirname, '..', 'commander', 'adventures')).filter(function(f) { return f.endsWith('.json'); }).length;
var commandCount = fs.readdirSync(path.join(__dirname, '..', 'commands')).filter(function(f) { return f.endsWith('.md'); }).length;

var errors = [];

function checkFile(filePath, checks) {
  if (!fs.existsSync(filePath)) return;
  var content = fs.readFileSync(filePath, 'utf8');
  checks.forEach(function(check) {
    if (!check.regex.test(content)) {
      errors.push(path.basename(filePath) + ': ' + check.msg);
    }
  });
}

// Skill count should appear in key docs
var skillRegex = new RegExp(skillCount + '\\+?\\s*skills|skills.*' + skillCount);
checkFile(path.join(__dirname, '..', 'README.md'), [
  { regex: skillRegex, msg: 'Skill count should be ' + skillCount },
]);
checkFile(path.join(__dirname, '..', 'BIBLE-AGENT.md'), [
  { regex: skillRegex, msg: 'Skill count should be ' + skillCount },
]);
checkFile(path.join(__dirname, '..', 'CLAUDE.md'), [
  { regex: new RegExp(skillCount + ' skills'), msg: 'Skill count should be ' + skillCount },
]);

// Vendor count
var vendorRegex = new RegExp(vendorCount + '\\s*(vendor|package)');
checkFile(path.join(__dirname, '..', 'README.md'), [
  { regex: vendorRegex, msg: 'Vendor count should be ' + vendorCount },
]);

if (errors.length > 0) {
  console.log('DOC SYNC ISSUES (' + errors.length + '):');
  errors.forEach(function(e) { console.log('  ❌ ' + e); });
  console.log('\nActual: ' + skillCount + ' skills, ' + vendorCount + ' vendors, ' + adventureCount + ' adventures, ' + commandCount + ' commands');
  process.exit(1);
} else {
  console.log('DOC SYNC OK: ' + skillCount + ' skills, ' + vendorCount + ' vendors, ' + adventureCount + ' adventures, ' + commandCount + ' commands');
  process.exit(0);
}
