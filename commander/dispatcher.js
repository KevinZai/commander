'use strict';

const { execSync } = require('child_process');

/**
 * Dispatch a task to Claude Code in headless mode.
 *
 * Uses `claude -p` for non-interactive execution.
 * Returns parsed JSON result with session_id, result, and metadata.
 *
 * @param {string} task - Plain English task description
 * @param {object} options
 * @param {boolean} options.sync - Use synchronous execution (default: true)
 * @param {number} options.maxTurns - Max agentic iterations (default: 30)
 * @param {string} options.resume - Session ID to resume
 * @param {string[]} options.allowedTools - Tools to auto-approve
 * @param {string} options.systemPrompt - Additional system prompt
 * @param {string} options.cwd - Working directory for Claude Code
 * @returns {object} Parsed JSON result from Claude Code
 */
function dispatch(task, options = {}) {
  const {
    sync = true,
    maxTurns = 30,
    resume,
    allowedTools,
    systemPrompt,
    cwd,
  } = options;

  const args = ['-p', JSON.stringify(task), '--output-format', 'json'];

  if (maxTurns) args.push('--max-turns', String(maxTurns));
  if (resume) args.push('--resume', resume);
  if (allowedTools && allowedTools.length > 0) {
    args.push('--allowedTools', allowedTools.join(','));
  }
  if (systemPrompt) {
    args.push('--append-system-prompt', JSON.stringify(systemPrompt));
  }

  const command = `claude ${args.join(' ')}`;

  if (!sync) {
    // For future async support — return the command for external execution
    return { command, async: true };
  }

  try {
    const stdout = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      timeout: 10 * 60 * 1000, // 10 minute timeout
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Parse JSON output
    try {
      return JSON.parse(stdout);
    } catch {
      // If not valid JSON, wrap in result object
      return { result: stdout.trim(), session_id: null, cost_usd: 0 };
    }
  } catch (err) {
    // Check if Claude Code is installed
    try {
      execSync('which claude', { encoding: 'utf8' });
    } catch {
      throw new Error(
        'Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code'
      );
    }

    // Re-throw with cleaner message
    const message = err.stderr
      ? err.stderr.toString().slice(0, 200)
      : err.message;
    throw new Error(`Claude Code dispatch failed: ${message}`);
  }
}

/**
 * Check if Claude Code CLI is available.
 * @returns {boolean}
 */
function isClaudeAvailable() {
  try {
    execSync('which claude', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Claude Code version.
 * @returns {string|null}
 */
function getClaudeVersion() {
  try {
    return execSync('claude --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

module.exports = { dispatch, isClaudeAvailable, getClaudeVersion };
