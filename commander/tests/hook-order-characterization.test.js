'use strict';

// CC-414 slice 1: characterization of the CURRENT hook ordering, before any
// consolidation of per-event Node chains. Pure static reads of hooks.json and
// the SessionStart orchestrator source: nothing is spawned or activated. If a
// later slice merges handlers, this snapshot must change in the same commit,
// which makes the reordering explicit in review.
// Row shape: [handler file, timeout seconds, async].

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var HOOKS_DIR = path.join(__dirname, '..', 'cowork-plugin', 'hooks');

var EXPECTED = {
  "SessionStart": [
    { matcher: null, hooks: [
      ['orchestrator/session-start-orchestrator.js', 15, false],
      ['license-check.js', 10, false],
      ['git-truth.js', 6, false],
      ['update-nudge.js', 6, true],
      ['console-autopen.js', 5, true],
    ] },
  ],
  "SessionEnd": [
    { matcher: null, hooks: [
      ['session-save.js', 3, false],
      ['session-end.js', 3, false],
    ] },
  ],
  "UserPromptSubmit": [
    { matcher: null, hooks: [
      ['suggest-ticker.js', 2, false],
      ['intent-classifier.js', 5, false],
      ['context-warning.js', 3, false],
      ['context-guard.js', 3, false],
      ['user-prompt-submit.js', 5, false],
      ['skill-runs-logger.js', 3, true],
    ] },
  ],
  "UserPromptExpansion": [
    { matcher: null, hooks: [
      ['prompt-expansion-guard.js', 3, false],
    ] },
  ],
  "PreToolUse": [
    { matcher: "*", hooks: [
      ['cost-tracker.js', 3, true],
      ['cost-ceiling-enforcer.js', 3, false],
      ['secret-leak-guard.js', 5, false],
    ] },
    { matcher: "Edit|Write|MultiEdit", hooks: [
      ['config-protection.js', 3, false],
    ] },
    { matcher: "Write", hooks: [
      ['doc-file-warning.js', 3, false],
    ] },
    { matcher: "Bash", hooks: [
      ['git-push-reminder.js', 3, false],
    ] },
  ],
  "PostToolUse": [
    { matcher: "*", hooks: [
      ['knowledge-capture.js', 5, false],
      ['mission-control-feed.js', 3, true],
    ] },
    { matcher: "Edit|Write|MultiEdit", hooks: [
      ['console-log-warn.js', 5, false],
    ] },
    { matcher: "Bash", hooks: [
      ['pr-link-notify.js', 3, true],
    ] },
  ],
  "PostToolUseFailure": [
    { matcher: "*", hooks: [
      ['post-tool-failure-logger.js', 3, true],
    ] },
  ],
  "PostToolBatch": [
    { matcher: null, hooks: [
      ['knowledge-capture.js', 5, true],
    ] },
  ],
  "Stop": [
    { matcher: null, hooks: [
      ['suggest-lightweight.js', 2, false],
      ['clickability-watch.js', 2, false],
    ] },
  ],
  "StopFailure": [
    { matcher: null, hooks: [
      ['stop-failure-handler.js', 3, false],
    ] },
  ],
  "Notification": [
    { matcher: null, hooks: [
      ['fleet-notify.js', 5, true],
    ] },
  ],
  "PreCompact": [
    { matcher: null, hooks: [
      ['pre-compact.js', 5, false],
    ] },
  ],
  "PostCompact": [
    { matcher: null, hooks: [
      ['post-compact-recovery.js', 5, false],
    ] },
  ],
  "SubagentStart": [
    { matcher: null, hooks: [
      ['subagent-start-tracker.js', 3, true],
    ] },
  ],
  "SubagentStop": [
    { matcher: null, hooks: [
      ['subagent-stop.js', 5, false],
      ['agent-run-logger.js', 5, true],
    ] },
  ],
  "PermissionRequest": [
    { matcher: null, hooks: [
      ['permission-gate.js', 5, false],
      ['mission-control-feed.js', 3, true],
    ] },
  ],
  "Elicitation": [
    { matcher: null, hooks: [
      ['elicitation-logger.js', 3, true],
    ] },
  ],
  "ElicitationResult": [
    { matcher: null, hooks: [
      ['elicitation-result-handler.js', 3, true],
    ] },
  ],
  "TaskCreated": [
    { matcher: null, hooks: [
      ['task-tracker.js', 3, true],
    ] },
  ],
  "TaskCompleted": [
    { matcher: null, hooks: [
      ['task-tracker.js', 3, true],
    ] },
  ],
  "ConfigChange": [
    { matcher: null, hooks: [
      ['config-protection.js', 3, false],
    ] },
  ],
  "InstructionsLoaded": [
    { matcher: null, hooks: [
      ['stale-claude-md-nudge.js', 3, false],
    ] },
  ],
  "Setup": [
    { matcher: null, hooks: [
      ['license-check.js', 10, false],
    ] },
  ],
  "PermissionDenied": [
    { matcher: null, hooks: [
      ['permission-denied-logger.js', 3, false],
    ] },
  ],
  "PreModelSwitch": [
    { matcher: null, hooks: [
      ['model-switch-logger.js', 5, false],
    ] },
  ],
  "PostModelSwitch": [
    { matcher: null, hooks: [
      ['model-switch-logger.js', 5, false],
    ] },
  ],
  "TeammateIdle": [
    { matcher: null, hooks: [
      ['fleet-telemetry.js', 3, false],
    ] },
  ],
  "CwdChanged": [
    { matcher: null, hooks: [
      ['session-state-sync.js', 3, false],
    ] },
  ],
  "DirectoryAdded": [
    { matcher: null, hooks: [
      ['session-state-sync.js', 3, false],
    ] },
  ],
  "FileChanged": [
    { matcher: "CLAUDE.md", hooks: [
      ['stale-claude-md-nudge.js', 3, false],
    ] },
  ],
};

