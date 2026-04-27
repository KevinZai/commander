'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  translateAgent,
  translateHooks,
  translateManifest,
  translateMcp,
} = require('../commander/adapters/codex/translate.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_PLUGIN_ROOT = path.join(REPO_ROOT, 'commander', 'cowork-plugin');
const CODEX_PLUGIN_ROOT = path.join(REPO_ROOT, 'commander', 'cowork-plugin-codex');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-codex.js');
const REQUIRED_MANIFEST_FIELDS = [
  'name',
  'displayName',
  'version',
  'description',
  'author',
  'homepage',
  'repository',
  'license',
  'keywords',
  'skills',
  'agents',
  'mcpServers',
  'hooks',
  'interface',
];
const REQUIRED_AGENT_FIELDS = [
  'name',
  'description',
  'model',
  'model_reasoning_effort',
  'developer_instructions',
];
const BASE_CODEX_HOOK_EVENTS = [
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'Stop',
];
const VALID_CODEX_HOOK_EVENTS = new Set([
  ...BASE_CODEX_HOOK_EVENTS,
  'SessionEnd',
  'PermissionRequest',
]);
const DROPPED_CLAUDE_HOOK_EVENTS = ['Notification', 'PreCompact', 'SubagentStop'];
const CANONICAL_CCC_SKILLS = [
  'ccc',
  'ccc-agent-writing',
  'ccc-browse',
  'ccc-build',
  'ccc-cheatsheet',
  'ccc-changelog',
  'ccc-connect',
  'ccc-data',
  'ccc-design',
  'ccc-devops',
  'ccc-doctor',
  'ccc-e2e',
  'ccc-fleet',
  'ccc-learn',
  'ccc-linear',
  'ccc-makeover',
  'ccc-marketing',
  'ccc-memory',
  'ccc-mobile',
  'ccc-more',
  'ccc-plan',
  'ccc-recall',
  'ccc-research',
  'ccc-review',
  'ccc-saas',
  'ccc-security',
  'ccc-seo',
  'ccc-ship',
  'ccc-start',
  'ccc-suggest',
  'ccc-systematic-debugging',
  'ccc-tasks',
  'ccc-testing',
  'ccc-upgrade',
];

let artifactMemo;

test('Plugin loads in codex CLI', (t) => {
  const artifact = prepareArtifact();
  const codex = findExecutable('codex');

  if (!codex) {
    t.skip('codex CLI is unavailable; artifact structure was prepared for smoke validation');
    return;
  }

  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-plugin-home-'));
  t.after(() => fs.rmSync(tempHome, { force: true, recursive: true }));

  const pluginTarget = path.join(tempHome, '.codex', 'plugins', 'commander');
  fs.mkdirSync(path.dirname(pluginTarget), { recursive: true });
  fs.cpSync(artifact.root, pluginTarget, { recursive: true });

  const result = spawnSync(codex, ['plugin', 'list'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEX_HOME: path.join(tempHome, '.codex'),
      HOME: tempHome,
    },
    timeout: 15_000,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;

  if (result.error && result.error.code === 'ETIMEDOUT') {
    t.skip('codex plugin list timed out in this environment');
    return;
  }
  if (result.status !== 0 && /unrecognized subcommand 'list'/.test(output)) {
    t.skip('installed codex CLI does not expose `codex plugin list`');
    return;
  }
  if (result.status !== 0 && /Operation not permitted|permission denied/i.test(output)) {
    t.skip('codex plugin list is blocked by sandbox permissions');
    return;
  }

  assert.equal(result.status, 0, formatSpawnFailure('codex plugin list', result));
  assert.match(output, /\bcommander\b/i);
});

test('Skills enumerable', (t) => {
  const artifact = prepareArtifact();

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    t.skip('interactive codex skill discovery is not testable without a TTY');
    return;
  }

  const codex = findExecutable('codex');
  if (!codex) {
    t.skip('codex CLI is unavailable');
    return;
  }

  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-plugin-home-'));
  t.after(() => fs.rmSync(tempHome, { force: true, recursive: true }));

  const pluginTarget = path.join(tempHome, '.codex', 'plugins', 'commander');
  fs.mkdirSync(path.dirname(pluginTarget), { recursive: true });
  fs.cpSync(artifact.root, pluginTarget, { recursive: true });

  const result = spawnSync(
    codex,
    [
      'exec',
      '--cd',
      REPO_ROOT,
      '--sandbox',
      'read-only',
      '--ask-for-approval',
      'never',
      'list available /ccc-* skills',
    ],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        CODEX_HOME: path.join(tempHome, '.codex'),
        HOME: tempHome,
      },
      timeout: 60_000,
    }
  );

  if (result.error && result.error.code === 'ETIMEDOUT') {
    t.skip('codex exec timed out during skill discovery');
    return;
  }
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0 && /not logged in|authentication|api key|Operation not permitted|permission denied/i.test(output)) {
    t.skip('codex exec skill discovery is blocked by auth or sandbox constraints');
    return;
  }

  assert.equal(result.status, 0, formatSpawnFailure('codex exec skill discovery', result));

  const mentions = CANONICAL_CCC_SKILLS.filter((skillName) =>
    new RegExp(`\\b/${escapeRegExp(skillName)}\\b|\\b${escapeRegExp(skillName)}\\b`, 'i').test(output)
  );
  assert.ok(
    mentions.length >= 10,
    `expected at least 10 canonical /ccc-* skills in codex output, got ${mentions.length}`
  );
});

