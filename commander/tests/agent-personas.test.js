'use strict';

// Test suite for the plugin agent files at commander/cowork-plugin/agents/*.md
// and the persona voice layers they reference in rules/personas/.
//
// Validates: count drift, required frontmatter, model aliases, per-agent
// model/effort routing, dropped platform-ignored fields, read-only reviewer
// tool limits, persona reference integrity, name uniqueness, body shape,
// and persona file size/content limits.

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var ROOT = path.join(__dirname, '..', '..');
var AGENTS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'agents');
var PERSONAS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'rules', 'personas');

var EXPECTED_AGENT_COUNT = 22;

// Claude Code subagent aliases plus the current full ids
// (docs/reference/platform-facts-2026-10.md §1). Legacy ids (claude-opus-5,
// claude-sonnet-5, claude-fable-5, claude-haiku-4-5) are deliberately absent
// so a stale pin fails here instead of passing silently.
var ALLOWED_MODELS = [
  'fable',
  'opus',
  'sonnet',
  'haiku',
  'inherit',
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'claude-haiku-5-5',
];

var ALIASES = ['fable', 'opus', 'sonnet', 'haiku', 'inherit'];

var ALLOWED_EFFORT = ['low', 'medium', 'high', 'xhigh'];

var LANGUAGE_REVIEWERS = [
  'csharp-reviewer',
  'go-reviewer',
  'java-reviewer',
  'kotlin-reviewer',
  'python-reviewer',
  'rust-reviewer',
  'typescript-reviewer',
];

// v8 routing (PROMPT-STANDARD §2): fable for architecture/security-class work,
// sonnet for writers and the fleet worker, opus for everything else.
var EXPECTED_ROUTING = {
  architect: { model: 'fable', effort: 'xhigh' },
  'security-auditor': { model: 'fable', effort: 'xhigh' },
  'technical-writer': { model: 'sonnet', effort: 'medium' },
  'content-strategist': { model: 'sonnet', effort: 'medium' },
  'fleet-worker': { model: 'sonnet', effort: 'medium' },
  builder: { model: 'opus', effort: 'high' },
  reviewer: { model: 'opus', effort: 'high' },
  debugger: { model: 'opus', effort: 'high' },
  designer: { model: 'opus', effort: 'high' },
  'devops-engineer': { model: 'opus', effort: 'high' },
  'qa-engineer': { model: 'opus', effort: 'high' },
  'product-manager': { model: 'opus', effort: 'high' },
  'data-analyst': { model: 'opus', effort: 'high' },
  'performance-engineer': { model: 'opus', effort: 'high' },
  researcher: { model: 'opus', effort: 'high' },
};
LANGUAGE_REVIEWERS.forEach(function (n) {
  EXPECTED_ROUTING[n] = { model: 'opus', effort: 'high' };
});

// Agents that must not write files: reviewers and auditors.
var READ_ONLY_AGENTS = ['reviewer', 'security-auditor', 'performance-engineer']
  .concat(LANGUAGE_REVIEWERS);

// Fields Claude Code ignores for plugin subagents (platform-facts §2.3).
var DROPPED_FIELDS = ['hooks', 'permissionMode', 'mcpServers', 'initialPrompt'];

var MAX_AGENT_BODY_LINES = 120;
var MAX_PERSONA_LINES = 40;

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

// ─── v8 agent-shape tests ─────────────────────────────────────────────────────

var STALE_MODEL_PATTERNS = [
  /\bFable 5\b(?!\.)/,
  /\bOpus 5\b(?!\.)/,
  /\bSonnet 5\b(?!\.)/,
  /\bHaiku 4\.5\b/,
  /\bclaude-(fable|opus|sonnet)-5\b(?!-)/,
  /\bclaude-haiku-4-5\b/,
  /\bgpt-5\./i,
];

agentFiles.forEach(function (agentFile) {
  var agentPath = path.join(AGENTS_DIR, agentFile);
  var label = agentFile.replace(/\.md$/, '');

  test('agent ' + label + ': model is an alias, not a full id', function () {
    var parsed = parseFrontmatter(agentPath);
    assert.ok(
      ALIASES.indexOf(parsed.fm.model) >= 0,
      label + ': plugin agents use model aliases (' + ALIASES.join(', ') + '), got "' + parsed.fm.model + '"'
    );
  });

  test('agent ' + label + ': no platform-ignored frontmatter fields', function () {
    var parsed = parseFrontmatter(agentPath);
    DROPPED_FIELDS.forEach(function (field) {
      var present = Object.prototype.hasOwnProperty.call(parsed.fm, field) ||
        Object.prototype.hasOwnProperty.call(parsed.arrays, field);
      assert.ok(!present, label + ': remove "' + field + '" (ignored for plugin subagents)');
    });
  });

  test('agent ' + label + ': tools and skills are YAML arrays; skills resolve', function () {
    var parsed = parseFrontmatter(agentPath);
    ['tools', 'disallowedTools', 'skills'].forEach(function (key) {
      assert.ok(
        !Object.prototype.hasOwnProperty.call(parsed.fm, key),
        label + ': "' + key + '" must be a YAML array, not a scalar'
      );
    });
    assert.ok(Array.isArray(parsed.arrays.tools) && parsed.arrays.tools.length > 0,
      label + ': tools must be a non-empty array');
    var skills = parsed.arrays.skills || [];
    assert.ok(skills.length <= 32, label + ': at most 32 preloaded skills');
    skills.forEach(function (skill) {
      var skillFile = path.join(ROOT, 'commander', 'cowork-plugin', 'skills', skill, 'SKILL.md');
      assert.ok(fs.existsSync(skillFile), label + ': preloaded skill "' + skill + '" not found at ' + skillFile);
    });
  });

  test('agent ' + label + ': body has Protocol, Output contract and Never sections, <= ' + MAX_AGENT_BODY_LINES + ' lines', function () {
    var parsed = parseFrontmatter(agentPath);
    assert.ok(
      parsed.bodyLines.length <= MAX_AGENT_BODY_LINES,
      label + ': body must be <= ' + MAX_AGENT_BODY_LINES + ' lines, got ' + parsed.bodyLines.length
    );
    ['## Protocol', '## Output contract', '## Never'].forEach(function (heading) {
      assert.ok(
        parsed.bodyLines.indexOf(heading) >= 0,
        label + ': body must contain a "' + heading + '" section'
      );
    });
  });

  test('agent ' + label + ': no stale model names', function () {
    var parsed = parseFrontmatter(agentPath);
    STALE_MODEL_PATTERNS.forEach(function (re) {
      assert.ok(!re.test(parsed.raw), label + ': stale model reference matches ' + re);
    });
  });
});

