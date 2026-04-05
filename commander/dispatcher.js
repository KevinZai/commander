'use strict';

var childProcess = require('child_process');

function generateSessionName(task) {
  return 'kc-' + task.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 40).replace(/-+$/, '');
}

function getDefaultsForLevel(level) {
  switch (level) {
    case 'power': return { effort: 'high', maxBudgetUsd: 10, model: 'opus', fallback: 'sonnet', maxTurns: 50 };
    case 'assisted': return { effort: 'medium', maxBudgetUsd: 5, model: 'opus', fallback: 'sonnet', maxTurns: 40 };
    case 'guided': default: return { effort: 'medium', maxBudgetUsd: 5, model: 'opus', fallback: 'sonnet', maxTurns: 30 };
  }
}

/**
 * Keyword signals with point weights for scoring complexity.
 * Negative = simpler, positive = more complex.
 */
var COMPLEXITY_SIGNALS = [
  // Trivial reducers
  { signal: 'fix typo', points: -30 },
  { signal: 'rename', points: -20 },
  { signal: 'update text', points: -25 },
  { signal: 'change color', points: -20 },
  { signal: 'add comment', points: -25 },
  { signal: 'one line', points: -30 },
  { signal: 'single file', points: -20 },
  { signal: 'quick fix', points: -20 },
  { signal: 'tweak', points: -15 },
  { signal: 'minor', points: -15 },
  { signal: 'small change', points: -20 },
  { signal: 'simple', points: -10 },
  // Moderate adders
  { signal: 'add feature', points: 15 },
  { signal: 'add page', points: 10 },
  { signal: 'create component', points: 10 },
  { signal: 'write test', points: 10 },
  { signal: 'integrate', points: 15 },
  { signal: 'refactor', points: 20 },
  { signal: 'debug', points: 10 },
  { signal: 'implement', points: 15 },
  { signal: 'set up', points: 10 },
  // High complexity adders
  { signal: 'build entire', points: 40 },
  { signal: 'full stack', points: 35 },
  { signal: 'build saas', points: 40 },
  { signal: 'saas', points: 30 },
  { signal: 'refactor all', points: 35 },
  { signal: 'migrate', points: 25 },
  { signal: 'redesign', points: 25 },
  { signal: 'from scratch', points: 30 },
  { signal: 'complete system', points: 40 },
  { signal: 'production', points: 20 },
  { signal: 'multi-tenant', points: 35 },
  { signal: 'authentication system', points: 30 },
  { signal: 'billing system', points: 35 },
  { signal: 'platform', points: 25 },
  { signal: 'architecture', points: 30 },
  { signal: 'overhaul', points: 35 },
  { signal: 'entire codebase', points: 40 },
  { signal: 'end to end', points: 25 },
  { signal: 'full application', points: 35 },
  { signal: 'complete app', points: 35 },
];

/**
 * Map a file count to an estimated scope bonus (0-20 points).
 * @param {number} fileCount
 * @returns {number}
 */
function fileCountToScopePoints(fileCount) {
  if (fileCount >= 20) return 20;
  if (fileCount >= 10) return 15;
  if (fileCount >= 5) return 10;
  if (fileCount >= 2) return 5;
  return 0;
}

/**
 * Estimate how many project files might be affected by a task.
 * Uses filename keyword matching — heuristic only.
 * @param {string} task
 * @param {string} projectDir
 * @returns {number} Estimated affected file count
 */
function estimateScope(task, projectDir) {
  if (!projectDir) return 0;
  var taskWords = task.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function(w) { return w.length > 3; });
  if (taskWords.length === 0) return 0;

  var fs = require('fs');
  var files = [];
  try {
    var entries = fs.readdirSync(projectDir);
    entries.forEach(function(entry) {
      var lower = entry.toLowerCase();
      // Skip hidden dirs and node_modules
      if (lower.startsWith('.') || lower === 'node_modules') return;
      files.push(lower);
      // One level deep into non-hidden subdirs
      try {
        var sub = require('path').join(projectDir, entry);
        if (fs.statSync(sub).isDirectory()) {
          fs.readdirSync(sub).forEach(function(f) {
            if (!f.startsWith('.')) files.push(f.toLowerCase());
          });
        }
      } catch (_e) {}
    });
  } catch (_e) { return 0; }

  var matched = files.filter(function(f) {
    return taskWords.some(function(w) { return f.indexOf(w) >= 0; });
  });

  return matched.length;
}

