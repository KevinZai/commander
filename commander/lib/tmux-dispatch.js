'use strict';

// Split-mode dispatch: open a new tmux pane to the right of the CCC menu,
// start an interactive Claude Code session in it, and type the task once
// Claude Code is running. Every pane command targets the pane id that
// split-window printed, so a pane the user focused meanwhile never receives
// the launch line or the task text.
//
// exec and sleep are injectable so tests can drive the flow with a fake tmux.

var SHELLS = ['sh', 'bash', 'zsh', 'fish', 'dash', 'ksh', 'mksh', 'tcsh', 'csh', 'nu', 'login'];

// Readiness is an allowlist: the task is typed only when the pane's
// foreground command is Claude Code itself. A denylist of shells let task
// text reach any unlisted shell or REPL (ash, busybox, pwsh, xonsh, python3).
var CLAUDE_COMMANDS = ['claude', 'node'];
// The native installer runs the binary from versions/<semver>, so tmux
// reports the version string as the command name.
var NATIVE_VERSION_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function isShell(command) {
  var c = String(command || '').trim().replace(/^-/, '');
  if (!c) return true;
  c = c.split('/').pop();
  return SHELLS.indexOf(c) !== -1;
}

function commandName(command) {
  return String(command || '').trim().replace(/^-/, '').split('/').pop();
}

// True only when the foreground command is Claude Code: claude, node, the
// basename of the resolved claude binary, or a native-installer version name.
function isClaudeProcess(command, claudeBin) {
  var c = commandName(command);
  if (!c || isShell(c)) return false;
  if (CLAUDE_COMMANDS.indexOf(c) !== -1) return true;
  if (NATIVE_VERSION_RE.test(c)) return true;
  var bin = commandName(claudeBin);
  return !!bin && bin === c;
}

// Claude Code's own screen text: the welcome banner, the prompt footer
// ("? for shortcuts", permission-mode line) or the busy hint. A node REPL,
// a pager or a shell prompt never prints these, so together with the
// foreground command they are a positive "Claude is ready" signal.
var CLAUDE_UI = /\?\s*for shortcuts|Claude Code|shift\+tab to cycle|esc to interrupt|\u23f5\u23f5|bypass permissions on|accept edits on|plan mode on|auto mode on/i;

function paneShowsClaude(exec, paneId) {
  try {
    return CLAUDE_UI.test(String(exec('tmux', ['capture-pane', '-p', '-t', paneId])));
  } catch (_e) {
    return false;
  }
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

// Ready only on a positive signal, two polls in a row: the pane's foreground
// command is Claude Code (allowlist, never "not a shell") AND the pane shows
// Claude Code's prompt UI. Anything else (a shell, sleep, a REPL, a pager)
// resets the streak, so the task is never typed into another program.
function waitForClaude(exec, sleep, paneId, maxPolls, pollMs, claudeBin) {
  var streak = 0;
  for (var attempt = 0; attempt < maxPolls; attempt++) {
    sleep(pollMs);
    var current = '';
    try {
      current = String(exec('tmux', ['display-message', '-p', '-t', paneId, '#{pane_current_command}'])).trim();
    } catch (_e) { current = ''; }
    var ready = isClaudeProcess(current, claudeBin) && paneShowsClaude(exec, paneId);
    streak = ready ? streak + 1 : 0;
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
    // Start the pane in the imported project's directory, so Claude Code loads its CLAUDE.md.
    if (o.cwd) splitArgs.push('-c', String(o.cwd));
    var paneId = String(exec('tmux', splitArgs)).trim();
    if (!/^%\d+$/.test(paneId)) return null;

    exec('tmux', ['select-pane', '-t', paneId, '-T', paneTitle]);

    var launch = shellQuote(claudeBin) + (resumeSessionId
      ? ' --resume ' + sessionId + ' --continue'
      : ' --session-id ' + sessionId);
    exec('tmux', ['send-keys', '-t', paneId, '-l', launch]);
    exec('tmux', ['send-keys', '-t', paneId, 'Enter']);

    if (!resumeSessionId) {
      if (!waitForClaude(exec, sleep, paneId, maxPolls, pollMs, claudeBin)) {
        write('\n  Claude Code did not start in pane ' + paneId + '; the task was not sent.\n');
        return null;
      }
      var safeTask = String(task || '').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 4000);
      // "--" ends tmux option parsing so a task starting with "-" is literal text.
      exec('tmux', ['send-keys', '-t', paneId, '-l', '--', safeTask]);
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
  isClaudeProcess: isClaudeProcess,
  paneShowsClaude: paneShowsClaude,
  waitForClaude: waitForClaude
};
