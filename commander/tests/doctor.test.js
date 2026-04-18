'use strict';

var test = require('node:test');
var assert = require('node:assert');
var path = require('path');

var doctor = require('../doctor');

test('doctor.runAuthChecks returns expected structure', function() {
  var result = doctor.runAuthChecks();
  assert.ok(result.checks, 'Should have checks array');
  assert.ok(Array.isArray(result.checks), 'Checks should be array');
  assert.ok(result.summary, 'Should have summary');
  assert.ok(typeof result.summary.ok === 'number', 'Summary.ok should be number');
  assert.ok(typeof result.summary.warn === 'number', 'Summary.warn should be number');
  assert.ok(typeof result.summary.fail === 'number', 'Summary.fail should be number');
});

test('doctor.runAuthChecks returns 7 checks', function() {
  var result = doctor.runAuthChecks();
  assert.strictEqual(result.checks.length, 7, 'Should have 7 auth checks');
});

test('doctor.runAuthChecks check objects have required fields', function() {
  var result = doctor.runAuthChecks();
  for (var c of result.checks) {
    assert.ok(c.label, 'Check should have label');
    assert.ok(c.message, 'Check should have message: ' + c.label);
    assert.ok(['true', 'false', 'warn'].includes(String(c.ok)), 'ok should be boolean or "warn": ' + c.label);
  }
});

test('doctor.checkEnvAbsent returns ok when var not set', function() {
  // Use a definitely-not-set var
  delete process.env.__CCC_TEST_VAR_XYZ;
  var result = doctor.checkEnvAbsent('__CCC_TEST_VAR_XYZ', 'test');
  assert.strictEqual(result.ok, true, 'Should be ok when var not set');
});

test('doctor.checkEnvAbsent returns fail when var is set', function() {
  process.env.__CCC_TEST_VAR_XYZ = 'test-value';
  var result = doctor.checkEnvAbsent('__CCC_TEST_VAR_XYZ', 'test reason');
  delete process.env.__CCC_TEST_VAR_XYZ;
  assert.strictEqual(result.ok, false, 'Should fail when var is set');
  assert.ok(result.hint, 'Should have remediation hint');
});

test('doctor.checkManagedByHost warns when set', function() {
  process.env.MANAGED_BY_HOST = 'openclaw';
  var result = doctor.checkManagedByHost();
  delete process.env.MANAGED_BY_HOST;
  assert.strictEqual(result.ok, 'warn', 'Should warn when MANAGED_BY_HOST is set');
});

test('doctor.checkManagedByHost ok when not set', function() {
  delete process.env.MANAGED_BY_HOST;
  var result = doctor.checkManagedByHost();
  assert.strictEqual(result.ok, true, 'Should be ok when MANAGED_BY_HOST is not set');
});

test('doctor.printAuthReport does not throw', function() {
  var result = doctor.runAuthChecks();
  // Capture stdout to avoid polluting test output
  var oldWrite = process.stdout.write.bind(process.stdout);
  var captured = '';
  process.stdout.write = function(s) { captured += s; return true; };
  try {
    doctor.printAuthReport(result);
  } finally {
    process.stdout.write = oldWrite;
  }
  assert.ok(captured.includes('Summary:'), 'Report should include Summary');
  assert.ok(captured.includes('ccc doctor --auth'), 'Report should include command name');
});
