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

// Use the canonical contract value as the marketing skill count — this is what
// docs SHOULD say. The floor is the REPO's own skills tree, counted directly:
// skillBrowser.listSkills() also scans ~/.claude/skills and $CWD/.claude/skills,
// so its count is machine-dependent — on a dev machine with personal skills
// installed it over-reports (observed: 522 vs 467 repo skills), which once
// nearly drove a wrong contract bump. Never compare the contract to it.
function countRepoSkills(dir) {
  var n = 0;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.isDirectory()) n += countRepoSkills(path.join(dir, e.name));
    else if (e.name === 'SKILL.md') n += 1;
  });
  return n;
}
var contract = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'commander', 'contract.json'), 'utf8'));
var actualSkillCount = countRepoSkills(path.join(__dirname, '..', 'skills'));
var skillCount = contract.ecosystem_skills || actualSkillCount;
if (actualSkillCount > skillCount) {
  console.warn('NOTE: filesystem has ' + actualSkillCount + ' skills; contract.ecosystem_skills=' + skillCount + ' — consider bumping contract.');
}
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
checkFile(path.join(__dirname, '..', 'docs', 'BIBLE-AGENT.md'), [
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
