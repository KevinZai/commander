'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');

function collectActions(adventuresDir) {
  var files = fs.readdirSync(adventuresDir).filter(function(f) { return f.endsWith('.json'); });
  var actions = new Set();

  files.forEach(function(file) {
    var adv = JSON.parse(fs.readFileSync(path.join(adventuresDir, file), 'utf8'));
    if (adv.action) actions.add(adv.action);

    (adv.choices || []).forEach(function(choice) {
      if (choice.action) actions.add(choice.action);
    });

    if (adv.afterAction && adv.afterAction.choices) {
      adv.afterAction.choices.forEach(function(choice) {
        if (choice.action) actions.add(choice.action);
      });
    }
  });

  return Array.from(actions).sort();
}

test('tmux mode menu actions do not crash and fail gracefully', async function() {
  var tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-tmux-audit-'));
  process.env.HOME = tmpHome;
  process.env.CCC_TMUX_SESSION = 'ci-audit-session';
  process.env.CCC_SIMPLE = '1';

  var tui = require('../tui');
  var Engine = require('../engine');

  var originalSelect = tui.select;
  var originalSpinner = tui.spinner;
  var originalWipe = tui.wipeTransition;

  tui.select = async function() { return -1; };
  tui.spinner = function() { return { start: function() {}, stop: function() {} }; };
  tui.wipeTransition = async function() {};

  var adventuresDir = path.join(__dirname, '..', 'adventures');
  var actions = collectActions(adventuresDir);
  assert.ok(actions.length > 0, 'Expected at least one action to audit');

  var engine = new Engine();
  engine.ask = async function() { return ''; };
  engine.pause = async function() {};
  engine.rl = { close: function() {}, question: function(_p, cb) { cb(''); } };

  var failures = [];
  var nullableActions = new Set(['quit']);

  for (var i = 0; i < actions.length; i++) {
    var action = actions[i];
    var out = [];
    var err = [];
    var origStdout = process.stdout.write.bind(process.stdout);
    var origStderr = process.stderr.write.bind(process.stderr);

    process.stdout.write = function(s) { out.push(String(s)); return true; };
    process.stderr.write = function(s) { err.push(String(s)); return true; };

    var result = null;
    var threw = null;

    try {
      result = await Promise.race([
        engine.executeAction(action, {}, { description: 'tmux audit task' }),
        new Promise(function(_resolve, reject) {
          setTimeout(function() { reject(new Error('timeout')); }, 8000);
        }),
      ]);
    } catch (e) {
      threw = e;
    }

    process.stdout.write = origStdout;
    process.stderr.write = origStderr;

    if (threw) {
      failures.push({ action: action, reason: 'threw', detail: threw.message });
      continue;
    }

    var resultType = typeof result;
    var validResult = result === null || resultType === 'object';
    if (!validResult) {
      failures.push({ action: action, reason: 'invalid-return', detail: String(resultType) });
      continue;
    }

    if (nullableActions.has(action)) {
      if (result !== null && !(result && typeof result.next === 'string')) {
        failures.push({ action: action, reason: 'invalid-nullable-return', detail: JSON.stringify(result) });
        continue;
      }
    } else {
      if (!result || typeof result.next !== 'string') {
        failures.push({ action: action, reason: 'missing-next', detail: JSON.stringify(result) });
        continue;
      }
    }

    // If an error message is shown, it must still return control to menu flow.
    var text = (out.join('') + '\n' + err.join('')).replace(/\x1b\[[0-9;]*m/g, '');
    var hasErrorText = /\b(Error:|error:|Unknown action|Build failed|not responding)\b/i.test(text);
    if (hasErrorText && !nullableActions.has(action) && (!result || typeof result.next !== 'string')) {
      failures.push({ action: action, reason: 'non-graceful-error-return', detail: JSON.stringify(result) });
    }
  }

  tui.select = originalSelect;
  tui.spinner = originalSpinner;
  tui.wipeTransition = originalWipe;

  assert.deepStrictEqual(failures, [], 'Action failures: ' + JSON.stringify(failures, null, 2));
});
