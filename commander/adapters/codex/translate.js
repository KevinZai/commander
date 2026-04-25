'use strict';

/**
 * Codex Adapter — Plugin Translator
 *
 * Reads CC Commander's Claude Code plugin tree (commander/cowork-plugin/)
 * and emits a Codex-flavored equivalent (commander/cowork-plugin-codex/ — not yet wired).
 *
 * Status: scaffold (v0.1) — pure translator with no I/O wiring yet.
 * Run `node translate.js --help` for usage notes.
 *
 * Coverage:
 *   ✅ plugin.json     → .codex-plugin/plugin.json (field remap + interface block)
 *   ✅ skills/         → skills/ (passthrough — Agent Skills spec is identical)
 *   ⚠️ agents/*.md     → agents/*.toml (frontmatter → TOML keys, body → developer_instructions)
 *   ⚠️ hooks.json      → hooks.json (event remap per hook-event-map.json)
 *   ✅ .mcp.json       → .mcp.json (Codex accepts both .mcp.json and config.toml [mcp_servers])
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HOOK_MAP = require('./hook-event-map.json');

// ─────────────────────────────────────────────────────────────
// plugin.json (Claude) → .codex-plugin/plugin.json (Codex)
// ─────────────────────────────────────────────────────────────
function translateManifest(claudeManifest, version) {
  const tpl = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'manifest.template.json'), 'utf8')
  );
  return JSON.parse(
    JSON.stringify(tpl)
      .replace('{{VERSION}}', version || claudeManifest.version)
      .replace('{{DESCRIPTION}}', claudeManifest.description.replace(/\n/g, ' ').replace(/"/g, '\\"'))
  );
}

// ─────────────────────────────────────────────────────────────
// agents/*.md (YAML frontmatter + body) → agents/*.toml
//
// Claude format:                          Codex format:
//   ---                                     name = "architect"
//   name: architect                         description = "..."
//   description: ...                        model = "claude-opus-4-7"
//   model: claude-opus-4-7                  developer_instructions = """ body... """
//   ---
//   body markdown
// ─────────────────────────────────────────────────────────────
function translateAgent(mdSource) {
  const fmMatch = mdSource.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error('Agent file missing YAML frontmatter');
  }
  const [, fm, body] = fmMatch;
  const fields = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }

  const toml = [];
  if (fields.name)        toml.push(`name = "${fields.name}"`);
  if (fields.description) toml.push(`description = "${fields.description.replace(/"/g, '\\"')}"`);
  if (fields.model)       toml.push(`model = "${remapModel(fields.model)}"`);
  if (fields.effort)      toml.push(`model_reasoning_effort = "${fields.effort}"`);
  if (fields.tools) {
    // Codex sandbox modes are coarser than Claude tool whitelists.
    toml.push(`sandbox_mode = "workspace-write"  # was tools: ${fields.tools}`);
  }
  toml.push('');
  toml.push('developer_instructions = """');
  toml.push(body.trim());
  toml.push('"""');

  return toml.join('\n');
}

// Codex doesn't speak Anthropic model IDs — translate or leave generic.
function remapModel(claudeModel) {
  if (!claudeModel) return 'gpt-5.4';
  if (claudeModel.includes('opus'))   return 'gpt-5.5';        // deepest reasoning
  if (claudeModel.includes('sonnet')) return 'gpt-5.4';        // general work
  if (claudeModel.includes('haiku'))  return 'gpt-5.4-mini';   // fast/cheap
  return claudeModel; // pass through if user already specified GPT
}

// ─────────────────────────────────────────────────────────────
// hooks.json — event remap
// ─────────────────────────────────────────────────────────────
function translateHooks(claudeHooks) {
  const out = { hooks: {} };
  for (const [event, handlers] of Object.entries(claudeHooks.hooks || {})) {
    const mapping = HOOK_MAP.events[event];
    if (!mapping) {
      out.hooks[event] = handlers; // unknown event — pass through, Codex will ignore
      continue;
    }
    if (mapping.status === 'drop' || mapping.codex === null) {
      // skip — log to caller via return shape
      continue;
    }
    out.hooks[mapping.codex] = handlers;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Skills are identical — pure passthrough.
// ─────────────────────────────────────────────────────────────
function translateSkill(skillMd) {
  return skillMd; // SKILL.md spec is shared between Claude + Codex (Dec 2025).
}

// ─────────────────────────────────────────────────────────────
// .mcp.json — Codex accepts the same shape, optional TOML conversion below.
// ─────────────────────────────────────────────────────────────
function translateMcp(claudeMcp) {
  return claudeMcp; // identical schema.
}

function mcpToToml(claudeMcp) {
  // Optional: convert .mcp.json → [mcp_servers.*] blocks for ~/.codex/config.toml
  const lines = [];
  for (const [name, cfg] of Object.entries(claudeMcp.mcpServers || {})) {
    lines.push(`[mcp_servers.${name}]`);
    if (cfg.command) lines.push(`command = "${cfg.command}"`);
    if (cfg.args)    lines.push(`args = ${JSON.stringify(cfg.args)}`);
    if (cfg.env) {
      lines.push(`[mcp_servers.${name}.env]`);
      for (const [k, v] of Object.entries(cfg.env)) {
        lines.push(`${k} = "${v}"`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

module.exports = {
  translateManifest,
  translateAgent,
  translateHooks,
  translateSkill,
  translateMcp,
  mcpToToml,
  remapModel,
};

if (require.main === module) {
  console.log('Codex translator scaffold v0.1');
  console.log('No I/O wiring yet — import as a module.');
  console.log('Phase 2 will add: build script + smoke test + marketplace publish.');
}
