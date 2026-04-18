#!/usr/bin/env node
'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');

var pkg = require('../package.json');
var themes = require('../lib/themes');

function parseArgs(argv) {
  var args = { json: false, context: '?', cost: '?' };
  for (var i = 2; i < argv.length; i++) {
    if (argv[i] === '--json') {
      args.json = true;
    } else if (argv[i] === '--context' && argv[i + 1]) {
      args.context = argv[++i];
    } else if (argv[i].startsWith('--context=')) {
      args.context = argv[i].slice('--context='.length);
    } else if (argv[i] === '--cost' && argv[i + 1]) {
      args.cost = argv[++i];
    } else if (argv[i].startsWith('--cost=')) {
      args.cost = argv[i].slice('--cost='.length);
    } else if ((argv[i] === '--time' || argv[i] === '--session-minutes') && argv[i + 1]) {
      args.sessionMinutes = parseInt(argv[++i], 10) || 0;
    } else if (argv[i].startsWith('--time=')) {
      args.sessionMinutes = parseInt(argv[i].slice('--time='.length), 10) || 0;
    } else if (argv[i].startsWith('--session-minutes=')) {
      args.sessionMinutes = parseInt(argv[i].slice('--session-minutes='.length), 10) || 0;
    } else if (argv[i] === '--cache-hit' && argv[i + 1]) {
      args.cacheHit = argv[++i];
    } else if (argv[i].startsWith('--cache-hit=')) {
      args.cacheHit = argv[i].slice('--cache-hit='.length);
    }
  }
  return args;
}

function formatModel(raw) {
  if (!raw) return 'Opus4.7-1M';
  return raw
    .replace(/^claude-/, '')
    .replace(/-(\d+)-(\d+)$/, '$1.$2')
    .replace(/-(\d+)$/, '$1')
    .split('-')
    .map(function(p) { return p.charAt(0).toUpperCase() + p.slice(1); })
    .join('');
}

function countSkills() {
  var globalSkillsDir = path.join(os.homedir(), '.claude', 'skills');
  try {
    var entries = fs.readdirSync(globalSkillsDir, { withFileTypes: true });
    var count = 0;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isDirectory()) {
        var skillFile = path.join(globalSkillsDir, entries[i].name, 'SKILL.md');
        if (fs.existsSync(skillFile)) count++;
      }
    }
    if (count > 0) return count;
  } catch (_) {}

  var localSkillsDir = path.join(__dirname, '..', 'skills');
  try {
    var localEntries = fs.readdirSync(localSkillsDir, { withFileTypes: true });
    var localCount = 0;
    for (var j = 0; j < localEntries.length; j++) {
      if (localEntries[j].isDirectory() && !localEntries[j].name.startsWith('.')) {
        localCount++;
      }
    }
    return localCount;
  } catch (_) {
    return 0;
  }
}

/**
 * Estimate session time remaining by reading the earliest JSONL timestamp
 * in ~/.claude/projects/ modified in the last 8 hours.
 * Returns minutes remaining in a 5-hour rolling window (or null if unknown).
 */
