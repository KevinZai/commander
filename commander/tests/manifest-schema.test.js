'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..', '..');

var MCP_JSON = path.join(ROOT, 'commander', 'cowork-plugin', '.mcp.json');
var PLUGIN_JSON = path.join(ROOT, 'commander', 'cowork-plugin', '.claude-plugin', 'plugin.json');
var MARKETPLACE_JSON = path.join(ROOT, '.claude-plugin', 'marketplace.json');

// ─── .mcp.json ────────────────────────────────────────────────────────────────

test('.mcp.json parses as valid JSON', function() {
  var raw = fs.readFileSync(MCP_JSON, 'utf8');
  // JSON.parse throws on invalid input
  JSON.parse(raw);
});

test('.mcp.json has top-level mcpServers object', function() {
  var json = JSON.parse(fs.readFileSync(MCP_JSON, 'utf8'));
  assert.ok(json.mcpServers, '.mcp.json must have "mcpServers" key');
  assert.strictEqual(typeof json.mcpServers, 'object', '"mcpServers" must be an object');
  assert.ok(!Array.isArray(json.mcpServers), '"mcpServers" must be a plain object, not an array');
});

test('.mcp.json each server entry has command, url, or type field', function() {
  var json = JSON.parse(fs.readFileSync(MCP_JSON, 'utf8'));
  var servers = json.mcpServers;
  Object.keys(servers).forEach(function(name) {
    var entry = servers[name];
    assert.ok(entry && typeof entry === 'object', 'Server entry "' + name + '" must be an object');

    var hasCommand = typeof entry.command === 'string';
    var hasUrl = typeof entry.url === 'string';
    var hasType = typeof entry.type === 'string';

    assert.ok(
      hasCommand || hasUrl || hasType,
      'Server "' + name + '" must have at least one of: command, url, type'
    );
  });
});

test('.mcp.json type values are valid transport types when present', function() {
  var json = JSON.parse(fs.readFileSync(MCP_JSON, 'utf8'));
  var validTypes = ['stdio', 'http', 'sse'];
  var servers = json.mcpServers;
  Object.keys(servers).forEach(function(name) {
    var entry = servers[name];
    if (entry.type !== undefined) {
      assert.ok(
        validTypes.indexOf(entry.type) !== -1,
        'Server "' + name + '" has invalid type "' + entry.type +
        '". Valid types: ' + validTypes.join(', ')
      );
    }
  });
});

test('.mcp.json env fields are plain objects when present', function() {
  var json = JSON.parse(fs.readFileSync(MCP_JSON, 'utf8'));
  var servers = json.mcpServers;
  Object.keys(servers).forEach(function(name) {
    var entry = servers[name];
    if (entry.env !== undefined) {
      assert.ok(
        typeof entry.env === 'object' && !Array.isArray(entry.env),
        'Server "' + name + '" env field must be a plain object, got ' + typeof entry.env
      );
    }
  });
});

// ─── plugin.json ─────────────────────────────────────────────────────────────

test('plugin.json parses as valid JSON', function() {
  var raw = fs.readFileSync(PLUGIN_JSON, 'utf8');
  JSON.parse(raw);
});

test('plugin.json has required field: name', function() {
  var json = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
  assert.ok(json.name && json.name.length > 0, 'plugin.json must have non-empty "name"');
});

test('plugin.json has required field: version', function() {
  var json = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
  assert.ok(json.version && json.version.length > 0, 'plugin.json must have non-empty "version"');
  // Version must look like semver (permissive: N.N.N with optional pre-release)
  assert.ok(
    /^\d+\.\d+\.\d+/.test(json.version),
    'plugin.json version must start with X.Y.Z semver format, got: ' + json.version
  );
});

test('plugin.json has required field: description', function() {
  var json = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
  assert.ok(json.description && json.description.length > 0, 'plugin.json must have non-empty "description"');
});

test('plugin.json has required field: author', function() {
  var json = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
  assert.ok(json.author, 'plugin.json must have an "author" field');
  assert.ok(
    (typeof json.author === 'string' && json.author.length > 0) ||
    (typeof json.author === 'object' && json.author.name),
    'plugin.json author must be a non-empty string or an object with "name"'
  );
});

// ─── marketplace.json ─────────────────────────────────────────────────────────

test('marketplace.json parses as valid JSON', function() {
  var raw = fs.readFileSync(MARKETPLACE_JSON, 'utf8');
  JSON.parse(raw);
});

test('marketplace.json has required field: name', function() {
  var json = JSON.parse(fs.readFileSync(MARKETPLACE_JSON, 'utf8'));
  assert.ok(json.name && json.name.length > 0, 'marketplace.json must have non-empty "name"');
});

test('marketplace.json has required field: owner', function() {
  var json = JSON.parse(fs.readFileSync(MARKETPLACE_JSON, 'utf8'));
  assert.ok(json.owner, 'marketplace.json must have an "owner" field');
});

test('marketplace.json has plugins array', function() {
  var json = JSON.parse(fs.readFileSync(MARKETPLACE_JSON, 'utf8'));
  assert.ok(Array.isArray(json.plugins), 'marketplace.json must have a "plugins" array');
  assert.ok(json.plugins.length > 0, 'marketplace.json plugins array must not be empty');
});

test('marketplace.json plugins each have name, description, version', function() {
  var json = JSON.parse(fs.readFileSync(MARKETPLACE_JSON, 'utf8'));
  json.plugins.forEach(function(plugin, idx) {
    assert.ok(
      plugin.name && plugin.name.length > 0,
      'marketplace.json plugins[' + idx + '] must have non-empty "name"'
    );
    assert.ok(
      plugin.description && plugin.description.length > 0,
      'marketplace.json plugins[' + idx + '] ("' + plugin.name + '") must have non-empty "description"'
    );
    assert.ok(
      plugin.version && plugin.version.length > 0,
      'marketplace.json plugins[' + idx + '] ("' + plugin.name + '") must have non-empty "version"'
    );
  });
});
