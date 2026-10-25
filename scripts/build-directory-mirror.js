#!/usr/bin/env node

// Builds the standalone `cc-commander` plugin repo tree for the Anthropic
// plugin directory (see DIRECTORY.md). It mirrors commander/cowork-plugin to the
// OUTPUT ROOT so .claude-plugin/plugin.json sits at the repo root, then applies
// the directory-specific transforms. Same shape as scripts/build-codex.js.
//
// Usage: node scripts/build-directory-mirror.js [--out <dir>]
// Default out dir is a fresh temp dir (never inside the repo); it is printed at the end.

import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'commander', 'cowork-plugin');

const MIRROR_REPOSITORY = 'https://github.com/KevinZai/cc-commander-plugin';
const MIRROR_NAME = 'cc-commander';
const MIRROR_DISPLAY_NAME = 'CC Commander';
const MIRROR_NOTE =
  '<!-- Generated from KevinZai/commander by scripts/build-directory-mirror.js; do not edit here. -->';

// Directory names skipped at any depth, and file-name patterns skipped anywhere.
const EXCLUDED_DIRS = new Set(['node_modules', 'tests']);
const EXCLUDED_FILE = /^\.DS_Store$|\.bak/;

// The nested mod manifest trips the directory validator (DIRECTORY.md gate 12).
const NESTED_MANIFEST = path.join('mods', 'commander-hud', '.claude-plugin', 'plugin.json');

// Marker written into every tree this builder produces. An --out directory is
// only ever cleared when it carries this marker (house rule: never delete
// something the builder did not create).
export const MARKER_FILE = '.cc-commander-mirror';

// The plugin namespace changes with the plugin name: `commander:ccc-review` ->
// `cc-commander:ccc-review`. Only the namespace form is touched (not prose, not
// `commander/` paths, not already-prefixed `cc-commander:`).
const NAMESPACE_PATTERN = /(?<![\w-])commander:(?=[\w<$%*)])/g;
const TEXT_EXTENSIONS = new Set([
  '.md', '.js', '.mjs', '.cjs', '.json', '.yaml', '.yml', '.sh', '.ts', '.tsx', '.txt', '.html', '.tpl',
]);

// Keeps the Anthropic model name "Fable" out of the listing (gate 2).
const FABLE_WORDING = /fable/i;

export function parseArgs(argv) {
  const index = argv.indexOf('--out');
  if (index === -1) return { out: null };
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error('--out requires a directory argument');
  }
  return { out: path.resolve(value) };
}

async function listFiles(baseDir, relativeDir = '') {
  const entries = await readdir(path.join(baseDir, relativeDir), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...(await listFiles(baseDir, relativePath)));
    } else if (entry.isFile() && !EXCLUDED_FILE.test(entry.name)) {
      files.push(relativePath);
    }
  }
  return files;
}

async function countSkills(dir, relativeDir = '') {
  const entries = await readdir(path.join(dir, relativeDir), { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      total += await countSkills(dir, path.join(relativeDir, entry.name));
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      total += 1;
    }
  }
  return total;
}

// Counts come from disk so the listing description cannot drift (policy 2.B).
export async function countFromDisk(pluginDir) {
  const agentFiles = (await readdir(path.join(pluginDir, 'agents'))).filter((f) => f.endsWith('.md'));
  const hooksJson = JSON.parse(await readFile(path.join(pluginDir, 'hooks', 'hooks.json'), 'utf8'));
  return {
    skills: await countSkills(path.join(pluginDir, 'skills')),
    agents: agentFiles.length,
    hooks: Object.keys(hooksJson.hooks ?? {}).length,
  };
}

// Listing copy from DIRECTORY.md ("Description"), counts substituted.
export function buildDescription({ skills, agents, hooks }) {
  return (
    `CC Commander adds a guided PM layer to Claude Code: ${skills} \`/ccc-*\` workflows, ` +
    `${agents} specialist agents and ${hooks} lifecycle hooks that route each prompt to the right ` +
    'skill or agent and end every step with a short multiple-choice next-step menu. ' +
    'It loads most skills on demand (about 3k tokens at session start, down from 6.7k), shows 5-hour and 7-day usage limits ' +
    'in the status line, and keeps a local knowledge base of lessons. MIT, free, source readable.'
  );
}

export function transformManifest(manifest, counts) {
  const keywords = (manifest.keywords ?? []).filter((k) => !FABLE_WORDING.test(k));
  const next = {
    ...manifest,
    name: MIRROR_NAME,
    displayName: MIRROR_DISPLAY_NAME,
    description: buildDescription(counts),
    repository: MIRROR_REPOSITORY,
    keywords,
  };
  if (FABLE_WORDING.test(next.description)) {
    throw new Error('Mirror description still contains "Fable"');
  }
  return next;
}

