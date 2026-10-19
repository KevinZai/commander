'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ATTRIBUTION_KEYS = ['CLAUDECODE', 'BRAIN_AGENT', 'BRAIN_DOMAIN', 'OPENCLAW_AGENT_ID', 'OPENCLAW_SESSION_ID', 'OPENCLAW_SESSION_KEY', 'OPENCLAW_SHELL', 'CODEX_THREAD_ID', 'CODEX_SESSION_ID'];

function quote(value) { return "'" + String(value).replace(/'/g, "'\\''") + "'"; }

function interactiveArgs(options = {}, sessionId) {
  for (const key of ['maxBudgetUsd', 'jsonSchema', 'outputFormat']) {
    if (options[key] != null) {
      throw new Error(key + ' is unsupported by interactive Remote Control dispatch. Remove the print-only option; use timeoutMs for report observation. Dollar caps are not enforced in this mode.');
    }
  }
  const args = ['--remote-control', options.name || 'ccc'];
  if (options.resume) args.push('--resume', options.resume);
  else if (sessionId) args.push('--session-id', sessionId);
  if (options.model) args.push('--model', options.model);
  if (options.fallbackModel) args.push('--fallback-model', options.fallbackModel);
  if (options.effort) args.push('--effort', options.effort);
  if (options.verbose) args.push('--verbose');
  if (options.permissionMode) args.push('--permission-mode', options.permissionMode);
  if (options.skipPermissions) args.push('--dangerously-skip-permissions');
  if (options.allowedTools && options.allowedTools.length) args.push('--allowedTools', options.allowedTools.join(','));
  if (options.systemPrompt) args.push('--append-system-prompt', options.systemPrompt);
  if (options.worktree) args.push('--worktree', options.worktree);
  return args;
}

const DEFAULT_WALL_TIMEOUT_MS = 45 * 60 * 1000;
const WATCHDOG_POLL_MS = 5000;
const KILL_GRACE_MS = 10000;
const REAP_SETTLE_MS = 3000;

function positiveInt(value, name) {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(name + ' must be a positive integer');
  return number;
}

function findTranscript(configDir, sessionId) {
  const projects = path.join(configDir || path.join(os.homedir(), '.claude'), 'projects');
  let entries;
  try { entries = fs.readdirSync(projects); } catch (_) { return null; }
  for (const entry of entries) {
    const file = path.join(projects, entry, sessionId + '.jsonl');
    try { if (fs.statSync(file).isFile()) return file; } catch (_) {}
  }
  return null;
}

// Incremental count of distinct assistant messages in the session transcript.
function createTurnCounter(configDir, sessionId) {
  const seen = new Set();
  let file = null;
  let offset = 0;
  let partial = '';
  return () => {
    if (!file) file = findTranscript(configDir, sessionId);
    if (!file) return seen.size;
    try {
      const size = fs.statSync(file).size;
      if (size < offset) { offset = 0; partial = ''; seen.clear(); }
      if (size > offset) {
        const fd = fs.openSync(file, 'r');
        try {
          const buffer = Buffer.alloc(size - offset);
          fs.readSync(fd, buffer, 0, buffer.length, offset);
          offset = size;
          const lines = (partial + buffer.toString('utf8')).split('\n');
          partial = lines.pop();
          for (const line of lines) {
            if (!line) continue;
            let entry;
            try { entry = JSON.parse(line); } catch (_) { continue; }
            if (entry && entry.type === 'assistant') seen.add((entry.message && entry.message.id) || entry.uuid || 'line-' + seen.size);
          }
        } finally { fs.closeSync(fd); }
      }
    } catch (_) {}
    return seen.size;
  };
}

function accountName() {
  if (process.env.CLAUDE_REMOTE_ACCOUNT) return process.env.CLAUDE_REMOTE_ACCOUNT;
  const name = path.basename(process.env.CLAUDE_CONFIG_DIR || '.claude');
  return name.startsWith('.claude-') ? name.slice(8) : 'default';
}

function writeJson(file, value) {
  const temp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, file);
}

function reportFailure(job, status, message) {
  let previous = '';
  try { previous = fs.readFileSync(job.report, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (/^Status: (done|blocked|failed) — [^\r\n]+/.test(previous)) return;
  const temp = job.report + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, 'Status: ' + status + ' — ' + message.replace(/[\r\n]+/g, ' ') + '\n' + (previous ? '\nIncomplete report preserved:\n' + previous : ''), { mode: 0o600 });
  fs.renameSync(temp, job.report);
}

function start(task, options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) throw new Error('--cwd must be an existing directory: ' + cwd);
  if (options.timeoutMs != null && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new Error('timeoutMs must be a positive number');
  const maxTurns = positiveInt(options.maxTurns, 'maxTurns');
  const wallTimeoutMs = options.wallTimeoutMs == null ? null : options.wallTimeoutMs;
  if (wallTimeoutMs != null && (!Number.isFinite(wallTimeoutMs) || wallTimeoutMs <= 0)) throw new Error('wallTimeoutMs must be a positive number');
  const sessionId = options.resume || crypto.randomUUID();
  const args = interactiveArgs(options, sessionId);
  if (typeof task !== 'string' || !task.trim()) throw new Error('Remote Control dispatch requires a non-empty task');
  const jobId = 'ccc-' + crypto.randomUUID();
  const root = path.resolve(process.env.CLAUDE_REMOTE_JOBS_DIR || path.join(os.homedir(), '.claude-remote', 'jobs'));
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const dir = path.join(root, jobId);
  fs.mkdirSync(dir, { mode: 0o700 });
  const report = path.resolve(options.report || path.join(cwd, 'reports', jobId + '-REPORT.md'));
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) throw new Error('Report already exists; select a fresh report path: ' + report);
  const promptFile = path.join(dir, 'prompt.txt');
  const prompt = task + '\n\nCompletion contract: perform the requested work and any authorized report/pingback steps. Your final action must write ' + JSON.stringify(report) + ' with first line "Status: done|blocked|failed — <one-line result>" using the actual status. Include the outcome and verification below it. Do not write a terminal status until work and pingbacks finish.';
  fs.writeFileSync(promptFile, prompt, { mode: 0o600 });
  const job = { version: 1, maxTurns, wallTimeoutMs, job: jobId, account: accountName(), model: options.model || null, sessionId, linearIssue: options.linearIssue || null, startedAt: new Date().toISOString(), cwd, tmuxSession: options.tmuxTarget || jobId, report };
  const jobFile = path.join(root, jobId + '.json');
  const configFile = path.join(dir, 'launch.json');
  writeJson(configFile, { binary: require('./claude-finder').resolve(), args, promptFile, cwd, exitFile: path.join(dir, 'exit.json'), stateFile: path.join(dir, 'state.json'), configDir: process.env.CLAUDE_CONFIG_DIR || null, sessionId, report, maxTurns, wallTimeoutMs, reapOnReport: options.reapOnReport === true, job: jobId, attribution: Object.fromEntries(ATTRIBUTION_KEYS.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]])) });
  try {
    writeJson(jobFile, job);
    if (options.beforeLaunch) options.beforeLaunch({ job, jobFile, exitFile: path.join(dir, 'exit.json'), stateFile: path.join(dir, 'state.json') });
    const command = [process.execPath, path.join(__dirname, 'remote-session.js'), '--run', configFile].map(quote).join(' ');
    const tmuxArgs = options.tmuxTarget ? ['split-window', '-h', '-t', options.tmuxTarget, '-c', cwd, command] : ['new-session', '-d', '-s', job.tmuxSession, '-c', cwd, command];
    cp.execFileSync('tmux', tmuxArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    reportFailure(job, 'failed', 'Interactive Remote Control launch failed');
    const failure = new Error('Remote Control launch failed. Verify tmux, Claude CLI, account login and workspace trust; no headless fallback was launched. ' + (error.code || 'tmux launch error'));
    failure.noRetry = true;
    throw failure;
  }
  return { job, jobFile, exitFile: path.join(dir, 'exit.json') };
}

