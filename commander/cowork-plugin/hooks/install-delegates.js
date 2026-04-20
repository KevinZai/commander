#!/usr/bin/env node
// CC Commander — install /ccc-* delegate stubs at user level
//
// Problem: Claude Code plugins namespace their commands as /<plugin>:<cmd>.
// Our plugin is "commander", so /ccc inside the plugin becomes /commander:ccc.
// Users expect to type /ccc.
//
// Solution: this SessionStart hook writes tiny user-level delegate files at
// ~/.claude/commands/ccc.md, ccc-start.md, ccc-browse.md, ... each of which
// instructs Claude to invoke the corresponding /commander:<cmd>. Three lines
// each, versioned so we can safely overwrite on plugin upgrades.
//
// Idempotent. Runs fast (< 50ms). Silent on success (prints nothing unless
// --verbose or stderr on error). Never blocks the SessionStart chain.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(os.homedir(), '.claude', 'commands');

// Read plugin version for the delegate header comment
function readPluginVersion() {
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
    return pj.version || 'unknown';
  } catch (_) {
    return 'unknown';
  }
}

// List of plugin commands that should have a plain /ccc-* delegate.
// If the plugin ships a `commands/<name>.md`, this hook will install a matching
// user-level `~/.claude/commands/<name>.md` that delegates to /commander:<name>.
function listPluginCommands() {
  const dir = path.join(PLUGIN_ROOT, 'commands');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
    // Only create delegates for ccc / ccc-* commands (avoid clobbering unrelated
    // user-level commands the user may have authored).
    .filter(name => name === 'ccc' || name.startsWith('ccc-'));
}

function delegateBody(commandName, version) {
  return `---
description: "CC Commander — plain /${commandName} (plugin delegate v${version})"
---

<!-- AUTO-INSTALLED by the "commander" plugin's install-delegates SessionStart hook.
     Safe to delete — hook will re-create on next SessionStart.
     To disable auto-install: set env var CCC_DISABLE_DELEGATES=1 -->

Invoke the plugin command **/commander:${commandName}** with the same arguments this delegate received. Do not modify the arguments; pass them through verbatim.
`;
}

// Parse the plugin version embedded in an existing delegate so we can decide
// whether to overwrite (our version newer) or leave it alone (user-edited).
function readDelegateVersion(file) {
  try {
    const head = fs.readFileSync(file, 'utf8').slice(0, 400);
    const m = head.match(/plugin delegate v([0-9A-Za-z.\-+]+)/);
    return m ? m[1] : null;
  } catch (_) {
    return null;
  }
}

function installDelegates({ verbose = false } = {}) {
  // Opt-out escape hatch
  if (process.env.CCC_DISABLE_DELEGATES === '1') {
    if (verbose) process.stderr.write('ccc-delegates: disabled via CCC_DISABLE_DELEGATES=1\n');
    return { installed: 0, updated: 0, skipped: 0, disabled: true };
  }

  fs.mkdirSync(COMMANDS_DIR, { recursive: true });

  const version = readPluginVersion();
  const commands = listPluginCommands();
  let installed = 0;
  let updated = 0;
  let skipped = 0;

  for (const name of commands) {
    const target = path.join(COMMANDS_DIR, `${name}.md`);
    const body = delegateBody(name, version);
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, body);
      installed++;
      if (verbose) process.stderr.write(`ccc-delegates: installed ${target}\n`);
      continue;
    }
    // Existing file — is it a previous delegate we own, or user content?
    const existingVersion = readDelegateVersion(target);
    if (existingVersion === null) {
      // Not our delegate — leave it alone to avoid clobbering user work
      skipped++;
      if (verbose) process.stderr.write(`ccc-delegates: skipped (user-owned) ${target}\n`);
      continue;
    }
    if (existingVersion !== version) {
      fs.writeFileSync(target, body);
      updated++;
      if (verbose) process.stderr.write(`ccc-delegates: updated ${target} (${existingVersion} → ${version})\n`);
    } else {
      // Same version, no-op
      if (verbose) process.stderr.write(`ccc-delegates: up-to-date ${target}\n`);
    }
  }

  return { installed, updated, skipped, version, total: commands.length };
}

// Hook entrypoint. SessionStart hooks should output `{"continue":true}` (or
// similar JSON) to signal success and allow the chain to proceed.
if (require.main === module) {
  const verbose = process.argv.includes('--verbose');
  try {
    const result = installDelegates({ verbose });
    // Never fail the SessionStart chain on delegate issues
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    process.exit(0);
  } catch (err) {
    if (verbose) process.stderr.write(`ccc-delegates error: ${err.message}\n`);
    // Fail-open: continue the session even if delegate install failed
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    process.exit(0);
  }
}

module.exports = { installDelegates, listPluginCommands, readPluginVersion };
