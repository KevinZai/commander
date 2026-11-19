'use strict';

var test = require('node:test');
var assert = require('node:assert');

var tmuxDispatch = require('../lib/tmux-dispatch');

// Fake tmux: records every call and answers display-message / split-window /
// capture-pane queries (the screen defaults to Claude Code's prompt UI).
// `commands` is the sequence #{pane_current_command} returns on successive polls.
function fakeTmux(commands, opts) {
  opts = opts || {};
  var calls = [];
  var polls = 0;
  function exec(cmd, args) {
    calls.push([cmd].concat(args));
    if (cmd !== 'tmux') return 'OK';
    if (args[0] === 'display-message' && args.indexOf('#{window_panes}') !== -1) return String(opts.panes || 1) + '\n';
    if (args[0] === 'split-window') return (opts.paneId || '%7') + '\n';
    if (args[0] === 'capture-pane') {
      return opts.screen !== undefined ? opts.screen : 'Welcome to Claude Code\n> \n? for shortcuts\n';
    }
    if (args[0] === 'display-message' && args.indexOf('#{pane_current_command}') !== -1) {
      var c = commands[Math.min(polls, commands.length - 1)];
      polls++;
      return c + '\n';
    }
    return '';
  }
  return { exec: exec, calls: calls };
}

function run(fake, task, resume, extra) {
  var o = Object.assign({
    exec: fake.exec,
    sleep: function() {},
    claudeBin: '/usr/local/bin/claude',
    sessionName: 'ccc',
    paneTitle: 'claude-1',
    authCheck: false,
    write: function() {}
  }, extra || {});
  return tmuxDispatch.dispatch(task, resume, o);
}

function sendKeys(calls) {
  return calls.filter(function(c) { return c[0] === 'tmux' && c[1] === 'send-keys'; });
}

test('no task text sent when readiness times out', function() {
  var fake = fakeTmux(['zsh']);
  var id = run(fake, 'write the release notes', null, { maxPolls: 5 });
  assert.strictEqual(id, null);
  var typed = sendKeys(fake.calls).map(function(c) { return c.join(' '); }).join('\n');
  assert.ok(typed.indexOf('release notes') === -1, 'task text must not be typed into a pane that never became ready:\n' + typed);
});

test('one non-shell poll is not enough; two consecutive are', function() {
  var fake = fakeTmux(['bash', 'claude', 'bash', 'claude', 'claude']);
  var id = run(fake, 'do the thing', null, { maxPolls: 10 });
  assert.ok(id, 'dispatch returns a session id once ready');
  var polls = fake.calls.filter(function(c) { return c[1] === 'display-message' && c.indexOf('#{pane_current_command}') !== -1; });
  assert.strictEqual(polls.length, 5);
  var last = sendKeys(fake.calls).slice(-2);
  assert.deepStrictEqual(last[0].slice(-3), ['-l', '--', 'do the thing']);
  assert.deepStrictEqual(last[1].slice(-1), ['Enter']);
});

test('targets the pane id', function() {
  var fake = fakeTmux(['node', 'node'], { paneId: '%42', panes: 3 });
  var id = run(fake, 'task', null);
  assert.ok(id);
  var split = fake.calls.filter(function(c) { return c[1] === 'split-window'; });
  assert.strictEqual(split.length, 1);
  assert.ok(split[0].indexOf('-P') !== -1 && split[0].indexOf('#{pane_id}') !== -1, 'split-window prints the new pane id');
  fake.calls.forEach(function(c) {
    if (c[1] === 'send-keys' || c[1] === 'capture-pane') {
      assert.strictEqual(c[c.indexOf('-t') + 1], '%42', c.join(' '));
    }
    if (c[1] === 'select-pane' && c.indexOf('-T') !== -1) {
      assert.strictEqual(c[c.indexOf('-t') + 1], '%42', c.join(' '));
    }
    if (c[1] === 'display-message' && c.indexOf('#{pane_current_command}') !== -1) {
      assert.strictEqual(c[c.indexOf('-t') + 1], '%42', c.join(' '));
    }
  });
});

test('a malformed pane id aborts without typing', function() {
  var fake = fakeTmux(['node', 'node'], { paneId: 'ccc:0.1' });
  assert.strictEqual(run(fake, 'task', null), null);
  assert.strictEqual(sendKeys(fake.calls).length, 0);
});

