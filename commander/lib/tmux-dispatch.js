'use strict';

// Split-mode dispatch: open a new tmux pane to the right of the CCC menu,
// start an interactive Claude Code session in it, and type the task once
// Claude Code is running. Every pane command targets the pane id that
// split-window printed, so a pane the user focused meanwhile never receives
// the launch line or the task text.
//
// exec and sleep are injectable so tests can drive the flow with a fake tmux.

var SHELLS = ['sh', 'bash', 'zsh', 'fish', 'dash', 'ksh', 'mksh', 'tcsh', 'csh', 'nu', 'login'];

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function isShell(command) {
  var c = String(command || '').trim().replace(/^-/, '');
  if (!c) return true;
  c = c.split('/').pop();
  return SHELLS.indexOf(c) !== -1;
}

function defaultExec(cmd, args, options) {
  var cp = require('child_process');
  return cp.execFileSync(cmd, args, Object.assign({ encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }, options || {}));
}

function defaultSleep(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (_e) { /* noop */ }
}

function defaultWrite(text) {
  process.stdout.write(text);
}

// Returns false when Claude Code reports an authentication failure.
function checkAuth(exec, claudeBin, write) {
  try {
    exec(claudeBin, ['-p', 'reply with OK', '--max-turns', '1', '--output-format', 'text'], { timeout: 15000 });
  } catch (authErr) {
    var errMsg = String(authErr.stderr || authErr.message || '');
    if (errMsg.indexOf('authentication') !== -1 || errMsg.indexOf('401') !== -1 || errMsg.indexOf('login') !== -1) {
      write('\n  \x1b[31mAuth error: Claude Code credentials are invalid or expired.\x1b[0m\n');
      write('  Run \x1b[1mclaude /login\x1b[0m to re-authenticate, then try again.\n\n');
      return false;
    }
  }
  return true;
}

// Ready once the pane's foreground command is not a shell on two consecutive
// polls (the shell has handed the terminal to Claude Code and it stayed up).
function waitForClaude(exec, sleep, paneId, maxPolls, pollMs) {
  var streak = 0;
  for (var attempt = 0; attempt < maxPolls; attempt++) {
    sleep(pollMs);
    var current = '';
    try {
      current = String(exec('tmux', ['display-message', '-p', '-t', paneId, '#{pane_current_command}'])).trim();
    } catch (_e) { current = ''; }
    streak = isShell(current) ? 0 : streak + 1;
    if (streak >= 2) return true;
  }
  return false;
}

/**
 * Dispatch a task (or resume a session) into a new tmux pane.
 * Returns the Claude session id, or null when the pane could not be created,
 * Claude Code never became ready, or authentication failed.
 */
function dispatch(task, resumeSessionId, options) {
  var o = options || {};
  var exec = o.exec || defaultExec;
  var sleep = o.sleep || defaultSleep;
  var write = o.write || defaultWrite;
  var maxPolls = o.maxPolls || 24;
  var pollMs = o.pollMs || 500;
  var sessionName = o.sessionName || 'ccc';
  var paneTitle = o.paneTitle || 'claude';
  var crypto = require('crypto');

  try {
    var claudeBin = o.claudeBin || require('../claude-finder').resolve();
    if (o.authCheck !== false && !checkAuth(exec, claudeBin, write)) return null;

    var sessionId = resumeSessionId || crypto.randomUUID();
    if (!/^[a-zA-Z0-9._:-]+$/.test(sessionId)) {
      if (resumeSessionId) return null;
      sessionId = crypto.randomUUID();
    }

    var paneCount = 1;
    try {
      paneCount = parseInt(String(exec('tmux', ['display-message', '-p', '-t', sessionName, '#{window_panes}'])).trim(), 10) || 1;
    } catch (_e) { /* single pane */ }

    var splitArgs = paneCount === 1
      ? ['split-window', '-h', '-t', sessionName, '-l', '75%', '-P', '-F', '#{pane_id}']
      : ['split-window', '-h', '-t', sessionName + ':.' + (paneCount - 1), '-P', '-F', '#{pane_id}'];
    var paneId = String(exec('tmux', splitArgs)).trim();
    if (!/^%\d+$/.test(paneId)) return null;

    exec('tmux', ['select-pane', '-t', paneId, '-T', paneTitle]);

    var launch = shellQuote(claudeBin) + (resumeSessionId
      ? ' --resume ' + sessionId + ' --continue'
      : ' --session-id ' + sessionId);
    exec('tmux', ['send-keys', '-t', paneId, '-l', launch]);
    exec('tmux', ['send-keys', '-t', paneId, 'Enter']);

    if (!resumeSessionId) {
      if (!waitForClaude(exec, sleep, paneId, maxPolls, pollMs)) {
        write('\n  Claude Code did not start in pane ' + paneId + '; the task was not sent.\n');
        return null;
      }
      var safeTask = String(task || '').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 4000);
      exec('tmux', ['send-keys', '-t', paneId, '-l', safeTask]);
      exec('tmux', ['send-keys', '-t', paneId, 'Enter']);
    }

    // Return focus to the menu pane and rebalance.
    try { exec('tmux', ['select-pane', '-t', sessionName + ':.0']); } catch (_e) { /* best effort */ }
    try {
      exec('tmux', ['select-layout', '-t', sessionName, 'main-vertical']);
      exec('tmux', ['resize-pane', '-t', sessionName + ':.0', '-x', '35']);
    } catch (_e) { /* best effort */ }

    return sessionId;
  } catch (_e) {
    return null;
  }
}

module.exports = {
  dispatch: dispatch,
  shellQuote: shellQuote,
  isShell: isShell,
  waitForClaude: waitForClaude
};
