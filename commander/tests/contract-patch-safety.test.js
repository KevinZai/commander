'use strict';

// Regression guard for check-product-contract.js's --patch safety.
//
// Why this file exists: the prose heuristic that decides whether a version
// reference is "current" or "historical" was broken by FOUR consecutive
// adversarial review rounds, each with a new phrasing, and each time the damage
// was silent — --patch rewrote historical text in committed docs and nobody
// noticed until an audit reproduced it.
//
// The fix was structural rather than another keyword: --check reports liberally,
// but --patch only rewrites the UNAMBIGUOUS subset. The two failure directions
// are not symmetric —
//   under-patch  -> a human updates one line that --check already flagged
//   over-patch   -> the historical record is falsified, usually unnoticed
// — so anything with a whiff of history must be left alone.
//
// Every case below is a real phrasing that broke a previous implementation.

var test = require('node:test');
var assert = require('node:assert');

var contractCli = require('../../scripts/check-product-contract');

var CONTRACT = { version: '7.3.1' };

function patch(line) {
  return contractCli.patchText(line, CONTRACT);
}

// --- must NOT be rewritten (historical or ambiguous) -------------------------

var MUST_KEEP = [
  ['heading naming a past release', '## What changed in v7.3.0'],
  ['remediation floor', 'Update to v7.3.0 or later.'],
  ['feature-origin stamp', 'Two new self-contained artifacts in v7.2.0: usage and safety.'],
  ['release-note voice', 'v6.0.0 ships four major additions.'],
  ['quoted release note', 'The 2024 release note says: CC Commander v6.4.2 ships a new hub.'],
  ['quoted changelog entry', 'Per the changelog entry, CC Commander version 6.4.2 ships a hub.'],
  ['explicit historical lead-in', 'Historical release note: CC Commander version 6.4.2 ships a hub.'],
  ['ambiguous "as of now"', 'As of now, CC Commander version 6.4.2 ships with 81 skills.'],
  ['ambiguous "obsolete changelog"', 'Obsolete changelog; CC Commander version 6.4.2 ships with 81 skills.'],
];

MUST_KEEP.forEach(function (row) {
  test('patch safety: leaves ' + row[0] + ' untouched', function () {
    assert.strictEqual(
      patch(row[1]),
      row[1],
      '--patch rewrote text it cannot prove is current-state: ' + row[1]
    );
  });
});

// --- MUST be rewritten (unambiguous current-state) ---------------------------

var MUST_PATCH = [
  ['product-led with v prefix', 'CC Commander v7.3.0 ships as a native Claude Code Desktop plugin.'],
  ['product-led spelled-out version', 'CC Commander version 7.3.0 ships with 81 skills.'],
];

MUST_PATCH.forEach(function (row) {
  test('patch safety: updates ' + row[0], function () {
    var out = patch(row[1]);
    assert.notStrictEqual(out, row[1], '--patch went blind on real drift: ' + row[1]);
    assert.ok(
      out.indexOf('7.3.1') !== -1,
      'expected the current version in the patched line, got: ' + out
    );
  });
});

// --- the invariant that actually matters -------------------------------------

test('patch safety: a history hint on a NEIGHBOURING line does not freeze patching', function () {
  // A raw character window bled across lines, so one "changelog" in an adjacent
  // bullet suppressed a perfectly current line below it. Same-line bounding fixed it.
  var doc = [
    'Obsolete changelog; CC Commander version 6.4.2 ships with 81 skills.',
    'CC Commander v7.3.0 ships as a native Claude Code Desktop plugin.',
  ].join('\n');
  var out = patch(doc);
  var lines = out.split('\n');
  assert.strictEqual(lines[0], 'Obsolete changelog; CC Commander version 6.4.2 ships with 81 skills.');
  assert.ok(lines[1].indexOf('7.3.1') !== -1, 'neighbouring history hint wrongly froze a current line');
});

test('patch safety: --patch is never more permissive than --check', function () {
  // If --patch would rewrite something --check would not even report, the two have
  // diverged and --patch is operating outside the checker's judgement entirely.
  MUST_PATCH.concat(MUST_KEEP).forEach(function (row) {
    var line = row[1];
    var m = /v?(\d+\.\d+\.\d+)/.exec(line);
    if (!m) return;
    var idx = m.index;
    var len = m[0].length;
    if (contractCli.isSafeToPatch(line, idx, len)) {
      assert.ok(
        contractCli.isVersionRelevant(line, idx, len),
        'isSafeToPatch accepted something isVersionRelevant rejects: ' + line
      );
    }
  });
});
