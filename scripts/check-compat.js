#!/usr/bin/env node
// check-compat.js — cross-surface manifest smoke gate.
//
// Validates the artifacts that make CC Commander installable on each agent
// surface (Claude Cowork / Claude Code CLI / Codex CLI / ChatGPT Work):
//   1. Claude plugin manifest + root marketplace (.claude-plugin/)
//   2. Codex mirror manifest (.codex-plugin/) — required fields, component
//      pointer paths, defaultPrompt array form
//   3. Bundled .mcp.json files (both trees)
//   4. Emitted AGENTS.md (present, under Codex's 32 KiB project_doc cap)
//   5. Local Codex/ChatGPT plugin marketplace (.agents/plugins/marketplace.json)
//
// Formats verified against learn.chatgpt.com plugin docs + Claude Code plugins
// reference on 2026-07-10 — see docs/compat/chatgpt-work.md for citations.
//
// Usage: node scripts/check-compat.js   (exit 0 = compatible, 1 = failures)

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CODEX_PROJECT_DOC_MAX_BYTES = 32 * 1024;
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const failures = [];
const passes = [];

function pass(label) {
  passes.push(label);
}

function fail(label, detail) {
  failures.push(`${label} — ${detail}`);
}

function readJson(relPath) {
  const absolute = path.join(ROOT, relPath);
  if (!existsSync(absolute)) {
    fail(relPath, 'file missing');
    return null;
  }
  try {
    return JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    fail(relPath, `invalid JSON: ${error.message}`);
    return null;
  }
}

function checkPointer(baseRel, manifest, field, { directory }) {
  const value = manifest[field];
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'string' || !value.startsWith('./')) {
    fail(`${baseRel} → ${field}`, `expected a relative "./" path string, got ${JSON.stringify(value)}`);
    return;
  }
  const target = path.join(ROOT, baseRel, value);
  if (!existsSync(target)) {
    fail(`${baseRel} → ${field}`, `points at missing path ${value}`);
    return;
  }
  const isDirectory = statSync(target).isDirectory();
  if (directory !== isDirectory) {
    fail(`${baseRel} → ${field}`, `expected a ${directory ? 'directory' : 'file'} at ${value}`);
    return;
  }
  pass(`${baseRel} → ${field} resolves (${value})`);
}

function checkMcpConfig(relPath) {
  const config = readJson(relPath);
  if (!config) {
    return;
  }
  const servers = config.mcpServers ?? config.mcp_servers ?? null;
  if (!servers || typeof servers !== 'object' || Object.keys(servers).length === 0) {
    fail(relPath, 'no MCP servers declared under mcpServers/mcp_servers');
    return;
  }
  for (const [name, server] of Object.entries(servers)) {
    if (!server || typeof server !== 'object' || (!server.command && !server.url)) {
      fail(relPath, `server "${name}" has neither command nor url`);
      return;
    }
  }
  pass(`${relPath} declares ${Object.keys(servers).length} runnable MCP server(s)`);
}

const pkg = readJson('package.json');
const expectedVersion = pkg?.version;
if (expectedVersion) {
  pass(`package.json version ${expectedVersion}`);
}

function checkVersionParity(label, actual) {
  if (!expectedVersion) {
    return;
  }
  if (actual !== expectedVersion) {
    fail(label, `version ${JSON.stringify(actual)} !== package.json ${expectedVersion}`);
  } else {
    pass(`${label} version parity (${actual})`);
  }
}

// ── 1. Claude Cowork / Claude Code CLI ─────────────────────────────────────
const CLAUDE_PLUGIN_DIR = 'commander/cowork-plugin';
const claudeManifest = readJson(`${CLAUDE_PLUGIN_DIR}/.claude-plugin/plugin.json`);
if (claudeManifest) {
  // Claude Code schema: `name` is the only required field (kebab-case).
  if (typeof claudeManifest.name !== 'string' || !KEBAB_CASE.test(claudeManifest.name)) {
    fail(`${CLAUDE_PLUGIN_DIR}/.claude-plugin/plugin.json`, `name must be kebab-case, got ${JSON.stringify(claudeManifest.name)}`);
  } else {
    pass(`Claude manifest name "${claudeManifest.name}" is kebab-case`);
  }
  checkVersionParity(`${CLAUDE_PLUGIN_DIR}/.claude-plugin/plugin.json`, claudeManifest.version);
}
checkMcpConfig(`${CLAUDE_PLUGIN_DIR}/.mcp.json`);

const claudeMarketplace = readJson('.claude-plugin/marketplace.json');
if (claudeMarketplace) {
  for (const plugin of claudeMarketplace.plugins ?? []) {
    const source = typeof plugin.source === 'string' ? plugin.source : plugin.source?.path;
    if (!source || !existsSync(path.join(ROOT, source))) {
      fail('.claude-plugin/marketplace.json', `plugin "${plugin.name}" source ${JSON.stringify(source)} missing`);
      continue;
    }
    pass(`Claude marketplace plugin "${plugin.name}" source resolves`);
    checkVersionParity(`.claude-plugin/marketplace.json plugins[${plugin.name}]`, plugin.version);
  }
}

