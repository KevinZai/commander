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
  'ccc-deploy',
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

test('ccc-deploy SKILL.md exists', function () {
  assert.ok(fs.existsSync(SKILL_PATH), 'Expected ' + SKILL_PATH + ' to exist');
});

test('ccc-deploy frontmatter is valid and description has no angle brackets', function () {
  var fm = frontmatter(readSkill());

  assert.ok(fm.includes('name: ccc-deploy'), 'name must be ccc-deploy');
  assert.ok(fm.includes('description:'), 'Frontmatter must have "description:" key');
  assert.ok(fm.includes('model: sonnet'), 'model must be sonnet');
  assert.ok(fm.includes('effort: high'), 'effort must be high');
  assert.ok(!/[<>]/.test(fm), 'Frontmatter must not contain angle brackets');
});

test('ccc-deploy allowed-tools are the requested deployment tool set', function () {
  var fm = frontmatter(readSkill());
  ['Read', 'Bash', 'WebFetch', 'AskUserQuestion'].forEach(function (tool) {
    assert.ok(fm.includes('  - ' + tool), 'allowed-tools must include ' + tool);
  });
});

test('ccc-deploy body has the AskUserQuestion platform picker block', function () {
  var content = readSkill();

  assert.ok(content.includes('Platform picker — `AskUserQuestion`'), 'Body must label the platform picker');
  assert.ok(content.includes('question: "Where should I deploy?"'), 'Picker must ask for deploy target');
  assert.ok(content.includes('autocomplete: true'), 'Picker must support autocomplete from detection');
  ['Vercel production', 'Fly.io', 'Cloudflare', 'GitHub Pages', 'npm publish'].forEach(function (label) {
    assert.ok(content.includes(label), 'Picker must include ' + label);
  });
});

test('ccc-deploy documents required deploy target detection files', function () {
  var content = readSkill();
  ['package.json', 'fly.toml', 'vercel.json', 'wrangler.toml', '.github/workflows/deploy.yml'].forEach(function (needle) {
    assert.ok(content.includes(needle), 'Detection logic must mention ' + needle);
  });
});
