'use strict';

// End-to-end plugin schema validation — asserts the plugin AS A WHOLE
// satisfies the marketplace install contract.
//
// W4e (Sonnet) was supposed to write this; reported success but the file
// was never on disk. Orchestrator caught the hallucination and wrote it
// in main thread. See /tmp/ccc-codex-audit-final/report.md → finding M4.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const PLUGIN_DIR = path.join(ROOT, 'commander', 'cowork-plugin');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---', 4);
  if (end < 0) return null;
  const yaml = content.slice(4, end);
  const fm = {};
  let lastKey = null;
  for (const line of yaml.split('\n')) {
    if (line.match(/^[a-zA-Z][\w-]*:/)) {
      const m = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
      if (m) {
        let val = m[2].trim();
        // Strip outer quotes (handle escaped quotes inside)
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
        }
        fm[m[1]] = val;
        lastKey = m[1];
      }
    } else if (line.match(/^\s+-\s+/) && lastKey) {
      // YAML list continuation
      if (!Array.isArray(fm[lastKey])) fm[lastKey] = [];
      fm[lastKey].push(line.replace(/^\s+-\s+/, '').trim());
    }
  }
  return fm;
}

// ─── Group 1: plugin.json ───────────────────────────────────────────

const PLUGIN_JSON_PATH = path.join(PLUGIN_DIR, '.claude-plugin', 'plugin.json');
let pluginJson;

test('plugin.json: parses as valid JSON', () => {
  pluginJson = readJSON(PLUGIN_JSON_PATH);
  assert.ok(pluginJson, 'plugin.json should parse');
});

test('plugin.json: has required top-level fields', () => {
  for (const field of ['name', 'version', 'description', 'author', 'repository', 'license']) {
    assert.ok(pluginJson[field], `plugin.json must have ${field}`);
  }
});

test('plugin.json: name is "commander"', () => {
  assert.equal(pluginJson.name, 'commander');
});

test('plugin.json: displayName is "Commander"', () => {
  assert.equal(pluginJson.displayName, 'Commander');
});

test('plugin.json: version is semver-shaped', () => {
  assert.match(pluginJson.version, /^\d+\.\d+\.\d+(-[\w.]+)?$/);
});

test('plugin.json: version === package.json.version', () => {
  const pkg = readJSON(path.join(ROOT, 'package.json'));
  assert.equal(pluginJson.version, pkg.version);
});

test('plugin.json: description claims 55 plugin skills', () => {
  assert.ok(/\b55 plugin skills\b/.test(pluginJson.description),
    'description must contain "55 plugin skills" as the canonical count claim');
});

test('plugin.json: keywords array has ≥3 entries', () => {
  assert.ok(Array.isArray(pluginJson.keywords));
  assert.ok(pluginJson.keywords.length >= 3);
});

test('plugin.json: license is MIT', () => {
  assert.equal(pluginJson.license, 'MIT');
});

// ─── Group 2: marketplace.json ──────────────────────────────────────

const MARKETPLACE_JSON_PATH = path.join(ROOT, '.claude-plugin', 'marketplace.json');
let marketplaceJson;

test('marketplace.json: parses as valid JSON', () => {
  marketplaceJson = readJSON(MARKETPLACE_JSON_PATH);
  assert.ok(marketplaceJson);
});

test('marketplace.json: has top-level required fields', () => {
  for (const field of ['name', 'owner', 'plugins', 'version']) {
    assert.ok(marketplaceJson[field], `marketplace.json must have ${field}`);
  }
});

test('marketplace.json: plugins[0].name is "commander"', () => {
  assert.equal(marketplaceJson.plugins[0].name, 'commander');
});

test('marketplace.json: plugins[0].displayName is "Commander"', () => {
  assert.equal(marketplaceJson.plugins[0].displayName, 'Commander');
});

test('marketplace.json: plugins[0].source resolves to a real directory', () => {
  const source = marketplaceJson.plugins[0].source;
  const resolved = path.join(ROOT, source);
  assert.ok(fs.existsSync(resolved), `${source} should resolve to existing dir`);
  assert.ok(fs.statSync(resolved).isDirectory());
});

test('marketplace.json: version === plugin.json.version === plugins[0].version', () => {
  assert.equal(marketplaceJson.version, pluginJson.version);
  assert.equal(marketplaceJson.plugins[0].version, pluginJson.version);
});

// ─── Group 3: hooks.json ────────────────────────────────────────────

const HOOKS_JSON_PATH = path.join(PLUGIN_DIR, 'hooks', 'hooks.json');
let hooksJson;

test('hooks.json: parses as valid JSON', () => {
  hooksJson = readJSON(HOOKS_JSON_PATH);
  assert.ok(hooksJson);
});