function actual() {
  var d = JSON.parse(fs.readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf8')).hooks;
  var out = {};
  Object.keys(d).forEach(function (event) {
    out[event] = d[event].map(function (g) {
      return {
        matcher: Object.prototype.hasOwnProperty.call(g, 'matcher') ? g.matcher : null,
        hooks: g.hooks.map(function (h) {
          var m = /\/hooks\/(.+?)"?$/.exec(h.command);
          assert.ok(m, 'unparseable hook command: ' + h.command);
          return [m[1], h.timeout, h.async === true];
        }),
      };
    });
  });
  return out;
}

test('hooks.json: event set, group order, handler order, timeout and async flags are unchanged', function () {
  assert.deepStrictEqual(actual(), EXPECTED);
});

test('hooks.json: per-event chain lengths (async included)', function () {
  // The Node spawn counts CC-414 targets: handlers that run per event.
  var a = actual();
  var count = function (ev) {
    return a[ev].reduce(function (n, g) { return n + g.hooks.length; }, 0);
  };
  assert.strictEqual(count('SessionStart'), 5);
  assert.strictEqual(count('UserPromptSubmit'), 6);
  assert.deepStrictEqual(a.PreToolUse.map(function (g) { return g.hooks.length; }), [3, 1, 1, 1]);
});

test('SessionStart orchestrator: internal handler order is unchanged', function () {
  var src = fs.readFileSync(path.join(HOOKS_DIR, 'orchestrator', 'session-start-orchestrator.js'), 'utf8');
  var names = [];
  var re = /\{ name: '([^']+)', file: '([^']+)' \}/g;
  var m;
  while ((m = re.exec(src))) names.push([m[1], m[2]]);
  assert.deepStrictEqual(names, [
    ['session-start', '../_archive/session-start.js'],
    ['stale-claude-md-nudge', '../stale-claude-md-nudge.js'],
    ['post-compact-recovery', '../post-compact-recovery.js'],
    ['fable-armed-nudge', '../fable-armed-nudge.js'],
    ['voice-injector', '../voice-injector.js'],
  ]);
});

test('every handler file referenced by hooks.json exists', function () {
  var a = actual();
  Object.keys(a).forEach(function (ev) {
    a[ev].forEach(function (g) {
      g.hooks.forEach(function (h) {
        assert.ok(fs.existsSync(path.join(HOOKS_DIR, h[0])), ev + ': missing ' + h[0]);
      });
    });
  });
});
