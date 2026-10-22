/**
 * Codex Adapter - Claude agent Markdown -> Codex custom-agent TOML
 *
 * Converts commander/cowork-plugin/agents/<name>.md (YAML frontmatter + body)
 * into the Codex custom-agent format (platform facts §3.4): required `name`,
 * `description`, `developer_instructions`; optional `model`,
 * `model_reasoning_effort`, `sandbox_mode`. The output is valid TOML that can
 * be dropped into ~/.codex/agents/ or <repo>/.codex/agents/ unchanged.
 *
 * Pure functions only; scripts/build-codex.js does the file I/O.
 */

import * as models from './models.js';

const VALID_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
const WRITE_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];

export function parseAgentFrontmatter(mdSource) {
  if (typeof mdSource !== 'string') {
    throw new TypeError('Agent source must be a string');
  }
  const fmMatch = mdSource.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error('Agent file missing YAML frontmatter');
  }

  const [, fm, body] = fmMatch;
  const fields = {};
  let currentKey = null;

  for (const line of fm.split(/\r?\n/)) {
    const keyMatch = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      fields[currentKey] = stripYamlQuotes(keyMatch[2].trim());
      continue;
    }

    const listMatch = line.match(/^\s+-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(fields[currentKey])) fields[currentKey] = [];
      fields[currentKey].push(stripYamlQuotes(listMatch[1].trim()));
    }
  }

  return { fields, body };
}

function stripYamlQuotes(value) {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

// Basic TOML string: escape backslash, quote and control characters.
export function tomlString(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, (ch) =>
      `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
    );
  return `"${escaped}"`;
}

// Multiline basic TOML string. Backslashes must be escaped (TOML treats them
// as escape sequences), and any run of three quotes is broken up.
export function tomlMultilineString(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '""\\"')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, (ch) =>
      `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
    );
  // A trailing quote would merge with the closing delimiter.
  const safeEnd = escaped.endsWith('"') ? `${escaped.slice(0, -1)}\\"` : escaped;
  return `"""\n${safeEnd}\n"""`;
}

/**
 * Claude model alias/id -> Codex model id. Uses models.js resolveClaudeTier
 * (fable -> deep, opus -> default, sonnet -> bounded, haiku -> bulk). A value
 * that is already a registered Codex id passes through. If models.js predates
 * resolveClaudeTier, fall back to the registry default so the build still
 * emits a registered id instead of an Anthropic name.
 */
export function resolveAgentModel(claudeModel) {
  const value = typeof claudeModel === 'string' ? claudeModel.trim() : '';
  if (value && typeof models.getModelEntry === 'function' && models.getModelEntry(value)) {
    return value;
  }
  if (typeof models.resolveClaudeTier === 'function') {
    return models.resolveClaudeTier(value);
  }
  const fallback = typeof models.getDefaultModel === 'function' ? models.getDefaultModel() : null;
  if (!fallback?.id) {
    throw new Error(
      'models.js exports neither resolveClaudeTier nor getDefaultModel; cannot map agent model'
    );
  }
  return fallback.id;
}

export function resolveAgentEffort(effort) {
  if (effort == null || effort === '') return null;
  const normalized = String(effort).trim().toLowerCase();
  if (!VALID_EFFORTS.has(normalized)) {
    throw new Error(
      `Unsupported agent effort "${effort}". Expected one of: ${[...VALID_EFFORTS].join(', ')}`
    );
  }
  return normalized;
}

/**
 * read-only when the agent cannot write files: its `tools` allowlist names no
 * write tool, or `disallowedTools` removes every write tool it names.
 * An agent with no `tools` list inherits every tool, so it can write.
 */
export function resolveSandboxMode(fields) {
  const tools = toList(fields.tools);
  const disallowed = new Set(toList(fields.disallowedTools));
  if (tools.length === 0) {
    return WRITE_TOOLS.every((tool) => disallowed.has(tool)) ? 'read-only' : 'workspace-write';
  }
  const canWrite = tools.some((tool) => WRITE_TOOLS.includes(tool) && !disallowed.has(tool));
  return canWrite ? 'workspace-write' : 'read-only';
}

/**
 * Returns { name, toml, model, effort, sandboxMode }.
 * `sourcePath` only feeds the generated-file banner.
 */
export function agentMarkdownToToml(mdSource, options = {}) {
  const { fields, body } = parseAgentFrontmatter(mdSource);
  const name = fields.name || options.fallbackName;
  if (!name) throw new Error('Agent frontmatter is missing name');
  if (!fields.description) throw new Error(`Agent ${name} is missing description`);
  const instructions = body.trim();
  if (!instructions) throw new Error(`Agent ${name} has an empty body`);

  const model = resolveAgentModel(fields.model);
  const effort = resolveAgentEffort(fields.effort);
  const sandboxMode = resolveSandboxMode(fields);

  const lines = [];
  if (options.sourcePath) {
    lines.push(`# Generated by scripts/build-codex.js from ${options.sourcePath}. Do not edit.`);
  }
  lines.push(`name = ${tomlString(name)}`);
  lines.push(`description = ${tomlString(fields.description)}`);
  lines.push(`model = ${tomlString(model)}`);
  if (effort) lines.push(`model_reasoning_effort = ${tomlString(effort)}`);
  lines.push(`sandbox_mode = ${tomlString(sandboxMode)}`);
  lines.push('');
  lines.push(`developer_instructions = ${tomlMultilineString(instructions)}`);

  return { name, toml: `${lines.join('\n')}\n`, model, effort, sandboxMode };
}

export default agentMarkdownToToml;
