#!/usr/bin/env node

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'commander', 'cowork-plugin');
const ADAPTER_DIR = path.join(ROOT_DIR, 'commander', 'adapters', 'codex');

// Allow callers to override the output directory via env var or --out CLI arg.
// Default: commander/cowork-plugin-codex/ (existing behaviour, backwards-compatible).
function resolveOutputDir() {
  const outArgIndex = process.argv.indexOf('--out');
  if (outArgIndex !== -1 && process.argv[outArgIndex + 1]) {
    return path.resolve(process.argv[outArgIndex + 1]);
  }
  if (process.env.BUILD_CODEX_OUT_DIR) {
    return path.resolve(process.env.BUILD_CODEX_OUT_DIR);
  }
  return path.join(ROOT_DIR, 'commander', 'cowork-plugin-codex');
}

const OUTPUT_DIR = resolveOutputDir();

// Events not in Codex's 10-event hook surface (SessionStart, SubagentStart,
// PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact,
// UserPromptSubmit, SubagentStop, Stop). Verified 2026-07-22 against primary
// docs (learn.chatgpt.com/docs/hooks) -- see hook-event-map.json for the
// full per-event table. PreCompact/PostCompact/SubagentStart/SubagentStop
// used to be listed here as unsupported; they are not -- dropping them was
// silently killing Mission Control's subagent-start-tracker.js and
// agent-run-logger.js writers on Codex.
const HOOK_EVENTS_DROPPED_BY_BUILD = new Set([
  'SessionEnd',
  'Notification',
  'StopFailure',
  'PostToolUseFailure',
  'PostToolBatch',
  'Elicitation',
  'ElicitationResult',
  'TaskCreated',
  'TaskCompleted',
  'ConfigChange',
  'UserPromptExpansion',
  'InstructionsLoaded',
  'Setup',
]);

const SUPPORT_DIRS = ['hooks', 'lib', 'menus', 'rules'];

const translatorModule = await import(
  pathToFileURL(path.join(ADAPTER_DIR, 'translate.js')).href
);
const translator = translatorModule.default ?? translatorModule;

const {
  translateManifest,
  translateAgent,
  translateHooks,
  translateSkill,
  translateMcp,
  mcpToToml,
  remapModel,
} = translator;

