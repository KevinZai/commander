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

test('ccc-save-session SKILL.md exists', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-save-session', 'SKILL.md');
  assert.ok(fs.existsSync(p), 'ccc-save-session/SKILL.md should exist at ' + p);
});

test('ccc-resume-session SKILL.md exists', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-resume-session', 'SKILL.md');
  assert.ok(fs.existsSync(p), 'ccc-resume-session/SKILL.md should exist at ' + p);
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

test('ccc-save-session frontmatter has required fields', function() {
  var fm = parseFrontmatter(path.join(PLUGIN_SKILLS, 'ccc-save-session', 'SKILL.md'));
  assert.strictEqual(fm.name, 'ccc-save-session', 'name should be ccc-save-session');
  assert.ok(fm.description, 'description should be present');
  assert.ok(fm.description.length > 0, 'description should not be empty');
  assert.ok(fm.description.length <= 500, 'description should be under 500 chars, got ' + fm.description.length);
  assert.ok(fm.model, 'model should be present');
  assert.ok(fm.effort, 'effort should be present');
});

test('ccc-resume-session frontmatter has required fields', function() {
  var fm = parseFrontmatter(path.join(PLUGIN_SKILLS, 'ccc-resume-session', 'SKILL.md'));
  assert.strictEqual(fm.name, 'ccc-resume-session', 'name should be ccc-resume-session');
  assert.ok(fm.description, 'description should be present');
  assert.ok(fm.description.length > 0, 'description should not be empty');
  assert.ok(fm.description.length <= 500, 'description should be under 500 chars, got ' + fm.description.length);
  assert.ok(fm.model, 'model should be present');
  assert.ok(fm.effort, 'effort should be present');
});

// ─── No XML Tags in Description ───────────────────────────────────────────────

test('ccc-save-session description has no XML tags', function() {
  var fm = parseFrontmatter(path.join(PLUGIN_SKILLS, 'ccc-save-session', 'SKILL.md'));
  assert.ok(!/<[a-zA-Z]/.test(fm.description), 'description should not contain XML tags');
});

test('ccc-resume-session description has no XML tags', function() {
  var fm = parseFrontmatter(path.join(PLUGIN_SKILLS, 'ccc-resume-session', 'SKILL.md'));
  assert.ok(!/<[a-zA-Z]/.test(fm.description), 'description should not contain XML tags');
});

// ─── Manifest Listing ─────────────────────────────────────────────────────────

test('plugin.json is valid JSON', function() {
  var content = fs.readFileSync(PLUGIN_JSON, 'utf8');
  var json = JSON.parse(content); // throws if invalid
  assert.ok(json.description, 'plugin.json should have a description');
  // plugin.json description focuses on /ccc-* skill count, not individual skill names
  assert.ok(json.description.includes('ccc-'), 'plugin.json description should mention /ccc-* skills');
});

test('marketplace.json is valid JSON and mentions ccc-save-session + ccc-resume-session', function() {
  var content = fs.readFileSync(MARKETPLACE_JSON, 'utf8');
  var json = JSON.parse(content); // throws if invalid
  assert.ok(Array.isArray(json.plugins), 'marketplace.json should have plugins array');
  var commander = json.plugins.find(function(p) { return p.name === 'commander'; });
  assert.ok(commander, 'marketplace.json should have commander plugin entry');
  // Accept either the bare name or ccc-prefixed name — both forms appear in the description
  assert.ok(
    commander.description.includes('save-session'),
    'marketplace.json commander description should mention save-session (or ccc-save-session)'
  );
  assert.ok(
    commander.description.includes('resume-session'),
    'marketplace.json commander description should mention resume-session (or ccc-resume-session)'
  );
});

// ─── /ccc-start Tip ───────────────────────────────────────────────────────────

test('ccc-start SKILL.md contains session persistence tip', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-start', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('/ccc-save-session'), 'ccc-start should mention /ccc-save-session');
  assert.ok(content.includes('/ccc-resume-session'), 'ccc-start should mention /ccc-resume-session');
});