// Install strings that name the monorepo plugin; rewritten to the directory listing.
const README_REWRITES = [
  [
    '/plugin install commander --marketplace KevinZai/commander',
    '/plugin install cc-commander@claude-community',
  ],
  [
    'This adds the `commander-hub` marketplace from `KevinZai/commander` and installs the plugin. On older builds:',
    'This installs the plugin from the `claude-community` marketplace. If that marketplace is not added yet:',
  ],
  [
    '/plugin marketplace add KevinZai/commander\n/plugin install commander',
    'claude plugin marketplace add anthropics/claude-plugins-community\nclaude plugin install cc-commander@claude-community',
  ],
  [
    'claude plugin marketplace update commander-hub && claude plugin update commander',
    'claude plugin marketplace update claude-community && claude plugin update cc-commander',
  ],
  [
    '2. Click **Add from GitHub** → enter `KevinZai/commander`\n3. Find `commander` → click **Install**, then quit and reopen the app',
    '2. Install CC Commander from the Claude plugin directory (search `cc-commander`), then quit and reopen the app',
  ],
];

const STALE_INSTALL_STRING =
  /install commander|update commander|commander@commander-hub|enter `KevinZai\/commander`/;

// Codex installs ship from the monorepo marketplace (commander@commander-hub), so
// Codex command/path lines and the Codex skill keep the original identity.
const CODEX_LINE = /codex plugin|\.codex\b/i;
const CODEX_SKILL_DIR = `skills${path.sep}ccc-codex${path.sep}`;