// ── 2. Codex CLI / ChatGPT Work plugin mirror ──────────────────────────────
const CODEX_PLUGIN_DIR = 'commander/cowork-plugin-codex';
const codexManifestPath = `${CODEX_PLUGIN_DIR}/.codex-plugin/plugin.json`;
const codexManifest = readJson(codexManifestPath);
if (codexManifest) {
  // Codex plugin schema (build-plugins.md): name, version, description required.
  for (const field of ['name', 'version', 'description']) {
    if (typeof codexManifest[field] !== 'string' || codexManifest[field].length === 0) {
      fail(codexManifestPath, `required field "${field}" missing or empty`);
    }
  }
  if (typeof codexManifest.name === 'string' && !KEBAB_CASE.test(codexManifest.name)) {
    fail(codexManifestPath, `name must be kebab-case, got ${JSON.stringify(codexManifest.name)}`);
  }
  pass(`Codex manifest required fields present (${codexManifest.name}@${codexManifest.version})`);
  checkVersionParity(codexManifestPath, codexManifest.version);

  checkPointer(CODEX_PLUGIN_DIR, codexManifest, 'skills', { directory: true });
  checkPointer(CODEX_PLUGIN_DIR, codexManifest, 'agents', { directory: true });
  checkPointer(CODEX_PLUGIN_DIR, codexManifest, 'hooks', { directory: false });
  checkPointer(CODEX_PLUGIN_DIR, codexManifest, 'mcpServers', { directory: false });
  checkPointer(CODEX_PLUGIN_DIR, codexManifest, 'apps', { directory: false });

  const defaultPrompt = codexManifest.interface?.defaultPrompt;
  if (defaultPrompt !== undefined) {
    const isStringArray =
      Array.isArray(defaultPrompt) &&
      defaultPrompt.length > 0 &&
      defaultPrompt.every((entry) => typeof entry === 'string');
    if (!isStringArray) {
      fail(codexManifestPath, `interface.defaultPrompt must be an array of strings (documented schema), got ${JSON.stringify(defaultPrompt)}`);
    } else {
      pass('Codex manifest interface.defaultPrompt is an array of strings');
    }
  }
}
checkMcpConfig(`${CODEX_PLUGIN_DIR}/.mcp.json`);

// ── 3. AGENTS.md (Codex/ChatGPT Work instruction surface) ──────────────────
const agentsMdPath = path.join(ROOT, CODEX_PLUGIN_DIR, 'AGENTS.md');
if (!existsSync(agentsMdPath)) {
  fail(`${CODEX_PLUGIN_DIR}/AGENTS.md`, 'missing — run `npm run build:codex`');
} else {
  const bytes = statSync(agentsMdPath).size;
  if (bytes >= CODEX_PROJECT_DOC_MAX_BYTES) {
    fail(`${CODEX_PLUGIN_DIR}/AGENTS.md`, `${bytes} bytes exceeds Codex project_doc_max_bytes (${CODEX_PROJECT_DOC_MAX_BYTES})`);
  } else {
    pass(`AGENTS.md present (${bytes} bytes < ${CODEX_PROJECT_DOC_MAX_BYTES})`);
  }
}

// ── 4. Local Codex/ChatGPT plugin marketplace ──────────────────────────────
const codexMarketplace = readJson('.agents/plugins/marketplace.json');
if (codexMarketplace) {
  const plugins = codexMarketplace.plugins ?? [];
  if (plugins.length === 0) {
    fail('.agents/plugins/marketplace.json', 'no plugin entries');
  }
  for (const plugin of plugins) {
    if (typeof plugin.name !== 'string' || !plugin.source?.path) {
      fail('.agents/plugins/marketplace.json', `entry ${JSON.stringify(plugin.name)} needs name + source.path`);
      continue;
    }
    const pluginRoot = path.join(ROOT, plugin.source.path);
    if (!existsSync(path.join(pluginRoot, '.codex-plugin', 'plugin.json'))) {
      fail('.agents/plugins/marketplace.json', `"${plugin.name}" source.path has no .codex-plugin/plugin.json`);
      continue;
    }
    pass(`Codex marketplace plugin "${plugin.name}" source resolves to a plugin`);
    checkVersionParity(`.agents/plugins/marketplace.json plugins[${plugin.name}]`, plugin.version);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
for (const label of passes) {
  process.stdout.write(`  ok ${label}\n`);
}
if (failures.length > 0) {
  process.stderr.write('\ncheck-compat FAILURES:\n');
  for (const failure of failures) {
    process.stderr.write(`  ✗ ${failure}\n`);
  }
  process.stderr.write(`\ncheck-compat: ${failures.length} failure(s), ${passes.length} passed\n`);
  process.exit(1);
}
process.stdout.write(`\ncheck-compat: all ${passes.length} checks passed\n`);
