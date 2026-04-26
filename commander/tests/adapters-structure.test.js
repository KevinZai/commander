'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var ROOT = path.join(__dirname, '..', '..');
var ADAPTERS_DIR = path.join(ROOT, 'commander', 'adapters');
var MCP_ADAPTERS = ['cursor', 'windsurf'];

function readAdapterFile(adapter, fileName) {
  return fs.readFileSync(path.join(ADAPTERS_DIR, adapter, fileName), 'utf8');
}

function listAdapterFiles(adapter) {
  return fs.readdirSync(path.join(ADAPTERS_DIR, adapter));
}

function firstMarkdownTableHeader(markdown) {
  var lines = markdown.split(/\r?\n/);
  for (var i = 0; i < lines.length - 1; i++) {
    var line = lines[i].trim();
    var next = lines[i + 1].trim();
    if (line.startsWith('|') && line.endsWith('|') && /^\|[-:|\s]+\|$/.test(next)) {
      return line;
    }
  }
  return null;
}

test('adapter index documents current cross-platform targets', function() {
  var indexPath = path.join(ADAPTERS_DIR, 'README.md');
  assert.ok(fs.existsSync(indexPath), 'commander/adapters/README.md should exist');

  var content = fs.readFileSync(indexPath, 'utf8');
  for (var name of ['Codex', 'Cursor', 'Windsurf', 'Cline', 'Continue']) {
    assert.ok(content.includes(name), 'adapter index should mention ' + name);
  }
});

test('MCP adapter directories have README, install guide, and config templates', function() {
  for (var adapter of MCP_ADAPTERS) {
    var dir = path.join(ADAPTERS_DIR, adapter);
    assert.ok(fs.existsSync(dir), adapter + ' adapter dir should exist');
    assert.ok(fs.existsSync(path.join(dir, 'README.md')), adapter + ' README.md should exist');
    assert.ok(fs.existsSync(path.join(dir, 'install.md')), adapter + ' install.md should exist');

    var templates = listAdapterFiles(adapter).filter(function(fileName) {
      return /\.template(\.json)?$/.test(fileName);
    });
    assert.ok(templates.length > 0, adapter + ' should include at least one template');
  }
});

test('MCP adapter config templates point at hosted Commander MCP without hardcoded secrets', function() {
  for (var adapter of MCP_ADAPTERS) {
    var files = listAdapterFiles(adapter).filter(function(fileName) {
      return fileName.endsWith('-mcp-config.template.json');
    });
    assert.strictEqual(files.length, 1, adapter + ' should have one MCP config template');

    var raw = readAdapterFile(adapter, files[0]);
    var parsed = JSON.parse(raw);
    assert.ok(parsed.mcpServers, adapter + ' config should define mcpServers');
    assert.ok(parsed.mcpServers['cc-commander'], adapter + ' config should define cc-commander');

    var server = parsed.mcpServers['cc-commander'];
    var endpoint = server.url || server.serverUrl;
    assert.strictEqual(endpoint, 'https://mcp.cc-commander.com/v1/sse');
    assert.strictEqual(server.headers.Authorization, 'Bearer ${env:COMMANDER_LICENSE_KEY}');
  }
});

test('MCP adapter README capability matrices use the same columns', function() {
  var expectedHeader = null;
  for (var adapter of MCP_ADAPTERS) {
    var content = readAdapterFile(adapter, 'README.md');
    var matrixIndex = content.indexOf('## Capability Matrix');
    assert.notStrictEqual(matrixIndex, -1, adapter + ' README should include a capability matrix');

    var header = firstMarkdownTableHeader(content.slice(matrixIndex));
    assert.ok(header, adapter + ' capability matrix should have a markdown table');

    if (expectedHeader === null) {
      expectedHeader = header;
    } else {
      assert.strictEqual(header, expectedHeader, adapter + ' matrix columns should match');
    }
  }
});

test('MCP adapter READMEs cite current platform sources', function() {
  var expectedSources = {
    cursor: ['https://docs.cursor.com/context/model-context-protocol', 'https://docs.cursor.com/context/rules'],
    windsurf: ['https://docs.windsurf.com/windsurf/cascade/mcp', 'https://docs.windsurf.com/windsurf/cascade/memories'],
  };

  for (var adapter of MCP_ADAPTERS) {
    var content = readAdapterFile(adapter, 'README.md');
    for (var source of expectedSources[adapter]) {
      assert.ok(content.includes(source), adapter + ' README should cite ' + source);
    }
  }
});
