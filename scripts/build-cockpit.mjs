#!/usr/bin/env node
/**
 * build-cockpit.mjs (repo-root shim, v7.3.0, W2+/codex 7)
 *
 * The REAL Cockpit builder now lives at
 * commander/cowork-plugin/scripts/build-cockpit.mjs — moved there so it
 * ships INSIDE the plugin (marketplace-only installs get agents/hooks/lib/
 * menus/rules/skills/scripts, per .claude-plugin/plugin.json) and can
 * regenerate the Cockpit without a full repo checkout. See that file's doc
 * comment for the plugin-only degrade behavior (contract.json + the
 * top-level ecosystem skills/ catalog are dev-checkout-only sources).
 *
 * This file is kept at the old repo-root path purely for muscle memory —
 * `node scripts/build-cockpit.mjs --out X` still works from a repo
 * checkout. It does nothing but spawn the real script with the same argv,
 * forward stdio 1:1, and exit with the same code.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REAL_GENERATOR = path.join(ROOT, 'commander', 'cowork-plugin', 'scripts', 'build-cockpit.mjs');

const result = spawnSync(process.execPath, [REAL_GENERATOR, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  process.stderr.write(`build-cockpit (shim): ${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
