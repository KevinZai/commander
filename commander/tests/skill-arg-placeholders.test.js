'use strict';

// Claude Code fills `$N` (and `$ARGUMENTS`, `$ARGUMENTS[N]`) in skill and
// command bodies with the invocation's arguments, including inside fenced code.
// `$0` is the first argument and `$1` the second. An unescaped awk or shell
// positional therefore breaks as soon as the user passes enough arguments:
// a live `/ccc-research a b c` run (Claude Code 2.1.309, #209 P0-4) expanded
// `awk '{print int($1/4)}'` to `awk '{print int(b/4)}'`. The documented escape
// is `\$1`, which Claude Code turns back into a literal `$1`.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..', '..');
const PLUGIN_SKILLS = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');
const PLUGIN_COMMANDS = path.join(ROOT, 'commander', 'cowork-plugin', 'commands');
const TOOLKIT_COMMANDS = path.join(ROOT, 'commands');
const CODEX_SKILLS = path.join(ROOT, 'commander', 'cowork-plugin-codex', 'skills');

const UNESCAPED = /(?<!\\)\$\d/g;
const ESCAPED = /(?<!\\)\\\$\d/;

function walk(dir, pick) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, pick));
    else if (pick(entry.name)) out.push(full);
  }
  return out;
}

// Files whose body Claude Code runs argument substitution on.
function expandedFiles() {
  return [
    ...walk(PLUGIN_SKILLS, (n) => n === 'SKILL.md'),
    ...walk(PLUGIN_COMMANDS, (n) => n.endsWith('.md')),
    ...walk(TOOLKIT_COMMANDS, (n) => n.endsWith('.md')),
  ];
}

function body(src) {
  const fm = src.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return fm ? src.slice(fm[0].length) : src;
}

// Minimal model of the documented substitution rules, enough to show what the
// model would receive: `\$N` becomes a literal `$N`; `$N` becomes argument N
// when it exists and is left alone otherwise.
function expand(text, args) {
  const SENTINEL = '\uFFFF';
  const words = args.split(/\s+/).filter(Boolean);
  return text
    .replace(/(?<!\\)\\\$(?=\d|ARGUMENTS)/g, SENTINEL)
    .replace(/\$(\d+)(?!\w)/g, (m, n) => (words[Number(n)] === undefined ? m : words[Number(n)]))
    .replaceAll(SENTINEL, '$');
}

test('scan covers plugin skills and toolkit commands', () => {
  const files = expandedFiles().map((f) => path.relative(ROOT, f));
  assert.ok(files.some((f) => f.endsWith(path.join('ccc-research', 'SKILL.md'))));
  assert.ok(files.some((f) => f === path.join('commands', 'ccc-retro.md')));
});

test('no unescaped $<digit> in skill or command bodies (write \\$1)', () => {
  const hits = [];
  for (const file of expandedFiles()) {
    const lines = body(fs.readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line) => {
      if (UNESCAPED.test(line)) hits.push(`${path.relative(ROOT, file)}: ${line.trim().slice(0, 120)}`);
      UNESCAPED.lastIndex = 0;
    });
  }
  assert.deepStrictEqual(hits, [], 'escape these as \\$N so arguments are not substituted into them');
});

test('skills that rely on \\$N are not forked (a forked skill with no args skips substitution)', () => {
  // Claude Code returns the body untouched when a forked skill runs with no
  // arguments, so the backslash would survive there.
  const forked = [];
  for (const file of walk(PLUGIN_SKILLS, (n) => n === 'SKILL.md')) {
    const src = fs.readFileSync(file, 'utf8');
    const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm && /^context:\s*fork\b/m.test(fm[1]) && ESCAPED.test(body(src))) forked.push(path.relative(ROOT, file));
  }
  assert.deepStrictEqual(forked, []);
});

test('ccc-research awk line survives `/ccc-research a b c`', () => {
  const src = fs.readFileSync(path.join(PLUGIN_SKILLS, 'ccc-research', 'SKILL.md'), 'utf8');
  const line = expand(body(src), 'a b c').split('\n').find((l) => l.includes('est. tokens'));
  assert.ok(line, 'awk token-estimate line present');
  assert.match(line, /awk '\{print int\(\$1\/4\)" est\. tokens"\}'/);
});

test('ccc-retro awk line survives arguments', () => {
  const src = fs.readFileSync(path.join(TOOLKIT_COMMANDS, 'ccc-retro.md'), 'utf8');
  const line = expand(body(src), 'last week team').split('\n').find((l) => l.includes('END {print "added"'));
  assert.ok(line);
  assert.match(line, /\{a\+=\$1; d\+=\$2\}/);
});

test('Codex translation restores plain $N and the generated mirror has no \\$N', async () => {
  const mod = await import(pathToFileURL(path.join(ROOT, 'commander', 'adapters', 'codex', 'translate.js')).href);
  const translate = mod.translateSkill || (mod.default && mod.default.translateSkill);
  assert.strictEqual(typeof translate, 'function');
  assert.strictEqual(
    translate("---\nname: x\n---\nawk '{print \\$1}' \\$ARGUMENTS \\\\$1 $5\n"),
    "---\nname: x\n---\nawk '{print $1}' $ARGUMENTS \\\\$1 $5\n"
  );
  const leaked = walk(CODEX_SKILLS, (n) => n.endsWith('.md'))
    .filter((f) => ESCAPED.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(ROOT, f));
  assert.deepStrictEqual(leaked, [], 'run npm run build:codex');
});