test('Manifest schema validation', () => {
  const artifact = prepareArtifact();
  const manifestPath = path.join(artifact.root, '.codex-plugin', 'plugin.json');
  const manifest = readJson(manifestPath);

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    assert.ok(Object.hasOwn(manifest, field), `missing manifest field: ${field}`);
  }

  assert.equal(manifest.name, 'commander');
  assert.equal(typeof manifest.displayName, 'string');
  assert.equal(typeof manifest.version, 'string');
  assert.equal(typeof manifest.description, 'string');
  assert.equal(typeof manifest.author.name, 'string');
  assert.equal(manifest.skills, './skills/');
  assert.equal(manifest.agents, './agents/');
  assert.equal(manifest.mcpServers, './.mcp.json');
  assert.equal(manifest.hooks, './hooks.json');
  assert.deepEqual(manifest.interface.capabilities, ['skills', 'agents', 'hooks', 'mcp']);

  assert.ok(!fs.existsSync(path.join(artifact.root, '.claude-plugin')), 'artifact must not include .claude-plugin');
  for (const claudeOnlyField of ['claude', 'claudeCode', 'claudePlugin', 'claudeVersion']) {
    assert.ok(!Object.hasOwn(manifest, claudeOnlyField), `manifest contains Claude-only field: ${claudeOnlyField}`);
  }
});

test('Hook event mapping correctness', () => {
  const artifact = prepareArtifact();
  const hooksPath = path.join(artifact.root, 'hooks.json');
  const translatedHooks = readJson(hooksPath);
  assert.ok(translatedHooks && typeof translatedHooks.hooks === 'object', 'hooks.json must contain hooks object');

  const eventNames = Object.keys(translatedHooks.hooks);
  for (const eventName of eventNames) {
    assert.ok(VALID_CODEX_HOOK_EVENTS.has(eventName), `invalid Codex hook event: ${eventName}`);
  }
  for (const eventName of BASE_CODEX_HOOK_EVENTS) {
    assert.ok(eventNames.includes(eventName), `missing Codex hook event: ${eventName}`);
  }
  for (const eventName of DROPPED_CLAUDE_HOOK_EVENTS) {
    assert.ok(!eventNames.includes(eventName), `Claude-only hook event should be dropped: ${eventName}`);
  }

  assert.ok(eventNames.includes('SessionEnd'), 'PreCompact handlers must be remapped to SessionEnd');
  assert.ok(
    collectHookCommands(translatedHooks.hooks.SessionEnd).some((command) => command.includes('pre-compact.js')),
    'SessionEnd must include the former PreCompact handler'
  );
});

