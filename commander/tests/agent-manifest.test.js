'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var os = require('os');

var ROOT = path.join(__dirname, '..', '..');
var AGENTS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'agents');
var PLUGIN_PERSONAS = path.join(ROOT, 'commander', 'cowork-plugin', 'rules', 'personas');
var GLOBAL_PERSONAS = path.join(os.homedir(), '.claude', 'rules', 'personas');

// ─── Frontmatter parser (no external deps) ───────────────────────────────────

function parseFrontmatter(filepath) {
  var content = fs.readFileSync(filepath, 'utf8');
  if (!content.startsWith('---')) {
    throw new Error('No frontmatter delimiter at start of ' + filepath);
  }
  var endIdx = content.indexOf('---', 3);
  if (endIdx < 0) {
    throw new Error('No closing --- found in ' + filepath);
  }
  var block = content.slice(3, endIdx);
  var result = {};
  block.split('\n').forEach(function(line) {
    // Match simple "key: value" (possibly quoted)
    var m = line.match(/^([\w][\w-]*):\s*"?([^"]*)"?\s*$/);
    if (m) {
      result[m[1]] = m[2].trim();
    }
  });
  return { fm: result, raw: content, fmBlock: block };
}

// ─── Collect agent files ──────────────────────────────────────────────────────

var agentFiles = fs.readdirSync(AGENTS_DIR).filter(function(f) {
  return f.endsWith('.md');
});

test('agents directory contains at least one agent file', function() {
  assert.ok(agentFiles.length > 0, 'Expected agent files in ' + AGENTS_DIR);
});

// ─── Per-agent tests ──────────────────────────────────────────────────────────

agentFiles.forEach(function(agentFile) {
  var agentPath = path.join(AGENTS_DIR, agentFile);
  var label = agentFile.replace('.md', '');

  test('agent ' + label + ' has valid frontmatter delimiter', function() {
    var content = fs.readFileSync(agentPath, 'utf8');
    assert.ok(content.startsWith('---'), label + ': must begin with --- frontmatter delimiter');
    var endIdx = content.indexOf('---', 3);
    assert.ok(endIdx > 3, label + ': must have a closing --- for frontmatter');
  });

  test('agent ' + label + ' has required field: name', function() {
    var parsed = parseFrontmatter(agentPath);
    assert.ok(
      parsed.fm.name && parsed.fm.name.length > 0,
      label + ': frontmatter must have a non-empty "name" field'
    );
  });

  test('agent ' + label + ' has required field: description', function() {
    var parsed = parseFrontmatter(agentPath);
    assert.ok(
      parsed.fm.description && parsed.fm.description.length > 0,
      label + ': frontmatter must have a non-empty "description" field'
    );
  });

  test('agent ' + label + ' has required field: model', function() {
    var parsed = parseFrontmatter(agentPath);
    assert.ok(
      parsed.fm.model && parsed.fm.model.length > 0,
      label + ': frontmatter must have a non-empty "model" field'
    );
  });

  test('agent ' + label + ' description is under 500 chars', function() {
    var parsed = parseFrontmatter(agentPath);
    var desc = parsed.fm.description || '';
    assert.ok(
      desc.length <= 500,
      label + ': description must be <= 500 chars, got ' + desc.length
    );
  });

  test('agent ' + label + ' description has no angle brackets', function() {
    var parsed = parseFrontmatter(agentPath);
    var desc = parsed.fm.description || '';
    // Angle brackets in descriptions cause rendering issues in plugin manifests
    assert.ok(
      !/<[a-zA-Z]/.test(desc),
      label + ': description must not contain XML/HTML angle brackets (<tag>)'
    );
  });

  // Optional: if persona field is present, the referenced file should resolve
  test('agent ' + label + ' persona path resolves if present', function() {
    var parsed = parseFrontmatter(agentPath);
    var persona = parsed.fm.persona;
    if (!persona || persona.length === 0) {
      // No persona field — skip
      return;
    }

    // Strip leading "personas/" prefix if present — it may be relative
    var personaFile = persona.replace(/^personas\//, '') + '.md';

    var inPlugin = path.join(PLUGIN_PERSONAS, personaFile);
    var inGlobal = path.join(GLOBAL_PERSONAS, personaFile);

    var resolves = fs.existsSync(inPlugin) || fs.existsSync(inGlobal);
    assert.ok(
      resolves,
      label + ': persona "' + persona + '" does not resolve to any file.\n' +
      '  Checked: ' + inPlugin + '\n' +
      '  Checked: ' + inGlobal
    );
  });
});
