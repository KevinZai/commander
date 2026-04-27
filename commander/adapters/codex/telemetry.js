#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const TELEMETRY_EVENTS = Object.freeze({
  SKILL_INVOKED: 'skill.invoked',
  AGENT_DISPATCHED: 'agent.dispatched',
  HOOK_FIRED: 'hook.fired',
  MCP_TOOL_CALLED: 'mcp_tool.called',
  SESSION_LIFECYCLE: 'session.lifecycle',
});

const RESERVED_KEYS = new Set(['ts', 'event', 'plugin_version']);

export function defaultTelemetryPath(homeDir = os.homedir()) {
  return path.join(homeDir, '.codex', 'commander-telemetry.jsonl');
}

export function normalizePayload(payload = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (!RESERVED_KEYS.has(key) && value !== undefined) {
      normalized[key] = value;
    }
  }
  return normalized;
}

export function createTelemetryEvent(kind, payload = {}, options = {}) {
  if (!kind || typeof kind !== 'string') {
    throw new TypeError('Telemetry event kind must be a non-empty string');
  }

  return {
    ts: new Date().toISOString(),
    event: kind,
    plugin_version:
      options.pluginVersion ||
      process.env.COMMANDER_PLUGIN_VERSION ||
      process.env.npm_package_version ||
      'unknown',
    ...normalizePayload(payload),
  };
}

export async function emitTelemetry(kind, payload = {}, options = {}) {
  if (process.env.CODEX_COMMANDER_TELEMETRY_DISABLED === '1') {
    return null;
  }

  const telemetryPath =
    options.telemetryPath ||
    process.env.CODEX_COMMANDER_TELEMETRY_PATH ||
    defaultTelemetryPath(options.homeDir);
  const event = createTelemetryEvent(kind, payload, options);

  await fs.mkdir(path.dirname(telemetryPath), { recursive: true, mode: 0o700 });
  await fs.appendFile(telemetryPath, `${JSON.stringify(event)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  return event;
}

export function recordSkillInvoked(skill, payload = {}, options = {}) {
  return emitTelemetry(
    TELEMETRY_EVENTS.SKILL_INVOKED,
    { skill, ...payload },
    options
  );
}

export function recordAgentDispatched(agent, payload = {}, options = {}) {
  return emitTelemetry(
    TELEMETRY_EVENTS.AGENT_DISPATCHED,
    { agent, ...payload },
    options
  );
}

export function recordHookFired(hookEvent, payload = {}, options = {}) {
  return emitTelemetry(
    TELEMETRY_EVENTS.HOOK_FIRED,
    { hook_event: hookEvent, ...payload },
    options
  );
}

export function recordMcpToolCalled(tool, payload = {}, options = {}) {
  return emitTelemetry(
    TELEMETRY_EVENTS.MCP_TOOL_CALLED,
    { tool, ...payload },
    options
  );
}

export function recordSessionLifecycle(phase, payload = {}, options = {}) {
  return emitTelemetry(
    TELEMETRY_EVENTS.SESSION_LIFECYCLE,
    { phase, ...payload },
    options
  );
}

async function readStdinJson() {
  if (process.stdin.isTTY) return {};

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    return { stdin_parse_error: error.message, stdin_raw: raw.slice(0, 4096) };
  }
}

function payloadFromHookInput(input) {
  const hookEvent =
    input.hook_event_name ||
    input.hookEventName ||
    input.hook_event ||
    input.event_name ||
    input.event;
  const sessionId = input.session_id || input.sessionId;
  const cwd = input.cwd || input.workspace || input.project_dir;

  return {
    hook_event: hookEvent,
    session_id: sessionId,
    cwd,
  };
}

function cliUsage() {
  return [
    'Usage: telemetry.js <kind> [name]',
    '',
    'Kinds:',
    '  skill <name>       Record a skill invocation',
    '  agent <name>       Record an agent dispatch',
    '  hook <event>       Record a Codex hook firing',
    '  mcp <tool>         Record an MCP tool call',
    '  session <phase>    Record a session lifecycle event',
    '',
    'Environment:',
    '  CODEX_COMMANDER_TELEMETRY_PATH       Override JSONL output path',
    '  CODEX_COMMANDER_TELEMETRY_DISABLED=1 Disable writes',
    '  COMMANDER_PLUGIN_VERSION             Set plugin_version',
  ].join('\n');
}

export async function runTelemetryCli(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${cliUsage()}\n`);
    return 0;
  }

  const input = await readStdinJson();
  const [kind, name] = argv;
  const hookPayload = payloadFromHookInput(input);
  const sharedPayload = Object.keys(input).length ? { codex_input: input } : {};

  if (kind === 'skill') {
    await recordSkillInvoked(name || input.skill || input.skill_name, sharedPayload);
  } else if (kind === 'agent') {
    await recordAgentDispatched(name || input.agent || input.agent_name, sharedPayload);
  } else if (kind === 'hook') {
    await recordHookFired(name || hookPayload.hook_event || 'unknown', {
      ...hookPayload,
      ...sharedPayload,
    });
  } else if (kind === 'mcp') {
    await recordMcpToolCalled(name || input.tool || input.tool_name, sharedPayload);
  } else if (kind === 'session') {
    await recordSessionLifecycle(name || hookPayload.hook_event || 'unknown', {
      ...hookPayload,
      ...sharedPayload,
    });
  } else if (!kind) {
    await recordHookFired(hookPayload.hook_event || 'unknown', {
      ...hookPayload,
      ...sharedPayload,
    });
  } else {
    throw new Error(`Unknown telemetry kind: ${kind}`);
  }

  return 0;
}

const isCli =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  runTelemetryCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(`commander telemetry failed: ${error.message}\n`);
      process.exitCode = 1;
    });
}