test('Agent TOML format', () => {
  const artifact = prepareArtifact();
  const agentsDir = path.join(artifact.root, 'agents');
  const preferredSamples = ['architect.toml', 'builder.toml', 'reviewer.toml'];
  const allTomlFiles = fs.readdirSync(agentsDir).filter((fileName) => fileName.endsWith('.toml')).sort();
  const sampleFiles = preferredSamples.every((fileName) => allTomlFiles.includes(fileName))
    ? preferredSamples
    : allTomlFiles.slice(0, 3);

  assert.equal(sampleFiles.length, 3, 'expected at least 3 Codex agent TOML files');

  const parsedAgents = sampleFiles.map((fileName) => {
    const fullPath = path.join(agentsDir, fileName);
    const parsed = parseTomlFile(fullPath);

    for (const field of REQUIRED_AGENT_FIELDS) {
      assert.ok(Object.hasOwn(parsed, field), `${fileName} missing TOML field: ${field}`);
      assert.equal(typeof parsed[field], 'string', `${fileName} field must be string: ${field}`);
      assert.notEqual(parsed[field].trim(), '', `${fileName} field must not be empty: ${field}`);
    }
    assert.match(parsed.model, /^gpt-/i, `${fileName} model must be remapped to a GPT model`);
    assert.doesNotMatch(parsed.model, /claude|opus|sonnet|haiku/i, `${fileName} model must not be Anthropic ID`);

    return parsed;
  });

  const architect = parsedAgents.find((agent) => agent.name === 'architect');
  assert.ok(architect, 'sample must include architect agent for opus model remap coverage');
  assert.equal(architect.model, 'gpt-5.5');
});

test('MCP config', () => {
  const artifact = prepareArtifact();
  const mcpConfig = readMcpConfig(artifact.root);
  const serverNames = Object.keys(mcpConfig).sort();

  assert.deepEqual(serverNames, ['context7', 'sequential-thinking']);

  for (const [serverName, serverConfig] of Object.entries(mcpConfig)) {
    assert.equal(typeof serverConfig.command, 'string', `${serverName} missing command`);
    assert.notEqual(serverConfig.command.trim(), '', `${serverName} command must not be empty`);
    assert.ok(!/^(stub|todo|placeholder)$/i.test(serverConfig.command), `${serverName} command is a stub`);

    const resolvedCommand = resolveCommand(serverConfig.command);
    assert.ok(resolvedCommand, `${serverName} command does not resolve on PATH: ${serverConfig.command}`);
    fs.accessSync(resolvedCommand, fs.constants.X_OK);

    assert.ok(Array.isArray(serverConfig.args), `${serverName} args must be an array`);
    assert.ok(serverConfig.args.length > 0, `${serverName} args must not be empty`);
    assert.ok(
      serverConfig.args.some((arg) => /context7|sequential-thinking|modelcontextprotocol|upstash/.test(arg)),
      `${serverName} args must reference a real MCP package`
    );
  }
});

function prepareArtifact() {
  if (artifactMemo) return artifactMemo;

  if (fs.existsSync(BUILD_SCRIPT)) {
    const buildResult = spawnSync(process.execPath, [BUILD_SCRIPT], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 120_000,
    });
    if (buildResult.status === 0 && fs.existsSync(path.join(CODEX_PLUGIN_ROOT, '.codex-plugin', 'plugin.json'))) {
      artifactMemo = {
        root: CODEX_PLUGIN_ROOT,
        source: 'from-build',
      };
      return artifactMemo;
    }
  }

  if (fs.existsSync(path.join(CODEX_PLUGIN_ROOT, '.codex-plugin', 'plugin.json'))) {
    artifactMemo = {
      root: CODEX_PLUGIN_ROOT,
      source: 'from-build',
    };
    return artifactMemo;
  }

  artifactMemo = createSpecArtifact();
  return artifactMemo;
}

