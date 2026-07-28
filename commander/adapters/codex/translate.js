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
import { getModelEntry } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOOK_MAP = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'hook-event-map.json'), 'utf8')
);

// CLAUDE_PLUGIN_ROOT, not CODEX_PLUGIN_ROOT: Codex documents CLAUDE_PLUGIN_ROOT
// as a compatibility alias it also exports (learn.chatgpt.com/docs/hooks,
// verified 2026-07-22); CODEX_PLUGIN_ROOT is not a real Codex variable. Note
// this snippet is a manually-copy-pasted addition to a user's own
// ~/.codex/config.toml (see telemetryInitToml below), not part of the
// generated plugin tree -- Codex's plugin-root env vars are only guaranteed
// for commands Codex itself spawns as plugin hooks, so this path may still
// need to be absolute in practice. Flagged, not fixed here (out of scope).
const DEFAULT_TELEMETRY_MODULE = '${CLAUDE_PLUGIN_ROOT}/adapters/codex/telemetry.js';
const VALID_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
// Handlers that were "async": true in the Claude source keep their timeout
// but never exceed this once translated to a synchronous Codex command hook
// (Codex parses "async": true but skips those handlers entirely -- see
// hook-event-map.json's schema_compat.async_handlers). Current source data
// tops out at 5000ms, well under this; the clamp is a defensive ceiling.
const MAX_SYNC_HANDLER_TIMEOUT_MS = 8000;

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

