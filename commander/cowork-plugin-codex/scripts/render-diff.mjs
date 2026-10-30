#!/usr/bin/env node
// CC-790: `git diff <base>...HEAD | node render-diff.mjs [--max-rows N] [--max-files N]`
// prints the markdown before/after view (lib/diff-render.js) to stdout. Reads stdin only; writes no files.
import { renderMarkdownDiff } from '../lib/diff-render.js';

function flag(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const n = Number(process.argv[i + 1]);
  if (!Number.isInteger(n) || n < 1) { console.error(`${name} needs a positive integer`); process.exit(2); }
  return n;
}

const opts = { maxRows: flag('--max-rows'), maxFiles: flag('--max-files') };
let text = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { text += d; });
process.stdin.on('end', () => { process.stdout.write(renderMarkdownDiff(text, opts)); });
