'use strict';

var test = require('node:test');
var assert = require('node:assert');
var cp = require('child_process');
var path = require('path');

var SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'audit-counts.js');

test('audit-counts --json produces valid JSON with expected keys', function() {
  var result = cp.execFileSync(process.execPath, [SCRIPT, '--json'], { encoding: 'utf8' });
  var data = JSON.parse(result);
  assert.ok(data.version, 'Should have version');
  assert.ok(typeof data.skillsCli === 'number', 'skillsCli should be number');
  assert.ok(typeof data.vendors === 'number', 'vendors should be number');
  assert.ok(data.skillsCli > 100, 'Should have 100+ skills');
  assert.ok(data.vendors > 10, 'Should have 10+ vendors');
});

test('audit-counts default mode outputs readable table', function() {
  var result = cp.execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.ok(result.includes('Skills (CLI)'));
  assert.ok(result.includes('Vendors'));
  assert.ok(result.includes('Version'));
});

test('audit-counts --check passes', function() {
  var result = cp.execFileSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' });
  assert.ok(result.includes('PASS'));
});