// Hook commands keep ${CLAUDE_PLUGIN_ROOT} verbatim -- Codex documents it as
// a compatibility alias for its native PLUGIN_ROOT (learn.chatgpt.com/docs/hooks,
// verified 2026-07-22), and the quoted-path form already used throughout
// hooks.json (`node "${CLAUDE_PLUGIN_ROOT}/hooks/..."`) is already correct
// for that env var. The only real translation left is stripping "async":
// true, which Codex parses but silently skips ("asynchronous command hooks
// aren't supported yet") -- without this, every async handler would be lost
// with no error. Handlers keep running, now synchronously, so their timeout
// is clamped to a sane ceiling.
function translateHookHandlers(handlers, log) {
  const translated = JSON.parse(JSON.stringify(handlers));
  for (const slot of translated) {
    for (const hook of slot.hooks || []) {
      // Claude Code hook timeouts are SECONDS (docs: "Seconds before canceling",
      // default 600 — fixed 2026-07-28 after 43 handlers shipped ms-scale values,
      // i.e. "3000" = 50 minutes). Codex reads ms (verified against Codex hook
      // docs 2026-07-22), so convert at the boundary. Guard: a value >= 100 is
      // assumed to already be ms (a stale un-migrated source) and passed through,
      // so a double conversion can never produce a multi-hour timeout.
      if (typeof hook.timeout === 'number' && hook.timeout > 0 && hook.timeout < 100) {
        hook.timeout = hook.timeout * 1000;
      }
      if (hook.async !== true) continue;
      log(`hook ${hook.command || '(no command)'}: stripped async (Codex skips async command hooks; now runs synchronously)`);
      delete hook.async;
      if (typeof hook.timeout === 'number' && hook.timeout > MAX_SYNC_HANDLER_TIMEOUT_MS) {
        log(`hook ${hook.command}: clamped timeout ${hook.timeout}ms -> ${MAX_SYNC_HANDLER_TIMEOUT_MS}ms`);
        hook.timeout = MAX_SYNC_HANDLER_TIMEOUT_MS;
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

// Codex does not speak Anthropic model IDs. Translate known Claude names to
// a Codex model id, sourced from the registry in ./models.js so tier
// assignments and fallback chains live in exactly one place.
//
// Tier mapping (registry-backed):
//   fable, opus -> gpt-5.6-sol   (flagship/deep-reasoning, fallback gpt-5.5)
//   sonnet      -> gpt-5.6-terra (balanced/default, fallback gpt-5.5)
//   haiku       -> gpt-5.6-luna  (fast/light, fallback gpt-5.4-mini)
//   default     -> gpt-5.6-terra
export function remapModel(claudeModel) {
  const targetId = resolveTargetModelId(claudeModel);
  if (targetId === PASSTHROUGH) return claudeModel;

  const entry = getModelEntry(targetId);
  // Every branch below picks its own target id from the registry — if one
  // ever drifts out of sync with models.js, fail loud instead of silently
  // emitting an unverified model string.
  if (!entry) {
    throw new Error(`remapModel: "${targetId}" is not in the Codex model registry`);
  }
  return entry.id;
}

const PASSTHROUGH = Symbol('passthrough');

// Unrecognized Claude model strings (not fable/opus/sonnet/haiku) pass
// through unchanged — this only classifies Claude names we know how to map.
function resolveTargetModelId(claudeModel) {
  if (!claudeModel) return 'gpt-5.6-terra';
  if (claudeModel.includes('fable')) return 'gpt-5.6-sol';
  if (claudeModel.includes('opus')) return 'gpt-5.6-sol';
  if (claudeModel.includes('sonnet')) return 'gpt-5.6-terra';
  if (claudeModel.includes('haiku')) return 'gpt-5.6-luna';
  return PASSTHROUGH;
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

// Skills carry over almost verbatim. ${CLAUDE_PLUGIN_ROOT} is NOT rewritten
// (see translateHookHandlers) -- Codex documents it as a compatibility alias
// for its native PLUGIN_ROOT, so a skill body telling the agent to run
// `node ${CLAUDE_PLUGIN_ROOT}/lib/...` keeps working unmodified. The four
// transforms below patch the things that genuinely differ between Claude
// Code and Codex: invocation syntax, the plugin's own manifest sub-path, and
// two Claude-only capabilities (AskUserQuestion, the Workflow tool) that
// need a fallback note so a skill body doesn't silently instruct an agent to
// reach for a tool Codex doesn't have. Order matters only in that the two
// notes are appended in this sequence when a file needs both.

// (a) `/ccc-<name>` invocation references -> Codex's `$ccc-<name>` form (see
// the generated AGENTS.md: "invoke explicitly with `$<skill-name>`"). The
// guard is INVOCATION POSITION, not backtick-span membership: `/ccc-` is
// rewritten only when preceded by start-of-line, whitespace, or a backtick.
// That covers the simple `` `/ccc-review` ``, composite recipes like
// `` `/loop 5m /ccc-doctor` `` (adversarial-gate finding: a span-opening
// anchor missed every composite), and bare prose/heading invocations — all
// of which should read `$ccc-*` on Codex — while URLs (https://.../ccc-x)
// and file paths (skills/ccc-build/SKILL.md) stay untouched because their
// `/ccc-` is preceded by a non-space, non-backtick character.
//
// Deliberately NOT a backtick-pairing regex: triple-backtick fences put an
// odd number of backticks on a line, which flips pair parity for the rest
// of the document and silently mis-scopes every later span (that exact bug
// shipped briefly and left `` `/ccc-build` `` untranslated below a fence).
const CCC_INVOCATION = /(^|[\s`])\/ccc-/g;

function rewriteCcInvocations(text) {
  return text.replace(CCC_INVOCATION, '$1$$ccc-');
}

// (b) The plugin's own manifest path. Scoped specifically to the
// ${CLAUDE_PLUGIN_ROOT}/-prefixed form (5 legitimate occurrences in the
// source tree, all "read my own version from my own manifest") so it never
// touches the unrelated `.claude-plugin/plugin.json` mentions that describe
// Claude-specific tooling paths (e.g. `~/.claude/plugins/cache/*/*/1*/...`
// glob in ccc-suggest, or `$PLUGIN_DIR/...` in ccc-doctor) which have no
// Codex equivalent and must stay as-is.
const OWN_MANIFEST_PATH = '${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json';
const OWN_MANIFEST_PATH_CODEX = '${CLAUDE_PLUGIN_ROOT}/.codex-plugin/plugin.json';

function rewriteOwnManifestPath(text) {
  return text.replaceAll(OWN_MANIFEST_PATH, OWN_MANIFEST_PATH_CODEX);
}

// (c) AskUserQuestion has no Codex equivalent. Append one note per file
// (never inline -- an inline replace could land inside YAML frontmatter's
// `allowed-tools` list, which several skills reference it from) so the
// Codex-side reader knows to fall back to a numbered list.
const ASKUSERQUESTION_MENTION = /\bAskUserQuestion\b/;
const ASKUSERQUESTION_NOTE =
  '\n> (On Codex, present these options as a numbered list and ask the ' +
  'user to reply with a number — AskUserQuestion is Claude-only.)\n';

function appendAskUserQuestionNote(text) {
  if (!ASKUSERQUESTION_MENTION.test(text)) return text;
  const withTrailingNewline = text.endsWith('\n') ? text : `${text}\n`;
  return `${withTrailingNewline}${ASKUSERQUESTION_NOTE}`;
}

// (d) The Workflow(...) tool is not packaged for Codex. Same one-note-per-
// file treatment as AskUserQuestion -- the real usages are multi-line
// `Workflow({ scriptPath, args })` code blocks, so annotating every call
// site inline risks corrupting fenced code blocks; a single file-level note
// is the conservative choice.
const WORKFLOW_TOOL_MENTION = /\bWorkflow\(/;
const WORKFLOW_NOTE =
  '\n> (The Workflow(...) tool is not available on Codex — run the steps sequentially.)\n';

function appendWorkflowNote(text) {
  if (!WORKFLOW_TOOL_MENTION.test(text)) return text;
  const withTrailingNewline = text.endsWith('\n') ? text : `${text}\n`;
  return `${withTrailingNewline}${WORKFLOW_NOTE}`;
}

export function translateSkill(skillMd) {
  if (typeof skillMd !== 'string') return skillMd;
  let out = skillMd;
  out = rewriteCcInvocations(out);
  out = rewriteOwnManifestPath(out);
  out = appendAskUserQuestionNote(out);
  out = appendWorkflowNote(out);
  return out;
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
