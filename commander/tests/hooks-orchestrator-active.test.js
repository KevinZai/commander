'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const HOOKS_JSON = path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'hooks.json');
// Paths are quoted so a plugin root containing a space (Cowork Desktop:
// ~/Library/Application Support/...) doesn't word-split at hook exec.
const ORCHESTRATOR_COMMAND = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/orchestrator/session-start-orchestrator.js"';
const LICENSE_CHECK_COMMAND = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/license-check.js"';
const GIT_TRUTH_COMMAND = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/git-truth.js"';
const UPDATE_NUDGE_COMMAND = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/update-nudge.js"';
const FORMER_SESSION_START_HANDLERS = [
  'session-start.js',
  'stale-claude-md-nudge.js',
  'post-compact-recovery.js',
  'suggest-ticker.js',
];

function readHooksConfig() {
  return JSON.parse(readFileSync(HOOKS_JSON, 'utf8'));
}

function sessionStartCommands(config) {
  const sessionStart = config.hooks?.SessionStart;
  assert.ok(Array.isArray(sessionStart), 'SessionStart must be an array');
  return sessionStart.flatMap((entry) => entry.hooks ?? []).map((hook) => hook.command);
}

test('hooks.json registers exactly one SessionStart entry group', () => {
  const config = readHooksConfig();

  // One entry group (array of length 1) containing orchestrator + license-check + git-truth + update-nudge.
  assert.equal(config.hooks.SessionStart.length, 1);
  // That group has exactly four hooks.
  assert.equal(sessionStartCommands(config).length, 4);
});

test('SessionStart entry contains orchestrator, license-check, git-truth, and update-nudge', () => {
  const config = readHooksConfig();

  assert.deepEqual(sessionStartCommands(config), [
    ORCHESTRATOR_COMMAND,
    LICENSE_CHECK_COMMAND,
    GIT_TRUTH_COMMAND,
    UPDATE_NUDGE_COMMAND,
  ]);
});

test('update-nudge is registered async: true (never blocks session start)', () => {
  const config = readHooksConfig();
  const entry = config.hooks.SessionStart[0].hooks.find((h) => h.command === UPDATE_NUDGE_COMMAND);
  assert.ok(entry, 'update-nudge.js must be registered in the SessionStart group');
  assert.equal(entry.async, true, 'update-nudge.js must be async: true');
});

test('former individual SessionStart handlers are no longer directly registered', () => {
  const config = readHooksConfig();
  const commands = sessionStartCommands(config);

  for (const handler of FORMER_SESSION_START_HANDLERS) {
    assert.equal(
      commands.some((command) => command?.endsWith(`/hooks/${handler}`)),
      false,
      `${handler} must not be directly registered for SessionStart`
    );
  }
});