function getSessionTimeRemaining() {
  var SESSION_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours
  var projectsDir = path.join(os.homedir(), '.claude', 'projects');
  var earliest = null;
  try {
    var projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true });
    var cutoff = Date.now() - SESSION_WINDOW_MS;
    for (var pd of projectDirs) {
      if (!pd.isDirectory()) continue;
      var dirPath = path.join(projectsDir, pd.name);
      var files;
      try { files = fs.readdirSync(dirPath); } catch (_) { continue; }
      for (var f of files) {
        if (!f.endsWith('.jsonl')) continue;
        var filePath = path.join(dirPath, f);
        try {
          var stat = fs.statSync(filePath);
          if (stat.mtimeMs < cutoff) continue; // skip old files
          // Read first line only for timestamp
          var fd = fs.openSync(filePath, 'r');
          var buf = Buffer.alloc(256);
          var bytesRead = fs.readSync(fd, buf, 0, 256, 0);
          fs.closeSync(fd);
          var line = buf.slice(0, bytesRead).toString('utf8').split('\n')[0];
          var parsed = JSON.parse(line);
          if (parsed.timestamp) {
            var ts = new Date(parsed.timestamp).getTime();
            if (!isNaN(ts) && (earliest === null || ts < earliest)) {
              earliest = ts;
            }
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  if (earliest === null) return null;
  var elapsed = Date.now() - earliest;
  var remaining = SESSION_WINDOW_MS - elapsed;
  if (remaining <= 0) return 0;
  return Math.round(remaining / 60000); // minutes
}

function fmtSessionRemaining(minutes) {
  if (minutes === null || minutes === undefined) return '--';
  if (minutes <= 0) return '0m';
  if (minutes < 60) return Math.round(minutes) + 'm';
  var h = Math.floor(minutes / 60);
  var m = Math.round(minutes % 60);
  return h + 'h' + (m > 0 ? m + 'm' : '');
}

function shortenPath(p) {
  var home = os.homedir();
  if (p.startsWith(home)) return '~' + p.slice(home.length);
  return p;
}

function getApiKeyLast3() {
  var key = process.env.ANTHROPIC_API_KEY || '';
  return key.length >= 3 ? key.slice(-3) : (key.length > 0 ? key : 'n/a');
}

function fmtSessionTime(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return Math.round(minutes) + 'm';
  var h = Math.floor(minutes / 60);
  var m = Math.round(minutes % 60);
  return h + 'h' + (m > 0 ? m + 'm' : '');
}

function main() {
  var args = parseArgs(process.argv);

  var version = pkg.version;
  var model = formatModel(process.env.ANTHROPIC_MODEL);
  var apiKeyLast3 = getApiKeyLast3();
  var skillCount = countSkills();
  var cwd = shortenPath(process.cwd());
  var contextPct = args.context;
  var cost = args.cost;
  var sessionMinutes = args.sessionMinutes || 0;
  var sessionRemaining = getSessionTimeRemaining(); // minutes remaining in 5h window
  var cacheHit = args.cacheHit !== undefined ? args.cacheHit : '--'; // best-effort

  if (args.json) {
    process.stdout.write(JSON.stringify({
      version: version,
      model: model,
      apiKeyLast3: apiKeyLast3,
      contextPct: contextPct,
      cost: cost,
      skillCount: skillCount,
      cwd: cwd,
      sessionMinutes: sessionMinutes,
      sessionRemaining: sessionRemaining,
      cacheHit: cacheHit,
    }) + '\n');
    return;
  }

  // Detect auth source (ClaudeSwap vs OAuth vs API key)
  var authSrc = 'key';
  try {
    var swapPath = require('path').join(require('os').homedir(), '.config', 'claudeswap-state.json');
    if (require('fs').existsSync(swapPath)) {
      var st = JSON.parse(require('fs').readFileSync(swapPath, 'utf8'));
      if (st.active) authSrc = 'swap';
    }
  } catch(_e) {}
  try {
    var credPath = require('path').join(require('os').homedir(), '.claude', '.credentials');
    if (authSrc === 'key' && require('fs').existsSync(credPath)) authSrc = 'oauth';
  } catch(_e) {}
  var authLabel = authSrc === 'swap' ? 'SW:' + apiKeyLast3 : authSrc === 'oauth' ? 'OA' : apiKeyLast3;

  var t = themes.getTheme();

  var sessionRemainingFmt = fmtSessionRemaining(sessionRemaining);
  var line = [
    '\u2501\u2501 ' + t.bold + t.primary + 'CCC' + version + t.reset,
    '\uD83D\uDD25' + t.primary + model + t.reset,
    '\uD83D\uDD11' + t.dim + authLabel + t.reset,
    '\uD83E\uDDE0' + t.primary + contextPct + '%' + t.reset,
    '\uD83D\uDCB0' + t.primary + '$' + cost + t.reset,
    '\u23F1\uFE0F' + t.primary + fmtSessionTime(sessionMinutes) + t.reset,
    '\u23F3' + t.dim + sessionRemainingFmt + t.reset,
    '\uD83D\uDCBE' + t.dim + cacheHit + '%' + t.reset,
    '\uD83C\uDFAF' + t.primary + skillCount + t.reset,
    '\uD83D\uDCC2' + t.dim + cwd + t.reset,
  ].join('\u2502');

  process.stdout.write(line + '\n');
}

main();
