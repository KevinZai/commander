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
import * as hooksDetector from './hooks-detector.js';
import * as models from './models.js';
import { agentMarkdownToToml } from './agents-toml.js';

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
// Codex hook `timeout` is in SECONDS, like Claude Code (platform facts §3.3;
// the Codex app-server reports it as `timeoutSec`). Handlers that were
// "async": true in the Claude source run synchronously on Codex (Codex skips
// async command handlers), so their timeout is capped. SessionEnd and
// Interrupt handlers are capped at Codex's 3-second maximum.
const MAX_SYNC_HANDLER_TIMEOUT_SEC = 8;
const SHORT_EVENT_TIMEOUT_CAP_SEC =
  hooksDetector.CODEX_SHORT_TIMEOUT_EVENTS ?? { SessionEnd: 3, Interrupt: 3 };
// Claude-only handler fields Codex does not accept (facts §3.3).
const UNSUPPORTED_HANDLER_FIELDS =
  hooksDetector.CODEX_UNSUPPORTED_HANDLER_FIELDS ?? ['args', 'onFailure', 'if', 'once'];
const { detectCodexHookCapabilities, validateHookMapAgainstCapabilities } = hooksDetector;

function createLogger(verbose, writer = process.stderr) {
  return (message) => {
    if (verbose) writer.write(`[codex translate] ${message}\n`);
  };
}

function escapeTomlString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Hook commands keep ${CLAUDE_PLUGIN_ROOT} verbatim -- Codex documents it as
// a compatibility alias for its native PLUGIN_ROOT (platform facts §3.3), and
// the quoted-path form used throughout hooks.json is already correct for it.
// Translation strips "async": true (Codex parses it but skips the handler) and
// normalizes timeouts to seconds within the Codex caps.
function translateHookHandlers(handlers, log, codexEvent) {
  const translated = JSON.parse(JSON.stringify(handlers));
  const eventCap = SHORT_EVENT_TIMEOUT_CAP_SEC[codexEvent];
  for (const slot of translated) {
    for (const hook of slot.hooks || []) {
      if (hook.type === 'command' && typeof hook.command !== 'string' && Array.isArray(hook.args)) {
        throw new Error('Exec-form (args) hook handlers cannot be mirrored to Codex; use a shell-form command');
      }
      for (const field of UNSUPPORTED_HANDLER_FIELDS) {
        if (Object.hasOwn(hook, field)) {
          log(`hook ${hook.command || '(no command)'}: dropped unsupported field ${field}`);
          delete hook[field];
        }
      }
      // A value >= 100 is a stale millisecond-scale source value; convert it
      // to seconds so it can never become a multi-hour timeout.
      if (typeof hook.timeout === 'number' && hook.timeout >= 100) {
        const seconds = Math.max(1, Math.ceil(hook.timeout / 1000));
        log(`hook ${hook.command || '(no command)'}: timeout ${hook.timeout} read as ms -> ${seconds}s`);
        hook.timeout = seconds;
      }
      if (hook.async === true) {
        log(`hook ${hook.command || '(no command)'}: stripped async (Codex skips async command hooks; now runs synchronously)`);
        delete hook.async;
        if (typeof hook.timeout === 'number' && hook.timeout > MAX_SYNC_HANDLER_TIMEOUT_SEC) {
          log(`hook ${hook.command}: clamped timeout ${hook.timeout}s -> ${MAX_SYNC_HANDLER_TIMEOUT_SEC}s`);
          hook.timeout = MAX_SYNC_HANDLER_TIMEOUT_SEC;
        }
      }
      if (eventCap && (typeof hook.timeout !== 'number' || hook.timeout > eventCap)) {
        log(`hook ${hook.command}: ${codexEvent} timeout capped at ${eventCap}s`);
        hook.timeout = eventCap;
      }
    }
  }
  return translated;
}

// Count-free listing copy. Counts drift; the manifest must not carry them.
const CODEX_SHORT_DESCRIPTION =
  'Guided AI PM for Codex: plan, build, review and ship workflows, specialist agents, and the Codex-supported hook subset.';

// plugin.json (Claude) -> .codex-plugin/plugin.json (Codex overlay).
// The overlay keeps its top-level `interface` for older Codex builds and also
// carries `extensions["com.openai"]` (platform facts §3.6) with the same
// interface plus the hooks path, so either reader finds the listing fields.
export function translateManifest(claudeManifest, version, options = {}) {
  const log = createLogger(options.verbose, options.writer);
  const tpl = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'manifest.template.json'), 'utf8')
  );
  const pluginVersion = version || claudeManifest.version;
  log(`manifest version ${pluginVersion}`);

  const manifest = JSON.parse(
    JSON.stringify(tpl)
      .replace('{{VERSION}}', pluginVersion)
      .replace(
        '{{DESCRIPTION}}',
        codexDescription(claudeManifest)
      )
  );

  const iface = { ...manifest.interface, shortDescription: CODEX_SHORT_DESCRIPTION };
  manifest.interface = iface;
  manifest.extensions = {
    ...(manifest.extensions || {}),
    'com.openai': {
      hooks: manifest.hooks,
      interface: { ...iface },
    },
  };
  return manifest;
}

// agents/*.md (YAML frontmatter + body) -> agents/*.toml (Codex custom agent).
// Delegates to agents-toml.js so the build and this entry point emit the
// same TOML.
export function translateAgent(mdSource, options = {}) {
  const log = createLogger(options.verbose, options.writer);
  const result = agentMarkdownToToml(mdSource, options);
  log(`agent ${result.name}: model ${result.model}, sandbox ${result.sandboxMode}`);
  return result.toml;
}