// ─── Routing tests ────────────────────────────────────────────────────────────

test('routing table covers every agent file', function () {
  var names = agentFiles.map(function (f) { return f.replace(/\.md$/, ''); }).sort();
  assert.deepStrictEqual(names, Object.keys(EXPECTED_ROUTING).sort());
});

Object.keys(EXPECTED_ROUTING).forEach(function (agentName) {
  var expected = EXPECTED_ROUTING[agentName];
  test('routing: ' + agentName + ' uses ' + expected.model + ' at effort ' + expected.effort, function () {
    var agentPath = path.join(AGENTS_DIR, agentName + '.md');
    assert.ok(fs.existsSync(agentPath), 'routing check requires ' + agentPath + ' to exist');
    var parsed = parseFrontmatter(agentPath);
    assert.strictEqual(parsed.fm.model, expected.model, agentName + ': model');
    assert.strictEqual(parsed.fm.effort, expected.effort, agentName + ': effort');
  });
});

READ_ONLY_AGENTS.forEach(function (agentName) {
  test('read-only: ' + agentName + ' disallows Write and Edit and is told to refute', function () {
    var parsed = parseFrontmatter(path.join(AGENTS_DIR, agentName + '.md'));
    var disallowed = parsed.arrays.disallowedTools || [];
    assert.ok(disallowed.indexOf('Write') >= 0, agentName + ': disallowedTools must include Write');
    assert.ok(disallowed.indexOf('Edit') >= 0, agentName + ': disallowedTools must include Edit');
    var tools = parsed.arrays.tools || [];
    assert.ok(tools.indexOf('Write') < 0 && tools.indexOf('Edit') < 0,
      agentName + ': tools must not grant Write or Edit');
  });
});

['reviewer', 'security-auditor', 'qa-engineer'].concat(LANGUAGE_REVIEWERS).forEach(function (agentName) {
  test('verifier: ' + agentName + ' is prompted to refute and defaults to refuted', function () {
    var body = parseFrontmatter(path.join(AGENTS_DIR, agentName + '.md')).body;
    assert.ok(/\brefute\b/i.test(body), agentName + ': body must instruct the agent to refute');
    assert.ok(/refuted/i.test(body), agentName + ': body must name the refuted default');
  });
});

// ─── Persona file tests ───────────────────────────────────────────────────────

var personaFiles = fs.readdirSync(PERSONAS_DIR)
  .filter(function (f) { return f.endsWith('.md') && f !== 'README.md'; })
  .sort();

test('every persona referenced by an agent exists, and every persona is referenced', function () {
  var referenced = {};
  agentFiles.forEach(function (f) {
    var persona = parseFrontmatter(path.join(AGENTS_DIR, f)).fm.persona;
    if (persona) referenced[persona.replace(/^personas\//, '') + '.md'] = true;
  });
  assert.deepStrictEqual(Object.keys(referenced).sort(), personaFiles);
});

test('personas README lists every persona file', function () {
  var readme = fs.readFileSync(path.join(PERSONAS_DIR, 'README.md'), 'utf8');
  personaFiles.forEach(function (f) {
    var name = f.replace(/\.md$/, '');
    assert.ok(new RegExp('\\| ' + name + ' \\|').test(readme), 'README table missing persona ' + name);
  });
});

personaFiles.forEach(function (personaFile) {
  var label = personaFile.replace(/\.md$/, '');
  test('persona ' + label + ': <= ' + MAX_PERSONA_LINES + ' lines, voice only (no model/cost/tool claims)', function () {
    var content = fs.readFileSync(path.join(PERSONAS_DIR, personaFile), 'utf8');
    var lines = content.replace(/\n$/, '').split('\n');
    assert.ok(lines.length <= MAX_PERSONA_LINES, label + ': must be <= ' + MAX_PERSONA_LINES + ' lines, got ' + lines.length);
    assert.ok(!/default model|\bmodel:|\$\d|per MTok|quota/i.test(content),
      label + ': personas must not carry model, cost or quota claims');
    STALE_MODEL_PATTERNS.forEach(function (re) {
      assert.ok(!re.test(content), label + ': stale model reference matches ' + re);
    });
  });
});
