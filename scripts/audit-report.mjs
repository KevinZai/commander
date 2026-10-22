#!/usr/bin/env node
import { existsSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { devNull } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { renderAuditReport } from '../templates/audit-report/render.mjs';

const SKIP = new Set(['.git', '.cache', 'node_modules', 'vendor', '.venv', 'venv', '__pycache__', 'dist', 'build', 'coverage']);
const LANGUAGES = {
  '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.jsx': 'JavaScript',
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.py': 'Python', '.rb': 'Ruby', '.php': 'PHP',
  '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.cs': 'C#', '.c': 'C', '.cpp': 'C++', '.sh': 'Shell',
};
const MANIFESTS = new Set([
  'package.json', 'pyproject.toml', 'requirements.txt', 'Pipfile', 'Cargo.toml', 'go.mod',
  'composer.json', 'Gemfile', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'mix.exs', 'pubspec.yaml',
]);
const TEST_NAME = /(^|\/)(tests?|__tests__|specs?)\/|(^|\/)test_[^/]+$|[._](test|spec)\.[^/]+$/i;
const environmentName = (name) => /^\.env(?:\..+)?$/i.test(basename(name)) && !/^\.env\.(example|sample|template)$/i.test(basename(name));

function inventory(root, relative = '') {
  const files = [];
  for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...inventory(root, name));
    else if (entry.isFile()) files.push(name);
  }
  return files.sort();
}

function gitSnapshot(root) {
  if (!existsSync(join(root, '.git'))) return { status: 'No Git metadata; committed-file checks not assessed', names: [] };
  const git = (...args) => spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 16 * 1024 * 1024,
    // Do not inherit credentials, Git overrides or transport configuration from the environment.
    env: {
      GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: devNull, GIT_ALLOW_PROTOCOL: '',
      GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0',
    },
  });
  const fail = () => { throw new Error('Git metadata could not be inspected'); };
  const top = git('rev-parse', '--show-toplevel');
  if (top.status !== 0 || top.stdout.trim() !== root) fail();
  const head = git('rev-parse', '--verify', '--quiet', 'HEAD');
  if (head.status === 1) return { status: 'No commits; no committed environment filenames', names: [] };
  if (head.status !== 0) fail();
  const commit = head.stdout.trim();
  const tree = git('ls-tree', '-r', '-z', '--name-only', commit);
  if (tree.status !== 0) fail();
  return { commit, status: 'Committed environment filenames checked at HEAD only', names: tree.stdout.split('\0').filter(Boolean) };
}

export function collectAuditReport(repoPath) {
  let root;
  try {
    root = realpathSync(repoPath);
    if (!statSync(root).isDirectory()) throw new Error();
  } catch {
    throw new Error('Repository path must be an existing directory');
  }
  let files;
  try { files = inventory(root); } catch { throw new Error('Repository filenames could not be inventoried'); }
  const snapshot = gitSnapshot(root);
  const languages = {};
  for (const file of files) {
    const language = LANGUAGES[extname(file).toLowerCase()];
    if (language) languages[language] = (languages[language] ?? 0) + 1;
  }
  const manifests = files.filter((file) => MANIFESTS.has(basename(file)) || /\.(cs|fs|vb)proj$/i.test(file));
  const tests = files.filter((file) => LANGUAGES[extname(file).toLowerCase()] && TEST_NAME.test(file));
  const findings = snapshot.names.filter(environmentName).sort().map((location) => ({
    severity: 'medium', title: 'Committed environment filename', location,
    detail: 'Present at HEAD; contents were not read. Confirm whether this is a placeholder or contains sensitive configuration.',
  }));
  if (!tests.length) findings.push({ severity: 'low', title: 'No test files detected', detail: 'No recognized test filenames; this does not prove tests are absent.' });
  if (!manifests.length) findings.push({ severity: 'info', title: 'No recognized package manifests', detail: 'Filename discovery only; this project may use another build system.' });
  return {
    repo: basename(root), date: new Date().toISOString().slice(0, 10),
    auditor: 'Offline filename audit', commit: snapshot.commit,
    executiveSummary: [
      `Files inventoried: ${files.length} (current working tree, including untracked files).`,
      `Languages by extension (file counts): ${Object.entries(languages).sort().map(([name, count]) => `${name}: ${count}`).join(', ') || 'None recognized'}.`,
      `Package manifests (names only): ${manifests.join(', ') || 'None recognized'}.`,
      `Test filenames (presence only): ${tests.join(', ') || 'None detected'}.`,
      `${snapshot.status}.`,
      'Scores, hardening and project health remain unassessed; no source review or tests were run.',
    ],
    review: { findings: findings.length ? findings : [{ severity: 'info', title: 'No filename hygiene findings', detail: 'No issues from these limited checks; this is not a security assessment.' }] },
    fixes: findings.map((finding) => ({
      title: `Review: ${finding.title}`, priority: finding.severity === 'medium' ? 'P1' : 'P2',
      effort: 'Not estimated', detail: finding.location || finding.detail,
    })),
    methodology: 'Local filename inventory only. No source or manifest contents were read; no scripts, tests or network requests were run. ' +
      `Symlinks and these directories were skipped: ${[...SKIP].join(', ')}. ` +
      'Git metadata supplies HEAD and committed environment filenames; history is not scanned. ' +
      'Exact .env.example, .env.sample and .env.template names are excluded from findings. ' +
      'Git ignore rules are not applied to the working-tree inventory.',
    disclaimer: 'This report describes a working-tree filename snapshot, which may differ from the displayed HEAD commit. ' +
      'It is not a security review or a guarantee of correctness. ' +
      'Language, manifest and test recognition are limited filename heuristics; absence of a finding proves nothing about file contents.',
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const [repoPath, flag, output, ...extra] = process.argv.slice(2);
    if (!repoPath || flag !== '--out' || !output || extra.length) {
      throw new Error('Usage: node scripts/audit-report.mjs <repoPath> --out <file>');
    }
    const report = renderAuditReport(collectAuditReport(repoPath));
    try { writeFileSync(output, report, { flag: 'wx' }); } catch {
      throw new Error('Report could not be written; choose a new file in an existing writable directory');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