// Codex does not speak Anthropic model IDs. Claude aliases and ids map by
// tier through models.js resolveClaudeTier (fable -> deep, opus -> default,
// sonnet -> bounded, haiku -> bulk; see CODEX_ROUTING). Empty/inherit maps to
// the registry default. Any other string (a Codex id, a future model) passes
// through unchanged.
const CLAUDE_MODEL_PATTERN = /^(fable|opus|sonnet|haiku|inherit|claude-.+)$/i;

export function remapModel(claudeModel) {
  const value = typeof claudeModel === 'string' ? claudeModel.trim() : '';
  if (value && !CLAUDE_MODEL_PATTERN.test(value)) return claudeModel;

  let targetId;
  if (typeof models.resolveClaudeTier === 'function') {
    targetId = models.resolveClaudeTier(value);
  } else if (typeof models.getDefaultModel === 'function') {
    // models.js predates resolveClaudeTier: every Claude tier collapses to
    // the registry default rather than emitting an unverified id.
    targetId = models.getDefaultModel()?.id;
  }
  if (!targetId || !models.getModelEntry(targetId)) {
    throw new Error(`remapModel: "${targetId}" is not in the Codex model registry`);
  }
  return targetId;
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
// Codex names its tools differently from Claude Code: file edits arrive as
// `apply_patch` and shell commands as `Bash` (learn.chatgpt.com/docs/hooks,
// verified 2026-10-13); Read/Glob/Grep, Agent, Skill, AskUserQuestion, Workflow
// and the other Claude-only tools never fire a Codex tool hook. A matcher that
// names only Claude tools would silently never match, so it is translated and,
// when nothing survives, the group is dropped with a log line.
const CODEX_TOOL_NAME_MAP = Object.freeze({
  Write: 'apply_patch',
  Edit: 'apply_patch',
  MultiEdit: 'apply_patch',
  NotebookEdit: 'apply_patch',
  apply_patch: 'apply_patch',
  Bash: 'Bash',
});
const TOOL_MATCHER_EVENTS = new Set(['PreToolUse', 'PostToolUse', 'PermissionRequest']);

export function translateMatcher(matcher) {
  if (matcher == null || matcher === '' || matcher === '*') return matcher;
  if (typeof matcher !== 'string') return matcher;
  // Only plain tool-name alternations are translated; any other regex syntax passes through.
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\|[A-Za-z_][A-Za-z0-9_]*)*$/.test(matcher)) return matcher;
  const mapped = [];
  for (const name of matcher.split('|')) {
    const codexName = name.startsWith('mcp__') ? name : CODEX_TOOL_NAME_MAP[name];
    if (codexName && !mapped.includes(codexName)) mapped.push(codexName);
  }
  return mapped.length ? mapped.join('|') : null;
}

function translateMatcherGroups(groups, event, log) {
  if (!TOOL_MATCHER_EVENTS.has(event) || !Array.isArray(groups)) return groups;
  const out = [];
  for (const group of groups) {
    if (!group || typeof group !== 'object' || !('matcher' in group)) { out.push(group); continue; }
    const translated = translateMatcher(group.matcher);
    if (translated === null) {
      log(`drop ${event} group: matcher "${group.matcher}" names only Claude-only tools`);
      continue;
    }
    if (translated !== group.matcher) log(`matcher ${event} "${group.matcher}" -> "${translated}"`);
    out.push({ ...group, matcher: translated });
  }
  return out;
}

// The Claude manifest description counts Claude-only surfaces (hook events,
// the HUD mod, plugin workflows, evals). The Codex manifest describes what the
// mirror actually ships and keeps only the skill count from the Claude text.
function codexDescription(claudeManifest) {
  const m = String(claudeManifest.description || '').match(/(\d+) plugin skills/);
  const skills = m ? `${m[1]} plugin skills` : 'click-first plugin skills';
  return (`Guided AI PM for Codex, running on the Commander Method: 12 enforceable gates (plan before build, verifier separate from worker, prove before alarm). ${skills} (click-first $ccc-* workflows incl. $ccc-codex for the Codex CLI), 22 specialist subagents generated as TOML, the Codex-supported hook subset, 2 bundled MCP servers + 16 opt-in. Built for GPT-6 Astra and GPT-6.1 Sol. Telemetry is off unless you opt in. MIT-licensed.`)
    .replace(/\n/g, ' ').replace(/"/g, '\\"');
}

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
      out.hooks[event] = translateHookHandlers(translateMatcherGroups(handlers, event, log), log, event);
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
      translateHookHandlers(translateMatcherGroups(handlers, mapping.codex, log), log, mapping.codex)
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

// (e) Claude Code substitutes `$N` / `$ARGUMENTS` in skill bodies with the
// invocation's arguments, so the Claude source writes literal shell and awk
// positionals as `\$1` (the documented escape; Claude Code strips the
// backslash). Codex does not run that substitution on skills, so the
// backslash would reach the shell: restore the plain `$N` for Codex.
const ESCAPED_ARG_PLACEHOLDER = /(?<!\\)\\\$(?=\d|ARGUMENTS)/g;

export function unescapeArgPlaceholders(text) {
  if (typeof text !== 'string') return text;
  return text.replace(ESCAPED_ARG_PLACEHOLDER, '$$');
}

export function translateSkill(skillMd) {
  if (typeof skillMd !== 'string') return skillMd;
  let out = skillMd;
  out = unescapeArgPlaceholders(out);
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
