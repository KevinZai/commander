#!/usr/bin/env node

/**
 * Codex Adapter - Plugin Translator
 *
 * Reads CC Commander's Claude Code plugin tree and emits Codex-flavored
 * artifacts. The public functions are intentionally side-effect free so the
 * build pipeline can wire them into generated output without touching source.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  detectCodexHookCapabilities,
  validateHookMapAgainstCapabilities,
} from './hooks-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOOK_MAP = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'hook-event-map.json'), 'utf8')
);

const DEFAULT_TELEMETRY_MODULE = '${CODEX_PLUGIN_ROOT}/adapters/codex/telemetry.js';
const VALID_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh']);

function createLogger(verbose, writer = process.stderr) {
  return (message) => {
    if (verbose) writer.write(`[codex translate] ${message}\n`);
  };
}

function escapeTomlString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeTomlMultiline(value) {
  return String(value).replace(/"""/g, '\\"\\"\\"');
}

function translateHookHandlers(handlers, log) {
  const translated = JSON.parse(JSON.stringify(handlers));
  for (const slot of translated) {
    for (const hook of slot.hooks || []) {
      if (typeof hook.command !== 'string') continue;
      const nextCommand = hook.command.replaceAll(
        '${CLAUDE_PLUGIN_ROOT}',
        '${CODEX_PLUGIN_ROOT}'
      );
      if (nextCommand !== hook.command) {
        log(`hook command root ${hook.command} -> ${nextCommand}`);
        hook.command = nextCommand;
      }
    }
  }
  return translated;
}

function parseFrontmatter(mdSource) {
  const fmMatch = mdSource.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error('Agent file missing YAML frontmatter');
  }

  const [, fm, body] = fmMatch;
  const fields = {};
  let currentKey = null;

  for (const line of fm.split('\n')) {
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
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

// plugin.json (Claude) -> .codex-plugin/plugin.json (Codex)
export function translateManifest(claudeManifest, version, options = {}) {
  const log = createLogger(options.verbose, options.writer);
  const tpl = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'manifest.template.json'), 'utf8')
  );
  const pluginVersion = version || claudeManifest.version;
  log(`manifest version ${pluginVersion}`);

  return JSON.parse(
    JSON.stringify(tpl)
      .replace('{{VERSION}}', pluginVersion)
      .replace(
        '{{DESCRIPTION}}',
        claudeManifest.description.replace(/\n/g, ' ').replace(/"/g, '\\"')
      )
  );
}

// agents/*.md (YAML frontmatter + body) -> agents/*.toml
export function translateAgent(mdSource, options = {}) {
  const log = createLogger(options.verbose, options.writer);
  const { fields, body } = parseFrontmatter(mdSource);
  const toml = [];

  if (fields.name) {
    log(`agent name ${fields.name}`);
    toml.push(`name = "${escapeTomlString(fields.name)}"`);
  }
  if (fields.description) {
    log(`agent description ${fields.description}`);
    toml.push(`description = "${escapeTomlString(fields.description)}"`);
  }
  if (fields.model) {
    const model = remapModel(fields.model);
    log(`agent model ${fields.model} -> ${model}`);
    toml.push(`model = "${escapeTomlString(model)}"`);
  }
  if (fields.effort) {
    const effort = remapEffort(fields.effort);
    log(`agent effort ${fields.effort} -> ${effort}`);
    toml.push(`model_reasoning_effort = "${effort}"`);
  }
  if (fields.tools) {
    const tools = Array.isArray(fields.tools) ? fields.tools.join(', ') : fields.tools;
    log(`agent tools -> sandbox_mode workspace-write (${tools})`);
    toml.push(`sandbox_mode = "workspace-write"  # was tools: ${escapeTomlString(tools)}`);
  }
  toml.push('');
  toml.push('developer_instructions = """');
  toml.push(escapeTomlMultiline(body.trim()));
  toml.push('"""');

  return toml.join('\n');
}

// Codex does not speak Anthropic model IDs. Translate known Claude names.
export function remapModel(claudeModel) {
  if (!claudeModel) return 'gpt-5.4';
  if (claudeModel.includes('opus')) return 'gpt-5.5';
  if (claudeModel.includes('sonnet')) return 'gpt-5.4';
  if (claudeModel.includes('haiku')) return 'gpt-5.4-mini';
  return claudeModel;
}

export function remapEffort(effort) {
  const normalized = String(effort || '').trim().toLowerCase();
  if (!VALID_EFFORTS.has(normalized)) {
    throw new Error(
      `Unsupported agent effort "${effort}". Expected one of: ${[...VALID_EFFORTS].join(', ')}`
    );
  }
  return normalized;
}

// hooks.json - event remap with runtime capability filtering.
export function translateHooks(claudeHooks, options = {}) {
  const log = createLogger(options.verbose, options.writer);
  const hookMap = options.hookMap || HOOK_MAP;
  const capabilities = options.capabilities || detectCodexHookCapabilities(options);
  const supportedEvents = new Set(capabilities.supportedEvents || []);
  const droppedFromClaude = new Set(capabilities.droppedFromClaude || []);
  const out = { hooks: {} };

  validateHookMapAgainstCapabilities(hookMap, capabilities);
  log(`codex version ${capabilities.codexVersion || 'unknown'}`);
  log(`supported hooks ${[...supportedEvents].join(', ')}`);

  for (const [event, handlers] of Object.entries(claudeHooks.hooks || {})) {
    if (droppedFromClaude.has(event)) {
      log(`drop hook ${event}: unsupported by Codex`);
      continue;
    }

    const mapping = hookMap.events[event];
    if (!mapping) {
      log(`pass hook ${event}: no mapping entry`);
      out.hooks[event] = translateHookHandlers(handlers, log);
      continue;
    }
    if (mapping.status === 'drop' || mapping.codex === null) {
      log(`drop hook ${event}: hook-event-map status ${mapping.status}`);
      continue;
    }
    if (!supportedEvents.has(mapping.codex)) {
      throw new Error(
        `Cannot translate ${event}: Codex runtime does not support ${mapping.codex}`
      );
    }

    log(`hook ${event} -> ${mapping.codex}`);
    out.hooks[mapping.codex] = (out.hooks[mapping.codex] || []).concat(
      translateHookHandlers(handlers, log)
    );
  }

  return out;
}

// Skills are identical.
export function translateSkill(skillMd) {
  return skillMd;
}

// .mcp.json - Codex accepts the same shape.
export function translateMcp(claudeMcp) {
  return claudeMcp;
}

export function mcpToToml(claudeMcp, options = {}) {
  const log = createLogger(options.verbose, options.writer);
  const lines = [];

  for (const [name, cfg] of Object.entries(claudeMcp.mcpServers || {})) {
    log(`mcp server ${name}`);
    lines.push(`[mcp_servers.${name}]`);
    if (cfg.command) lines.push(`command = "${escapeTomlString(cfg.command)}"`);
    if (cfg.args) lines.push(`args = ${JSON.stringify(cfg.args)}`);
    if (cfg.env) {
      lines.push(`[mcp_servers.${name}.env]`);
      for (const [key, value] of Object.entries(cfg.env)) {
        lines.push(`${key} = "${escapeTomlString(value)}"`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function telemetryInitToml(options = {}) {
  const telemetryModule = options.telemetryModule || DEFAULT_TELEMETRY_MODULE;
  const command = `${options.nodeBin || 'node'} ${telemetryModule} session SessionStart`;
  const timeoutMs = options.timeoutMs || 1000;

  return [
    '# commander-telemetry-init.toml',
    '# Appends local Commander telemetry to ~/.codex/commander-telemetry.jsonl.',
    '[[hooks.SessionStart]]',
    'name = "commander-telemetry"',
    `command = "${escapeTomlString(command)}"`,
    `timeout_ms = ${timeoutMs}`,
    '',
  ].join('\n');
}

export const emitTelemetryInitToml = telemetryInitToml;

function usage() {
  return [
    'Usage: translate.js [options]',
    '',
    'Options:',
    '  --agent <file>             Translate one agents/*.md file to Codex TOML',
    '  --hooks <file>             Translate one hooks.json file to Codex hooks JSON',
    '  --mcp-toml <file>          Convert .mcp.json to config.toml blocks',
    '  --manifest <file>          Translate Claude plugin.json to Codex manifest JSON',
    '  --version <semver>         Override manifest version',
    '  --telemetry-init           Emit commander-telemetry-init.toml snippet',
    '  --telemetry-path <path>    Module path used by --telemetry-init',
    '  --verbose                  Log every translation decision to stderr',
    '  --help                    Show this help',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { verbose: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--verbose') {
      args.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--telemetry-init') {
      args.telemetryInit = true;
    } else if (
      arg === '--agent' ||
      arg === '--hooks' ||
      arg === '--mcp-toml' ||
      arg === '--manifest' ||
      arg === '--version' ||
      arg === '--telemetry-path'
    ) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      args[arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return args;
}

export function runTranslateCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const options = { verbose: args.verbose };

  if (args.help || argv.length === 0) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  if (args.agent) {
    process.stdout.write(`${translateAgent(fs.readFileSync(args.agent, 'utf8'), options)}\n`);
    return 0;
  }

  if (args.hooks) {
    const translated = translateHooks(
      JSON.parse(fs.readFileSync(args.hooks, 'utf8')),
      options
    );
    process.stdout.write(`${JSON.stringify(translated, null, 2)}\n`);
    return 0;
  }

  if (args.mcpToml) {
    process.stdout.write(
      `${mcpToToml(JSON.parse(fs.readFileSync(args.mcpToml, 'utf8')), options)}`
    );
    return 0;
  }

  if (args.manifest) {
    const translated = translateManifest(
      JSON.parse(fs.readFileSync(args.manifest, 'utf8')),
      args.version,
      options
    );
    process.stdout.write(`${JSON.stringify(translated, null, 2)}\n`);
    return 0;
  }

  if (args.telemetryInit) {
    process.stdout.write(
      telemetryInitToml({
        telemetryModule: args.telemetryPath || DEFAULT_TELEMETRY_MODULE,
      })
    );
    return 0;
  }

  throw new Error('No translation target selected');
}

const isCli = process.argv[1] && __filename === path.resolve(process.argv[1]);

if (isCli) {
  try {
    process.exitCode = runTranslateCli();
  } catch (error) {
    process.stderr.write(`codex translate failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
