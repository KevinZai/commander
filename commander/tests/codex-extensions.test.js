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

// Codex hook surface (platform facts §3.3).
const CODEX_HOOK_EVENTS = [
  'PreToolUse', 'PermissionRequest', 'PostToolUse', 'PreCompact', 'PostCompact',
  'UserPromptSubmit', 'SubagentStop', 'Stop', 'SessionStart', 'SubagentStart',
  'SessionEnd', 'Interrupt',
];

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

  // Codex hook surface: 12 events (platform facts §3.3).
  assert.equal(capabilities.codexVersion, '0.125.0');
  assert.deepEqual([...capabilities.supportedEvents].sort(), [
    'Interrupt',
    'PermissionRequest',
    'PostCompact',
    'PostToolUse',
    'PreCompact',
    'PreToolUse',
    'SessionEnd',
    'SessionStart',
    'Stop',
    'SubagentStart',
    'SubagentStop',
    'UserPromptSubmit',
  ]);

  // The dropped set is whatever hook-event-map.json marks as having no Codex
  // target; the detector and the map must agree.
  const hookMap = JSON.parse(fs.readFileSync(path.join(CODEX_ADAPTER_DIR, 'hook-event-map.json'), 'utf8'));
  const derivedDrops = Object.entries(hookMap.events)
    .filter(([, mapping]) => mapping.status === 'drop' || mapping.codex == null)
    .map(([event]) => event)
    .sort();
  assert.deepEqual([...capabilities.droppedFromClaude].sort(), derivedDrops);
  assert.ok(!capabilities.droppedFromClaude.includes('SessionEnd'), 'SessionEnd is a Codex event now');
  for (const event of ['Notification', 'PostToolUseFailure', 'StopFailure']) {
    assert.ok(capabilities.droppedFromClaude.includes(event), `${event} has no Codex counterpart`);
  }
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
model: claude-opus-4-8
effort: xhigh
tools:
  - Read
  - Bash
---

# Architect

