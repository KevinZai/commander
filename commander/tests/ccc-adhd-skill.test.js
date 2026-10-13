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
  'ccc-adhd',
  'SKILL.md'
);
var CONTRACT_PATH = path.join(ROOT, 'commander', 'contract.json');
var SKILLS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');

function readSkill() {
  return fs.readFileSync(SKILL_PATH, 'utf8');
}

function frontmatter(content) {
  assert.ok(content.startsWith('---'), 'SKILL.md must begin with --- frontmatter delimiter');
  var endIdx = content.indexOf('---', 3);
  assert.ok(endIdx > 0, 'SKILL.md must have a closing --- for frontmatter');
  return content.slice(3, endIdx);
}

function countPluginSkills() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(function (entry) {
    return entry.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, entry.name, 'SKILL.md'));
  }).length;
}

test('ccc-adhd SKILL.md exists', function () {
  assert.ok(fs.existsSync(SKILL_PATH), 'Expected ' + SKILL_PATH + ' to exist');
});

test('ccc-adhd frontmatter has name, description, allowed-tools, argument-hint', function () {
  var fm = frontmatter(readSkill());

  assert.ok(fm.includes('name: ccc-adhd'), 'name must be ccc-adhd');
  assert.ok(fm.includes('description:'), 'Frontmatter must have "description:" key');
  assert.ok(fm.includes('argument-hint:'), 'Frontmatter must have "argument-hint:" key');
  ['Read', 'Write', 'Bash', 'AskUserQuestion'].forEach(function (tool) {
    assert.ok(fm.includes('  - ' + tool), 'allowed-tools must include ' + tool);
  });
});

test('ccc-adhd description stays under the 200-char naming-audit limit and credits upstream', function () {
  var fm = frontmatter(readSkill());
  var match = fm.match(/description:\s*(.+?)(?=\n[a-zA-Z_-]+:|\n---|$)/ms);
  assert.ok(match, 'description field must be parseable');
  var raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  assert.ok(raw.length <= 200, 'description must be <= 200 chars (audit-naming FAIL_LEN), got ' + raw.length);
  assert.ok(raw.includes('ayghri/i-have-adhd'), 'description must credit ayghri/i-have-adhd');
});

test('ccc-adhd body has a dedicated Attribution section crediting the MIT-licensed upstream', function () {
  var content = readSkill();

  assert.ok(content.includes('## Attribution'), 'Body must have an "## Attribution" section');
  assert.ok(content.includes('ayghri/i-have-adhd'), 'Attribution must name the upstream repo');
  assert.ok(content.includes('MIT'), 'Attribution must name the MIT license');
});

test('ccc-adhd documents answer-first ordering, the off switch, and stacking with caveman', function () {
  var content = readSkill();

  assert.ok(content.includes('Lead with the fix'), 'Body must state the lead-with-the-fix rule');
  assert.ok(content.includes('/ccc-adhd off'), 'Body must document the off switch');
  assert.ok(content.includes('caveman'), 'Body must document composing with caveman mode');
});

test('ccc-adhd persists state at ~/.claude/commander/output-mode.json, defaulting OFF', function () {
  var content = readSkill();

  assert.ok(content.includes('output-mode.json'), 'Body must name the state file');
  assert.ok(/default is off/i.test(content), 'Body must state the default is OFF');
});

test('contract.json plugin_skills matches the plugin skills directory count (includes ccc-adhd)', function () {
  var contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  var actual = countPluginSkills();
  assert.strictEqual(contract.plugin_skills, actual, 'contract.plugin_skills (' + contract.plugin_skills + ') must equal the filesystem count (' + actual + ')');
  assert.ok(actual >= 83, 'expected at least 83 plugin skills once ccc-adhd is added, got ' + actual);
});