// ─── Behavioral: ccc-save-session body ───────────────────────────────────────

test('ccc-save-session body specifies session file path pattern', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-save-session', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  // Must document where files land so the round-trip contract is clear
  assert.ok(
    content.includes('~/.claude/sessions/'),
    'ccc-save-session must specify the ~/.claude/sessions/ directory'
  );
  assert.ok(
    content.includes('-session.tmp'),
    'ccc-save-session must specify the -session.tmp filename suffix'
  );
});

test('ccc-save-session body defines the required session file sections', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-save-session', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  var requiredSections = [
    'What We Are Building',
    'What WORKED',
    'What Did NOT Work',
    'Exact Next Step'
  ];
  requiredSections.forEach(function(section) {
    assert.ok(
      content.includes(section),
      'ccc-save-session must document required section: "' + section + '"'
    );
  });
});

test('ccc-save-session body handles corrupt/empty case — instructs honest empty sections', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-save-session', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  // Skill must instruct writer to document "Nothing" rather than silently skip
  assert.ok(
    content.includes('Nothing') || content.includes('nothing'),
    'ccc-save-session should instruct agent to write "Nothing yet" for empty sections, not skip them'
  );
  // Must not instruct omitting incomplete sections (would create corrupt read)
  assert.ok(
    !content.includes('skip sections'),
    'ccc-save-session must not tell agent to skip sections silently'
  );
});

test('ccc-save-session body specifies short-id filename rules', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-save-session', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  // Short-id rules prevent same-day filename collisions
  assert.ok(
    content.includes('Minimum length') || content.includes('minimum length') || content.includes('8 char'),
    'ccc-save-session must specify minimum short-id length to prevent collisions'
  );
});

// ─── Behavioral: ccc-resume-session body ─────────────────────────────────────

test('ccc-resume-session body specifies the missing-file error message', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-resume-session', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  // Must define exact "no session found" user-facing message
  assert.ok(
    content.includes('No session files found'),
    'ccc-resume-session must specify "No session files found" message for missing-file path'
  );
  // Must instruct stopping, not crashing silently
  assert.ok(
    content.includes('Then stop') || content.includes('then stop') || content.includes('stop.'),
    'ccc-resume-session must instruct agent to stop gracefully when no file exists'
  );
});

test('ccc-resume-session body handles malformed/empty file gracefully', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-resume-session', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  assert.ok(
    content.includes('empty or malformed') || content.includes('empty or unreadable'),
    'ccc-resume-session must define graceful handling for empty or malformed session files'
  );
});

test('ccc-resume-session body defines round-trip contract with ccc-save-session', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-resume-session', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  // Must reference its counterpart skill (accepts either prefix form)
  assert.ok(
    content.includes('/ccc-save-session') || content.includes('/save-session'),
    'ccc-resume-session must reference /ccc-save-session as its counterpart (round-trip contract)'
  );
  // Must read, not modify
  assert.ok(
    content.includes('read-only') || content.includes('Never modify'),
    'ccc-resume-session must specify the session file is read-only'
  );
});

test('ccc-resume-session body specifies SESSION LOADED briefing format', function() {
  var p = path.join(PLUGIN_SKILLS, 'ccc-resume-session', 'SKILL.md');
  var content = fs.readFileSync(p, 'utf8');
  assert.ok(
    content.includes('SESSION LOADED'),
    'ccc-resume-session must specify the "SESSION LOADED:" briefing header format'
  );
  assert.ok(
    content.includes('WHAT NOT TO RETRY') || content.includes('What Not To Retry'),
    'ccc-resume-session briefing must include WHAT NOT TO RETRY section (critical for avoiding repeated failures)'
  );
  assert.ok(
    content.includes('NEXT STEP'),
    'ccc-resume-session briefing must include NEXT STEP section'
  );
});