function observe(handle, options = {}) {
  const timeoutMs = options.timeoutMs == null ? 4 * 60 * 60 * 1000 : options.timeoutMs;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('timeoutMs must be a positive number');
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const poll = () => {
      try {
        if (fs.existsSync(handle.job.report)) {
          const report = fs.readFileSync(handle.job.report, 'utf8');
          const match = report.match(/^Status: (done|blocked|failed) — ([^\r\n]+)/);
          if (match) {
            if (match[1] !== 'done') {
              const error = new Error('Claude reported ' + match[1] + ': ' + match[2] + ' (' + handle.job.report + ')');
              error.noRetry = true;
              return reject(error);
            }
            return resolve({ result: report, session_id: handle.job.sessionId, cost_usd: null, status: match[1], report: handle.job.report, tmux_session: handle.job.tmuxSession });
          }
        }
        if (fs.existsSync(handle.exitFile)) {
          reportFailure(handle.job, 'failed', 'Claude exited without a valid terminal report');
          const error = new Error('Claude exited without a valid terminal report: ' + handle.job.report);
          error.noRetry = true;
          return reject(error);
        }
        if (Date.now() >= deadline) {
          reportFailure(handle.job, 'blocked', 'Report observation timed out; interactive session remains available for steering');
          const error = new Error('Timed out waiting for report; session remains available in tmux: ' + handle.job.tmuxSession);
          error.noRetry = true;
          return reject(error);
        }
        setTimeout(poll, options.pollMs || 1000);
      } catch (error) { error.noRetry = true; reject(error); }
    };
    poll();
  });
}

