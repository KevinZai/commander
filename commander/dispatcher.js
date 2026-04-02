'use strict';

var childProcess = require('child_process');

function generateSessionName(task) {
  return 'kc-' + task.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 40).replace(/-+$/, '');
}

function getDefaultsForLevel(level) {
  switch (level) {
    case 'power': return { effort: 'high', maxBudgetUsd: 5, model: 'opusplan', maxTurns: 50 };
    case 'assisted': return { effort: 'medium', maxBudgetUsd: 3, model: 'opusplan', maxTurns: 40 };
    case 'guided': default: return { effort: 'medium', maxBudgetUsd: 2, model: 'sonnet', maxTurns: 30 };
  }
}

function dispatch(task, options) {
  if (!options) options = {};
  var sync = options.sync !== undefined ? options.sync : true;
  var maxTurns = options.maxTurns || 30;
  var resume = options.resume;
  var allowedTools = options.allowedTools;
  var systemPrompt = options.systemPrompt;
  var cwd = options.cwd;
  var bare = options.bare !== undefined ? options.bare : true;
  var jsonSchema = options.jsonSchema;
  var maxBudgetUsd = options.maxBudgetUsd;
  var effort = options.effort;
  var permissionMode = options.permissionMode !== undefined ? options.permissionMode : 'plan';
  var model = options.model;
  var fallbackModel = options.fallbackModel !== undefined ? options.fallbackModel : 'sonnet';
  var worktree = options.worktree;
  var name = options.name;
  var continueSession = options.continueSession;

  var args = ['-p', JSON.stringify(task), '--output-format', 'json'];
  if (bare) args.push('--bare');
  args.push('--dangerously-skip-permissions');
  if (maxTurns) args.push('--max-turns', String(maxTurns));
  if (resume) args.push('--resume', resume);
  if (continueSession) args.push('--continue');
  if (model) args.push('--model', model);
  if (fallbackModel && fallbackModel !== model) args.push('--fallback-model', fallbackModel);
  if (effort) args.push('--effort', effort);
  // --dangerously-skip-permissions replaces --permission-mode (they conflict)
  if (maxBudgetUsd) args.push('--max-budget-usd', String(maxBudgetUsd));
  if (name) args.push('--name', name);
  if (worktree) args.push('--worktree', worktree);
  if (jsonSchema) args.push('--json-schema', JSON.stringify(jsonSchema));
  if (allowedTools && allowedTools.length > 0) args.push('--allowedTools', allowedTools.join(','));
  if (systemPrompt) args.push('--append-system-prompt', JSON.stringify(systemPrompt));

  var command = 'claude';
  if (!sync) return { command: command + ' ' + args.join(' '), async: true };

  var env = Object.assign({}, process.env, { CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '70' });
  var stream = options.stream !== false; // default: stream live output

  if (stream) {
    // Stream mode: show live output like regular claude, collect result at end
    return new Promise(function(resolve, reject) {
      var proc = childProcess.spawn(command, args, {
        cwd: cwd || process.cwd(),
        env: env,
        stdio: ['inherit', 'pipe', 'pipe'], // stdin inherit, stdout+stderr piped
      });

      var output = '';
      var stderrOutput = '';
      proc.stdout.on('data', function(chunk) {
        var text = chunk.toString();
        output += text;
        if (bare) process.stdout.write(text);
      });
      proc.stderr.on('data', function(chunk) {
        var text = chunk.toString();
        stderrOutput += text;
        process.stderr.write(text); // always stream stderr to terminal
      });

      proc.on('close', function(code) {
        if (code !== 0) {
          var detail = stderrOutput.trim().split('\n').slice(-3).join(' ').slice(0, 300);
          reject(new Error('Claude Code exited with code ' + code + (detail ? ': ' + detail : '')));
          return;
        }
        // Try to parse the last JSON object from output
        try {
          // Find last complete JSON object (claude outputs JSON at end with --output-format json)
          var jsonMatch = output.match(/\{[\s\S]*\}\s*$/);
          if (jsonMatch) resolve(JSON.parse(jsonMatch[0]));
          else resolve({ result: output.trim(), session_id: null, cost_usd: 0 });
        } catch (_e) {
          resolve({ result: output.trim(), session_id: null, cost_usd: 0 });
        }
      });

      proc.on('error', function(err) {
        reject(new Error('Claude Code dispatch failed: ' + err.message));
      });
    });
  }

  // Silent mode (stream=false): original behavior for background/batch jobs
  try {
    var stdout = childProcess.execSync(command + ' ' + args.join(' '), {
      encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 10 * 60 * 1000,
      cwd: cwd || process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env: env,
    });
    try { return JSON.parse(stdout); } catch (_e) { return { result: stdout.trim(), session_id: null, cost_usd: 0 }; }
  } catch (err) {
    try { childProcess.execSync('which claude', { encoding: 'utf8' }); }
    catch (_e2) { throw new Error('Claude Code CLI not found. Install: npm i -g @anthropic-ai/claude-code'); }
    var message = err.stderr ? err.stderr.toString().slice(0, 200) : err.message;
    throw new Error('Claude Code dispatch failed: ' + message);
  }
}

function isClaudeAvailable() {
  try { childProcess.execSync('which claude', { encoding: 'utf8', stdio: 'pipe' }); return true; } catch (_e) { return false; }
}

function getClaudeVersion() {
  try { return childProcess.execSync('claude --version', { encoding: 'utf8', stdio: 'pipe' }).trim(); } catch (_e) { return null; }
}

module.exports = { dispatch: dispatch, isClaudeAvailable: isClaudeAvailable, getClaudeVersion: getClaudeVersion, generateSessionName: generateSessionName, getDefaultsForLevel: getDefaultsForLevel };
