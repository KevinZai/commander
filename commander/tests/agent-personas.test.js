'use strict';

// Test suite for the 17 specialist agent persona files at
// commander/cowork-plugin/agents/*.md.
//
// Validates: count drift, required frontmatter, persona reference integrity,
// name uniqueness, pinned model IDs, body content, allowed-tools shape.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var ROOT = path.join(__dirname, '..', '..');
var AGENTS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'agents');
var PERSONAS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'rules', 'personas');

var EXPECTED_AGENT_COUNT = 17;

var ALLOWED_MODELS = [
  'opus',
  'sonnet',
  'haiku',
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
];

var ALLOWED_EFFORT = ['low', 'medium', 'high', 'xhigh'];

// 5 specific agents pinned to explicit model IDs (mission spec lists 7 entries).
var PINNED_MODELS = {
  architect: 'claude-opus-4-7',
  'security-auditor': 'claude-opus-4-7',
  debugger: 'claude-opus-4-7',
  'product-manager': 'claude-opus-4-7',
  designer: 'claude-sonnet-4-6',
  researcher: 'claude-sonnet-4-6',
  reviewer: 'claude-sonnet-4-6',
};

// ─── Frontmatter parser ───────────────────────────────────────────────────────
//
// Returns: { fm: {scalar fields}, arrays: {array fields}, body: string, raw }
//
// Supports:
//   key: value
//   key: "quoted value"
//   key:
//     - item1
//     - item2

