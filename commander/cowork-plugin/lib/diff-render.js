/**
 * diff-render.js
 * CC-790 slice 1: turn a unified diff (`git diff`) into a markdown
 * before/after view for /ccc-review reports. One section per file, one
 * two-column table per hunk: removed lines on the left, added lines on
 * the right, context on both sides. Pure string work, zero deps and no
 * I/O; scripts/render-diff.mjs is the stdin wrapper. No HTML or browser
 * preview here (later slice).
 */

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

function unquote(raw) {
  const p = raw.replace(/\t$/, ''); // git ends ---/+++ names that contain spaces with a tab
  if (p === '/dev/null') return null;
  const s = p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1) : p;
  return s.replace(/^[ab]\//, '');
}

/** Paths from a `diff --git` header. Git leaves names with spaces unquoted, so "a/x y b/x y" is split at its midpoint. */
function headerPaths(rest) {
  const q = /^("(?:[^"\\]|\\.)+"|\S+) ("(?:[^"\\]|\\.)+"|\S+)$/.exec(rest);
  if (q && (q[1].startsWith('"') || q[2].startsWith('"'))) return [unquote(q[1]), unquote(q[2])];
  const p = (rest.length - 5) / 2;
  if (Number.isInteger(p) && rest.startsWith('a/') && rest.slice(2 + p, 5 + p) === ' b/' && rest.slice(2, 2 + p) === rest.slice(5 + p)) {
    return [rest.slice(2, 2 + p), rest.slice(5 + p)];
  }
  const i = rest.indexOf(' b/');
  return i > 0 ? [unquote(rest.slice(0, i)), unquote(rest.slice(i + 1))] : [null, null];
}

/** Parse unified diff text into [{ oldPath, newPath, status, binary, hunks: [{ header, oldStart, newStart, lines: [{ op, text }] }] }]. */
function parseUnifiedDiff(text) {
  const files = [];
  let file = null;
  let hunk = null;
  // strip ANSI colour from `git diff --color=always` (color.ui=always)
  const plain = String(text || '').replace(/\u001b\[[0-9;]*m/g, '');
  for (const line of plain.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const [oldPath, newPath] = headerPaths(line.slice(11));
      file = { oldPath, newPath, status: 'modified', binary: false, hunks: [] };
      files.push(file);
      hunk = null;
      continue;
    }
    if (!file) continue;
    const h = HUNK_RE.exec(line);
    if (h) {
      hunk = { header: line, oldStart: Number(h[1]), newStart: Number(h[3]), lines: [] };
      file.hunks.push(hunk);
      continue;
    }
    if (!hunk) {
      if (line.startsWith('new file mode')) file.status = 'added';
      else if (line.startsWith('deleted file mode')) file.status = 'deleted';
      else if (line.startsWith('rename from ')) { file.status = 'renamed'; file.oldPath = line.slice(12); }
      else if (line.startsWith('rename to ')) file.newPath = line.slice(10);
      else if (line.startsWith('Binary files ') || line === 'GIT binary patch') file.binary = true;
      else if (line.startsWith('--- ')) { const p = unquote(line.slice(4)); if (p === null) file.status = 'added'; else file.oldPath = p; }
      else if (line.startsWith('+++ ')) { const p = unquote(line.slice(4)); if (p === null) file.status = 'deleted'; else file.newPath = p; }
      continue;
    }
    if (line.startsWith('\\')) continue; // "\ No newline at end of file"
    const op = line[0] === '+' ? 'add' : line[0] === '-' ? 'del' : line[0] === ' ' ? 'ctx' : null;
    if (op) hunk.lines.push({ op, text: line.slice(1) });
  }
  return files;
}

/** Pair a hunk's lines into before/after rows: a run of removals sits beside the run of additions that follows it. */
function hunkRows(hunk) {
  const rows = [];
  let oldNo = hunk.oldStart;
  let newNo = hunk.newStart;
  const lines = hunk.lines;
  let i = 0;
  while (i < lines.length) {
    if (lines[i].op === 'ctx') {
      rows.push({ kind: 'ctx', before: { no: oldNo++, text: lines[i].text }, after: { no: newNo++, text: lines[i].text } });
      i++;
      continue;
    }
    const dels = [];
    const adds = [];
    while (i < lines.length && lines[i].op === 'del') dels.push(lines[i++].text);
    while (i < lines.length && lines[i].op === 'add') adds.push(lines[i++].text);
    for (let k = 0; k < Math.max(dels.length, adds.length); k++) {
      rows.push({
        kind: 'change',
        before: k < dels.length ? { no: oldNo++, text: dels[k] } : null,
        after: k < adds.length ? { no: newNo++, text: adds[k] } : null,
      });
    }
  }
  return rows;
}

/** A table cell holding one code line: pipes escaped, a backtick fence longer than any run inside, blanks kept visible. */
function cell(side) {
  if (!side) return '';
  const text = side.text.replace(/\t/g, '    ').replace(/\|/g, '\\|');
  if (!text.trim()) return `${side.no}`;
  const longest = Math.max(0, ...(text.match(/`+/g) || []).map((r) => r.length));
  const fence = '`'.repeat(longest + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${side.no} ${fence}${pad}${text}${pad}${fence}`;
}

function fileTitle(f) {
  const name = f.status === 'deleted' ? f.oldPath : f.newPath || f.oldPath;
  if (f.status === 'renamed') return `\`${f.oldPath}\` → \`${f.newPath}\` (renamed)`;
  return `\`${name}\`${f.status === 'modified' ? '' : ` (${f.status})`}`;
}

/**
 * Render parsed files (or raw diff text) as markdown.
 * opts.maxRows: rows per hunk before truncating (default 40). opts.maxFiles: files rendered (default 50).
 */
function renderMarkdownDiff(input, opts = {}) {
  const files = typeof input === 'string' ? parseUnifiedDiff(input) : input || [];
  const maxRows = opts.maxRows > 0 ? opts.maxRows : 40;
  const maxFiles = opts.maxFiles > 0 ? opts.maxFiles : 50;
  if (!files.length) return '_No changes in this diff._\n';
  const out = [];
  for (const f of files.slice(0, maxFiles)) {
    out.push(`### ${fileTitle(f)}`, '');
    if (f.binary) { out.push('_Binary file; no text diff._', ''); continue; }
    if (!f.hunks.length) { out.push('_No content changes (mode or rename only)._', ''); continue; }
    for (const h of f.hunks) {
      const rows = hunkRows(h);
      out.push(`\`${h.header.replace(/`/g, "'")}\``, '', '| Before | After |', '| --- | --- |');
      for (const r of rows.slice(0, maxRows)) out.push(`| ${cell(r.before)} | ${cell(r.after)} |`);
      if (rows.length > maxRows) out.push(`| _… ${rows.length - maxRows} more rows not shown_ | |`);
      out.push('');
    }
  }
  if (files.length > maxFiles) out.push(`_… ${files.length - maxFiles} more files not shown._`, '');
  return out.join('\n');
}

export { parseUnifiedDiff, hunkRows, renderMarkdownDiff };
