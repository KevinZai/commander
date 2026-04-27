'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..', '..');
const CODEX_ADAPTER_DIR = path.join(ROOT, 'commander', 'adapters', 'codex');

function adapterUrl(file) {
  return pathToFileURL(path.join(CODEX_ADAPTER_DIR, file)).href;
}

function tempDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

test('telemetry.js writes well-formed JSONL', async () => {
  const telemetry = await import(adapterUrl('telemetry.js'));
  const dir = tempDir('ccc-codex-telemetry');
  const telemetryPath = path.join(dir, 'commander-telemetry.jsonl');

  await telemetry.recordSkillInvoked(
    'ccc-build',
    { source: 'test' },
    { telemetryPath, pluginVersion: '9.9.9-test' }
  );

  const lines = fs.readFileSync(telemetryPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);

  const event = JSON.parse(lines[0]);
  assert.match(event.ts, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(event.event, telemetry.TELEMETRY_EVENTS.SKILL_INVOKED);
  assert.equal(event.plugin_version, '9.9.9-test');
  assert.equal(event.skill, 'ccc-build');
  assert.equal(event.source, 'test');
});

test('hooks-detector.js handles missing config.toml gracefully', async () => {
  const detector = await import(adapterUrl('hooks-detector.js'));
  const homeDir = tempDir('ccc-codex-home');
  const capabilities = detector.detectCodexHookCapabilities({
    homeDir,
    codexVersion: '0.125.0',
    runCodexVersion: false,
  });

  assert.deepEqual(capabilities, {
    codexVersion: '0.125.0',
    supportedEvents: [
      'SessionStart',
      'SessionEnd',
      'UserPromptSubmit',
      'Stop',
      'StopFailure',
      'PreToolUse',
      'PostToolUse',
      'PermissionRequest',
    ],
    droppedFromClaude: ['Notification', 'PreCompact', 'SubagentStop'],
  });
});

test('hooks-detector.js fails loud when hook map references unsupported runtime events', async () => {
  const detector = await import(adapterUrl('hooks-detector.js'));
  assert.throws(
    () =>
      detector.validateHookMapAgainstCapabilities(
        {
          events: {
            SessionStart: { codex: 'ImaginaryEvent', status: 'remap' },
          },
        },
        { supportedEvents: ['SessionStart'], droppedFromClaude: [] }
      ),
    /unsupported by this runtime/
  );
});

test('translateAgent emits Codex model_reasoning_effort from effort frontmatter', async () => {
  const translate = await import(adapterUrl('translate.js'));
  const toml = translate.translateAgent(`---
name: architect
description: Designs systems.
model: claude-opus-4-7
effort: xhigh
tools:
  - Read
  - Bash
---

# Architect

Do deep design work.
`);

  assert.match(toml, /name = "architect"/);
  assert.match(toml, /model = "gpt-5\.5"/);
  assert.match(toml, /model_reasoning_effort = "xhigh"/);
  assert.match(toml, /sandbox_mode = "workspace-write"/);
});

test('translateHooks drops Claude-only events and preserves supported Codex events', async () => {
  const translate = await import(adapterUrl('translate.js'));
  const translated = translate.translateHooks(
    {
      hooks: {
        SessionStart: [
          {
            hooks: [
              {
                type: 'command',
                command: 'node ${CLAUDE_PLUGIN_ROOT}/hooks/start.js',
              },
            ],
          },
        ],
        Notification: [{ hooks: [{ type: 'command', command: 'node notify.js' }] }],
        PreCompact: [{ hooks: [{ type: 'command', command: 'node compact.js' }] }],
      },
    },
    {
      capabilities: {
        codexVersion: '0.125.0',
        supportedEvents: [
          'SessionStart',
          'SessionEnd',
          'UserPromptSubmit',
          'Stop',
          'StopFailure',
          'PreToolUse',
          'PostToolUse',
          'PermissionRequest',
        ],
        droppedFromClaude: ['Notification', 'PreCompact', 'SubagentStop'],
      },
    }
  );

  assert.deepEqual(Object.keys(translated.hooks), ['SessionStart']);
  assert.equal(
    translated.hooks.SessionStart[0].hooks[0].command,
    'node ${CODEX_PLUGIN_ROOT}/hooks/start.js'
  );
});

test('translate.js --agent --verbose emits TOML and decision log', () => {
  const dir = tempDir('ccc-codex-translate');
  const agentPath = path.join(dir, 'agent.md');
  fs.writeFileSync(
    agentPath,
    `---
name: reviewer
description: Reviews code.
model: claude-sonnet-4-7
effort: high
---

Review changed code.
`
  );

  const result = spawnSync(
    process.execPath,
    [path.join(CODEX_ADAPTER_DIR, 'translate.js'), '--agent', agentPath, '--verbose'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /model = "gpt-5\.4"/);
  assert.match(result.stdout, /model_reasoning_effort = "high"/);
  assert.match(result.stderr, /\[codex translate\] agent effort high -> high/);
});

test('translate.js --telemetry-init emits commander-telemetry-init TOML', () => {
  const result = spawnSync(
    process.execPath,
    [
      path.join(CODEX_ADAPTER_DIR, 'translate.js'),
      '--telemetry-init',
      '--telemetry-path',
      '${CODEX_PLUGIN_ROOT}/adapters/codex/telemetry.js',
    ],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# commander-telemetry-init\.toml/);
  assert.match(result.stdout, /\[\[hooks\.SessionStart\]\]/);
  assert.match(result.stdout, /telemetry\.js session SessionStart/);
});
