#!/usr/bin/env node
/**
 * config-protection.js
 * Hook: PreToolUse (Edit/Write/MultiEdit)
 * Blocks modifications to linter/formatter config files. Agents frequently
 * modify these to make checks pass instead of fixing the actual code. This
 * hook steers the agent back to fixing the source.
 * Adapted from ECC vendor (CommonJS → ESM).
 * Never crashes the session — fail open on any error.
 */
import { track } from '../lib/telemetry.mjs';
import path from 'node:path';

const PROTECTED_FILES = new Set([
  // ESLint
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
  // Prettier
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  // Biome
  'biome.json',
  'biome.jsonc',
  // Ruff (Python)
  '.ruff.toml',
  'ruff.toml',
  // Shell / Style / Markdown
  '.shellcheckrc',
  '.stylelintrc',
  '.stylelintrc.json',
  '.stylelintrc.yml',
  '.markdownlint.json',
  '.markdownlint.yaml',
  '.markdownlintrc',
]);

async function main() {
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
      track('hook_fired', { hook: 'PreToolUse', handler: 'config-protection' });

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    const toolName = input.tool_name || input.toolName || '';
    if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const filePath = input.tool_input?.file_path || input.tool_input?.file || '';
    if (!filePath) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const basename = path.basename(filePath);
    if (PROTECTED_FILES.has(basename)) {
      const stopReason = `CCC CONFIG GUARD: Modifying ${basename} is blocked. ` +
        `Fix the source code to satisfy linter/formatter rules instead of weakening ` +
        `the config. If this is a legitimate config change, disable the ` +
        `config-protection hook temporarily or commit the change manually.`;
      process.stdout.write(JSON.stringify({ continue: false, stopReason }) + '\n');
      return;
    }

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  }
}

main();
