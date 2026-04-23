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
  'ccc-e2e',
  'SKILL.md'
);

var PLUGIN_JSON_PATH = path.join(
  ROOT,
  'commander',
  'cowork-plugin',
  '.claude-plugin',
  'plugin.json'
);

test('ccc-e2e SKILL.md exists', function() {
  assert.ok(fs.existsSync(SKILL_PATH), 'Expected ' + SKILL_PATH + ' to exist');
});

test('ccc-e2e SKILL.md frontmatter parses cleanly — no XML brackets, valid YAML keys', function() {
  var content = fs.readFileSync(SKILL_PATH, 'utf8');

  // Must start with YAML frontmatter delimiter
  assert.ok(content.startsWith('---'), 'SKILL.md must begin with --- frontmatter delimiter');

  // Extract frontmatter block
  var endIdx = content.indexOf('---', 3);
  assert.ok(endIdx > 0, 'SKILL.md must have a closing --- for frontmatter');
  var frontmatter = content.slice(3, endIdx);

  // No XML-style angle brackets in frontmatter (Wave 2 constraint)
  assert.ok(
    !/<[^-!]/.test(frontmatter),
    'Frontmatter must not contain XML-style angle brackets (<...>)'
  );

  // Required frontmatter keys present
  assert.ok(frontmatter.includes('name:'), 'Frontmatter must have "name:" key');
  assert.ok(frontmatter.includes('description:'), 'Frontmatter must have "description:" key');
  assert.ok(frontmatter.includes('model:'), 'Frontmatter must have "model:" key');
  assert.ok(frontmatter.includes('effort:'), 'Frontmatter must have "effort:" key');
});

test('ccc-e2e SKILL.md body references /ccc-fleet and /ccc-testing', function() {
  var content = fs.readFileSync(SKILL_PATH, 'utf8');
  assert.ok(
    content.includes('/ccc-fleet'),
    'Body must reference /ccc-fleet (orchestration dependency)'
  );
  assert.ok(
    content.includes('/ccc-testing'),
    'Body must reference /ccc-testing (testing dependency)'
  );
});

test('plugin.json skill count matches actual skills directory (dynamic)', function() {
  // Read the actual count from the skills directory rather than hardcoding
  var skillsDir = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');
  var actualCount = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(function(e) { return e.isDirectory(); })
    .length;

  var raw = fs.readFileSync(PLUGIN_JSON_PATH, 'utf8');
  var json = JSON.parse(raw);

  // Extract the skill count from description (e.g. "33 plugin skills")
  var match = json.description.match(/(\d+)\s+plugin skills/);
  assert.ok(
    match,
    'plugin.json description must contain a "N plugin skills" count, got: ' + json.description.slice(0, 120)
  );
  var claimedCount = parseInt(match[1], 10);

  assert.strictEqual(
    claimedCount,
    actualCount,
    'plugin.json claims ' + claimedCount + ' plugin skills but directory has ' + actualCount +
    ' — update plugin.json description to match'
  );
});

test('ccc-e2e SKILL.md allowed-tools includes required orchestration tools', function() {
  var content = fs.readFileSync(SKILL_PATH, 'utf8');
  var requiredTools = ['Agent', 'AskUserQuestion', 'Bash', 'Read', 'Grep'];
  requiredTools.forEach(function(tool) {
    assert.ok(
      content.includes(tool),
      'ccc-e2e SKILL.md must list "' + tool + '" in allowed-tools or body'
    );
  });
});

test('ccc-e2e SKILL.md depends on /ccc-fleet and /ccc-testing', function() {
  var content = fs.readFileSync(SKILL_PATH, 'utf8');
  assert.ok(
    content.includes('/ccc-fleet'),
    'ccc-e2e must reference /ccc-fleet (parallel orchestration dependency)'
  );
  assert.ok(
    content.includes('/ccc-testing'),
    'ccc-e2e must reference /ccc-testing (testing dependency)'
  );
});
