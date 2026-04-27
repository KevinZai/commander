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
  'ccc-rollback',
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

test('ccc-rollback SKILL.md exists', function () {
  assert.ok(fs.existsSync(SKILL_PATH), 'Expected ' + SKILL_PATH + ' to exist');
});

test('ccc-rollback frontmatter is valid and description has no angle brackets', function () {
  var fm = frontmatter(readSkill());

  assert.ok(fm.includes('name: ccc-rollback'), 'name must be ccc-rollback');
  assert.ok(fm.includes('description:'), 'Frontmatter must have "description:" key');
  assert.ok(fm.includes('model: sonnet'), 'model must be sonnet');
  assert.ok(fm.includes('effort: high'), 'effort must be high');
  assert.ok(!/[<>]/.test(fm), 'Frontmatter must not contain angle brackets');
});

test('ccc-rollback allowed-tools are the requested rollback tool set', function () {
  var fm = frontmatter(readSkill());
  ['Read', 'Bash', 'WebFetch', 'AskUserQuestion'].forEach(function (tool) {
    assert.ok(fm.includes('  - ' + tool), 'allowed-tools must include ' + tool);
  });
});

test('ccc-rollback body has the AskUserQuestion rollback target picker block', function () {
  var content = readSkill();

  assert.ok(content.includes('Rollback target picker — `AskUserQuestion`'), 'Body must label the rollback target picker');
  assert.ok(content.includes('question: "What should I roll back to?"'), 'Picker must ask for rollback target');
  assert.ok(content.includes('autocomplete: true'), 'Picker must support autocomplete from tags or commits');
  ['Last good commit', 'Specific tag', 'N versions back'].forEach(function (label) {
    assert.ok(content.includes(label), 'Picker must include ' + label);
  });
});

test('ccc-rollback documents atomic revert, push, deploy, and distance warning', function () {
  var content = readSkill();

  assert.ok(content.includes('git revert'), 'Rollback must use git revert');
  assert.ok(content.includes('git push origin'), 'Rollback must push the revert commit');
  assert.ok(content.includes('/ccc-deploy'), 'Rollback must redeploy via /ccc-deploy');
  assert.ok(content.includes('more than 5 commits ahead'), 'Rollback must warn when target is more than 5 commits behind HEAD');
});
