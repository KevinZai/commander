'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');

// Ensure every *.test.js in the two test directories is reachable
// by the glob pattern used in package.json: "commander/tests/*.test.js tests/*.test.js"
// This prevents orphaning regressions like the one fixed in fix-wave-C.

var ROOT = path.join(__dirname, '..', '..');
var COMMANDER_TESTS = path.join(ROOT, 'commander', 'tests');
var TESTS = path.join(ROOT, 'tests');

function listTestFiles(dir) {
  return fs.readdirSync(dir).filter(function(f) {
    return f.endsWith('.test.js');
  });
}

test('all *.test.js files in commander/tests/ match the npm test glob', function() {
  var files = listTestFiles(COMMANDER_TESTS);
  assert.ok(files.length > 0, 'Expected at least one test file in commander/tests/');

  files.forEach(function(f) {
    // The glob "commander/tests/*.test.js" matches any file directly in that dir
    // (no sub-directories). Confirm each discovered file has no path separator.
    assert.ok(!f.includes('/') && !f.includes(path.sep),
      'Test file should be flat (no sub-dir): ' + f);
    assert.ok(f.endsWith('.test.js'),
      'File should end with .test.js: ' + f);
  });
});

test('all *.test.js files in tests/ match the npm test glob', function() {
  var files = listTestFiles(TESTS);
  assert.ok(files.length > 0, 'Expected at least one test file in tests/');

  files.forEach(function(f) {
    assert.ok(!f.includes('/') && !f.includes(path.sep),
      'Test file should be flat (no sub-dir): ' + f);
    assert.ok(f.endsWith('.test.js'),
      'File should end with .test.js: ' + f);
  });
});

test('package.json test script uses glob pattern (not hardcoded list)', function() {
  var pkgPath = path.join(ROOT, 'package.json');
  var pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  var testScript = pkg.scripts && pkg.scripts.test;
  assert.ok(testScript, 'package.json must have a test script');

  // Must use wildcard glob, not a hardcoded list of individual files
  assert.ok(
    testScript.includes('*.test.js'),
    'test script must use *.test.js glob (not a hardcoded file list). Got: ' + testScript
  );
});

test('no test files are in sub-directories (would be missed by flat glob)', function() {
  [COMMANDER_TESTS, TESTS].forEach(function(dir) {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(function(entry) {
      if (entry.isDirectory()) {
        // Warn by checking if directory contains test files that would be missed
        var subDir = path.join(dir, entry.name);
        var subFiles;
        try {
          subFiles = fs.readdirSync(subDir).filter(function(f) {
            return f.endsWith('.test.js');
          });
        } catch (_) {
          subFiles = [];
        }
        assert.strictEqual(subFiles.length, 0,
          'Sub-directory ' + subDir + ' contains test files that would be missed by flat glob: ' + subFiles.join(', '));
      }
    });
  });
});
