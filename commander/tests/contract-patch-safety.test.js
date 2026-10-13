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
  // Round 5: compatibility FLOORS. Bumping these tells users to upgrade past a
  // version that already works for them — the same falsification class as history.
  ['floor: "from vX onward"', 'From v6.4.2 onward, the CC Commander plugin ships the hub.'],
  ['floor: spelled-out "from version X onward"', 'From version 6.4.2 onward, CC Commander supports the hub.'],
  ['floor: "compatible with vX onward"', 'Compatible with CC Commander v6.4.2 onward.'],
  ['floor: "requires ... vX or newer"', 'Requires the plugin at v6.4.2 or newer.'],
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

test('patch safety: a historical heading on the PRECEDING line protects the version below it', function () {
  // Same-line bounding alone cannot see a lead-in heading, so multi-line historical
  // blocks were still being rewritten (found round 5).
  var doc = 'Historical release note:\nCC Commander v6.4.2 ships a new hub.';
  assert.strictEqual(patch(doc), doc, '--patch rewrote a version under a historical heading');
});

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

// --- CC-1397 §B: blind spots found by the 11-agent audit ---------------------
//
// Four gaps let real drift ship silently: markdown-table label-first cells
// ("| Plugin skills | 81 |"), the "N total handlers" phrasing, an unscanned
// surface that ships inside every install, and a live upgrade guide that can
// go stale forever with nobody noticing. Each gets a negative control (the
// stale fixture the audit actually found IS detected) and a positive control
// (the corrected doc is NOT flagged) — a rule that only has the negative half
// tested can regress into flagging correct docs and nobody would catch it.

var FULL_CONTRACT = {
  version: '7.4.1',
  plugin_skills: 82,
  specialist_agents: 22,
  lifecycle_hooks: 23,
  hook_handlers: 44,
  bundled_mcp_servers: 2,
  opt_in_mcp_servers: 16,
  ecosystem_skills: 467,
  ccc_domains: 11,
  command_prefix: '/ccc-',
  pricing_model: 'free-forever-with-pro-tier',
  pro_tier_planned: true,
  hosted_mcp_status: 'live',
  codex_cli_compat: 'shipping',
  cursor_windsurf_compat: 'shipping',
};

function fieldFindings(content, field) {
  return contractCli
    .scanTextSurface(content, 'test-surface.mdx', FULL_CONTRACT)
    .filter(function (f) { return f.field === field; });
}

test('blind spot: markdown-table "| Plugin skills | N |" — stale value IS detected', function () {
  var stale = '| Plugin skills | 81 (13 /ccc-* workflows + 11 CCC domains) |';
  var findings = fieldFindings(stale, 'plugin_skills');
  assert.ok(findings.length > 0, 'stale table-cell plugin_skills count was not flagged');
  assert.strictEqual(findings[0].actual, 81);
});

test('blind spot: markdown-table "| Plugin skills | N |" — corrected value is NOT flagged', function () {
  var corrected = '| Plugin skills | 82 (13 /ccc-* workflows + 11 CCC domains) |';
  assert.deepStrictEqual(fieldFindings(corrected, 'plugin_skills'), []);
});

test('blind spot: markdown-table "| Hook handlers | N |" — stale value IS detected', function () {
  var stale = '| Hook handlers | 43 |';
  var findings = fieldFindings(stale, 'hook_handlers');
  assert.ok(findings.length > 0, 'stale table-cell hook_handlers count was not flagged');
  assert.strictEqual(findings[0].actual, 43);
});

test('blind spot: markdown-table "| Hook handlers | N |" — corrected value is NOT flagged', function () {
  var corrected = '| Hook handlers | 44 |';
  assert.deepStrictEqual(fieldFindings(corrected, 'hook_handlers'), []);
});

test('blind spot: "N total handlers" phrasing — stale value IS detected', function () {
  // The un-broadened regex required the number immediately before "handlers"
  // with nothing but whitespace between — "total" in the middle hid this
  // exact sentence from hooks.mdx while every other sentence on the page
  // correctly said 44.
  var stale = 'CC Commander registers 23 lifecycle hook events with 43 total handlers.';
  var findings = fieldFindings(stale, 'hook_handlers');
  assert.ok(findings.length > 0, '"N total handlers" phrasing was not flagged when stale');
  assert.strictEqual(findings[0].actual, 43);
});

test('blind spot: "N total handlers" phrasing — corrected value is NOT flagged', function () {
  var corrected = 'CC Commander registers 23 lifecycle hook events with 44 total handlers.';
  assert.deepStrictEqual(fieldFindings(corrected, 'hook_handlers'), []);
});

test('blind spot: commander/cowork-plugin/README.md is now a scanned surface', function () {
  // This file ships inside every install. It was not in TEXT_SURFACES before
  // CC-1397 and had drifted to 72 skills / 39 handlers / 459 ecosystem skills
  // for at least one release with the gate reporting PASS the whole time.
  assert.ok(
    contractCli.TEXT_SURFACES.indexOf('commander/cowork-plugin/README.md') !== -1,
    'commander/cowork-plugin/README.md must be a scanned TEXT_SURFACE'
  );
});

test('blind spot: upgrade.mdx currency — a guide with no current-version mention IS flagged', function () {
  var stale = '# Upgrade to v7.3.0\n\nHere is how to upgrade to v7.3.0.\n';
  var findings = contractCli.checkUpgradeGuideCurrency(stale, FULL_CONTRACT);
  assert.ok(findings.length > 0, 'upgrade guide stuck on a stale version snapshot was not flagged');
});

test('blind spot: upgrade.mdx currency — a guide mentioning the current version is NOT flagged', function () {
  var current = '# Upgrade to v7.4.1\n\nHere is how to upgrade to v7.4.1.\n';
  assert.deepStrictEqual(contractCli.checkUpgradeGuideCurrency(current, FULL_CONTRACT), []);
});

test('blind spot: upgrade.mdx currency does NOT weaken historical protection elsewhere', function () {
  // The targeted assertion only checks "does the version appear somewhere" —
  // it must not start flagging the file's legitimate Before/Now comparison
  // table, which is exactly the historical content HISTORICAL_SURFACES exists
  // to protect. A before/after table for an OLDER release pair (neither side
  // is the current version) must still pass as long as the file mentions the
  // current version anywhere else.
  var doc = [
    '# Upgrade to v7.4.1',
    '| Surface | Before (v7.3.0) | Now (v7.4.0) |',
    '| Plugin skills | 80 | 81 |',
    'Verify: should show the latest version (currently v7.4.1)',
  ].join('\n');
  assert.deepStrictEqual(contractCli.checkUpgradeGuideCurrency(doc, FULL_CONTRACT), []);
});
