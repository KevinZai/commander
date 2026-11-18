'use strict';

var test = require('node:test');
var assert = require('node:assert');
var path = require('path');

var TOOLS = require('../mcp-server/tools');
var loader = require('../mcp-server/skills-loader');
var translator = require('../mcp-server/translator');

test('MCP tools list has 14 tools', function() {
  assert.strictEqual(TOOLS.length, 14, 'Should have exactly 14 tools');
});

test('All MCP tools have required fields', function() {
  for (var tool of TOOLS) {
    assert.ok(tool.name, 'Tool should have name');
    assert.ok(tool.description, 'Tool should have description: ' + tool.name);
    assert.ok(tool.inputSchema, 'Tool should have inputSchema: ' + tool.name);
    assert.ok(tool.name.startsWith('commander_'), 'Tool name should start with commander_: ' + tool.name);
  }
});

test('MCP tool names match expected set', function() {
  var expectedTools = [
    'commander_list_skills', 'commander_get_skill', 'commander_search',
    'commander_suggest_for', 'commander_invoke_skill', 'commander_list_agents',
    'commander_get_agent', 'commander_invoke_agent', 'commander_status',
    'commander_update', 'commander_init', 'commander_notes_pin',
    'commander_tasks_push', 'commander_plan_integrate',
  ];
  var actualNames = TOOLS.map(function(t) { return t.name; });
  for (var name of expectedTools) {
    assert.ok(actualNames.includes(name), 'Missing tool: ' + name);
  }
});

test('skills-loader listSkills returns paginated results', function() {
  var result = loader.listSkills({});
  assert.ok(result.items, 'Should have items');
  assert.ok(Array.isArray(result.items), 'Items should be array');
  assert.ok(typeof result.total === 'number', 'Should have total count');
  assert.ok(result.total > 100, 'Should have 100+ skills, got: ' + result.total);
  assert.ok(result.page === 1, 'Default page should be 1');
});

test('skills-loader listSkills pagination works', function() {
  var page1 = loader.listSkills({ pageSize: 5, page: 1 });
  var page2 = loader.listSkills({ pageSize: 5, page: 2 });
  assert.strictEqual(page1.items.length, 5, 'Page 1 should have 5 items');
  assert.strictEqual(page2.items.length, 5, 'Page 2 should have 5 items');
  assert.notDeepStrictEqual(page1.items[0].id, page2.items[0].id, 'Pages should have different items');
});

test('skills-loader getSkill returns content', function() {
  // Get first skill from catalog
  var catalog = loader.listSkills({ pageSize: 1 });
  if (catalog.items.length === 0) return;
  var skill = loader.getSkill(catalog.items[0].id);
  assert.ok(skill, 'Should return skill');
  assert.ok(skill.content, 'Skill should have content');
  assert.ok(skill.content.length > 0, 'Skill content should not be empty');
});

test('skills-loader getSkill returns null for unknown skill', function() {
  var result = loader.getSkill('skill-that-does-not-exist-xyz-999');
  assert.strictEqual(result, null, 'Should return null for unknown skill');
});

test('skills-loader searchSkills returns ranked results', function() {
  var results = loader.searchSkills('design', 5);
  assert.ok(Array.isArray(results), 'Should return array');
  // May have 0 results but should not throw
});

test('translator.translateResult returns MCP content format', function() {
  var result = translator.translateResult('commander_status', { version: '4.0.0-beta.1' });
  assert.ok(result.content, 'Should have content');
  assert.ok(Array.isArray(result.content), 'Content should be array');
  assert.ok(result.content[0].type === 'text', 'Content block should be text');
});

test('translator.translateError returns isError response', function() {
  var result = translator.translateError(new Error('test error'));
  assert.ok(result.isError, 'Should have isError: true');
  assert.ok(result.content, 'Should have content');
  var text = result.content[0].text;
  assert.ok(text.includes('error'), 'Error text should mention error');
});

test('skills-loader getSkill returns the adjacent LICENSE text for copied skills', function() {
  var loader = require('../mcp-server/skills-loader.js');
  var fs = require('fs');
  var path = require('path');
  var skill = loader.getSkill('claude-api');
  assert.ok(skill, 'claude-api skill present');
  var expected = fs.readFileSync(path.join(__dirname, '..', '..', 'skills', 'claude-api', 'LICENSE.txt'), 'utf8');
  assert.equal(skill.license, expected);
});

test('skills-loader serves nested skills with their license, and refuses when a notice is unreadable', function() {
  var loader = require('../mcp-server/skills-loader.js');
  var fs = require('fs');
  var nested = loader.getSkill('canvas-design');
  assert.strictEqual(nested.id, 'ccc-design/canvas-design');
  assert.ok(nested.license && nested.license.length > 0);
  var orig = fs.readFileSync;
  fs.readFileSync = function(file) {
    if (String(file).endsWith(require('path').join('claude-api', 'LICENSE.txt'))) { var e = new Error('denied'); e.code = 'EACCES'; throw e; }
    return orig.apply(fs, arguments);
  };
  try {
    var r = loader.getSkill('claude-api');
    assert.ok(r && r.error && /EACCES/.test(r.error), JSON.stringify(r && Object.keys(r)));
    assert.strictEqual(r.content, undefined);
  } finally {
    fs.readFileSync = orig;
  }
});

test('skills-loader refuses a skill whose declared LICENSE.txt is missing', function() {
  var loader = require('../mcp-server/skills-loader.js');
  var fs = require('fs');
  var p = require('path');
  var origExists = fs.existsSync;
  var target = p.join('canvas-design', 'LICENSE.txt');
  fs.existsSync = function(f) { return String(f).endsWith(target) ? false : origExists.apply(fs, arguments); };
  try {
    var r = loader.getSkill('canvas-design');
    assert.ok(r && r.error && /declares LICENSE\.txt/.test(r.error), JSON.stringify(r && Object.keys(r)));
  } finally {
    fs.existsSync = origExists;
  }
});