/**
 * Map a 0-100 score to turns/budget/effort.
 * @param {number} score
 * @returns {{ turns: number, budget: number, effort: string }}
 */
function scoreToParams(score) {
  if (score <= 25) return { turns: 10, budget: 1, effort: 'low' };
  if (score <= 50) return { turns: 20, budget: 3, effort: 'low' };
  if (score <= 75) return { turns: 35, budget: 6, effort: 'medium' };
  return { turns: 50, budget: 10, effort: 'high' };
}

/**
 * Score task complexity on a 0-100 scale using multiple signals.
 * Maps to turns/budget params via ranges:
 *   0-25: trivial (10 turns, $1)
 *   26-50: simple (20 turns, $3)
 *   51-75: moderate (35 turns, $6)
 *   76-100: complex (50 turns, $10)
 *
 * @param {string} task - Task description
 * @param {string} [projectDir] - Optional project directory for file-count scope estimation
 * @returns {{ turns: number, budget: number, effort: string, score: number }|null}
 */
function scoreComplexity(task, projectDir) {
  if (!task) return null;
  var text = task.toLowerCase();
  var words = task.split(/\s+/).length;

  // Base score starts at 30 (simple baseline)
  var score = 30;

  // Word count contribution: long tasks signal more work
  if (words > 50) score += 20;
  else if (words > 25) score += 10;
  else if (words < 5) score -= 15;

  // Keyword signal contributions (summed)
  // Use regex with optional words between signal terms for fuzzy matching
  COMPLEXITY_SIGNALS.forEach(function(sig) {
    if (text.indexOf(sig.signal) !== -1) {
      score += sig.points;
    } else {
      // Fuzzy: allow 1-2 filler words between signal words
      var sigWords = sig.signal.split(/\s+/);
      if (sigWords.length >= 2) {
        var pattern = sigWords.map(function(w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s+(?:\\w+\\s+){0,2}');
        try {
          if (new RegExp(pattern).test(text)) {
            score += sig.points;
          }
        } catch (_e) {}
      }
    }
  });

  // File scope estimation (0-20 bonus points)
  if (projectDir) {
    var fileCount = estimateScope(task, projectDir);
    score += fileCountToScopePoints(fileCount);
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  var params = scoreToParams(score);
  return { turns: params.turns, budget: params.budget, effort: params.effort, score: score };
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
    var stdout = childProcess.execFileSync(command, args, {
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

function dispatchWithRetry(task, options, retries) {
  retries = retries || 0;
  var maxRetries = 2;
  var p = dispatch(task, options);
  if (typeof p.then !== 'function') return p;
  return p.catch(function(err) {
    if (retries >= maxRetries) throw err;
    var msg = (err.message || '').toLowerCase();
    if (msg.includes('budget') || msg.includes('cost')) throw new Error('Budget exceeded. Use --budget to increase. ' + err.message);
    if (msg.includes('rate') || msg.includes('429') || msg.includes('limit')) {
      process.stderr.write('\n  Rate limited. Waiting 60s...\n');
      return new Promise(function(r) { setTimeout(r, 60000); }).then(function() { return dispatchWithRetry(task, options, retries + 1); });
    }
    if (msg.includes('context') || msg.includes('compact') || msg.includes('thrash')) {
      var reducedOptions = Object.assign({}, options, { maxTurns: Math.round((options.maxTurns || 30) * 0.6) });
      process.stderr.write('\n  Context issue. Retrying with ' + reducedOptions.maxTurns + ' turns...\n');
      return dispatchWithRetry(task, reducedOptions, retries + 1);
    }
    process.stderr.write('\n  Dispatch failed, retrying (' + (retries + 1) + '/' + maxRetries + ')...\n');
    return dispatchWithRetry(task, options, retries + 1);
  });
}

module.exports = { dispatch: dispatch, dispatchWithRetry: dispatchWithRetry, scoreComplexity: scoreComplexity, estimateScope: estimateScope, isClaudeAvailable: isClaudeAvailable, getClaudeVersion: getClaudeVersion, generateSessionName: generateSessionName, getDefaultsForLevel: getDefaultsForLevel };
