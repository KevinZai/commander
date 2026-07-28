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
const CONSOLE_AUTOPEN_COMMAND = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/console-autopen.js"';
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

  // One entry group (array of length 1) containing orchestrator + license-check
  // + git-truth + update-nudge + console-autopen.
  assert.equal(config.hooks.SessionStart.length, 1);
  // That group has exactly five hooks.
  assert.equal(sessionStartCommands(config).length, 5);
});

// The list is retyped on purpose: SessionStart is the most expensive event to
// get wrong (it runs before the user has done anything), so adding a handler
// here is a reviewed change rather than something a test silently absorbs.
test('SessionStart entry contains orchestrator, license-check, git-truth, update-nudge, console-autopen', () => {
  const config = readHooksConfig();

  assert.deepEqual(sessionStartCommands(config), [
    ORCHESTRATOR_COMMAND,
    LICENSE_CHECK_COMMAND,
    GIT_TRUTH_COMMAND,
    UPDATE_NUDGE_COMMAND,
    CONSOLE_AUTOPEN_COMMAND,
  ]);
});

test('the two nudge hooks are registered async: true (never block session start)', () => {
  const config = readHooksConfig();
  for (const command of [UPDATE_NUDGE_COMMAND, CONSOLE_AUTOPEN_COMMAND]) {
    const entry = config.hooks.SessionStart[0].hooks.find((h) => h.command === command);
    assert.ok(entry, `${command} must be registered in the SessionStart group`);
    assert.equal(entry.async, true, `${command} must be async: true`);
  }
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
