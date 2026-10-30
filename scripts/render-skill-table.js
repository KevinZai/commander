#!/usr/bin/env node
'use strict';

// Render the plugin skill table from commander/cowork-plugin/skills/*/SKILL.md
// frontmatter. Prints a markdown table (skill, one-line description, whether
// Claude sees it) sorted by name. A skill with `disable-model-invocation: true`
// is "on demand": its description is not in Claude's context, and the user
// opens it by typing the command.
//
//   node scripts/render-skill-table.js                        # print to stdout
//   node scripts/render-skill-table.js --write SKILLS-INDEX.md
//   node scripts/render-skill-table.js --check SKILLS-INDEX.md
//
// --write replaces the region between the skill-table markers in place and
// fails if either marker is missing. --check exits 1 when the region is stale.

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SKILLS_DIR = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');
var START = '<!-- skill-table:start -->';
var END = '<!-- skill-table:end -->';
var MAX_DESC = 160;

function unquote(value) {
  var v = value.trim();
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') {
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (v.length >= 2 && v[0] === "'" && v[v.length - 1] === "'") {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  return v;
}

// Minimal frontmatter reader: top-level scalar keys, quoted values and
// folded/literal block scalars. Nested keys and lists are skipped.
function parseFrontmatter(text, file) {
  var lines = text.split(/\r?\n/);
  if (lines[0].trim() !== '---') throw new Error(file + ': no frontmatter');
  var end = lines.indexOf('---', 1);
  if (end === -1) throw new Error(file + ': unterminated frontmatter');
  var out = {};
  for (var i = 1; i < end; i++) {
    var m = /^([A-Za-z_][\w-]*):\s?(.*)$/.exec(lines[i]);
    if (!m) continue;
    var key = m[1];
    var raw = m[2];
    if (/^[>|][+-]?\s*$/.test(raw)) {
      var block = [];
      while (i + 1 < end && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
        block.push(lines[++i].trim());
      }
      out[key] = block.join(raw[0] === '>' ? ' ' : '\n').trim();
    } else {
      out[key] = unquote(raw);
    }
  }
  return out;
}

function oneLine(desc) {
  var s = String(desc || '').replace(/\s+/g, ' ').trim();
  var stop = s.search(/\.(\s|$)/);
  if (stop !== -1) s = s.slice(0, stop + 1);
  if (s.length > MAX_DESC) s = s.slice(0, MAX_DESC - 1).replace(/\s+\S*$/, '') + '…';
  return s.replace(/\|/g, '\\|');
}

function collect() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(function (e) { return e.isDirectory(); })
    .map(function (e) {
      var file = path.join(SKILLS_DIR, e.name, 'SKILL.md');
      if (!fs.existsSync(file)) return null;
      var fm = parseFrontmatter(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file));
      return {
        name: fm.name || e.name,
        description: oneLine(fm.description),
        onDemand: String(fm['disable-model-invocation'] || '').trim() === 'true',
      };
    })
    .filter(Boolean)
    .sort(function (a, b) { return a.name.localeCompare(b.name); });
}

function render(skills) {
  var rows = skills.map(function (s) {
    return '| `/' + s.name + '` | ' + s.description + ' | ' + (s.onDemand ? 'on demand' : 'visible') + ' |';
  });
  return ['| Skill | What it does | Claude sees it |', '|---|---|---|'].concat(rows).join('\n');
}

function regionUpdate(target, table) {
  var file = path.resolve(process.cwd(), target);
  var text = fs.readFileSync(file, 'utf8');
  var a = text.indexOf(START);
  var b = text.indexOf(END);
  if (a === -1 || b === -1 || b < a) {
    throw new Error(target + ': missing ' + START + ' / ' + END + ' markers');
  }
  var next = text.slice(0, a + START.length) + '\n' + table + '\n' + text.slice(b);
  return { file: file, text: text, next: next };
}

function writeRegion(target, table) {
  var u = regionUpdate(target, table);
  if (u.next !== u.text) fs.writeFileSync(u.file, u.next);
  return u.next !== u.text;
}

function main(argv) {
  var table = render(collect());
  var c = argv.indexOf('--check');
  if (c !== -1) {
    if (!argv[c + 1]) throw new Error('--check needs a file path');
    var u = regionUpdate(argv[c + 1], table);
    if (u.next !== u.text) {
      throw new Error(argv[c + 1] + ' skill table is stale; run node scripts/render-skill-table.js --write ' + argv[c + 1]);
    }
    process.stdout.write('current ' + argv[c + 1] + '\n');
    return;
  }
  var i = argv.indexOf('--write');
  if (i === -1) {
    process.stdout.write(table + '\n');
    return;
  }
  var target = argv[i + 1];
  if (!target) throw new Error('--write needs a file path');
  var changed = writeRegion(target, table);
  process.stdout.write((changed ? 'updated ' : 'unchanged ') + target + '\n');
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write('render-skill-table: ' + err.message + '\n');
    process.exit(1);
  }
}

module.exports = { parseFrontmatter: parseFrontmatter, oneLine: oneLine, collect: collect, render: render, regionUpdate: regionUpdate };