test('hooks.json: every command path exists on disk', () => {
  // hooks.json structure: { hooks: { EventName: [{ matcher, hooks: [{ type, command }] }] } }
  const events = hooksJson.hooks || {};
  let totalHandlers = 0;
  const missing = [];
  for (const [eventName, slots] of Object.entries(events)) {
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (!Array.isArray(slot.hooks)) continue;
      for (const h of slot.hooks) {
        if (h.command && h.command.includes('${CLAUDE_PLUGIN_ROOT}')) {
          const resolved = h.command.replace('${CLAUDE_PLUGIN_ROOT}', PLUGIN_DIR).split(/\s+/).find(t => t.endsWith('.js'));
          if (resolved && !fs.existsSync(resolved)) missing.push(`${eventName}: ${resolved}`);
          totalHandlers++;
        }
      }
    }
  }
  assert.deepEqual(missing, [], `hooks.json references non-existent files: ${missing.join(', ')}`);
  assert.ok(totalHandlers > 0, 'Should have at least one handler registered');
});

test('hooks.json: every event name is a valid Claude Code lifecycle', () => {
  // Claude Code core events + PermissionRequest (Codex Desktop only; harmless on Claude Code — won't fire)
  const valid = new Set([
    'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
    'Stop', 'Notification', 'PreCompact', 'SubagentStop',
    'PermissionRequest',  // Codex-only; registered for Codex Desktop UX; ignored by Claude Code
  ]);
  const events = Object.keys(hooksJson.hooks || {});
  const invalid = events.filter(e => !valid.has(e));
  assert.deepEqual(invalid, [], `Unknown lifecycle events: ${invalid.join(', ')}`);
});

// ─── Group 4: skills ────────────────────────────────────────────────

const SKILLS_DIR = path.join(PLUGIN_DIR, 'skills');

test('skills: every dir has SKILL.md', () => {
  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
  const missing = dirs.filter(d => !fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')));
  assert.deepEqual(missing, [], `Skill dirs missing SKILL.md: ${missing.join(', ')}`);
});

test('skills: every SKILL.md has valid frontmatter with required fields', () => {
  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => e.name);
  const missing = [];
  for (const d of dirs) {
    const content = fs.readFileSync(path.join(SKILLS_DIR, d, 'SKILL.md'), 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) { missing.push(`${d}: no frontmatter`); continue; }
    if (!fm.name) missing.push(`${d}: missing name`);
    if (!fm.description) missing.push(`${d}: missing description`);
  }
  assert.deepEqual(missing, [], `Skill frontmatter issues: ${missing.join('; ')}`);
});

test('skills: total dir count is 55 (canonical claim)', () => {
  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory()).length;
  assert.equal(dirs, 55);
});

test('skills: no description contains angle brackets', () => {
  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => e.name);
  const offenders = [];
  for (const d of dirs) {
    const content = fs.readFileSync(path.join(SKILLS_DIR, d, 'SKILL.md'), 'utf8');
    const fm = parseFrontmatter(content);
    if (fm && fm.description && /[<>]/.test(fm.description)) offenders.push(d);
  }
  assert.deepEqual(offenders, [], `Skill descriptions with angle brackets: ${offenders.join(', ')}`);
});

// ─── Group 5: agents ────────────────────────────────────────────────

const AGENTS_DIR = path.join(PLUGIN_DIR, 'agents');

test('agents: total count is 17', () => {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  assert.equal(files.length, 17);
});

test('agents: every .md has frontmatter with name + description + model + effort', () => {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  const missing = [];
  for (const f of files) {
    const fm = parseFrontmatter(fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8'));
    if (!fm) { missing.push(`${f}: no frontmatter`); continue; }
    if (!fm.name) missing.push(`${f}: missing name`);
    if (!fm.description) missing.push(`${f}: missing description`);
    if (!fm.model) missing.push(`${f}: missing model`);
    if (!fm.effort) missing.push(`${f}: missing effort`);
  }
  assert.deepEqual(missing, [], `Agent frontmatter issues: ${missing.join('; ')}`);
});

// ─── Group 6: .mcp.json ─────────────────────────────────────────────

test('.mcp.json: parses + has exactly 2 servers (canonical claim)', () => {
  const mcpJson = readJSON(path.join(PLUGIN_DIR, '.mcp.json'));
  assert.ok(mcpJson.mcpServers, '.mcp.json should have mcpServers key');
  const serverNames = Object.keys(mcpJson.mcpServers);
  assert.equal(serverNames.length, 2, `Expected 2 bundled MCP servers, got ${serverNames.length}: ${serverNames.join(', ')}`);
});

test('.mcp.json: server names match canonical (context7 + sequential-thinking)', () => {
  const mcpJson = readJSON(path.join(PLUGIN_DIR, '.mcp.json'));
  const expected = new Set(['context7', 'sequential-thinking']);
  const actual = new Set(Object.keys(mcpJson.mcpServers));
  assert.deepEqual(actual, expected);
});

test('.mcp.json: each server has a command field', () => {
  const mcpJson = readJSON(path.join(PLUGIN_DIR, '.mcp.json'));
  for (const [name, cfg] of Object.entries(mcpJson.mcpServers)) {
    assert.ok(cfg.command, `MCP server ${name} must have command`);
  }
});
