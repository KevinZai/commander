import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TEST_DIR, '..', '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'commander', 'cowork-plugin');
const PACKAGE_JSON = await readJson(path.join(ROOT_DIR, 'package.json'));
const HOOK_EVENT_MAP = await readJson(path.join(ROOT_DIR, 'commander', 'adapters', 'codex', 'hook-event-map.json'));
const { resolveClaudeTier } = await import(
  new URL('../adapters/codex/models.js', import.meta.url).href
);
// Codex hook surface (platform facts §3.3).
const CODEX_HOOK_EVENTS = new Set([
  'PreToolUse', 'PermissionRequest', 'PostToolUse', 'PreCompact', 'PostCompact',
  'UserPromptSubmit', 'SubagentStop', 'Stop', 'SessionStart', 'SubagentStart',
  'SessionEnd', 'Interrupt',
]);

async function runBuild(outputDir) {
  await execFileAsync(process.execPath, ['scripts/build-codex.js', '--out', outputDir], {
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
  // Use an isolated tmp dir so parallel test suite runs can't interfere.
  const OUTPUT_DIR = await mkdtemp(path.join(tmpdir(), 'ccc-codex-build-'));
  t.after(() => rm(OUTPUT_DIR, { recursive: true, force: true }));

  await runBuild(OUTPUT_DIR);

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
    assert.equal(manifest.version, PACKAGE_JSON.version);
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
    const openai = manifest.extensions?.['com.openai'];
    assert.ok(openai, 'overlay carries extensions["com.openai"]');
    assert.equal(openai.hooks, './hooks.json');
    assert.equal(openai.interface.displayName, 'CC Commander');
    assert.doesNotMatch(openai.interface.shortDescription, /\b\d+ (skills|agents)\b/);
  });

  await t.test('never copies Claude-only mods/, evals/ or workflows/', async () => {
    const files = await listFiles(OUTPUT_DIR);
    const offenders = files.filter((file) =>
      file.split(path.sep).some((part) => ['mods', 'evals', 'workflows'].includes(part))
    );
    assert.deepEqual(offenders, []);
  });

  await t.test('keeps CLAUDE_PLUGIN_ROOT verbatim and never emits CODEX_PLUGIN_ROOT', async () => {
    const sourceSkillFiles = (await listFiles(path.join(SOURCE_DIR, 'skills')))
      .filter((file) => path.basename(file) === 'SKILL.md')
      .sort();
    const outputSkillFiles = (await listFiles(path.join(OUTPUT_DIR, 'skills')))
      .filter((file) => path.basename(file) === 'SKILL.md')
      .sort();

    // Skill-count parity with contract.json is the contract gate's job
    // (npm run check:contract); this test pins source/mirror parity.
    assert.ok(sourceSkillFiles.length > 0);
    assert.deepEqual(outputSkillFiles, sourceSkillFiles);

    let skillsReferencingPluginRoot = 0;
    for (const skillFile of sourceSkillFiles) {
      const source = await readFile(path.join(SOURCE_DIR, 'skills', skillFile), 'utf8');
      const output = await readFile(path.join(OUTPUT_DIR, 'skills', skillFile), 'utf8');

      // CODEX_PLUGIN_ROOT is not a real Codex variable (verified 2026-07-22 against
      // learn.chatgpt.com/docs/hooks — Codex exports CLAUDE_PLUGIN_ROOT as a documented
      // compatibility alias for its native PLUGIN_ROOT). ${CLAUDE_PLUGIN_ROOT} must
      // therefore survive translation unmodified.
      assert.ok(
        !output.includes('${CODEX_PLUGIN_ROOT}'),
        `${skillFile} must not reference CODEX_PLUGIN_ROOT in the Codex mirror`
      );
      if (source.includes('${CLAUDE_PLUGIN_ROOT}')) {
        skillsReferencingPluginRoot += 1;
        assert.ok(
          output.includes('${CLAUDE_PLUGIN_ROOT}'),
          `${skillFile} should keep CLAUDE_PLUGIN_ROOT verbatim`
        );
      }
    }

    // Guards the "don't touch it" behaviour against silently regressing back
    // to a rewrite.
    assert.ok(
      skillsReferencingPluginRoot > 0,
      'expected at least one skill to reference CLAUDE_PLUGIN_ROOT'
    );
  });

  await t.test('maps /ccc-* invocation references to $ccc-* form inside backticks', async () => {
    const output = await readFile(
      path.join(OUTPUT_DIR, 'skills', 'ccc-build', 'SKILL.md'),
      'utf8'
    );
    assert.match(output, /`\$ccc-build`/);
    assert.ok(!/`\/ccc-build`/.test(output), 'source /ccc-build slash form must not survive translation');
  });

  await t.test('rewrites the plugin\'s own manifest sub-path but not unrelated .claude-plugin mentions', async () => {
    const startOutput = await readFile(
      path.join(OUTPUT_DIR, 'skills', 'ccc-start', 'SKILL.md'),
      'utf8'
    );
    assert.ok(
      startOutput.includes('${CLAUDE_PLUGIN_ROOT}/.codex-plugin/plugin.json'),
      'ccc-start should read its own manifest from .codex-plugin/plugin.json in the Codex mirror'
    );

    const suggestOutput = await readFile(
      path.join(OUTPUT_DIR, 'skills', 'ccc-suggest', 'SKILL.md'),
      'utf8'
    );
    assert.ok(
      suggestOutput.includes('.claude-plugin/plugin.json'),
      'ccc-suggest\'s unrelated ~/.claude/plugins/cache glob must not be rewritten'
    );
  });

  await t.test('appends a Codex fallback note to every skill referencing AskUserQuestion', async () => {
    const sourceSkillFiles = (await listFiles(path.join(SOURCE_DIR, 'skills')))
      .filter((file) => path.basename(file) === 'SKILL.md');

    let askUserQuestionSkills = 0;
    for (const skillFile of sourceSkillFiles) {
      const source = await readFile(path.join(SOURCE_DIR, 'skills', skillFile), 'utf8');
      if (!/\bAskUserQuestion\b/.test(source)) continue;
      askUserQuestionSkills += 1;

      const output = await readFile(path.join(OUTPUT_DIR, 'skills', skillFile), 'utf8');
      assert.match(
        output,
        /AskUserQuestion is Claude-only/,
        `${skillFile} should carry the Codex AskUserQuestion fallback note`
      );
    }

    assert.ok(askUserQuestionSkills >= 40, `expected many skills to reference AskUserQuestion, got ${askUserQuestionSkills}`);
  });

  await t.test('translates every agent to Codex custom-agent TOML', async () => {
    const sourceAgents = (await listFiles(path.join(SOURCE_DIR, 'agents')))
      .filter((file) => file.endsWith('.md'));
    const outputAgents = (await listFiles(path.join(OUTPUT_DIR, 'agents')))
      .filter((file) => file.endsWith('.toml'));

    assert.ok(sourceAgents.length > 0);
    assert.deepEqual(
      outputAgents.sort(),
      sourceAgents.map((file) => file.replace(/\.md$/, '.toml')).sort()
    );

    for (const agentFile of sourceAgents) {
      const source = await readFile(path.join(SOURCE_DIR, 'agents', agentFile), 'utf8');
      const toml = await readFile(
        path.join(OUTPUT_DIR, 'agents', agentFile.replace(/\.md$/, '.toml')),
        'utf8'
      );
      const name = path.basename(agentFile, '.md');
      const frontmatter = source.split(/^---$/m)[1] ?? '';
      const sourceModel = (frontmatter.match(/^model:\s*(.+)$/m) || [])[1]?.trim() ?? '';
      const listOf = (key) => {
        const block = (frontmatter.match(new RegExp(`^${key}:\\n((?:[ \\t]+-[ \\t]+.+\\n?)+)`, 'm')) || [])[1] ?? '';
        return [...block.matchAll(/-\s+(\S+)/g)].map((m) => m[1]);
      };
      const tools = listOf('tools');
      const disallowed = new Set(listOf('disallowedTools'));
      const writeTools = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];
      const canWrite = tools.length === 0
        ? !writeTools.every((tool) => disallowed.has(tool))
        : tools.some((tool) => writeTools.includes(tool) && !disallowed.has(tool));
      const expectedModel = resolveClaudeTier(sourceModel);

      assert.match(toml, new RegExp(`^name = "${name}"$`, 'm'), `${name} name`);
      assert.match(toml, /^description = "/m, `${name} description`);
      assert.ok(toml.includes(`\nmodel = "${expectedModel}"\n`), `${name} model should be ${expectedModel}`);
      assert.ok(
        toml.includes(`\nsandbox_mode = "${canWrite ? 'workspace-write' : 'read-only'}"\n`),
        `${name} sandbox_mode`
      );
      assert.ok(toml.includes('\ndeveloper_instructions = """\n'), `${name} developer_instructions`);
    }
  });

  await t.test('keeps exactly the hook events hook-event-map.json maps to Codex', async () => {
    const sourceHooks = await readJson(path.join(SOURCE_DIR, 'hooks', 'hooks.json'));
    const hooks = await readJson(path.join(OUTPUT_DIR, 'hooks.json'));
    const eventNames = Object.keys(hooks.hooks).sort();

    const expected = [...new Set(
      Object.keys(sourceHooks.hooks)
        .map((event) => HOOK_EVENT_MAP.events[event])
        .filter((mapping) => mapping && mapping.status !== 'drop' && mapping.codex != null)
        .map((mapping) => mapping.codex)
    )].sort();

    assert.deepEqual(eventNames, expected);
    for (const event of eventNames) {
      assert.ok(CODEX_HOOK_EVENTS.has(event), `${event} is not a Codex hook event`);
    }
    for (const event of ['Notification', 'PostToolUseFailure', 'StopFailure']) {
      assert.ok(!eventNames.includes(event), `${event} must be dropped`);
    }
  });

  await t.test('emits hook timeouts in seconds within the Codex caps', async () => {
    const hooks = await readJson(path.join(OUTPUT_DIR, 'hooks.json'));
    for (const [event, groups] of Object.entries(hooks.hooks)) {
      for (const group of groups) {
        for (const hook of group.hooks ?? []) {
          if (typeof hook.timeout !== 'number') continue;
          assert.ok(hook.timeout >= 1 && hook.timeout <= 600, `${event} timeout ${hook.timeout}s`);
          if (event === 'SessionEnd' || event === 'Interrupt') {
            assert.ok(hook.timeout <= 3, `${event} timeout must be <= 3s, got ${hook.timeout}`);
          }
        }
      }
    }
  });

  await t.test('never emits async:true and never emits CODEX_PLUGIN_ROOT', async () => {
    const hooksText = await readFile(path.join(OUTPUT_DIR, 'hooks.json'), 'utf8');
    assert.ok(!hooksText.includes('"async"'), 'translated hooks.json must not contain an async field');
    assert.ok(!hooksText.includes('CODEX_PLUGIN_ROOT'), 'translated hooks.json must not reference CODEX_PLUGIN_ROOT');
    assert.ok(
      hooksText.includes('${CLAUDE_PLUGIN_ROOT}'),
      'translated hooks.json should keep CLAUDE_PLUGIN_ROOT verbatim'
    );
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
    await runBuild(OUTPUT_DIR);
    const secondHash = await hashTree(OUTPUT_DIR);

    assert.equal(secondHash, firstHash);
  });

  await t.test('the broken ${CODEX_PLUGIN_ROOT} template form never appears anywhere in the tree', async () => {
    // Scoped precisely to the literal shell/JS template-literal expansion
    // form (the thing that was actually broken -- an unset variable
    // expanding to nothing in hook commands and skill bodies). This does
    // NOT forbid the string "CODEX_PLUGIN_ROOT" outright: mission-control-
    // feed.js, skill-runs-logger.js, and lib/suggestions.js legitimately
    // read `process.env.CODEX_PLUGIN_ROOT` as a documented, harmless
    // backward-compat fallback in their source-app detection (see the
    // comments in those files) -- that pattern is intentional, not a bug.
    const files = await listFiles(OUTPUT_DIR);
    const offenders = [];

    for (const relativePath of files) {
      const content = await readFile(path.join(OUTPUT_DIR, relativePath), 'utf8').catch(() => '');
      if (content.includes('${CODEX_PLUGIN_ROOT}')) {
        offenders.push(relativePath);
      }
    }

    assert.deepEqual(offenders, [], `found broken \${CODEX_PLUGIN_ROOT} references in: ${offenders.join(', ')}`);
  });
});
