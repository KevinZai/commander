'use strict';

// #209: the suite failed when the checkout path contained a space
// (e.g. "/Volumes/Extreme Pro/..."). Two patterns caused it:
//   1. execSync with a shell string built as "node " + <path> — the shell
//      splits the path at the space.
//      Use execFileSync(process.execPath, [SCRIPT, '--flag']) instead.
//   2. Taking .pathname of a URL built from import.meta.url — leaves %20.
//      Use fileURLToPath(import.meta.url) instead.
// This guard keeps both patterns out of the test tree. The full suite is
// also verified from a checkout path containing a space.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SCAN_DIRS = [
  path.join(ROOT, 'commander', 'tests'),
  path.join(ROOT, 'tests'),
  path.join(ROOT, 'apps', 'mcp-server-cloud', 'tests'),
];
const EXT = /\.(c|m)?(j|t)s$/;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (EXT.test(ent.name)) out.push(p);
  }
  return out;
}

// Built from parts so this file does not match its own patterns.
const URL_PATHNAME = new RegExp('new URL\\(import\\.meta\\.url\\)' + '\\.pathname');
const EXEC_NODE_CONCAT = new RegExp('execSync\\(\\s*[\'"`]node [^\'"`]*[\'"`]\\s*\\+');

test('test files do not use URL.pathname for import.meta.url (breaks on %20)', function () {
  const offenders = walk(SCAN_DIRS[0], []).concat(walk(SCAN_DIRS[1], []), walk(SCAN_DIRS[2], []))
    .filter(function (f) { return URL_PATHNAME.test(fs.readFileSync(f, 'utf8')); })
    .map(function (f) { return path.relative(ROOT, f); });
  assert.deepStrictEqual(offenders, [], 'use fileURLToPath(import.meta.url) in: ' + offenders.join(', '));
});

test('test files do not build unquoted `node <path>` execSync commands', function () {
  const offenders = walk(SCAN_DIRS[0], []).concat(walk(SCAN_DIRS[1], []), walk(SCAN_DIRS[2], []))
    .filter(function (f) { return EXEC_NODE_CONCAT.test(fs.readFileSync(f, 'utf8')); })
    .map(function (f) { return path.relative(ROOT, f); });
  assert.deepStrictEqual(offenders, [], 'use execFileSync(process.execPath, [script, ...args]) in: ' + offenders.join(', '));
});
