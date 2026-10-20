'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ATTRIBUTION_KEYS = ['CLAUDECODE', 'BRAIN_AGENT', 'BRAIN_DOMAIN', 'OPENCLAW_AGENT_ID', 'OPENCLAW_SESSION_ID', 'OPENCLAW_SESSION_KEY', 'OPENCLAW_SHELL', 'CODEX_THREAD_ID', 'CODEX_SESSION_ID'];

function quote(value) { return "'" + String(value).replace(/'/g, "'\\''") + "'"; }

function interactiveArgs(options = {}, sessionId) {
  for (const key of ['maxTurns', 'maxBudgetUsd', 'jsonSchema', 'outputFormat']) {
    if (options[key] != null) {
      throw new Error(key + ' is unsupported by interactive Remote Control dispatch. Remove the print-only option; use timeoutMs for report observation. Dollar/turn caps are not enforced in this mode.');
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
  const job = { version: 1, job: jobId, account: accountName(), model: options.model || null, sessionId, linearIssue: options.linearIssue || null, startedAt: new Date().toISOString(), cwd, tmuxSession: options.tmuxTarget || jobId, report };
  const jobFile = path.join(root, jobId + '.json');
  const configFile = path.join(dir, 'launch.json');
  writeJson(configFile, { binary: require('./claude-finder').resolve(), args, promptFile, cwd, exitFile: path.join(dir, 'exit.json'), configDir: process.env.CLAUDE_CONFIG_DIR || null, sessionId, report, job: jobId, attribution: Object.fromEntries(ATTRIBUTION_KEYS.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]])) });
  try {
    writeJson(jobFile, job);
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

module.exports = { start, observe, interactiveArgs, accountName, quote, remoteReady };