// Process-tree reaping. Descendants are snapshotted before signalling because
// children re-parent to init once their parent dies.
function processTable() {
  try {
    return cp.execFileSync('ps', ['-A', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 })
      .split('\n').map(line => line.match(/^\s*(\d+)\s+(\d+)\s?(.*)$/)).filter(Boolean)
      .map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), command: m[3] }));
  } catch (_) { return []; }
}

function descendants(roots, rows) {
  const tree = new Set(roots.filter(pid => Number.isInteger(pid) && pid > 1));
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) if (tree.has(row.ppid) && !tree.has(row.pid) && row.pid !== process.pid) { tree.add(row.pid); grew = true; }
  }
  return [...tree];
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

function signalAll(pids, signal) { for (const pid of pids) { try { process.kill(pid, signal); } catch (_) {} } }

// SIGTERM the whole tree, then SIGKILL whatever survives the grace period.
function terminateTree(roots, options = {}) {
  const graceMs = options.graceMs == null ? KILL_GRACE_MS : options.graceMs;
  const pids = descendants(roots, options.rows || processTable());
  signalAll(pids, 'SIGTERM');
  return new Promise(resolve => {
    const deadline = Date.now() + graceMs;
    const poll = () => {
      const left = pids.filter(alive);
      if (!left.length) return resolve({ pids, killed: [] });
      if (Date.now() >= deadline) {
        const killed = [...new Set(left.concat(descendants(left, processTable())))];
        signalAll(killed, 'SIGKILL');
        return resolve({ pids, killed });
      }
      setTimeout(poll, options.pollMs || 100);
    };
    poll();
  });
}

// Stop a launched job's supervisor, Claude session and their descendants. Only pids whose
// command line still names this job (supervisor) or session id (Claude) are signalled.
async function stopSession(remote, options = {}) {
  let state;
  try { state = JSON.parse(fs.readFileSync(remote.stateFile, 'utf8')); } catch (_) { return { stopped: false, reason: 'no supervisor state', pids: [] }; }
  if (!state || state.sessionId !== remote.sessionId) return { stopped: false, reason: 'supervisor state does not match the session', pids: [] };
  const rows = processTable();
  const command = pid => (rows.find(row => row.pid === pid) || {}).command || '';
  const roots = [];
  if (Number.isInteger(state.supervisorPid) && command(state.supervisorPid).includes('remote-session.js') && command(state.supervisorPid).includes(remote.job)) roots.push(state.supervisorPid);
  if (Number.isInteger(state.childPid) && command(state.childPid).includes(remote.sessionId)) roots.push(state.childPid);
  const result = roots.length ? await terminateTree(roots, { graceMs: options.graceMs, rows }) : { pids: [], killed: [] };
  // Only the dedicated session this job created; split panes belong to the caller's session.
  if (remote.tmuxSession && remote.tmuxSession === remote.job) {
    try { cp.execFileSync('tmux', ['kill-session', '-t', '=' + remote.tmuxSession], { stdio: 'ignore', timeout: 5000 }); } catch (_) {}
  }
  return { stopped: roots.length > 0, reason: roots.length ? null : 'session already gone', pids: result.pids, killed: result.killed };
}

function remoteReady(config, pid) {
  const sessions = path.join(config.configDir || path.join(os.homedir(), '.claude'), 'sessions');
  try {
    const native = JSON.parse(fs.readFileSync(path.join(sessions, pid + '.json'), 'utf8'));
    if (native.pid !== pid || native.sessionId !== config.sessionId || !/^session_[A-Za-z0-9_-]{6,128}$/.test(native.bridgeSessionId || '')) return false;
    process.kill(pid, 0);
    return true;
  } catch (_) { return false; }
}