for (const [name, fn] of Object.entries({
  translateManifest,
  translateAgent,
  translateHooks,
  translateSkill,
  translateMcp,
  mcpToToml,
  remapModel,
})) {
  if (typeof fn !== 'function') {
    throw new TypeError(`Codex translator export ${name} is not a function`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeText(filePath, text) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text);
}

async function writeJson(filePath, value) {
  await writeText(filePath, stableJson(value));
}

async function listFiles(baseDir) {
  const entries = await readdir(baseDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolutePath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await listFiles(absolutePath);
      files.push(...nestedFiles.map((file) => path.join(entry.name, file)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entry.name);
    }
  }

  return files;
}

async function copyTree(sourceDir, targetDir, options = {}) {
  const files = await listFiles(sourceDir);
  let copied = 0;

  for (const relativePath of files) {
    if (options.skip?.(relativePath)) {
      continue;
    }

    const content = await readFile(path.join(sourceDir, relativePath));
    await mkdir(path.dirname(path.join(targetDir, relativePath)), { recursive: true });
    await writeFile(path.join(targetDir, relativePath), content);
    copied += 1;
  }

  return copied;
}

async function buildManifest() {
  const manifest = await readJson(
    path.join(SOURCE_DIR, '.claude-plugin', 'plugin.json')
  );
  const translatedManifest = translateManifest(manifest, manifest.version);
  await writeJson(
    path.join(OUTPUT_DIR, '.codex-plugin', 'plugin.json'),
    translatedManifest
  );
  console.log(`✓ manifest ${translatedManifest.name} translated`);
}

async function buildSkills() {
  const sourceSkillsDir = path.join(SOURCE_DIR, 'skills');
  const outputSkillsDir = path.join(OUTPUT_DIR, 'skills');
  const files = await listFiles(sourceSkillsDir);
  let skillCount = 0;
  let supportFileCount = 0;

  for (const relativePath of files) {
    const inputPath = path.join(sourceSkillsDir, relativePath);
    const outputPath = path.join(outputSkillsDir, relativePath);

    if (path.basename(relativePath) === 'SKILL.md') {
      const skillMd = await readFile(inputPath, 'utf8');
      await writeText(outputPath, translateSkill(skillMd));
      skillCount += 1;
      console.log(`✓ skill ${path.dirname(relativePath)} passthrough`);
      continue;
    }

    const content = await readFile(inputPath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content);
    supportFileCount += 1;
  }

  console.log(`✓ skills support files copied (${supportFileCount})`);
  return skillCount;
}

function extractSourceModel(markdown) {
  const match = markdown.match(/^model:\s*(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function ensureTomlMultilineSafety(toml) {
  const startMarker = 'developer_instructions = """\n';
  const start = toml.indexOf(startMarker);
  const end = toml.lastIndexOf('\n"""');

  if (start === -1 || end === -1 || end <= start) {
    return toml.endsWith('\n') ? toml : `${toml}\n`;
  }

  const bodyStart = start + startMarker.length;
  const body = toml.slice(bodyStart, end);

  if (!body.includes('"""')) {
    return toml.endsWith('\n') ? toml : `${toml}\n`;
  }

  if (body.includes("'''")) {
    throw new Error('Agent instructions contain both TOML multiline delimiters');
  }

  const prefix = toml.slice(0, start);
  return `${prefix}developer_instructions = '''\n${body}\n'''\n`;
}

async function buildAgents() {
  const sourceAgentsDir = path.join(SOURCE_DIR, 'agents');
  const outputAgentsDir = path.join(OUTPUT_DIR, 'agents');
  const agentFiles = (await listFiles(sourceAgentsDir)).filter((file) =>
    file.endsWith('.md')
  );

  for (const agentFile of agentFiles) {
    const sourcePath = path.join(sourceAgentsDir, agentFile);
    const markdown = await readFile(sourcePath, 'utf8');
    const translatedAgent = ensureTomlMultilineSafety(translateAgent(markdown));
    const agentName = path.basename(agentFile, '.md');
    const outputPath = path.join(outputAgentsDir, `${agentName}.toml`);
    const model = remapModel(extractSourceModel(markdown));

    await writeText(outputPath, translatedAgent);
    console.log(`→ agent ${agentName} translated (${model})`);
  }

  return agentFiles.length;
}

function filterHooksForCodexBuild(claudeHooks) {
  const filteredHooks = { hooks: {} };

  for (const [event, handlers] of Object.entries(claudeHooks.hooks ?? {})) {
    if (HOOK_EVENTS_DROPPED_BY_BUILD.has(event)) {
      console.log(`⚠ event ${event} dropped`);
      continue;
    }

    filteredHooks.hooks[event] = handlers;
  }

  return filteredHooks;
}

async function buildHooks() {
  const claudeHooks = await readJson(path.join(SOURCE_DIR, 'hooks', 'hooks.json'));
  const translatedHooks = translateHooks(filterHooksForCodexBuild(claudeHooks));

  await writeJson(path.join(OUTPUT_DIR, 'hooks.json'), translatedHooks);

  for (const event of Object.keys(translatedHooks.hooks)) {
    console.log(`✓ event ${event} mapped`);
  }

  const copiedHooks = await copyTree(
    path.join(SOURCE_DIR, 'hooks'),
    path.join(OUTPUT_DIR, 'hooks'),
    { skip: (relativePath) => relativePath === 'hooks.json' }
  );
  console.log(`✓ hooks runtime files copied (${copiedHooks})`);

  return Object.keys(translatedHooks.hooks).length;
}

async function buildMcp() {
  const claudeMcp = await readJson(path.join(SOURCE_DIR, '.mcp.json'));
  const translatedMcp = translateMcp(claudeMcp);
  const tomlPreview = mcpToToml(translatedMcp);
  const serverNames = Object.keys(translatedMcp.mcpServers ?? {});

  if (serverNames.length > 0 && !tomlPreview.includes('[mcp_servers.')) {
    throw new Error('MCP TOML conversion produced no server blocks');
  }

  await writeJson(path.join(OUTPUT_DIR, '.mcp.json'), translatedMcp);
  console.log(`✓ mcp ${serverNames.length} servers passthrough`);

  return serverNames.length;
}

// AGENTS.md is the Codex/ChatGPT Work-side instruction surface (read from repo
// root down to cwd, ~32 KiB combined cap — see docs/compat/chatgpt-work.md).
// Emit a deterministic one at the mirror root from contract.json + the manifest.
async function buildAgentsMd() {
  const contract = await readJson(path.join(ROOT_DIR, 'commander', 'contract.json'));
  const manifest = await readJson(
    path.join(SOURCE_DIR, '.claude-plugin', 'plugin.json')
  );

  const lines = [
    '# AGENTS.md — CC Commander (Codex / ChatGPT Work mirror)',
    '',
    `> Generated by \`npm run build:codex\` from \`commander/contract.json\` v${manifest.version}. Do not edit by hand.`,
    '',
    '## What this directory is',
    '',
    'The Codex-format mirror of the CC Commander plugin: ' +
      `${contract.plugin_skills} skills (\`skills/*/SKILL.md\`, byte-identical to the ` +
      `Claude Code tree), ${contract.specialist_agents} specialist agent personas ` +
      '(`agents/*.toml`), the Codex-supported hook subset (`hooks.json`), and ' +
      `${contract.bundled_mcp_servers} credential-free MCP servers (\`.mcp.json\`).`,
    '',
    '## How to use it',
    '',
    `- Start with the \`ccc\` skill (\`$ccc\`) — the guided hub for the ${contract.command_prefix}* workflows.`,
    '- Skills load from `skills/`; invoke explicitly with `$<skill-name>` or let the task match implicitly.',
    '- Agent personas in `agents/*.toml` define specialist voices (architect, reviewer, security-auditor, …). Adopt the matching persona when a task fits one.',
    '- Skill/hook commands reference `${CLAUDE_PLUGIN_ROOT}` — Codex exposes it as a documented compatibility alias for its native `PLUGIN_ROOT`, so it resolves correctly here unmodified.',
    '',
    '## Operating rules for agents working here',
    '',
    '- This tree is GENERATED. Never edit it directly — change `commander/cowork-plugin/` and run `npm run build:codex`.',
    '- Plan before building; verify before declaring done. Prefer small, reviewed diffs.',
    '- Never commit secrets. Use env vars for anything sensitive.',
    '- Run the repo gates before pushing: `npm test`, `node scripts/check-product-contract.js --check`, `node scripts/check-compat.js`.',
    '',
    '## Links',
    '',
    `- Homepage: ${manifest.homepage}`,
    `- Repo: ${manifest.repository}`,
    '- Compat matrix (Claude Cowork / Claude Code CLI / Codex CLI / ChatGPT Work): `docs/compat/chatgpt-work.md`',
    '',
  ];

  const content = lines.join('\n');
  const byteLength = Buffer.byteLength(content, 'utf8');
  const CODEX_PROJECT_DOC_MAX_BYTES = 32 * 1024;
  if (byteLength >= CODEX_PROJECT_DOC_MAX_BYTES) {
    throw new Error(
      `AGENTS.md would be ${byteLength} bytes — exceeds Codex project_doc_max_bytes (${CODEX_PROJECT_DOC_MAX_BYTES})`
    );
  }

  await writeText(path.join(OUTPUT_DIR, 'AGENTS.md'), content);
  console.log(`✓ AGENTS.md emitted (${byteLength} bytes)`);
}

async function buildSupportDirs() {
  for (const dirName of SUPPORT_DIRS) {
    if (dirName === 'hooks') {
      continue;
    }

    const copied = await copyTree(
      path.join(SOURCE_DIR, dirName),
      path.join(OUTPUT_DIR, dirName)
    );
    console.log(`✓ support ${dirName}/ copied (${copied})`);
  }
}

async function main() {
  console.log('Codex plugin build starting');
  // README.md is hand-authored (CC-859 mirror-workflow doc) — preserve across the wipe
  let readme = null;
  try {
    readme = await readFile(path.join(OUTPUT_DIR, 'README.md'), 'utf8');
  } catch { /* first build or already gone */ }
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  if (readme) {
    await writeFile(path.join(OUTPUT_DIR, 'README.md'), readme);
    console.log('✓ README.md preserved');
  }

  await buildManifest();
  const skillCount = await buildSkills();
  const agentCount = await buildAgents();
  const hookEventCount = await buildHooks();
  const mcpServerCount = await buildMcp();
  await buildAgentsMd();
  await buildSupportDirs();

  console.log(
    `Codex plugin build complete: ${skillCount} skills, ${agentCount} agents, ` +
      `${hookEventCount} hook events, ${mcpServerCount} MCP servers`
  );
}

await main();
