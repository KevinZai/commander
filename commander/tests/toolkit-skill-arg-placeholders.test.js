'use strict';

// Toolkit counterpart of skill-arg-placeholders.test.js (#229): Claude Code
// fills `$N` in a skill body with the invocation's arguments, even inside
// fenced code, so a literal shell/awk positional or a price like `$5.00`
// breaks as soon as the user passes enough arguments. The documented escape
// is `\$N`, which Claude Code turns back into a literal `$N`. This scan covers
// the toolkit skills shipped under skills/** (#209 P0-4).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOLKIT_SKILLS = path.join(ROOT, 'skills');
const CODEX_SKILLS = path.join(ROOT, 'commander', 'cowork-plugin-codex', 'skills');

const UNESCAPED = /(?<!\\)\$\d/;
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

// Same body rule as #229: Claude Code substitutes in the body, not the
// frontmatter, so the frontmatter is left as written.
function body(src) {
  const fm = src.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return fm ? src.slice(fm[0].length) : src;
}

function frontmatter(src) {
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return fm ? fm[1] : '';
}

const skillFiles = () => walk(TOOLKIT_SKILLS, (n) => n === 'SKILL.md');

test('scan covers the toolkit skills tree', () => {
  const files = skillFiles().map((f) => path.relative(ROOT, f));
  assert.ok(files.length > 100, `expected the full skills/** tree, got ${files.length}`);
  assert.ok(files.some((f) => f.startsWith(path.join('skills', 'ccc-'))), 'domain sub-skills included');
});

test('no unescaped $<digit> in toolkit skill bodies (write \\$1)', () => {
  const hits = [];
  for (const file of skillFiles()) {
    body(fs.readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((line, i) => {
        if (UNESCAPED.test(line)) hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
  }
  assert.deepStrictEqual(hits, [], 'escape these as \\$N so slash-command arguments are not substituted into them');
});

test('escaped toolkit skills are not forked (a forked skill with no args skips substitution)', () => {
  const forked = skillFiles()
    .filter((file) => {
      const src = fs.readFileSync(file, 'utf8');
      return /^context:\s*fork\b/m.test(frontmatter(src)) && ESCAPED.test(body(src));
    })
    .map((f) => path.relative(ROOT, f));
  assert.deepStrictEqual(forked, []);
});

test('the scan flags a raw positional and accepts the escaped form', () => {
  assert.ok(UNESCAPED.test("awk '{print $1}'"));
  assert.ok(UNESCAPED.test('Cost ceiling: $5.00'));
  assert.ok(!UNESCAPED.test("awk '{print \\$1}'"));
  assert.ok(!UNESCAPED.test('Cost ceiling: \\$5.00 and $ARGS and ${1}'));
});

test('Codex mirror carries no \\$N escapes', () => {
  const leaked = walk(CODEX_SKILLS, (n) => n.endsWith('.md'))
    .filter((f) => ESCAPED.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(ROOT, f));
  assert.deepStrictEqual(leaked, [], 'run npm run build:codex');
});
