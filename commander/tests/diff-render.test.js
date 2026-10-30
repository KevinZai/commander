// CC-790 slice 1: the markdown before/after diff view for /ccc-review reports
// (commander/cowork-plugin/lib/diff-render.js + scripts/render-diff.mjs). Offline, no browser.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { hunkRows, parseUnifiedDiff, renderMarkdownDiff } from '../cowork-plugin/lib/diff-render.js';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../cowork-plugin/scripts/render-diff.mjs');

const MODIFIED = [
  'diff --git a/src/auth.js b/src/auth.js',
  'index 1111111..2222222 100644',
  '--- a/src/auth.js',
  '+++ b/src/auth.js',
  '@@ -10,4 +10,5 @@ function login(user) {',
  '   const id = user.id;',
  '-  const q = "SELECT * FROM t WHERE id=" + id;',
  '-  return db.raw(q);',
  '+  const q = "SELECT * FROM t WHERE id=?";',
  '+  return db.query(q, [id]);',
  '+  // parameterized',
  ' }',
  '\\ No newline at end of file',
].join('\n');

test('parse: a modified file with one hunk, line numbers and the no-newline marker dropped', () => {
  const [f] = parseUnifiedDiff(MODIFIED);
  assert.equal(f.newPath, 'src/auth.js');
  assert.equal(f.status, 'modified');
  assert.equal(f.hunks.length, 1);
  assert.equal(f.hunks[0].oldStart, 10);
  assert.deepEqual(f.hunks[0].lines.map((l) => l.op), ['ctx', 'del', 'del', 'add', 'add', 'add', 'ctx']);
});

test('rows: removals sit beside the additions that replace them; numbering follows each side', () => {
  const rows = hunkRows(parseUnifiedDiff(MODIFIED)[0].hunks[0]);
  assert.deepEqual(rows.map((r) => [r.before && r.before.no, r.after && r.after.no]), [[10, 10], [11, 11], [12, 12], [null, 13], [13, 14]]);
  assert.equal(rows[1].before.text, '  const q = "SELECT * FROM t WHERE id=" + id;');
  assert.equal(rows[1].after.text, '  const q = "SELECT * FROM t WHERE id=?";');
});

