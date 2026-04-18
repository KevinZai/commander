'use strict';

var test = require('node:test');
var assert = require('node:assert');
var cp = require('child_process');
var path = require('path');

var SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'build-from-registry.js');

test('registry drift check passes', function() {
  var result = cp.execSync('node ' + SCRIPT + ' --check', { encoding: 'utf8' });
  assert.ok(result.includes('PASS'), 'Registry drift check should PASS');
});

test('registry.yaml exists and has skills section', function() {
  var registryPath = path.join(__dirname, '..', '..', 'commander', 'core', 'registry.yaml');
  var fs = require('fs');
  assert.ok(fs.existsSync(registryPath), 'registry.yaml should exist');
  var content = fs.readFileSync(registryPath, 'utf8');
  assert.ok(content.includes('skills:'), 'registry.yaml should have skills section');
  assert.ok(content.includes('agents:'), 'registry.yaml should have agents section');
  assert.ok(content.includes('commands:'), 'registry.yaml should have commands section');
});

test('registry has expected minimum counts', function() {
  var registryPath = path.join(__dirname, '..', '..', 'commander', 'core', 'registry.yaml');
  var fs = require('fs');
  var content = fs.readFileSync(registryPath, 'utf8');
  var skillMatches = content.match(/^  - id: /gm) || [];
  // Skills + agents + commands + hooks all use "  - id:"
  assert.ok(skillMatches.length > 100, 'Registry should have 100+ entries: got ' + skillMatches.length);
});
