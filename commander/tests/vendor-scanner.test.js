'use strict';

var test = require('node:test');
var assert = require('node:assert');
var path = require('path');
var fs = require('fs');

var vendorScanner = require('../vendor-scanner');

// ─── scanVendorDir ───────────────────────────────────────────

test('scanVendorDir returns an array', function() {
  var result = vendorScanner.scanVendorDir();
  assert.ok(Array.isArray(result), 'Expected array, got ' + typeof result);
});

test('scanVendorDir finds vendor packages with expected fields', function() {
  var result = vendorScanner.scanVendorDir();
  if (result.length === 0) return; // no vendor dir in CI
  var pkg = result[0];
  assert.ok(typeof pkg.name === 'string', 'Package should have name');
  assert.ok(typeof pkg.path === 'string', 'Package should have path');
  assert.ok(typeof pkg.hasSkills === 'boolean', 'Package should have hasSkills boolean');
  assert.ok(typeof pkg.hasCommands === 'boolean', 'Package should have hasCommands boolean');
  assert.ok(typeof pkg.hasHooks === 'boolean', 'Package should have hasHooks boolean');
  assert.ok(typeof pkg.hasAgents === 'boolean', 'Package should have hasAgents boolean');
  assert.ok(Array.isArray(pkg.skills), 'Package should have skills array');
});

// ─── detectSkills ────────────────────────────────────────────

test('detectSkills finds SKILL.md files in vendor packages', function() {
  var vendorDir = vendorScanner.VENDOR_DIR;
  if (!fs.existsSync(vendorDir)) return;
  // Test with a known vendor that has skills
  var gstackPath = path.join(vendorDir, 'gstack');
  if (!fs.existsSync(gstackPath)) return;
  var skills = vendorScanner.detectSkills(gstackPath);
  assert.ok(skills.length > 0, 'gstack should have skills, got ' + skills.length);
  var names = skills.map(function(s) { return s.name; });
  assert.ok(names.indexOf('office-hours') !== -1 || names.indexOf('qa') !== -1,
    'gstack should contain office-hours or qa skill');
});

test('detectSkills handles non-existent path gracefully', function() {
  var skills = vendorScanner.detectSkills('/nonexistent/path/foo');
  assert.ok(Array.isArray(skills), 'Should return array');
  assert.strictEqual(skills.length, 0, 'Should return empty array for missing path');
});

test('detectSkills finds .claude/skills pattern', function() {
  var vendorDir = vendorScanner.VENDOR_DIR;
  if (!fs.existsSync(vendorDir)) return;
  var rtkPath = path.join(vendorDir, 'rtk');
  if (!fs.existsSync(rtkPath)) return;
  var skills = vendorScanner.detectSkills(rtkPath);
  assert.ok(skills.length > 0, 'rtk should have .claude/skills, got ' + skills.length);
});

// ─── buildCapabilityIndex ────────────────────────────────────

test('buildCapabilityIndex maps to all 8 phases', function() {
  var packages = vendorScanner.scanVendorDir();
  var index = vendorScanner.buildCapabilityIndex(packages);
  var phases = ['clarify', 'decide', 'plan', 'execute', 'review', 'test', 'learn', 'ship'];
  phases.forEach(function(phase) {
    assert.ok(Array.isArray(index[phase]), 'Index should have phase: ' + phase);
  });
});

test('buildCapabilityIndex returns entries with vendor and skill fields', function() {
  var packages = vendorScanner.scanVendorDir();
  var index = vendorScanner.buildCapabilityIndex(packages);
  // Find any non-empty phase
  var phases = Object.keys(index);
  var found = false;
  phases.forEach(function(phase) {
    if (index[phase].length > 0 && !found) {
      var entry = index[phase][0];
      assert.ok(typeof entry.vendor === 'string', 'Entry should have vendor');
      assert.ok(typeof entry.skill === 'string', 'Entry should have skill');
      found = true;
    }
  });
});

// ─── getCachedIndex ──────────────────────────────────────────

test('getCachedIndex returns object or null', function() {
  var index = vendorScanner.getCachedIndex();
  if (index !== null) {
    assert.ok(typeof index === 'object', 'Index should be object');
    assert.ok(Array.isArray(index.clarify), 'Index should have clarify phase');
  }
});

// ─── mapSkillToPhase heuristic ───────────────────────────────

test('mapSkillToPhase maps tdd to test', function() {
  assert.strictEqual(vendorScanner.mapSkillToPhase('tdd'), 'test');
  assert.strictEqual(vendorScanner.mapSkillToPhase('rtk-tdd'), 'test');
});

test('mapSkillToPhase maps office-hours to clarify', function() {
  assert.strictEqual(vendorScanner.mapSkillToPhase('office-hours'), 'clarify');
});

test('mapSkillToPhase maps plan to plan', function() {
  assert.strictEqual(vendorScanner.mapSkillToPhase('plan'), 'plan');
  assert.strictEqual(vendorScanner.mapSkillToPhase('autoplan'), 'plan');
});

test('mapSkillToPhase maps ship to ship', function() {
  assert.strictEqual(vendorScanner.mapSkillToPhase('ship'), 'ship');
  assert.strictEqual(vendorScanner.mapSkillToPhase('land-and-deploy'), 'ship');
});

test('mapSkillToPhase maps review to review', function() {
  assert.strictEqual(vendorScanner.mapSkillToPhase('code-review'), 'review');
  assert.strictEqual(vendorScanner.mapSkillToPhase('review'), 'review');
});

test('mapSkillToPhase maps learn/reflect to learn', function() {
  assert.strictEqual(vendorScanner.mapSkillToPhase('learn'), 'learn');
  assert.strictEqual(vendorScanner.mapSkillToPhase('continuous-learning'), 'learn');
  assert.strictEqual(vendorScanner.mapSkillToPhase('retro'), 'learn');
});

test('mapSkillToPhase defaults unknown skills to execute', function() {
  assert.strictEqual(vendorScanner.mapSkillToPhase('some-random-tool'), 'execute');
  assert.strictEqual(vendorScanner.mapSkillToPhase('foobar'), 'execute');
});
