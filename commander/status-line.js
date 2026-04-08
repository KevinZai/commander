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
    }
  }
  return args;
}

function formatModel(raw) {
  if (!raw) return 'Opus4.6-1M';
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

  var line = [
    '\u2501\u2501 ' + t.bold + t.primary + 'CCC' + version + t.reset,
    '\uD83D\uDD25' + t.primary + model + t.reset,
    '\uD83D\uDD11' + t.dim + authLabel + t.reset,
    '\uD83E\uDDE0' + t.primary + contextPct + '%' + t.reset,
    '\uD83D\uDCB0' + t.primary + '$' + cost + t.reset,
    '\u23F1\uFE0F' + t.primary + fmtSessionTime(sessionMinutes) + t.reset,
    '\uD83C\uDFAF' + t.primary + skillCount + t.reset,
    '\uD83D\uDCC2' + t.dim + cwd + t.reset,
  ].join('\u2502');

  process.stdout.write(line + '\n');
}

main();
