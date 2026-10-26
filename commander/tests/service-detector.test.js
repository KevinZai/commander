'use strict';

// CC-197: /ccc-init reports local infrastructure (services, CLIs, configured MCP servers) read-only.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');

var detector = require('../service-detector');

function fixture() {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-detect-'));
  var cwd = path.join(dir, 'proj');
  fs.mkdirSync(cwd);
  var projects = {};
  projects[cwd] = { mcpServers: { 'context-mode': { command: 'context-mode' } } };
  fs.writeFileSync(path.join(dir, '.claude.json'), JSON.stringify({
    mcpServers: { linear: { type: 'http', url: 'https://mcp.linear.app/mcp', headers: { Authorization: 'Bearer lin_secret_value' } } },
    projects: projects,
  }));
  fs.writeFileSync(path.join(cwd, '.mcp.json'), JSON.stringify({ mcpServers: { fleet: { env: { FLEET_TOKEN: 'fc_secret' } }, linear: {} } }));
  return { configDir: dir, cwd: cwd };
}

test('registry covers the /init infrastructure list', function() {
  var ports = detector.SERVICES.map(function(s) { return s.name + ':' + s.port; });
  ['Fleet Commander:4680', 'Synapse:4682', 'OpenClaw:18789', 'ClaudeSwap:8082'].forEach(function(p) { assert.ok(ports.includes(p), p); });
  var clis = detector.CLIS.map(function(c) { return c.name; });
  ['ao', 'rtk'].forEach(function(c) { assert.ok(clis.includes(c), c); });
});

test('detectMcpServers reads user, local and project scopes by name only', function() {
  var f = fixture();
  var mcp = detector.detectMcpServers(f);
  // linear is in user and project scope: project wins, as in Claude Code (local, then project, then user)
  assert.deepStrictEqual(mcp.map(function(m) { return m.name + '/' + m.source; }), ['context-mode/local', 'fleet/project', 'linear/project']);
  var linear = mcp.find(function(m) { return m.name === 'linear'; });
  assert.strictEqual(linear.known, 'Linear');
  assert.strictEqual(linear.command, '/ccc-linear');
  assert.strictEqual(mcp.find(function(m) { return m.name === 'context-mode'; }).known, 'context-mode');
  var out = JSON.stringify(mcp);
  assert.ok(!/secret|Bearer|https:\/\//.test(out), 'no env, headers or URLs leave the config');
});

test('detectMcpServers tolerates missing and malformed config', function() {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-detect-empty-'));
  assert.deepStrictEqual(detector.detectMcpServers({ configDir: dir, cwd: dir }), []);
  fs.writeFileSync(path.join(dir, '.claude.json'), '{not json');
  assert.deepStrictEqual(detector.detectMcpServers({ configDir: dir, cwd: dir }), []);
});

test('renderInitSection lists only what is up, installed or configured', function() {
  var text = detector.renderInitSection({
    services: [{ name: 'Fleet Commander', port: 4680, up: true, command: '/fleet' }, { name: 'Synapse', port: 4682, up: false, command: '/syn' }],
    clis: [{ name: 'rtk', available: true, skill: null }, { name: 'ao', available: false, skill: '/ao' }],
    mcp: [{ name: 'linear', source: 'user', known: 'Linear', command: '/ccc-linear' }],
  });
  assert.strictEqual(text, [
    '## Infrastructure detected (read-only)',
    '- Fleet Commander on :4680 → /fleet',
    '- rtk CLI',
    '- MCP linear (user) → /ccc-linear',
  ].join('\n'));
  assert.match(detector.renderInitSection({ services: [], clis: [], mcp: [] }), /nothing detected/);
});

test('detectInfra probes no port unless asked', async function() {
  var http = require('http');
  var calls = 0;
  var orig = http.get;
  http.get = function() { calls++; return orig.apply(http, arguments); };
  try {
    var d = await detector.detectInfra(fixture());
    assert.deepStrictEqual(d.services, []);
    assert.strictEqual(calls, 0, 'no port probe by default');
    assert.ok(d.clis.length >= 1 && d.mcp.length === 3);
  } finally { http.get = orig; }
});

test('/ccc-init runs the detector read-only', function() {
  var md = fs.readFileSync(path.join(__dirname, '..', '..', 'commands', 'ccc-init.md'), 'utf8');
  assert.match(md, /node <install>\/commander\/service-detector\.js` from the project root/);
  assert.match(md, /never writes their config/);
  assert.match(md, /Add `--probe` only when the user asks/);
});
