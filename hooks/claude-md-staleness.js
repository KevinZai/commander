'use strict';

// CC Commander — CLAUDE.md Staleness Check
// Type: PreToolUse (SessionStart equivalent — fires on first tool use)
// Checks if CLAUDE.md exists, is current, and has key sections.

var fs = require('fs');
var path = require('path');
var os = require('os');

var CLAUDE_MD_PATH = path.join(os.homedir(), '.claude', 'CLAUDE.md');
var MAX_AGE_DAYS = 30;
var CCC_VERSION = '2.0.0';

// Key sections that should exist in a v2.0 CLAUDE.md
var KEY_SECTIONS = [
  'Session Startup',
  'Coding Standards',
  'Workflow',
  'Core Principles',
];

function compareVersions(a, b) {
  var partsA = a.split('.').map(Number);
  var partsB = b.split('.').map(Number);
  for (var i = 0; i < 3; i++) {
    var va = partsA[i] || 0;
    var vb = partsB[i] || 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

function checkStaleness() {
  var issues = [];

  // Check existence
  if (!fs.existsSync(CLAUDE_MD_PATH)) {
    return {
      stale: true,
      issues: ['CLAUDE.md not found at ' + CLAUDE_MD_PATH],
      suggestion: 'Run /claude-md:refresh to create one from the CC Commander template.',
    };
  }

  var content = fs.readFileSync(CLAUDE_MD_PATH, 'utf8');
  var stat = fs.statSync(CLAUDE_MD_PATH);

  // Check template version
  var versionMatch = content.match(/CC Commander.*?v(\d+\.\d+\.\d+)/);
  var templateVersion = versionMatch ? versionMatch[1] : '1.0.0';
  if (compareVersions(templateVersion, CCC_VERSION) < 0) {
    issues.push('Template version ' + templateVersion + ' is behind CC Commander ' + CCC_VERSION);
  }

  // Check age
  var ageDays = Math.floor((Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24));
  if (ageDays > MAX_AGE_DAYS) {
    issues.push('CLAUDE.md is ' + ageDays + ' days old (threshold: ' + MAX_AGE_DAYS + ')');
  }

  // Check key sections
  KEY_SECTIONS.forEach(function(section) {
    if (content.indexOf('## ' + section) === -1) {
      issues.push('Missing section: ## ' + section);
    }
  });

  if (issues.length > 0) {
    return {
      stale: true,
      issues: issues,
      suggestion: 'Run /claude-md:refresh to update your CLAUDE.md with the latest CC Commander best practices.',
    };
  }

  return { stale: false, issues: [], suggestion: null };
}

// Hook entry point
var result = checkStaleness();
if (result.stale) {
  var msg = '\n  CC Commander: Your CLAUDE.md may need a refresh:\n';
  result.issues.forEach(function(issue) {
    msg += '    - ' + issue + '\n';
  });
  msg += '\n  ' + result.suggestion + '\n';
  process.stdout.write(msg);
}
