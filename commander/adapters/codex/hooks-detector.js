#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// Verified 2026-10-13 against docs/reference/platform-facts-2026-10.md §3.3
// (Codex CLI 0.162.1). Codex supports exactly these 12 hook events. The
// 2026-07-22 list had 10; Codex has since added SessionEnd and Interrupt.
// Interrupt has no Claude Code equivalent (see CODEX_ONLY_HOOK_EVENTS and the
// codex_only section of hook-event-map.json).
//
// Handler fields Codex understands: type (command | mcp_tool), command,
// commandWindows, timeout, async (parsed but SKIPPED, so async handlers must
// translate to synchronous), matcher, statusMessage, additionalContextLimit,
// server/tool/input. Codex has no args, onFailure, if or once.
export const CODEX_HOOK_EVENTS_VERIFIED_20261013 = Object.freeze([
  'SessionStart',
  'SubagentStart',
  'PreToolUse',
  'PermissionRequest',
  'PostToolUse',
  'PreCompact',
  'PostCompact',
  'UserPromptSubmit',
  'SubagentStop',
  'Stop',
  'SessionEnd',
  'Interrupt',
]);

// Back-compat aliases -- existing callers import these names. Both now point
// at the current verified set.
export const CODEX_HOOK_EVENTS_VERIFIED_20260722 = CODEX_HOOK_EVENTS_VERIFIED_20261013;
export const CODEX_HOOK_EVENTS_0125 = CODEX_HOOK_EVENTS_VERIFIED_20261013;

// Codex events with no Claude Code counterpart; nothing in a Claude
// hooks.json translates to them.
export const CODEX_ONLY_HOOK_EVENTS = Object.freeze(['Interrupt']);

// Handler fields Codex does not support. Commander's hooks.json never uses
// them, so it mirrors to Codex unchanged.
export const CODEX_UNSUPPORTED_HANDLER_FIELDS = Object.freeze(['args', 'onFailure', 'if', 'once']);

// Handler fields that pass through translation unchanged.
export const CODEX_PASSTHROUGH_HANDLER_FIELDS = Object.freeze([
  'type',
  'command',
  'commandWindows',
  'timeout',
  'matcher',
  'statusMessage',
  'additionalContextLimit',
]);

// Codex caps SessionEnd and Interrupt handler timeouts (default 1 s, max 3 s).
export const CODEX_SHORT_TIMEOUT_EVENTS = Object.freeze({ SessionEnd: 3, Interrupt: 3 });

// Claude Code hook events with no Codex equivalent. Distinct from events that
// map 1:1 -- see hook-event-map.json for the full per-event mapping table.
export const CLAUDE_EVENTS_DROPPED_BY_CODEX = Object.freeze([
  'Notification',
  'PostToolUseFailure',
  'PostToolBatch',
  'StopFailure',
  'Elicitation',
  'ElicitationResult',
  'TaskCreated',
  'TaskCompleted',
  'ConfigChange',
  'UserPromptExpansion',
  'InstructionsLoaded',
  'Setup',
  'PermissionDenied',
  'MessageDisplay',
  'TeammateIdle',
  'CwdChanged',
  'DirectoryAdded',
  'FileChanged',
  'WorktreeCreate',
  'WorktreeRemove',
  'PreModelSwitch',
  'PostModelSwitch',
]);

export function codexConfigPath(homeDir = os.homedir()) {
  return path.join(homeDir, '.codex', 'config.toml');
}

export function readCodexConfig(options = {}) {
  const configPath = options.configPath || codexConfigPath(options.homeDir);
  if (!fs.existsSync(configPath)) return null;
  return fs.readFileSync(configPath, 'utf8');
}

export function parseCodexVersion(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(/(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
  return match ? match[1] : null;
}

export function parseCodexVersionFromConfig(configText) {
  if (!configText) return null;

  const match = configText.match(
    /(?:^|\n)\s*(?:codex_version|cli_version|version)\s*=\s*["']([^"']+)["']/i
  );
  return match ? parseCodexVersion(match[1]) : null;
}

export function detectCodexVersion(options = {}) {
  if (options.codexVersion !== undefined) return options.codexVersion;
  if (options.runCodexVersion === false) return null;

  const codexBin = options.codexBin || process.env.CODEX_BIN || 'codex';
  try {
    const raw = execFileSync(codexBin, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: options.timeoutMs || 2000,
    });
    return parseCodexVersion(raw);
  } catch {
    return null;
  }
}

export function compareVersions(left, right) {
  const a = parseCodexVersion(left);
  const b = parseCodexVersion(right);
  if (!a || !b) return 0;

  const aParts = a.split(/[.+-]/)[0].split('.').map(Number);
  const bParts = b.split(/[.+-]/)[0].split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const diff = (aParts[index] || 0) - (bParts[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function supportedEventsForVersion(_codexVersion) {
  // No version threshold is documented for hook-event support (re-checked
  // 2026-10-13 against platform facts §3.3) -- the
  // prior version-gated split (a lesser "legacy" set below some Codex
  // version) was an unverified guess. Return the verified set
  // unconditionally; the codexVersion parameter is kept for API
  // compatibility and future use if a real threshold is ever documented.
  return [...CODEX_HOOK_EVENTS_VERIFIED_20261013];
}

export function detectCodexHookCapabilities(options = {}) {
  const configText =
    options.configText !== undefined ? options.configText : readCodexConfig(options);
  const codexVersion =
    detectCodexVersion(options) || parseCodexVersionFromConfig(configText);

  return {
    codexVersion,
    supportedEvents: supportedEventsForVersion(codexVersion),
    droppedFromClaude: [...CLAUDE_EVENTS_DROPPED_BY_CODEX],
    codexOnlyEvents: [...CODEX_ONLY_HOOK_EVENTS],
  };
}

export function validateHookMapAgainstCapabilities(hookMap, capabilities) {
  const supported = new Set(capabilities.supportedEvents || []);
  const unsupportedReferences = [];

  for (const [claudeEvent, mapping] of Object.entries(hookMap.events || {})) {
    if (!mapping || mapping.codex === null || mapping.status === 'drop') continue;
    if (!supported.has(mapping.codex)) {
      unsupportedReferences.push(`${claudeEvent}->${mapping.codex}`);
    }
  }

  if (unsupportedReferences.length > 0) {
    throw new Error(
      `hook-event-map.json references Codex hook events unsupported by this runtime: ${unsupportedReferences.join(', ')}`
    );
  }
}

function cliUsage() {
  return [
    'Usage: hooks-detector.js [--json]',
    '',
    'Prints Codex hook support detected from ~/.codex/config.toml and codex --version.',
  ].join('\n');
}

export function runHooksDetectorCli(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${cliUsage()}\n`);
    return 0;
  }

  const capabilities = detectCodexHookCapabilities();
  process.stdout.write(`${JSON.stringify(capabilities, null, 2)}\n`);
  return 0;
}

const isCli =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  try {
    process.exitCode = runHooksDetectorCli();
  } catch (error) {
    process.stderr.write(`codex hook detection failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
