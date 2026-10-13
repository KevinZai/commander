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

// Codex hook `timeout` is also SECONDS (default 600; SessionEnd/Interrupt max
// 3) per learn.chatgpt.com/docs/hooks and platform facts §3.3. The translator
// passes seconds through and caps them. Built into a temp dir so the test
// never writes the committed mirror.
test('codex mirror hooks.json: every timeout is second-scale within Codex caps', function () {
  var os = require('node:os');
  var spawnSync = require('node:child_process').spawnSync;
  var outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-timeout-units-'));
  try {
    var build = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-codex.js'), '--out', outDir], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10,
    });
    assert.strictEqual(build.status, 0, build.stderr);
    var rows = collectTimeouts(path.join(outDir, 'hooks.json'));
    assert.ok(rows.length > 0, 'expected mirrored handlers');
    rows.forEach(function (r) {
      assert.ok(
        r.timeout >= 1 && r.timeout <= 600,
        'codex handler "' + (r.command || '').slice(0, 60) + '" has timeout ' + r.timeout +
          ' — Codex hook timeouts are seconds'
      );
      if (r.event === 'SessionEnd' || r.event === 'Interrupt') {
        assert.ok(r.timeout <= 3, r.event + ' handler timeout ' + r.timeout + 's exceeds the Codex 3s cap');
      }
    });
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});