test('quotes the claude path', function() {
  var fake = fakeTmux(['claude', 'claude']);
  var id = run(fake, 'task', null, { claudeBin: "/Users/a b/it's/claude" });
  assert.ok(id);
  var launch = sendKeys(fake.calls)[0];
  var line = launch[launch.length - 1];
  assert.strictEqual(line, "'/Users/a b/it'\\''s/claude' --session-id " + id);
});

test('resume launches the session without sending a task', function() {
  var fake = fakeTmux(['zsh']);
  var id = run(fake, null, 'abc-123');
  assert.strictEqual(id, 'abc-123');
  var keys = sendKeys(fake.calls);
  assert.strictEqual(keys.length, 2);
  assert.strictEqual(keys[0][keys[0].length - 1], "'/usr/local/bin/claude' --resume abc-123 --continue");
});

test('shellQuote handles plain and quoted input', function() {
  assert.strictEqual(tmuxDispatch.shellQuote('/bin/claude'), "'/bin/claude'");
  assert.strictEqual(tmuxDispatch.shellQuote("a'b"), "'a'\\''b'");
});

test('isShell recognises login shells', function() {
  assert.ok(tmuxDispatch.isShell('-zsh'));
  assert.ok(tmuxDispatch.isShell('bash'));
  assert.ok(tmuxDispatch.isShell(''));
  assert.ok(!tmuxDispatch.isShell('claude'));
  assert.ok(!tmuxDispatch.isShell('node'));
});

test('readiness is an allowlist: unlisted shells and REPLs never receive the task', function() {
  ['ash', 'busybox', 'pwsh', 'elvish', 'xonsh', 'python3', 'vim', 'less'].forEach(function(cmd) {
    var fake = fakeTmux([cmd]);
    var id = run(fake, 'rm -rf build', null, { maxPolls: 6 });
    assert.strictEqual(id, null, cmd + ' must not count as ready');
    var typed = sendKeys(fake.calls).map(function(c) { return c.join(' '); }).join('\n');
    assert.ok(typed.indexOf('rm -rf build') === -1, cmd + ' received the task text');
  });
});

test('isClaudeProcess accepts claude, node, the binary basename and native version names', function() {
  assert.ok(tmuxDispatch.isClaudeProcess('claude'));
  assert.ok(tmuxDispatch.isClaudeProcess('node'));
  assert.ok(tmuxDispatch.isClaudeProcess('2.1.30'));
  assert.ok(tmuxDispatch.isClaudeProcess('claude-dev', '/opt/bin/claude-dev'));
  assert.ok(!tmuxDispatch.isClaudeProcess('bash', '/bin/bash'), 'a shell never counts even when it matches the binary name');
  assert.ok(!tmuxDispatch.isClaudeProcess('pwsh'));
  assert.ok(!tmuxDispatch.isClaudeProcess(''));
});

test('a task starting with "-" is sent after "--" so tmux treats it as text', function() {
  var fake = fakeTmux(['claude', 'claude']);
  var id = run(fake, '-t evil --flag', null);
  assert.ok(id);
  var taskKeys = sendKeys(fake.calls).filter(function(c) { return c[c.length - 1] === '-t evil --flag'; });
  assert.strictEqual(taskKeys.length, 1);
  assert.deepStrictEqual(taskKeys[0].slice(-3), ['-l', '--', '-t evil --flag']);
});

test('Codex counterexample: sleep or elvish in the pane never count as ready', function() {
  ['sleep', 'elvish'].forEach(function(cmd) {
    var fake = fakeTmux([cmd, cmd, cmd, cmd]);
    assert.strictEqual(run(fake, 'deploy prod', null, { maxPolls: 4 }), null, cmd);
    assert.strictEqual(sendKeys(fake.calls).filter(function(c) { return c[c.length - 1] === 'deploy prod' || c[c.length - 1] === 'Enter'; }).length, 1, cmd + ': only the launch Enter is sent');
  });
});

test('a node REPL without the Claude Code screen is not ready', function() {
  var fake = fakeTmux(['node', 'node', 'node'], { screen: 'Welcome to Node.js v22.0.0.\n> ' });
  assert.strictEqual(run(fake, 'process.exit()', null, { maxPolls: 3 }), null);
  var typed = sendKeys(fake.calls).map(function(c) { return c.join(' '); }).join('\n');
  assert.ok(typed.indexOf('process.exit()') === -1, typed);
});