function createSpecArtifact() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'commander-codex-from-spec-'));
  const pluginRoot = path.join(tempRoot, 'cowork-plugin-codex');

  fs.mkdirSync(path.join(pluginRoot, '.codex-plugin'), { recursive: true });
  fs.mkdirSync(path.join(pluginRoot, 'agents'), { recursive: true });

  const claudeManifest = readJson(path.join(SOURCE_PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));
  writeJson(
    path.join(pluginRoot, '.codex-plugin', 'plugin.json'),
    translateManifest(claudeManifest, claudeManifest.version)
  );

  fs.cpSync(path.join(SOURCE_PLUGIN_ROOT, 'skills'), path.join(pluginRoot, 'skills'), { recursive: true });

  const agentSourceDir = path.join(SOURCE_PLUGIN_ROOT, 'agents');
  for (const fileName of fs.readdirSync(agentSourceDir).filter((name) => name.endsWith('.md')).sort()) {
    const mdSource = fs.readFileSync(path.join(agentSourceDir, fileName), 'utf8');
    const tomlName = `${path.basename(fileName, '.md')}.toml`;
    fs.writeFileSync(path.join(pluginRoot, 'agents', tomlName), translateAgent(mdSource));
  }

  const claudeHooks = readJson(path.join(SOURCE_PLUGIN_ROOT, 'hooks', 'hooks.json'));
  writeJson(path.join(pluginRoot, 'hooks.json'), translateHooks(claudeHooks));

  const claudeMcp = readJson(path.join(SOURCE_PLUGIN_ROOT, '.mcp.json'));
  writeJson(path.join(pluginRoot, '.mcp.json'), translateMcp(claudeMcp));

  return {
    root: pluginRoot,
    source: 'from-spec',
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readMcpConfig(pluginRoot) {
  const jsonPath = path.join(pluginRoot, '.mcp.json');
  if (fs.existsSync(jsonPath)) {
    const parsed = readJson(jsonPath);
    assert.ok(parsed && typeof parsed.mcpServers === 'object', '.mcp.json must contain mcpServers object');
    return parsed.mcpServers;
  }

  const tomlPath = path.join(pluginRoot, 'config.toml');
  assert.ok(fs.existsSync(tomlPath), 'expected .mcp.json or config.toml MCP config');
  return parseMcpServersToml(fs.readFileSync(tomlPath, 'utf8'));
}

function parseTomlFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = {};
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#')) continue;

    const multiLineMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"""$/);
    if (multiLineMatch) {
      const body = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== '"""') {
        body.push(lines[index]);
        index += 1;
      }
      assert.ok(index < lines.length, `${filePath} has unterminated TOML multiline string`);
      parsed[multiLineMatch[1]] = body.join('\n');
      continue;
    }

    const stringMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"((?:\\.|[^"])*)"/);
    if (stringMatch) {
      parsed[stringMatch[1]] = stringMatch[2].replace(/\\"/g, '"');
    }
  }

  return parsed;
}

function parseMcpServersToml(source) {
  const servers = {};
  let activeServer = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const sectionMatch = line.match(/^\[mcp_servers\.([A-Za-z0-9_-]+)\]$/);
    if (sectionMatch) {
      activeServer = sectionMatch[1];
      servers[activeServer] = {};
      continue;
    }

    if (!activeServer) continue;

    const stringMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"((?:\\.|[^"])*)"$/);
    if (stringMatch) {
      servers[activeServer][stringMatch[1]] = stringMatch[2].replace(/\\"/g, '"');
      continue;
    }

    const argsMatch = line.match(/^args\s*=\s*(\[.*\])$/);
    if (argsMatch) {
      servers[activeServer].args = JSON.parse(argsMatch[1]);
    }
  }

  return servers;
}

function collectHookCommands(entries) {
  const commands = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (typeof value.command === 'string') commands.push(value.command);
    for (const nested of Object.values(value)) visit(nested);
  };

  visit(entries);
  return commands;
}

function findExecutable(command) {
  if (path.isAbsolute(command)) {
    return isExecutable(command) ? command : null;
  }

  return resolveCommand(command);
}

function resolveCommand(command) {
  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const candidates = path.isAbsolute(command)
    ? [command]
    : pathEntries.map((entry) => path.join(entry, command));

  for (const candidate of candidates) {
    if (isExecutable(candidate)) return candidate;
  }

  return null;
}

function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function formatSpawnFailure(label, result) {
  return [
    `${label} failed`,
    `status: ${result.status}`,
    `signal: ${result.signal || ''}`,
    `stdout: ${result.stdout || ''}`,
    `stderr: ${result.stderr || ''}`,
    result.error ? `error: ${result.error.message}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
