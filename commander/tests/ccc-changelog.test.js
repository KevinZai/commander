'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..', '..');

var SKILL_PATH = path.join(
  ROOT,
  'commander',
  'cowork-plugin',
  'skills',
  'ccc-changelog',
  'SKILL.md'
);

var SESSION_START_PATH = path.join(
  ROOT,
  'commander',
  'cowork-plugin',
  'hooks',
  'session-start.js'
);

test('ccc-changelog SKILL.md exists', function () {
  assert.ok(fs.existsSync(SKILL_PATH), 'Expected ' + SKILL_PATH + ' to exist');
});

test('ccc-changelog SKILL.md frontmatter parses — required keys present', function () {
  var content = fs.readFileSync(SKILL_PATH, 'utf8');
  assert.ok(content.startsWith('---'), 'SKILL.md must begin with --- frontmatter delimiter');

  var endIdx = content.indexOf('---', 3);
  assert.ok(endIdx > 0, 'SKILL.md must have a closing --- for frontmatter');
  var frontmatter = content.slice(3, endIdx);

  assert.ok(frontmatter.includes('name:'), 'Frontmatter must have "name:" key');
  assert.ok(frontmatter.includes('description:'), 'Frontmatter must have "description:" key');
  assert.ok(frontmatter.includes('model:'), 'Frontmatter must have "model:" key');
  assert.ok(frontmatter.includes('effort:'), 'Frontmatter must have "effort:" key');
});

test('ccc-changelog SKILL.md model is sonnet and effort is medium', function () {
  var content = fs.readFileSync(SKILL_PATH, 'utf8');
  var endIdx = content.indexOf('---', 3);
  var frontmatter = content.slice(3, endIdx);

  assert.ok(frontmatter.includes('model: sonnet'), 'model must be sonnet');
  assert.ok(frontmatter.includes('effort: medium'), 'effort must be medium');
});

test('ccc-changelog SKILL.md description has no angle brackets', function () {
  var content = fs.readFileSync(SKILL_PATH, 'utf8');
  var endIdx = content.indexOf('---', 3);
  var frontmatter = content.slice(3, endIdx);

  var descMatch = frontmatter.match(/^description:\s*(.+?)(?=\n[a-zA-Z_]+:|\n---|$)/ms);
  assert.ok(descMatch, 'Frontmatter must have a description field');
  var desc = descMatch[1].replace(/^[>|]\s*/, '').trim();
  assert.ok(
    !/<[^-!]/.test(desc),
    'Description must not contain angle brackets, got: ' + desc
  );
});

test('session-start.js references last_seen_version', function () {
  var content = fs.readFileSync(SESSION_START_PATH, 'utf8');
  assert.ok(
    content.includes('last_seen_version'),
    'session-start.js must reference last_seen_version for version-transition tracking'
  );
});

test('session-start.js references /ccc-changelog in nudge message', function () {
  var content = fs.readFileSync(SESSION_START_PATH, 'utf8');
  assert.ok(
    content.includes('/ccc-changelog'),
    'session-start.js must reference /ccc-changelog in the version-transition nudge'
  );
});

test('session-start.js version-transition block does not fire on first run', function () {
  var content = fs.readFileSync(SESSION_START_PATH, 'utf8');
  // The guard must check isFirstRun before declaring a versionTransition
  // Ensure isFirstRun is set before the versionTransition assignment
  var isFirstRunIdx = content.indexOf('isFirstRun');
  var versionTransitionIdx = content.indexOf('versionTransition');
  assert.ok(isFirstRunIdx > -1, 'isFirstRun must be referenced in session-start.js');
  assert.ok(versionTransitionIdx > -1, 'versionTransition must be referenced in session-start.js');
  assert.ok(
    isFirstRunIdx < versionTransitionIdx,
    'isFirstRun must be set before versionTransition is evaluated'
  );
});