Do deep design work.
`);

  assert.match(toml, /name = "architect"/);
  // opus -> default Codex tier (models.js CODEX_ROUTING.default)
  assert.match(toml, /model = "gpt-6\.1-sol"/);
  assert.match(toml, /model_reasoning_effort = "xhigh"/);
  // Read + Bash only: no write tool, so the Codex agent runs read-only.
  assert.match(toml, /sandbox_mode = "read-only"/);
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
        PreCompact: [{ hooks: [{ type: 'command', command: 'node compact.js' }] }],
        Notification: [{ hooks: [{ type: 'command', command: 'node notify.js' }] }],
      },
    },
    {
      // PreCompact is a Codex event; Notification is not.
      capabilities: {
        codexVersion: '0.125.0',
        supportedEvents: CODEX_HOOK_EVENTS,
        droppedFromClaude: ['Notification'],
      },
    }
  );

  assert.deepEqual(Object.keys(translated.hooks).sort(), ['PreCompact', 'SessionStart']);
  // ${CLAUDE_PLUGIN_ROOT} is kept verbatim -- Codex documents it as a
  // compatibility alias for its native PLUGIN_ROOT (verified 2026-07-22).
  assert.equal(
    translated.hooks.SessionStart[0].hooks[0].command,
    'node ${CLAUDE_PLUGIN_ROOT}/hooks/start.js'
  );
});

test('translateHooks strips async:true and clamps the timeout so the handler still runs', async () => {
  const translate = await import(adapterUrl('translate.js'));
  const translated = translate.translateHooks(
    {
      hooks: {
        PostToolUse: [
          {
            hooks: [
              {
                type: 'command',
                command: 'node ${CLAUDE_PLUGIN_ROOT}/hooks/mission-control-feed.js',
                async: true,
                timeout: 3000,
              },
              {
                type: 'command',
                command: 'node ${CLAUDE_PLUGIN_ROOT}/hooks/pr-link-notify.js',
                async: true,
                timeout: 30000,
              },
            ],
          },
        ],
      },
    },
    {
      capabilities: {
        codexVersion: '0.125.0',
        supportedEvents: CODEX_HOOK_EVENTS,
        droppedFromClaude: [],
      },
    }
  );

  const [normalTimeout, longTimeout] = translated.hooks.PostToolUse[0].hooks;
  assert.equal(normalTimeout.async, undefined, 'async flag must be stripped');
  // Codex timeouts are seconds; ms-scale source values are converted.
  assert.equal(normalTimeout.timeout, 3, 'a millisecond-scale 3000 becomes 3 seconds');
  assert.equal(longTimeout.async, undefined, 'async flag must be stripped');
  assert.equal(longTimeout.timeout, 8, 'a long async timeout is clamped once synchronous');
});

test('translateHooks caps SessionEnd handlers at the Codex 3-second maximum', async () => {
  const translate = await import(adapterUrl('translate.js'));
  const translated = translate.translateHooks(
    {
      hooks: {
        SessionEnd: [{ hooks: [{ type: 'command', command: 'node end.js', timeout: 10 }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'node stop.js', timeout: 10 }] }],
      },
    },
    {
      capabilities: {
        codexVersion: '0.162.1',
        supportedEvents: CODEX_HOOK_EVENTS,
        droppedFromClaude: [],
      },
    }
  );
  assert.equal(translated.hooks.SessionEnd[0].hooks[0].timeout, 3);
  assert.equal(translated.hooks.Stop[0].hooks[0].timeout, 10, 'other events keep their seconds');
});

test('translateSkill: (a) maps bare /ccc-<name> invocations inside backticks to $ccc-<name>', async () => {
  const translate = await import(adapterUrl('translate.js'));

  const fixture =
    'Run `/ccc-build` to scaffold, or `/ccc-build web-app` for a specific ' +
    'template. Wildcards like `/ccc-*` and `/ccc-<workflow>` are also used ' +
    'as placeholders.';
  const out = translate.translateSkill(fixture);

  assert.match(out, /`\$ccc-build`/);
  assert.match(out, /`\$ccc-build web-app`/);
  assert.match(out, /`\$ccc-\*`/);
  assert.match(out, /`\$ccc-<workflow>`/);
  assert.ok(!out.includes('/ccc-build'), 'slash form must not survive translation');
});

test('translateSkill: (a) never touches /ccc- in URLs or file paths; bare prose invocations DO rewrite', async () => {
  const translate = await import(adapterUrl('translate.js'));

  // URLs and paths: the char before /ccc- is non-space/non-backtick — protected.
  const protectedFixture =
    'See https://commanderplugin.com/ccc-build for docs, or the file at ' +
    '`skills/ccc-build/SKILL.md`.';
  assert.equal(translate.translateSkill(protectedFixture).trim(), protectedFixture.trim());

  // Bare prose/heading invocations are whitespace-preceded — on Codex the
  // correct invocation form is $ccc-*, so these rewrite (v7.3.0 gate fix:
  // invocation-position scoping replaced fragile backtick-span pairing).
  assert.equal(translate.translateSkill('Run /ccc-build to start.'), 'Run $ccc-build to start.');

  // Composite recipe inside one span (the adversarial-gate miss) + a
  // triple-backtick fence above must not de-scope later spans (parity bug).
  assert.equal(
    translate.translateSkill('try `/loop 5m /ccc-doctor` then'),
    'try `/loop 5m $ccc-doctor` then'
  );
  assert.equal(
    translate.translateSkill('```bash\nfoo\n```\n- `/ccc-build` → picker'),
    '```bash\nfoo\n```\n- `$ccc-build` → picker'
  );
});

test('translateSkill: (b) rewrites only the plugin\'s own ${CLAUDE_PLUGIN_ROOT}-prefixed manifest path', async () => {
  const translate = await import(adapterUrl('translate.js'));

  const ownManifest = 'Read version from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.';
  assert.match(
    translate.translateSkill(ownManifest),
    /\$\{CLAUDE_PLUGIN_ROOT\}\/\.codex-plugin\/plugin\.json/
  );

  const unrelated = 'Count installs: `ls ~/.claude/plugins/cache/*/*/1*/.claude-plugin/plugin.json | wc -l`.';
  assert.equal(translate.translateSkill(unrelated), unrelated);
});

test('translateSkill: (c) appends the AskUserQuestion fallback note exactly once, only when referenced', async () => {
  const translate = await import(adapterUrl('translate.js'));

  const withAuq = '---\nallowed-tools:\n  - AskUserQuestion\n---\n\nAsk the user via AskUserQuestion.\n';
  const out = translate.translateSkill(withAuq);
  const occurrences = out.split('AskUserQuestion is Claude-only').length - 1;
  assert.equal(occurrences, 1, 'note must be appended exactly once regardless of mention count');

  const without = '---\nallowed-tools:\n  - Read\n---\n\nJust reads a file.\n';
  assert.ok(!translate.translateSkill(without).includes('Claude-only'));
});

test('translateSkill: (d) appends the Workflow(...) fallback note exactly once, only when referenced', async () => {
  const translate = await import(adapterUrl('translate.js'));

  const withWorkflow =
    '# Fan out\n\n```js\nWorkflow({\n  scriptPath: "x",\n  args: { mode: "fanout" },\n})\n```\n';
  const out = translate.translateSkill(withWorkflow);
  const occurrences = out.split('not available on Codex').length - 1;
  assert.equal(occurrences, 1, 'note must be appended exactly once regardless of call-site count');

  const without = '# No workflow here\n\nJust a plain skill.\n';
  assert.ok(!translate.translateSkill(without).includes('not available on Codex'));
});

test('translateSkill: applies all four transforms together and is a no-op on plain skills', async () => {
  const translate = await import(adapterUrl('translate.js'));

  const combined =
    '---\nallowed-tools:\n  - AskUserQuestion\n---\n\n' +
    'Invoke with `/ccc-fleet`. Read `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`. ' +
    'Fan out via:\n\n```js\nWorkflow({ scriptPath: "x" })\n```\n';
  const out = translate.translateSkill(combined);

  assert.match(out, /`\$ccc-fleet`/);
  assert.match(out, /\$\{CLAUDE_PLUGIN_ROOT\}\/\.codex-plugin\/plugin\.json/);
  assert.match(out, /AskUserQuestion is Claude-only/);
  assert.match(out, /not available on Codex/);

  const plain = '# Just prose\n\nNothing special here.\n';
  assert.equal(translate.translateSkill(plain), plain);
});

test('translate.js --agent --verbose emits TOML and decision log', () => {
  const dir = tempDir('ccc-codex-translate');
  const agentPath = path.join(dir, 'agent.md');
  fs.writeFileSync(
    agentPath,
    `---
name: reviewer
description: Reviews code.
model: claude-sonnet-5-5
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
  // sonnet -> bounded Codex tier (models.js CODEX_ROUTING.bounded)
  assert.match(result.stdout, /model = "gpt-6-sol"/);
  assert.match(result.stdout, /model_reasoning_effort = "high"/);
  assert.match(result.stderr, /\[codex translate\] agent reviewer: model gpt-6-sol, sandbox workspace-write/);
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
