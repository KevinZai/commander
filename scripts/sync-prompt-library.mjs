#!/usr/bin/env node
/**
 * sync-prompt-library.mjs (v7.3.0, W5 / Item 15a)
 *
 * Rebuilds commander/cowork-plugin/lib/prompts-data/anthropic.json — the
 * vendored copy of Anthropic's Claude Code prompt library
 * (code.claude.com/docs/en/prompt-library) that feeds the Cockpit's
 * "Prompts" tab.
 *
 * The live page is an MDX doc whose data lives in three JS literals in the
 * page source: a `RAW` array of `{id, sdlc, cat, roles, prompt, slots, src}`
 * records, an `export const text = {...}` map of `{title, teaches, next}`
 * per id, and a handful of small label maps (`phaseLabels`, `sourceLabels`,
 * `catLabels`). This script locates each literal by a text marker, extracts
 * its *balanced* bracket span (a bracket-depth scanner that understands
 * string quoting — a plain regex can't safely capture nested `{}`/`[]`), and
 * evaluates the extracted source in a fresh vm context (no access to
 * `require`/`process`/outer scope — the closest practical thing to a "safe
 * eval" for a JS object/array literal). This is a MAINTAINER-ONLY tool: it
 * never ships inside the plugin and never runs against untrusted input in
 * the wild — the only two inputs are (a) a local snapshot file you supply
 * with --from-file, or (b) Anthropic's own docs page.
 *
 * Usage:
 *   node scripts/sync-prompt-library.mjs --from-file <path> [--out <path>]
 *   node scripts/sync-prompt-library.mjs --url <url> [--out <path>]
 *   node scripts/sync-prompt-library.mjs
 *     (defaults to fetching --url; if that fails, e.g. offline or the page
 *     structure changed, re-run with --from-file against a fresh manual
 *     capture of the page source)
 *
 * Output shape (see commander/cowork-plugin/lib/prompts-data/anthropic.json):
 *   { source, fetchedAt, attribution, labels: {phase, source, cat},
 *     entries: [{id, sdlc, cat, roles, prompt, slots, src, title, teaches}] }
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEFAULT_URL = 'https://code.claude.com/docs/en/prompt-library';
const DEFAULT_OUT = path.join(ROOT, 'commander', 'cowork-plugin', 'lib', 'prompts-data', 'anthropic.json');
const SOURCE_LABEL = 'code.claude.com/docs/en/prompt-library';

function parseArgs(argv) {
  const args = { url: null, fromFile: null, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url') { args.url = argv[i + 1]; i += 1; }
    else if (arg === '--from-file') { args.fromFile = argv[i + 1]; i += 1; }
    else if (arg === '--out') { args.out = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

// Scans forward from `openIndex` (which must point at the opening bracket)
// tracking bracket depth while respecting string literals ('...', "...",
// `...`) so a quoted "}" or "]" inside prompt text never miscounts. Returns
// the balanced substring including both brackets.
function extractBalanced(source, openIndex) {
  const openChar = source[openIndex];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inString = ch; continue; }
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  throw new Error(`Unbalanced ${openChar}${closeChar} starting at index ${openIndex}`);
}

function extractLiteralAfter(source, marker, bracketChar) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) return null;
  const openIndex = source.indexOf(bracketChar, markerIndex);
  if (openIndex === -1) return null;
  return extractBalanced(source, openIndex);
}

// A JS object/array literal (single-quoted strings, unquoted keys) isn't
// valid JSON, so this evaluates it as JS instead — in a throwaway vm context
// with no globals, no require, no process, and a hard timeout. That's the
// "safe eval" middle ground for a maintainer script over a known, trusted
// source (Anthropic's own docs snapshot) rather than arbitrary user input.
function evalLiteral(code, label) {
  try {
    return vm.runInNewContext(`(${code})`, Object.create(null), { timeout: 2000, filename: label });
  } catch (error) {
    throw new Error(`Failed to parse ${label}: ${error.message}`);
  }
}

function parseSnapshot(source) {
  const rawSource = extractLiteralAfter(source, 'const RAW = useMemo(() =>', '[');
  if (!rawSource) throw new Error('Could not find the RAW prompt array in the snapshot — page structure may have changed.');
  const raw = evalLiteral(rawSource, 'RAW');
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Parsed RAW is not a non-empty array.');

  const textSource = extractLiteralAfter(source, 'export const text = {', '{');
  const text = textSource ? evalLiteral(textSource, 'text') : {};

  const phaseSource = extractLiteralAfter(source, 'export const phaseLabels = {', '{');
  const phaseLabels = phaseSource ? evalLiteral(phaseSource, 'phaseLabels') : {};

  const sourceLabelsSource = extractLiteralAfter(source, 'export const sourceLabels = {', '{');
  const sourceLabels = sourceLabelsSource ? evalLiteral(sourceLabelsSource, 'sourceLabels') : {};

  const catLabelsSource = extractLiteralAfter(source, 'export const catLabels = {', '{');
  const catLabels = catLabelsSource ? evalLiteral(catLabelsSource, 'catLabels') : {};

  const entries = raw.map((prompt) => {
    const extra = (text && text[prompt.id]) || {};
    return {
      id: String(prompt.id),
      sdlc: String(prompt.sdlc || ''),
      cat: String(prompt.cat || ''),
      roles: Array.isArray(prompt.roles) ? prompt.roles.map(String) : [],
      prompt: String(prompt.prompt || ''),
      slots: prompt.slots && typeof prompt.slots === 'object' ? prompt.slots : null,
      src: String(prompt.src || ''),
      title: String(extra.title || prompt.id),
      teaches: String(extra.teaches || ''),
    };
  });

  return { entries, labels: { phase: phaseLabels, source: sourceLabels, cat: catLabels } };
}

async function loadSnapshot(args) {
  if (args.fromFile) {
    return fs.readFileSync(path.resolve(process.cwd(), args.fromFile), 'utf8');
  }
  const url = args.url || DEFAULT_URL;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    throw new Error(
      `Could not fetch ${url}: ${error.message}\n` +
      'Re-run with --from-file <path> against a manually saved copy of the page source.'
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshot = await loadSnapshot(args);
  const { entries, labels } = parseSnapshot(snapshot);

  const payload = {
    source: SOURCE_LABEL,
    fetchedAt: new Date().toISOString(),
    attribution: 'Prompt library from code.claude.com/docs — © Anthropic',
    labels,
    entries,
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(payload, null, 2) + '\n');
  process.stderr.write(`Wrote ${entries.length} prompts to ${path.relative(ROOT, args.out)}\n`);
}

main().catch((error) => {
  process.stderr.write(`sync-prompt-library: ${error.message}\n`);
  process.exitCode = 1;
});
