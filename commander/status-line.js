#!/usr/bin/env node
'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');

var pkg = require('../package.json');

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

function main() {
  var args = parseArgs(process.argv);

  var version = pkg.version;
  var model = formatModel(process.env.ANTHROPIC_MODEL);
  var apiKeyLast3 = getApiKeyLast3();
  var skillCount = countSkills();
  var cwd = shortenPath(process.cwd());
  var contextPct = args.context;
  var cost = args.cost;

  if (args.json) {
    process.stdout.write(JSON.stringify({
      version: version,
      model: model,
      apiKeyLast3: apiKeyLast3,
      contextPct: contextPct,
      cost: cost,
      skillCount: skillCount,
      cwd: cwd,
    }) + '\n');
    return;
  }

  var line = [
    '\u2501\u2501 CCC' + version,
    '\uD83D\uDD25' + model,
    '\uD83D\uDD11' + apiKeyLast3,
    '\uD83E\uDDE0' + contextPct + '%',
    '\uD83D\uDCB0$' + cost,
    '\uD83C\uDFAF' + skillCount,
    '\uD83D\uDCC2' + cwd,
  ].join('\u2502');

  process.stdout.write(line + '\n');
}

main();
