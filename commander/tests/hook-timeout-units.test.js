'use strict';

// Claude Code hook `timeout` is in SECONDS ("Seconds before canceling",
// default 600 — code.claude.com/docs/en/hooks). All 43 plugin handlers shipped
// ms-scale values for months ("3000" = 50 MINUTES), silently disabling the
// anti-hang ceilings they were meant to be. Fixed 2026-07-28; this pins the
// convention at both ends of the pipeline so it cannot regress.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var ROOT = path.join(__dirname, '..', '..');

function collectTimeouts(manifestPath) {
  var d = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  var out = [];
  Object.keys(d.hooks || {}).forEach(function (event) {
    (d.hooks[event] || []).forEach(function (group) {
      (group.hooks || []).forEach(function (h) {
        if (typeof h.timeout === 'number') out.push({ event: event, timeout: h.timeout, command: h.command });
      });
    });
  });
  return out;
}

test('plugin hooks.json: every timeout is second-scale (Claude Code units)', function () {
  var rows = collectTimeouts(path.join(ROOT, 'commander', 'cowork-plugin', 'hooks', 'hooks.json'));
  assert.ok(rows.length >= 40, 'expected the full handler set, got ' + rows.length);
  rows.forEach(function (r) {
    assert.ok(
      r.timeout >= 1 && r.timeout <= 600,
      r.event + ' handler "' + (r.command || '').slice(0, 60) + '" has timeout ' + r.timeout +
        ' — hook timeouts are SECONDS (a value like 3000 means 50 minutes, not 3s)'
    );
  });
});

test('codex mirror hooks.json: every timeout is ms-scale (Codex units)', function () {
  var rows = collectTimeouts(path.join(ROOT, 'commander', 'cowork-plugin-codex', 'hooks.json'));
  assert.ok(rows.length > 0, 'expected mirrored handlers');
  rows.forEach(function (r) {
    assert.ok(
      r.timeout >= 1000,
      'codex handler "' + (r.command || '').slice(0, 60) + '" has timeout ' + r.timeout +
        ' — the translator must convert source seconds to Codex ms'
    );
  });
});
