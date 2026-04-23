'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..', '..');
var PLUGIN_SKILLS = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');
var PLUGIN_JSON = path.join(ROOT, 'commander', 'cowork-plugin', '.claude-plugin', 'plugin.json');
var MARKETPLACE_JSON = path.join(ROOT, '.claude-plugin', 'marketplace.json');

// ─── File Existence ───────────────────────────────────────────────────────────

test('save-session SKILL.md exists', function() {
  var p = path.join(PLUGIN_SKILLS, 'save-session', 'SKILL.md');
  assert.ok(fs.existsSync(p), 'save-session/SKILL.md should exist at ' + p);
});

test('resume-session SKILL.md exists', function() {
  var p = path.join(PLUGIN_SKILLS, 'resume-session', 'SKILL.md');
  assert.ok(fs.existsSync(p), 'resume-session/SKILL.md should exist at ' + p);
});

// ─── Frontmatter Parse ────────────────────────────────────────────────────────

function parseFrontmatter(filepath) {
  var content = fs.readFileSync(filepath, 'utf8');
  var parts = content.split('---');
  if (parts.length < 3) throw new Error('No frontmatter found in ' + filepath);
  // parts[0] is empty, parts[1] is the YAML block
  var yaml = parts[1];
  var result = {};
  yaml.split('\n').forEach(function(line) {
    var match = line.match(/^(\w[\w-]*):\s*"?([^"]*)"?\s*$/);
    if (match) result[match[1]] = match[2].trim();
  });
  return result;
}

test('save-session frontmatter has required fields', function() {
  var fm = parseFrontmatter(path.join(PLUGIN_SKILLS, 'save-session', 'SKILL.md'));
  assert.strictEqual(fm.name, 'save-session', 'name should be save-session');
  assert.ok(fm.description, 'description should be present');
  assert.ok(fm.description.length > 0, 'description should not be empty');
  assert.ok(fm.description.length <= 500, 'description should be under 500 chars, got ' + fm.description.length);
  assert.ok(fm.model, 'model should be present');
  assert.ok(fm.effort, 'effort should be present');
});

test('resume-session frontmatter has required fields', function() {
  var fm = parseFrontmatter(path.join(PLUGIN_SKILLS, 'resume-session', 'SKILL.md'));
  assert.strictEqual(fm.name, 'resume-session', 'name should be resume-session');
  assert.ok(fm.description, 'description should be present');
  assert.ok(fm.description.length > 0, 'description should not be empty');
  assert.ok(fm.description.length <= 500, 'description should be under 500 chars, got ' + fm.description.length);
  assert.ok(fm.model, 'model should be present');
  assert.ok(fm.effort, 'effort should be present');
});

// ─── No XML Tags in Description ───────────────────────────────────────────────

test('save-session description has no XML tags', function() {
  var fm = parseFrontmatter(path.join(PLUGIN_SKILLS, 'save-session', 'SKILL.md'));
  assert.ok(!/<[a-zA-Z]/.test(fm.description), 'description should not contain XML tags');
});

test('resume-session description has no XML tags', function() {
  var fm = parseFrontmatter(path.join(PLUGIN_SKILLS, 'resume-session', 'SKILL.md'));
  assert.ok(!/<[a-zA-Z]/.test(fm.description), 'description should not contain XML tags');
});

// ─── Manifest Listing ─────────────────────────────────────────────────────────

test('plugin.json is valid JSON and mentions save-session + resume-session', function() {
  var content = fs.readFileSync(PLUGIN_JSON, 'utf8');
  var json = JSON.parse(content); // throws if invalid
  assert.ok(json.description, 'plugin.json should have a description');
  assert.ok(json.description.includes('save-session'), 'plugin.json description should mention save-session');
  assert.ok(json.description.includes('resume-session'), 'plugin.json description should mention resume-session');
});

test('marketplace.json is valid JSON and mentions save-session + resume-session', function() {
  var content = fs.readFileSync(MARKETPLACE_JSON, 'utf8');
  var json = JSON.parse(content); // throws if invalid
  assert.ok(Array.isArray(json.plugins), 'marketplace.json should have plugins array');
  var commander = json.plugins.find(function(p) { return p.name === 'commander'; });
  assert.ok(commander, 'marketplace.json should have commander plugin entry');
  assert.ok(commander.description.includes('save-session'), 'marketplace.json commander description should mention save-session');
  assert.ok(commander.description.includes('resume-session'), 'marketplace.json commander description should mention resume-session');
});

// ─── /ccc-start Tip ───────────────────────────────────────────────────────────

test('ccc-start SKILL.md contains session persistence tip', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-start', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('/save-session'), 'ccc-start should mention /save-session');
  assert.ok(content.includes('/resume-session'), 'ccc-start should mention /resume-session');
});
