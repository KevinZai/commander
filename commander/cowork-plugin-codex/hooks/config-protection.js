#!/usr/bin/env node
/**
 * config-protection.js
 * Hook: PreToolUse (Edit/Write/MultiEdit; Codex apply_patch) + ConfigChange
 * PreToolUse: blocks modifications to linter/formatter config files. Agents
 * frequently modify these to make checks pass instead of fixing the actual
 * code. This hook steers the agent back to fixing the source.
 * ConfigChange: surfaces harness settings-file changes (settings.json /
 * settings.local.json / hooks) so mid-session permission or hook drift is
 * visible instead of silent.
 * Adapted from ECC vendor (CommonJS → ESM).
 * Never crashes the session. An edit it cannot read or check is blocked
 * (fail closed); other errors pass.
 */
import { track } from '../lib/telemetry.mjs';
import { emitUser, emitSilent, emitDeny } from './lib/emit.mjs';
import path from 'node:path';
import { editTargets, isFileEditTool } from './lib/edit-targets.mjs';

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
  track('hook_fired', { hook: 'PreToolUse', handler: 'config-protection' });
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
    // Unreadable input on an edit: the guard cannot tell what is written, so block (fail closed).
    process.stdout.write(JSON.stringify(emitDeny('CCC CONFIG GUARD: could not read this edit call, so it is blocked.')) + '\n');
    return;
  }

  try {
    // ConfigChange branch — the harness reports a settings-file change
    // (its payload has no tool_name; branch on the event name).
    if (input.hook_event_name === 'ConfigChange') {
      const source = input.source || input.config_source || '';
      const file = input.file_path || input.settings_path || source || 'a Claude Code settings file';
      const base = typeof file === 'string' ? path.basename(file) : 'settings';
      const sensitive = /settings(\.local)?\.json$|hooks\.json$/.test(String(file));
      if (sensitive) {
        process.stdout.write(JSON.stringify(emitUser(
          `⚙️ CCC config watch: ${base} changed mid-session — permissions or hooks may have drifted. Review the change if you didn't make it.`
        )) + '\n');
      } else {
        process.stdout.write(JSON.stringify(emitSilent()) + '\n');
      }
      return;
    }

    const toolName = input.tool_name || input.toolName || '';
    if (!isFileEditTool(toolName)) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Every file the call writes: one for a Claude edit, one per file op (and rename target) for a Codex patch.
    const basename = editTargets(input)
      .map((target) => path.basename(target.path))
      .find((name) => PROTECTED_FILES.has(name));
    if (basename) {
      const stopReason = `CCC CONFIG GUARD: Modifying ${basename} is blocked. ` +
        `Fix the source code to satisfy linter/formatter rules instead of weakening ` +
        `the config. If this is a legitimate config change, disable the ` +
        `config-protection hook temporarily or commit the change manually.`;
      process.stdout.write(JSON.stringify(emitDeny(stopReason)) + '\n');
      return;
    }

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  } catch {
    // An edit the guard failed to check is blocked; anything else passes.
    const edit = isFileEditTool(input.tool_name || input.toolName || '');
    process.stdout.write(JSON.stringify(edit ? emitDeny('CCC CONFIG GUARD: could not check this edit, so it is blocked.') : { continue: true }) + '\n');
  }
}

main();
