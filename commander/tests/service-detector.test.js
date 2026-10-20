'use strict';

// CC-197 slice 1: fixture-based audit of tool detection coverage.
// Pure: reads the static SERVICES/CLIS tables and renders fixtures. No port
// probes, no `which`, no config writes.

var test = require('node:test');
var assert = require('node:assert');
var detector = require('../service-detector');

function svc(name) {
  return detector.SERVICES.find(function(s) { return s.name === name; });
}
function cli(name) {
  return detector.CLIS.find(function(c) { return c.name === name; });
}

test('covers the CC-197 tools that are detected today', function() {
  assert.strictEqual(svc('Fleet Commander').port, 4680);
  assert.strictEqual(svc('Synapse').port, 4682);
  assert.strictEqual(svc('Paperclip').port, 3110);
  assert.strictEqual(svc('OpenClaw').port, 18789);
  assert.ok(cli('ao'), 'Composio AO CLI is detected');
});

test('table entries are well formed and ports are unique', function() {
  var ports = detector.SERVICES.map(function(s) { return s.port; });
  assert.strictEqual(new Set(ports).size, ports.length);
  detector.SERVICES.forEach(function(s) {
    assert.ok(Number.isInteger(s.port) && s.port > 0 && s.port < 65536, s.name);
    assert.strictEqual(typeof s.path, 'string', s.name);
  });
  detector.CLIS.forEach(function(c) { assert.ok(c.command, c.name); });
});

test('does not probe reserved ports 8788, 8789, 3100', function() {
  detector.SERVICES.forEach(function(s) {
    assert.ok([8788, 8789, 3100].indexOf(s.port) === -1, s.name);
  });
});

// Gaps found by the audit; flip to real tests when slice 2 adds detection.
test('ClaudeSwap (port 8082) is detected', { todo: 'CC-197 gap: no ClaudeSwap entry' }, function() {
  assert.ok(detector.SERVICES.some(function(s) { return s.port === 8082; }));
});
test('RTK binary is detected', { todo: 'CC-197 gap: no rtk CLI entry' }, function() {
  assert.ok(cli('rtk'));
});
test('Linear and context-mode MCP servers are detected', { todo: 'CC-197 gap: no MCP detection' }, function() {
  assert.strictEqual(typeof detector.detectMcpServers, 'function');
});

test('renderDetectionSummary renders a fixture without live probes', function() {
  var out = detector.renderDetectionSummary({
    services: [
      { name: 'Fleet Commander', port: 4680, up: true, command: '/fleet' },
      { name: 'Synapse', port: 4682, up: false, command: '/syn' },
    ],
    clis: [
      { name: 'ao', available: true, skill: '/ao' },
      { name: 'repomix', available: false, skill: null },
    ],
  });
  assert.match(out, /Detected: 1 services, 1 CLIs/);
  assert.match(out, /Fleet Commander.*4680 UP.*\/fleet/);
  assert.match(out, /Synapse.*4682 DOWN/);
  assert.match(out, /ao\s+installed.*\/ao/);
  assert.match(out, /repomix\s+not found/);
});