function parseFrontmatter(filepath) {
  var content = fs.readFileSync(filepath, 'utf8');
  if (!content.startsWith('---')) {
    throw new Error('No frontmatter delimiter at start of ' + filepath);
  }
  // Find closing --- on its own line
  var lines = content.split('\n');
  var endLineIdx = -1;
  for (var i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endLineIdx = i;
      break;
    }
  }
  if (endLineIdx < 0) {
    throw new Error('No closing --- found in ' + filepath);
  }

  var fmLines = lines.slice(1, endLineIdx);
  var bodyLines = lines.slice(endLineIdx + 1);

  var scalar = {};
  var arrays = {};
  var currentArrayKey = null;

  for (var j = 0; j < fmLines.length; j++) {
    var line = fmLines[j];
    // YAML array continuation: "  - item"
    var arrItem = line.match(/^\s+-\s+(.+)$/);
    if (arrItem && currentArrayKey) {
      arrays[currentArrayKey].push(arrItem[1].trim());
      continue;
    }
    // key: value or key:
    var kv = line.match(/^([\w][\w-]*):\s*(.*)$/);
    if (kv) {
      var key = kv[1];
      var rawVal = kv[2];
      if (rawVal === '' || rawVal === undefined) {
        // Start of an array (next lines should be "  - item")
        currentArrayKey = key;
        arrays[key] = [];
      } else {
        currentArrayKey = null;
        // Strip surrounding quotes if present
        var v = rawVal.trim();
        if ((v.startsWith('"') && v.endsWith('"')) ||
            (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        scalar[key] = v;
      }
    } else {
      currentArrayKey = null;
    }
  }

  return {
    fm: scalar,
    arrays: arrays,
    body: bodyLines.join('\n'),
    bodyLines: bodyLines,
    raw: content,
  };
}

// ─── Collect agent files ──────────────────────────────────────────────────────

var agentFiles = fs.readdirSync(AGENTS_DIR)
  .filter(function (f) { return f.endsWith('.md'); })
  .sort();

// ─── Suite-wide tests ─────────────────────────────────────────────────────────

test('agents directory has exactly ' + EXPECTED_AGENT_COUNT + ' agent files', function () {
  assert.strictEqual(
    agentFiles.length,
    EXPECTED_AGENT_COUNT,
    'Expected ' + EXPECTED_AGENT_COUNT + ' agent .md files in ' + AGENTS_DIR +
      ', found ' + agentFiles.length + ': ' + agentFiles.join(', ')
  );
});

test('all agent name fields are unique', function () {
  var names = agentFiles.map(function (f) {
    var parsed = parseFrontmatter(path.join(AGENTS_DIR, f));
    return parsed.fm.name;
  });
  var seen = {};
  var dupes = [];
  names.forEach(function (n) {
    if (seen[n]) dupes.push(n);
    seen[n] = true;
  });
  assert.strictEqual(dupes.length, 0, 'Duplicate agent name(s): ' + dupes.join(', '));
});

// ─── Per-agent tests ──────────────────────────────────────────────────────────

agentFiles.forEach(function (agentFile) {
  var agentPath = path.join(AGENTS_DIR, agentFile);
  var label = agentFile.replace(/\.md$/, '');

  test('agent ' + label + ': name is kebab-case and matches filename', function () {
    var parsed = parseFrontmatter(agentPath);
    var name = parsed.fm.name;
    assert.ok(name && name.length > 0, label + ': must have non-empty name');
    assert.strictEqual(
      name,
      label,
      label + ': name field "' + name + '" must match filename "' + label + '"'
    );
    assert.ok(
      /^[a-z][a-z0-9-]*$/.test(name),
      label + ': name "' + name + '" must be kebab-case (lowercase + hyphens only)'
    );
  });

  test('agent ' + label + ': description present, non-empty, < 500 chars', function () {
    var parsed = parseFrontmatter(agentPath);
    var desc = parsed.fm.description;
    assert.ok(desc && desc.length > 0, label + ': description must be non-empty');
    assert.ok(
      desc.length < 500,
      label + ': description must be < 500 chars, got ' + desc.length
    );
  });

  test('agent ' + label + ': description has no angle brackets', function () {
    var parsed = parseFrontmatter(agentPath);
    var desc = parsed.fm.description || '';
    assert.ok(
      !/[<>]/.test(desc),
      label + ': description must not contain angle brackets (< or >). Got: ' + desc
    );
  });

  test('agent ' + label + ': model is in allowed list', function () {
    var parsed = parseFrontmatter(agentPath);
    var model = parsed.fm.model;
    assert.ok(model && model.length > 0, label + ': model must be present');
    assert.ok(
      ALLOWED_MODELS.indexOf(model) >= 0,
      label + ': model "' + model + '" not in allowed list: ' + ALLOWED_MODELS.join(', ')
    );
  });

  test('agent ' + label + ': effort is in allowed list', function () {
    var parsed = parseFrontmatter(agentPath);
    var effort = parsed.fm.effort;
    assert.ok(effort && effort.length > 0, label + ': effort must be present');
    assert.ok(
      ALLOWED_EFFORT.indexOf(effort) >= 0,
      label + ': effort "' + effort + '" not in allowed list: ' + ALLOWED_EFFORT.join(', ')
    );
  });

  test('agent ' + label + ': persona reference resolves (if present)', function () {
    var parsed = parseFrontmatter(agentPath);
    var persona = parsed.fm.persona;
    if (!persona || persona.length === 0) {
      return; // optional field — skip
    }
    assert.ok(
      /^personas\/[a-z][a-z0-9-]*$/.test(persona),
      label + ': persona "' + persona + '" must match relative path "personas/<name>"'
    );
    var personaName = persona.replace(/^personas\//, '');
    var personaFile = path.join(PERSONAS_DIR, personaName + '.md');
    assert.ok(
      fs.existsSync(personaFile),
      label + ': persona file does not exist at ' + personaFile
    );
  });

  test('agent ' + label + ': body is non-empty and >= 20 lines', function () {
    var parsed = parseFrontmatter(agentPath);
    var nonBlank = parsed.bodyLines.filter(function (l) {
      return l.trim().length > 0;
    });
    assert.ok(nonBlank.length > 0, label + ': body must be non-empty');
    assert.ok(
      parsed.bodyLines.length >= 20,
      label + ': body must be >= 20 lines (prevents blank stubs), got ' + parsed.bodyLines.length
    );
  });

  test('agent ' + label + ': allowed-tools is array if present', function () {
    var parsed = parseFrontmatter(agentPath);
    // If a scalar "allowed-tools: ..." sneaked in, it would land in parsed.fm.
    // The valid YAML-array form lands in parsed.arrays.
    var scalarPresent = Object.prototype.hasOwnProperty.call(parsed.fm, 'allowed-tools');
    var arrayPresent = Object.prototype.hasOwnProperty.call(parsed.arrays, 'allowed-tools');
    if (scalarPresent) {
      assert.fail(
        label + ': "allowed-tools" must be a YAML array (use "- item" entries), not a scalar string'
      );
    }
    if (arrayPresent) {
      assert.ok(
        Array.isArray(parsed.arrays['allowed-tools']),
        label + ': "allowed-tools" must parse as an array'
      );
    }
    // No allowed-tools field at all = OK, skip silently.
  });
});

// ─── Pinned-model tests ───────────────────────────────────────────────────────

Object.keys(PINNED_MODELS).forEach(function (agentName) {
  var expected = PINNED_MODELS[agentName];
  test('pinned model: ' + agentName + ' must use "' + expected + '"', function () {
    var agentPath = path.join(AGENTS_DIR, agentName + '.md');
    assert.ok(
      fs.existsSync(agentPath),
      'pinned-model check requires ' + agentPath + ' to exist'
    );
    var parsed = parseFrontmatter(agentPath);
    assert.strictEqual(
      parsed.fm.model,
      expected,
      agentName + ': must be pinned to explicit model ID "' + expected +
        '" (not an alias). Got: "' + parsed.fm.model + '"'
    );
  });
});