// Runtime identity: where the installed plugin is looked up and which update
// command is shown. In the mirror these must resolve to cc-commander from the
// claude-community marketplace. Applied line by line, after the README table.
const IDENTITY_REWRITES = [
  [
    /https:\/\/raw\.githubusercontent\.com\/KevinZai\/commander\/main\/commander\/cowork-plugin\/\.claude-plugin\/plugin\.json/g,
    'https://raw.githubusercontent.com/KevinZai/cc-commander-plugin/main/.claude-plugin/plugin.json',
  ],
  [/commander@commander-hub/g, 'cc-commander@claude-community'],
  [/commander-hub\/commander(?!\/cowork-plugin)(?![\w-])/g, 'claude-community/cc-commander'],
  [/\/plugin marketplace add KevinZai\/commander/g, '/plugin marketplace add anthropics/claude-plugins-community'],
  [/(?<![\w-])commander-hub(?![\w-])/g, 'claude-community'],
  [/(?<![\w-])commander@/g, 'cc-commander@'],
  [/startsWith\((['"])commander\1\)/g, 'startsWith($1cc-commander$1)'],
  [/(:\[\[:space:\]\]\*)"commander"/g, '$1"cc-commander"'],
  [/plugins\[(['"])commander\1\]/g, 'plugins[$1cc-commander$1]'],
  [/(plugin (?:update|install) )commander(?![\w@-])/g, '$1cc-commander'],
  [/PLUGIN_ID = 'commander'/g, "PLUGIN_ID = 'cc-commander'"],
];

export function rewriteIdentity(text, relativePath = '') {
  if (relativePath.startsWith(CODEX_SKILL_DIR)) return text;
  return text
    .split('\n')
    .map((line) =>
      CODEX_LINE.test(line)
        ? line
        : IDENTITY_REWRITES.reduce((acc, [pattern, to]) => acc.replace(pattern, to), line)
    )
    .join('\n');
}

export function transformReadme(readme) {
  let rewritten = readme;
  for (const [from, to] of README_REWRITES) {
    rewritten = rewritten.replaceAll(from, to);
  }
  rewritten = rewriteIdentity(rewritten);
  const stale = rewritten
    .split('\n')
    .filter((line) => !CODEX_LINE.test(line))
    .join('\n')
    .match(STALE_INSTALL_STRING);
  if (stale) {
    throw new Error(`Mirror README still has an old install string: "${stale[0]}"`);
  }
  return `${MIRROR_NOTE}\n${rewritten}`;
}

async function writeText(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

export function rewriteNamespace(text) {
  return text.replace(NAMESPACE_PATTERN, 'cc-commander:');
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// Resolve symlinks on the deepest existing ancestor so `..`/symlink tricks
// cannot hide the repo root or the source plugin dir.
function resolveReal(target) {
  const missing = [];
  let current = path.resolve(target);
  while (!existsSync(current)) {
    missing.unshift(path.basename(current));
    current = path.dirname(current);
  }
  return path.join(realpathSync(current), ...missing);
}

// Refuses --out values that could clobber source, and non-empty directories this
// builder did not create. Returns the resolved path. Never deletes anything.
export async function assertSafeOutDir(outDir) {
  const resolved = resolveReal(outDir);
  for (const protectedDir of [ROOT_DIR, SOURCE_DIR].map(resolveReal)) {
    if (isInside(resolved, protectedDir)) {
      throw new Error(`Refusing --out ${resolved}: it is, or contains, ${protectedDir}`);
    }
  }
  if (isInside(resolveReal(SOURCE_DIR), resolved)) {
    throw new Error(`Refusing --out ${resolved}: it is inside the source plugin dir`);
  }
  if (!existsSync(resolved)) return resolved;
  const info = await stat(resolved);
  if (!info.isDirectory()) {
    throw new Error(`Refusing --out ${resolved}: it exists and is not a directory`);
  }
  const entries = await readdir(resolved);
  if (entries.length > 0 && !entries.includes(MARKER_FILE)) {
    throw new Error(
      `Refusing --out ${resolved}: not empty and has no ${MARKER_FILE} marker (not created by this builder)`
    );
  }
  return resolved;
}

async function populateMirror(targetDir) {
  const warnings = [];
  const files = await listFiles(SOURCE_DIR);
  for (const relativePath of files) {
    if (relativePath === NESTED_MANIFEST) continue;
    const content = await readFile(path.join(SOURCE_DIR, relativePath));
    let output = content;
    if (TEXT_EXTENSIONS.has(path.extname(relativePath))) {
      output = rewriteNamespace(content.toString('utf8'));
      // README.md gets its own ordered rewrite in transformReadme.
      if (relativePath !== 'README.md') output = rewriteIdentity(output, relativePath);
    }
    await writeText(path.join(targetDir, relativePath), output);
  }

  const counts = await countFromDisk(SOURCE_DIR);
  const manifestPath = path.join(targetDir, '.claude-plugin', 'plugin.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  await writeText(
    manifestPath,
    `${JSON.stringify(transformManifest(manifest, counts), null, 2)}\n`
  );

  await writeText(path.join(targetDir, 'LICENSE'), await readFile(path.join(ROOT_DIR, 'LICENSE')));

  const readmePath = path.join(targetDir, 'README.md');
  await writeText(readmePath, transformReadme(await readFile(readmePath, 'utf8')));

  if (!existsSync(path.join(SOURCE_DIR, '.claude-plugin', 'icon.png'))) {
    warnings.push('icon.png not found at commander/cowork-plugin/.claude-plugin/icon.png (gate 10); mirror has no icon');
  }

  await writeText(
    path.join(targetDir, MARKER_FILE),
    'Generated by scripts/build-directory-mirror.js. This directory may be cleared and rebuilt by that script.\n'
  );
  return { counts, warnings };
}

// Builds into a fresh temp dir, then (when outArg is given) publishes it to the
// guarded --out dir. Returns the final directory.
export async function buildDirectoryMirror(outArg = null) {
  const outDir = outArg ? await assertSafeOutDir(outArg) : null;
  const stagingDir = await mkdtemp(path.join(tmpdir(), 'cc-commander-mirror-'));
  const { counts, warnings } = await populateMirror(stagingDir);
  if (!outDir) return { outDir: stagingDir, counts, warnings };

  // Only a marked dir is ever cleared; assertSafeOutDir already refused the rest.
  if (existsSync(path.join(outDir, MARKER_FILE))) {
    for (const entry of await readdir(outDir)) {
      await rm(path.join(outDir, entry), { recursive: true, force: true });
    }
  }
  await cp(stagingDir, outDir, { recursive: true });
  await rm(stagingDir, { recursive: true, force: true }); // staging carries the marker
  return { outDir, counts, warnings };
}

async function summarize(outDir) {
  const files = (await listFiles(outDir)).filter((f) => f !== MARKER_FILE);
  let bytes = 0;
  let largest = { file: '', size: 0 };
  for (const relativePath of files) {
    const { size } = await stat(path.join(outDir, relativePath));
    bytes += size;
    if (size > largest.size) largest = { file: relativePath, size };
  }
  return { fileCount: files.length, bytes, largest };
}

// Skips with a notice when `claude` is not installed; throws when validation fails.
function runValidate(outDir) {
  const probe = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (probe.error) {
    console.log('notice: `claude` not on PATH; skipped `claude plugin validate --strict`');
    return;
  }
  const result = spawnSync('claude', ['plugin', 'validate', outDir, '--strict'], { encoding: 'utf8' });
  console.log(`claude plugin validate --strict -> exit ${result.status}`);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (output) console.log(output);
  if (result.error || result.status !== 0) {
    throw new Error(
      `claude plugin validate --strict failed (exit ${result.status ?? result.error?.message}); mirror left in ${outDir}`
    );
  }
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  const { outDir, counts, warnings } = await buildDirectoryMirror(out);
  const summary = await summarize(outDir);

  for (const warning of warnings) console.warn(`warning: ${warning}`);
  console.log(`counts: ${counts.skills} skills, ${counts.agents} agents, ${counts.hooks} hook events`);
  console.log(`files copied: ${summary.fileCount}`);
  console.log(`bytes: ${summary.bytes}`);
  console.log(`largest file: ${summary.largest.file} (${summary.largest.size} bytes)`);
  console.log(`out: ${outDir}`);
  runValidate(outDir);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`build-directory-mirror failed: ${error.message}`);
    process.exit(1);
  });
}
