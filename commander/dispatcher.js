'use strict';

var childProcess = require('child_process');

function generateSessionName(task) {
  return 'kc-' + task.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 40).replace(/-+$/, '');
}

function getDefaultsForLevel(level) {
  switch (level) {
    case 'power': return { effort: 'high', maxBudgetUsd: 10, model: 'opus', maxTurns: 50 };
    case 'assisted': return { effort: 'medium', maxBudgetUsd: 5, model: 'opus', maxTurns: 40 };
    case 'guided': default: return { effort: 'medium', maxBudgetUsd: 3, model: 'sonnet', maxTurns: 30 };
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
  var model = options.model;
  var fallbackModel = options.fallbackModel !== undefined ? options.fallbackModel : 'sonnet';
  var worktree = options.worktree;
  var name = options.name;
  var continueSession = options.continueSession;
  var stream = options.stream !== false;

  var args = [];
  if (resume) {
    args.push('--resume', resume, '--continue');
  } else {
    args.push('-p', JSON.stringify(task));
  }

  // Stream mode: use stream-json for live events. Batch: json for final result only.
  if (stream && !bare) {
    args.push('--output-format', 'stream-json', '--verbose');
  } else {
    args.push('--output-format', 'json');
  }

  if (bare) args.push('--bare');
  args.push('--dangerously-skip-permissions');
  if (maxTurns) args.push('--max-turns', String(maxTurns));
  // resume handled above in args init
  // continue handled above in args init
  if (model) args.push('--model', model);
  if (fallbackModel && fallbackModel !== model) args.push('--fallback-model', fallbackModel);
  if (effort) args.push('--effort', effort);
  if (maxBudgetUsd) args.push('--max-budget-usd', String(maxBudgetUsd));
  if (name) args.push('--name', name);
  if (worktree) args.push('--worktree', worktree);
  if (jsonSchema) args.push('--json-schema', JSON.stringify(jsonSchema));
  if (allowedTools && allowedTools.length > 0) args.push('--allowedTools', allowedTools.join(','));
  if (systemPrompt) args.push('--append-system-prompt', JSON.stringify(systemPrompt));

  var command = 'claude';
  if (!sync) return { command: command + ' ' + args.join(' '), async: true };

  var env = Object.assign({}, process.env, { CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '70' });

  if (stream) {
    var childProc = null;
    var promise = new Promise(function(resolve, reject) {
      childProc = childProcess.spawn(command, args, {
        cwd: cwd || process.cwd(),
        env: env,
        stdio: ['inherit', 'pipe', 'pipe'],
      });
      var proc = childProc;

      var output = '';
      var lastResult = null;

      proc.stdout.on('data', function(chunk) {
        var text = chunk.toString();
        output += text;

        if (!bare) {
          // stream-json: each line is a JSON event. Parse and display live.
          text.split('\n').forEach(function(line) {
            if (!line.trim()) return;
            try {
              var evt = JSON.parse(line);
              if (evt.type === 'assistant' && evt.message && evt.message.content) {
                evt.message.content.forEach(function(block) {
                  if (block.type === 'text' && block.text) {
                    process.stdout.write(block.text);
                  }
                  if (block.type === 'tool_use') {
                    var toolLabel = block.name || 'unknown';
                    var toolInput = '';
                    if (block.input) {
                      if (block.input.command) toolInput = block.input.command.slice(0, 120);
                      else if (block.input.pattern) toolInput = block.input.pattern;
                      else if (block.input.file_path) toolInput = block.input.file_path;
                      else if (block.input.query) toolInput = block.input.query.slice(0, 80);
                      else if (block.input.url) toolInput = block.input.url.slice(0, 80);
                    }
                    process.stdout.write('\n  \x1b[38;5;245m[\u2699 ' + toolLabel + (toolInput ? ': ' + toolInput : '') + ']\x1b[0m\n');
                  }
                });
              }
              if (evt.type === 'user' && evt.message && evt.message.content) {
                // Tool results — show abbreviated
                evt.message.content.forEach(function(block) {
                  if (block.type === 'tool_result' && block.content) {
                    var preview = typeof block.content === 'string' ? block.content.slice(0, 150) : '';
                    if (preview) process.stdout.write('  \x1b[38;5;240m' + preview.replace(/\n/g, ' ') + '\x1b[0m\n');
                  }
                });
              }
              if (evt.type === 'result') {
                lastResult = evt;
              }
            } catch(_e) {
              // partial JSON line — buffer could split mid-event, skip
            }
          });
        } else {
          process.stdout.write(text);
        }
      });

      proc.stderr.on('data', function(chunk) {
        process.stderr.write(chunk.toString());
      });

      proc.on('close', function(code) {
        if (code !== 0) {
          var detail = output.trim().split('\n').slice(-3).join(' ').slice(0, 300);
          reject(new Error('Claude Code exited with code ' + code + (detail ? ': ' + detail : '')));
          return;
        }
        if (lastResult) {
          resolve({
            result: lastResult.result || output.trim(),
            session_id: lastResult.session_id || null,
            cost_usd: lastResult.cost_usd || 0,
          });
        } else {
          try {
            var jsonMatch = output.match(/\{[\s\S]*\}\s*$/);
            if (jsonMatch) resolve(JSON.parse(jsonMatch[0]));
            else resolve({ result: output.trim(), session_id: null, cost_usd: 0 });
          } catch (_e) {
            resolve({ result: output.trim(), session_id: null, cost_usd: 0 });
          }
        }
      });

      proc.on('error', function(err) {
        reject(new Error('Claude Code dispatch failed: ' + err.message));
      });
    });
    // Attach child process to promise so caller can kill it
    promise.childProcess = childProc;
    return promise;
  }

  // Silent mode (stream=false): batch JSON for background jobs
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
