import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  readdir,
  readFile,
  stat,
} from 'node:fs/promises';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TEST_DIR, '..', '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'commander', 'cowork-plugin');
const OUTPUT_DIR = path.join(ROOT_DIR, 'commander', 'cowork-plugin-codex');

async function runBuild() {
  await execFileAsync(process.execPath, ['scripts/build-codex.js'], {
    cwd: ROOT_DIR,
    maxBuffer: 1024 * 1024 * 10,
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
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

async function hashTree(baseDir) {
  const hash = createHash('sha256');
  const files = await listFiles(baseDir);

  for (const relativePath of files) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(await readFile(path.join(baseDir, relativePath)));
    hash.update('\0');
  }

  return hash.digest('hex');
}

test('codex plugin build artifact', async (t) => {
  await runBuild();

  await t.test('creates the expected output structure', async () => {
    await stat(OUTPUT_DIR);
    await stat(path.join(OUTPUT_DIR, '.codex-plugin', 'plugin.json'));
    await stat(path.join(OUTPUT_DIR, 'skills'));
    await stat(path.join(OUTPUT_DIR, 'agents'));
    await stat(path.join(OUTPUT_DIR, 'hooks.json'));
    await stat(path.join(OUTPUT_DIR, '.mcp.json'));
  });

  await t.test('writes a valid Codex manifest', async () => {
    const manifest = await readJson(
      path.join(OUTPUT_DIR, '.codex-plugin', 'plugin.json')
    );

    assert.equal(manifest.name, 'commander');
    assert.equal(manifest.displayName, 'CC Commander');
    assert.equal(manifest.version, '4.0.0-beta.11');
    assert.equal(manifest.skills, './skills/');
    assert.equal(manifest.agents, './agents/');
    assert.equal(manifest.hooks, './hooks.json');
    assert.equal(manifest.mcpServers, './.mcp.json');
    assert.deepEqual(manifest.interface.capabilities, [
      'skills',
      'agents',
      'hooks',
      'mcp',
    ]);
  });

  await t.test('passes through all 55 skills unchanged', async () => {
    const sourceSkillFiles = (await listFiles(path.join(SOURCE_DIR, 'skills')))
      .filter((file) => path.basename(file) === 'SKILL.md')
      .sort();
    const outputSkillFiles = (await listFiles(path.join(OUTPUT_DIR, 'skills')))
      .filter((file) => path.basename(file) === 'SKILL.md')
      .sort();

    assert.equal(sourceSkillFiles.length, 55);
    assert.deepEqual(outputSkillFiles, sourceSkillFiles);

    for (const skillFile of sourceSkillFiles) {
      assert.equal(
        await readFile(path.join(OUTPUT_DIR, 'skills', skillFile), 'utf8'),
        await readFile(path.join(SOURCE_DIR, 'skills', skillFile), 'utf8'),
        `${skillFile} should be byte-identical`
      );
    }
  });

  await t.test('translates all 17 agents to TOML', async () => {
    const sourceAgents = (await listFiles(path.join(SOURCE_DIR, 'agents')))
      .filter((file) => file.endsWith('.md'));
    const outputAgents = (await listFiles(path.join(OUTPUT_DIR, 'agents')))
      .filter((file) => file.endsWith('.toml'));

    assert.equal(sourceAgents.length, 17);
    assert.equal(outputAgents.length, 17);
    assert.ok(outputAgents.includes('architect.toml'));

    const architect = await readFile(
      path.join(OUTPUT_DIR, 'agents', 'architect.toml'),
      'utf8'
    );
    assert.match(architect, /^name = "architect"/m);
    assert.match(architect, /^model = "gpt-5\.5"/m);
    assert.match(architect, /^developer_instructions = /m);
  });

  await t.test('drops unsupported hook events and emits 5 events', async () => {
    const hooks = await readJson(path.join(OUTPUT_DIR, 'hooks.json'));
    const eventNames = Object.keys(hooks.hooks).sort();

    assert.deepEqual(eventNames, [
      'PostToolUse',
      'PreToolUse',
      'SessionStart',
      'Stop',
      'UserPromptSubmit',
    ]);
    assert.equal(eventNames.length, 5);
  });

  await t.test('passes through 2 MCP servers', async () => {
    const mcp = await readJson(path.join(OUTPUT_DIR, '.mcp.json'));
    assert.deepEqual(Object.keys(mcp.mcpServers).sort(), [
      'context7',
      'sequential-thinking',
    ]);
  });

  await t.test('is idempotent across repeated builds', async () => {
    const firstHash = await hashTree(OUTPUT_DIR);
    await runBuild();
    const secondHash = await hashTree(OUTPUT_DIR);

    assert.equal(secondHash, firstHash);
  });
});