function run(config) {
  const env = { ...process.env };
  for (const key of ATTRIBUTION_KEYS) {
    if (config.attribution && Object.hasOwn(config.attribution, key)) env[key] = config.attribution[key];
    else delete env[key];
  }
  if (config.configDir) env.CLAUDE_CONFIG_DIR = config.configDir;
  else delete env.CLAUDE_CONFIG_DIR;
  // Start without a task: --remote-control can continue locally after an RC failure.
  const child = cp.spawn(config.binary, config.args, { cwd: config.cwd, env, stdio: 'inherit' });
  if (config.stateFile) writeJson(config.stateFile, { supervisorPid: process.pid, childPid: child.pid || null, sessionId: config.sessionId });
  let stopped = false;
  // Claude handles terminal Ctrl+C; keep its supervising pane alive.
  process.on('SIGINT', () => {});
  child.on('error', () => {
    stopped = true;
    reportFailure(config, 'failed', 'Claude could not start');
    writeJson(config.exitFile, { code: null, error: 'spawn-failed' });
    process.exitCode = 1;
  });
  child.on('close', (code, signal) => {
    stopped = true;
    reportFailure(config, 'failed', 'Claude exited without writing a terminal report');
    writeJson(config.exitFile, { code, signal });
    process.exitCode = code == null ? 1 : code;
  });
  let terminating = false;
  const terminate = (message) => {
    if (stopped || terminating) return;
    terminating = true;
    reportFailure(config, 'blocked', message);
    terminateTree([child.pid], { graceMs: config.killGraceMs || KILL_GRACE_MS });
  };
  // Stopping the supervisor (daemon stop, tmux kill-session) takes the session down with it.
  for (const signal of ['SIGTERM', 'SIGHUP']) process.on(signal, () => terminate('Supervisor received ' + signal + '; session terminated'));
  const timers = [];
  if (config.wallTimeoutMs) {
    timers.push(setTimeout(() => terminate('Wall-clock limit of ' + Math.round(config.wallTimeoutMs / 1000) + ' seconds reached; session terminated by the supervisor'), config.wallTimeoutMs));
  }
  if (config.maxTurns) {
    const turns = createTurnCounter(config.configDir, config.sessionId);
    const watch = setInterval(() => {
      const count = turns();
      if (count > config.maxTurns) terminate('Turn limit of ' + config.maxTurns + ' exceeded (' + count + ' assistant turns); session terminated by the supervisor');
    }, config.watchdogPollMs || WATCHDOG_POLL_MS);
    timers.push(watch);
  }
  if (config.reapOnReport) {
    // A settled job must not keep its session: end it shortly after the terminal report lands.
    const reaper = setInterval(() => {
      let report = '';
      try { report = fs.readFileSync(config.report, 'utf8'); } catch (_) { return; }
      if (!/^Status: (done|blocked|failed) — [^\r\n]+/.test(report)) return;
      clearInterval(reaper);
      timers.push(setTimeout(() => terminate('Terminal report written; session reaped'), config.reapSettleMs == null ? REAP_SETTLE_MS : config.reapSettleMs));
    }, config.reapPollMs || 1000);
    timers.push(reaper);
  }
  child.on('close', () => timers.forEach(timer => { clearTimeout(timer); clearInterval(timer); }));
  const deadline = Date.now() + 120000;
  const poll = () => {
    if (stopped) return;
    if (remoteReady(config, child.pid)) {
      try {
        if (!process.env.TMUX_PANE) throw new Error('No tmux pane');
        const buffer = 'ccc-' + config.job;
        cp.execFileSync('tmux', ['load-buffer', '-b', buffer, '-'], { input: fs.readFileSync(config.promptFile), stdio: ['pipe', 'pipe', 'pipe'] });
        cp.execFileSync('tmux', ['paste-buffer', '-p', '-d', '-b', buffer, '-t', process.env.TMUX_PANE], { stdio: ['ignore', 'pipe', 'pipe'] });
        setTimeout(() => {
          try { cp.execFileSync('tmux', ['send-keys', '-t', process.env.TMUX_PANE, 'Enter'], { stdio: ['ignore', 'pipe', 'pipe'] }); }
          catch (_) { reportFailure(config, 'blocked', 'Remote Control ready but prompt submission failed; inspect tmux'); }
        }, 250);
      } catch (_) { reportFailure(config, 'blocked', 'Remote Control ready but prompt injection failed; inspect tmux'); }
      return;
    }
    if (Date.now() >= deadline) {
      reportFailure(config, 'blocked', 'Remote Control did not register within 120 seconds; no task injected. Check account eligibility, organization policy, login, consent and workspace trust in tmux.');
      return;
    }
    setTimeout(poll, 500);
  };
  poll();
}

if (require.main === module && process.argv[2] === '--run') run(JSON.parse(fs.readFileSync(process.argv[3], 'utf8')));

module.exports = { start, observe, interactiveArgs, accountName, quote, remoteReady, createTurnCounter, findTranscript, descendants, processTable, terminateTree, stopSession, DEFAULT_WALL_TIMEOUT_MS, KILL_GRACE_MS };
