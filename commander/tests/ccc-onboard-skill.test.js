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
  'ccc-onboard',
  'SKILL.md'
);

function readSkill() {
  return fs.readFileSync(SKILL_PATH, 'utf8');
}

function frontmatter(content) {
  assert.ok(content.startsWith('---'), 'SKILL.md must begin with --- frontmatter delimiter');
  var endIdx = content.indexOf('---', 3);
  assert.ok(endIdx > 0, 'SKILL.md must have a closing --- for frontmatter');
  return content.slice(3, endIdx);
}

test('ccc-onboard SKILL.md exists', function () {
  assert.ok(fs.existsSync(SKILL_PATH), 'Expected ' + SKILL_PATH + ' to exist');
});

test('ccc-onboard frontmatter is valid and description has no angle brackets', function () {
  var fm = frontmatter(readSkill());

  assert.ok(fm.includes('name: ccc-onboard'), 'name must be ccc-onboard');
  assert.ok(fm.includes('description:'), 'Frontmatter must have "description:" key');
  assert.ok(fm.includes('model: sonnet'), 'model must be sonnet');
  assert.ok(fm.includes('effort: high'), 'effort must be high');
  assert.ok(!/[<>]/.test(fm), 'Frontmatter must not contain angle brackets');
});

test('ccc-onboard allowed-tools are the requested onboarding tool set', function () {
  var fm = frontmatter(readSkill());
  ['Read', 'Bash', 'WebFetch', 'AskUserQuestion'].forEach(function (tool) {
    assert.ok(fm.includes('  - ' + tool), 'allowed-tools must include ' + tool);
  });
});

test('ccc-onboard body has the AskUserQuestion role picker block', function () {
  var content = readSkill();

  assert.ok(content.includes('Role picker — `AskUserQuestion`'), 'Body must label the role picker');
  assert.ok(content.includes('question: "What kind of contributor are you onboarding?"'), 'Picker must ask for role');
  assert.ok(content.includes('autocomplete: true'), 'Picker must support autocomplete');
  ['Frontend', 'Backend', 'Full-stack', 'Docs', 'First PR'].forEach(function (label) {
    assert.ok(content.includes(label), 'Picker must include ' + label);
  });
});

test('ccc-onboard documents first-hour checklist, starter resources, and clone-time validator', function () {
  var content = readSkill();

  assert.ok(content.includes('CLAUDE.md'), 'Onboarding must pull from CLAUDE.md');
  assert.ok(content.includes('BIBLE.md'), 'Onboarding must pull from BIBLE.md');
  assert.ok(content.includes('package.json'), 'Onboarding must pull scripts from package.json');
  assert.ok(content.includes('## Your First Hour'), 'Onboarding must output first-hour checklist');
  assert.ok(content.includes('## Starter Resources'), 'Onboarding must output starter resources');
  assert.ok(content.includes('node --version'), 'Clone-time validator must check node');
  assert.ok(content.includes('bun --version'), 'Clone-time validator must check bun');
});