test('render: one section per file and a Before | After table per hunk', () => {
  const md = renderMarkdownDiff(MODIFIED);
  assert.match(md, /^### `src\/auth\.js`$/m);
  assert.match(md, /^`@@ -10,4 \+10,5 @@ function login\(user\) \{`$/m);
  assert.match(md, /^\| Before \| After \|$/m);
  assert.match(md, /^\| 11 `  const q = "SELECT \* FROM t WHERE id=" \+ id;` \| 11 `  const q = "SELECT \* FROM t WHERE id=\?";` \|$/m);
  assert.match(md, /^\|  \| 13 `  \/\/ parameterized` \|$/m);
});

test('render: pipes are escaped and backticks get a longer fence, so the table never breaks', () => {
  const diff = ['diff --git a/a.md b/a.md', '--- a/a.md', '+++ b/a.md', '@@ -1 +1 @@', '-a | b', '+run `npm test` | ``x``'].join('\n');
  const md = renderMarkdownDiff(diff);
  assert.match(md, /\| 1 `a \\\| b` \| 1 ``` run `npm test` \\\| ``x`` ``` \|/);
  for (const row of md.split('\n').filter((l) => l.startsWith('| 1 '))) assert.equal(row.split(/(?<!\\)\|/).length, 4);
});

test('render: added, deleted, renamed and binary files are labelled; renames without content say so', () => {
  const diff = [
    'diff --git a/new.txt b/new.txt', 'new file mode 100644', '--- /dev/null', '+++ b/new.txt', '@@ -0,0 +1 @@', '+hello',
    'diff --git a/old.txt b/old.txt', 'deleted file mode 100644', '--- a/old.txt', '+++ /dev/null', '@@ -1 +0,0 @@', '-bye',
    'diff --git a/x.js b/y.js', 'similarity index 100%', 'rename from x.js', 'rename to y.js',
    'diff --git a/logo.png b/logo.png', 'Binary files a/logo.png and b/logo.png differ',
  ].join('\n');
  const md = renderMarkdownDiff(diff);
  assert.match(md, /^### `new\.txt` \(added\)$/m);
  assert.match(md, /^\|  \| 1 `hello` \|$/m);
  assert.match(md, /^### `old\.txt` \(deleted\)$/m);
  assert.match(md, /^\| 1 `bye` \|  \|$/m);
  assert.match(md, /^### `x\.js` → `y\.js` \(renamed\)$/m);
  assert.match(md, /_No content changes \(mode or rename only\)\._/);
  assert.match(md, /^### `logo\.png`\n\n_Binary file; no text diff\._$/m);
});

test('parse: unquoted names with spaces (binary and mode-only) and quoted names keep their paths', () => {
  const diff = [
    'diff --git a/images/company logo.png b/images/company logo.png', 'index 1..2 100644', 'Binary files a/images/company logo.png and b/images/company logo.png differ',
    'diff --git a/bin/run me.sh b/bin/run me.sh', 'old mode 100644', 'new mode 100755',
    'diff --git "a/docs/caf\\303\\251 b.md" "b/docs/caf\\303\\251 b.md"', '--- "a/docs/caf\\303\\251 b.md"', '+++ "b/docs/caf\\303\\251 b.md"', '@@ -1 +1 @@', '-x', '+y',
    'diff --git a/my notes.txt b/my notes.txt', '--- a/my notes.txt\t', '+++ b/my notes.txt\t', '@@ -1 +1 @@', '-a', '+b',
  ].join('\n');
  const files = parseUnifiedDiff(diff);
  assert.deepEqual(files.map((f) => f.newPath), ['images/company logo.png', 'bin/run me.sh', 'docs/caf\\303\\251 b.md', 'my notes.txt']);
  const md = renderMarkdownDiff(files);
  assert.match(md, /^### `images\/company logo\.png`\n\n_Binary file; no text diff\._$/m);
  assert.match(md, /^### `bin\/run me\.sh`\n\n_No content changes \(mode or rename only\)\._$/m);
  assert.doesNotMatch(md, /null/);
});

test('render: long hunks and many files are capped with a visible count', () => {
  const body = Array.from({ length: 50 }, (_, i) => `+line ${i}`);
  const one = (n) => [`diff --git a/f${n}.txt b/f${n}.txt`, `--- a/f${n}.txt`, `+++ b/f${n}.txt`, '@@ -0,0 +1,50 @@', ...body].join('\n');
  const md = renderMarkdownDiff([one(1), one(2), one(3)].join('\n'), { maxRows: 5, maxFiles: 2 });
  assert.equal((md.match(/^### /gm) || []).length, 2);
  assert.match(md, /_… 45 more rows not shown_/);
  assert.match(md, /_… 1 more files not shown\._/);
});

test('parse: ANSI colour codes from color.ui=always are stripped before parsing', () => {
  const coloured = MODIFIED.split('\n').map((l) => (l.startsWith('-') ? `\u001b[31m${l}\u001b[m` : l.startsWith('+') ? `\u001b[32m${l}\u001b[m` : l.startsWith('diff') ? `\u001b[1m${l}\u001b[m` : l)).join('\n');
  assert.deepEqual(parseUnifiedDiff(coloured), parseUnifiedDiff(MODIFIED));
});

test('render: empty input says there are no changes', () => {
  assert.equal(renderMarkdownDiff(''), '_No changes in this diff._\n');
});

test('script: reads a diff on stdin, prints the markdown, rejects a bad flag', () => {
  const ok = spawnSync(process.execPath, [SCRIPT, '--max-rows', '3'], { input: MODIFIED, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^### `src\/auth\.js`$/m);
  assert.match(ok.stdout, /_… 2 more rows not shown_/);
  const bad = spawnSync(process.execPath, [SCRIPT, '--max-rows', '0'], { input: '', encoding: 'utf8' });
  assert.equal(bad.status, 2);
});
