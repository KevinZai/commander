#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const CODEX_HOOK_EVENTS_0125 = Object.freeze([
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'Stop',
  'StopFailure',
  'PreToolUse',
  'PostToolUse',
  'PermissionRequest',
]);

export const CODEX_HOOK_EVENTS_LEGACY = Object.freeze([
  'SessionStart',
  'UserPromptSubmit',
  'Stop',
  'PreToolUse',
  'PostToolUse',
]);

export const CLAUDE_EVENTS_DROPPED_BY_CODEX = Object.freeze([
  'Notification',
  'PreCompact',
  'SubagentStop',
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

export function supportedEventsForVersion(codexVersion) {
  if (!codexVersion) return [...CODEX_HOOK_EVENTS_0125];
  if (compareVersions(codexVersion, '0.125.0') >= 0) {
    return [...CODEX_HOOK_EVENTS_0125];
  }
  return [...CODEX_HOOK_EVENTS_LEGACY];
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
