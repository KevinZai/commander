#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const CONVENTIONAL_PREFIXES = new Set([
  'feat',
  'fix',
  'chore',
  'docs',
  'refactor',
  'test',
]);

const CATEGORIES = [
  { key: 'new', title: '🚀 New' },
  { key: 'security', title: '🔒 Security' },
  { key: 'fixes', title: '🐛 Fixes' },
  { key: 'infrastructure', title: '🏗️ Infrastructure' },
  { key: 'agents', title: '🤖 Agent improvements' },
  { key: 'docs', title: '📚 Docs' },
  { key: 'tests', title: '🧪 Tests' },
  { key: 'branding', title: '🏷️ Branding' },
  { key: 'other', title: '📝 Other' },
];

function usage() {
  return [
    'Usage: node scripts/generate-changelog.js [options]',
    '',
    'Options:',
    '  --version <version>      Next version, with or without leading v',
    '  --dry-run                Print the generated section to stdout',
    '  --insert                 Insert or replace the section in CHANGELOG.md',
    '  --check-version          Verify latest CHANGELOG version matches package.json',
    '  --prev-tag <tag>         Override the git range start tag',
    '  --changelog <path>       Override changelog path',
    '  --package <path>         Override package.json path for --check-version',
    '  --repo <path>            Override repo root for git log',
    '  --date <YYYY-MM-DD>      Override release date',
    '  --stdin                  Read git log records from stdin',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = {
    changelogPath: path.join(ROOT, 'CHANGELOG.md'),
    packagePath: path.join(ROOT, 'package.json'),
    repoRoot: ROOT,
    dryRun: false,
    insert: false,
    checkVersion: false,
    forceStdin: false,
    date: null,
    prevTag: null,
    version: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--insert') {
      opts.insert = true;
    } else if (arg === '--check-version') {
      opts.checkVersion = true;
    } else if (arg === '--stdin') {
      opts.forceStdin = true;
    } else if (arg === '--version') {
      opts.version = requireValue(argv, i, arg);
      i += 1;
    } else if (arg === '--prev-tag') {
      opts.prevTag = requireValue(argv, i, arg);
      i += 1;
    } else if (arg === '--changelog') {
      opts.changelogPath = path.resolve(requireValue(argv, i, arg));
      i += 1;
    } else if (arg === '--package') {
      opts.packagePath = path.resolve(requireValue(argv, i, arg));
      i += 1;
    } else if (arg === '--repo') {
      opts.repoRoot = path.resolve(requireValue(argv, i, arg));
      i += 1;
    } else if (arg === '--date') {
      opts.date = requireValue(argv, i, arg);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write(usage() + '\n');
      process.exit(0);
    } else {
      fail('Unknown argument: ' + arg + '\n\n' + usage());
    }
  }

  return opts;
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    fail('Missing value for ' + flag);
  }
  return value;
}

function fail(message) {
  process.stderr.write('ERROR: ' + message + '\n');
  process.exit(1);
}

function normalizeVersion(version) {
  return String(version || '').trim().replace(/^v/i, '');
}

function displayVersion(version) {
  const normalized = normalizeVersion(version);
  if (!normalized) fail('Version is required');
  return normalized;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readText(filePath, label) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    fail('Could not read ' + label + ' at ' + filePath + ': ' + err.message);
  }
}

function readJson(filePath, label) {
  const raw = readText(filePath, label);
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail('Could not parse ' + label + ' at ' + filePath + ': ' + err.message);
  }
}

function findChangelogVersions(changelog) {
  const versions = [];
  const re = /^## \[v?([^\]]+)\]/gm;
  let match;
  while ((match = re.exec(changelog)) !== null) {
    versions.push(normalizeVersion(match[1]));
  }
  return versions;
}

function findPreviousVersion(changelog, targetVersion) {
  const versions = findChangelogVersions(changelog);
  if (versions.length === 0) return null;

  const target = normalizeVersion(targetVersion);
  if (target && versions[0] === target && versions.length > 1) {
    return versions[1];
  }

  return versions[0];
}

function inferNextBetaVersion(previousVersion) {
  const match = String(previousVersion || '').match(/^(\d+\.\d+\.\d+-beta\.)(\d+)$/);
  if (!match) return null;
  return match[1] + String(Number(match[2]) + 1);
}

function checkVersion(opts) {
  const pkg = readJson(opts.packagePath, 'package.json');
  const changelog = readText(opts.changelogPath, 'CHANGELOG.md');
  const latest = findChangelogVersions(changelog)[0] || null;
  const packageVersion = normalizeVersion(pkg.version);

  if (!packageVersion) {
    fail('package.json has no version field');
  }

  if (latest === packageVersion) {
    process.stdout.write('PASS: Latest CHANGELOG entry matches package.json version ' + packageVersion + '\n');
    return;
  }

  process.stderr.write('FAIL: Latest CHANGELOG entry does not match package.json version\n');
  process.stderr.write('  package.json: ' + packageVersion + '\n');
  process.stderr.write('  CHANGELOG.md: ' + (latest || 'NO VERSION FOUND') + '\n');
  process.exit(1);
}

function readStdinIfAvailable(force) {
  if (!force && process.stdin.isTTY) return '';
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function gitOk(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: 'ignore',
    timeout: 10000,
  });
  return result.status === 0;
}

function gitOutput(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function resolvePreviousTag(previousVersion, opts) {
  if (opts.prevTag) {
    return { tag: opts.prevTag, warning: null };
  }

  if (!previousVersion) {
    const nearest = gitOutput(['describe', '--tags', '--abbrev=0'], opts.repoRoot);
    return {
      tag: nearest || null,
      warning: nearest ? 'WARN: No previous changelog version found; using nearest tag ' + nearest : null,
    };
  }

  const version = normalizeVersion(previousVersion);
  const candidates = ['v' + version, version];
  for (const tag of candidates) {
    if (gitOk(['rev-parse', '--verify', '--quiet', 'refs/tags/' + tag], opts.repoRoot)) {
      return { tag, warning: null };
    }
  }

  const nearest = gitOutput(['describe', '--tags', '--abbrev=0'], opts.repoRoot);
  if (nearest) {
    return {
      tag: nearest,
      warning:
        'WARN: Tag v' + version + ' was not found; using nearest reachable tag ' + nearest + ' for git log.',
    };
  }

  return {
    tag: 'v' + version,
    warning: 'WARN: Tag v' + version + ' was not found and no fallback tag is available.',
  };
}

function readGitLog(opts, previousVersion) {
  const stdin = readStdinIfAvailable(opts.forceStdin);
  if (stdin.trim().length > 0) {
    return { raw: stdin, rangeLabel: 'stdin fixture', warning: null };
  }

  const resolved = resolvePreviousTag(previousVersion, opts);
  if (resolved.warning) {
    process.stderr.write(resolved.warning + '\n');
  }
  if (!resolved.tag) {
    fail('No previous tag found. Pass --prev-tag or pipe git log records on stdin.');
  }

  const range = resolved.tag + '..HEAD';
  const result = spawnSync('git', ['log', range, '--pretty=format:%H|%s|%b'], {
    cwd: opts.repoRoot,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || '');
    fail('git log failed for range ' + range);
  }

  return {
    raw: result.stdout,
    rangeLabel: range,
    warning: resolved.warning,
  };
}

function parseGitLog(raw) {
  const records = [];
  const lines = String(raw || '').replace(/\r\n/g, '\n').split('\n');
  let current = null;

  for (const line of lines) {
    const parsed = parseRecordStart(line);
    if (parsed) {
      if (current) records.push(current);
      current = {
        hash: parsed.hash,
        subject: parsed.subject.trim(),
        bodyLines: parsed.body ? [parsed.body] : [],
      };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }

  if (current) records.push(current);

  return records
    .map((record) => ({
      hash: record.hash,
      subject: record.subject,
      body: cleanBody(record.bodyLines),
    }))
    .filter((record) => record.subject.length > 0)
    .filter((record) => !isMergeCommit(record.subject));
}

function parseRecordStart(line) {
  const firstPipe = line.indexOf('|');
  if (firstPipe < 7) return null;

  const hash = line.slice(0, firstPipe);
  if (!/^[0-9a-f]{7,40}$/i.test(hash)) return null;

  const secondPipe = line.indexOf('|', firstPipe + 1);
  if (secondPipe === -1) return null;

  return {
    hash,
    subject: line.slice(firstPipe + 1, secondPipe),
    body: line.slice(secondPipe + 1),
  };
}

function cleanBody(lines) {
  return lines
    .filter((line) => !/^\s*Co-authored-by:/i.test(line))
    .join('\n')
    .trim();
}

function isMergeCommit(subject) {
  return /^Merge\b/i.test(subject);
}

function parseConventionalSubject(subject) {
  const cleanSubject = decodeEscapedUnicode(subject);
  const match = cleanSubject.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i);
  if (!match) {
    return {
      prefix: null,
      scope: null,
      description: cleanSubject.trim(),
      conventional: false,
    };
  }

  const prefix = match[1].toLowerCase();
  if (!CONVENTIONAL_PREFIXES.has(prefix)) {
    return {
      prefix: null,
      scope: null,
      description: cleanSubject.trim(),
      conventional: false,
    };
  }

  return {
    prefix,
    scope: match[2] ? match[2].trim() : null,
    description: match[4].trim(),
    conventional: true,
  };
}

function decodeEscapedUnicode(value) {
  return String(value || '').replace(/\\u([0-9a-fA-F]{4})/g, function (_match, code) {
    return String.fromCharCode(parseInt(code, 16));
  });
}

function enrichCommit(record) {
  const parsed = parseConventionalSubject(record.subject);
  return {
    hash: record.hash,
    subject: record.subject,
    body: record.body,
    prefix: parsed.prefix,
    scope: parsed.scope,
    description: parsed.description,
    conventional: parsed.conventional,
    category: categorize(parsed),
  };
}

function categorize(parsed) {
  if (!parsed.conventional) return 'other';

  const scope = String(parsed.scope || '').toLowerCase();
  const text = (scope + ' ' + parsed.description).toLowerCase();

  if (matchesAny(text, ['security', 'auth', 'secret', 'credential', 'sanitize', 'cve', 'vulnerability'])) {
    return 'security';
  }
  if (matchesAny(scope, ['brand', 'branding', 'positioning', 'marketing'])) {
    return 'branding';
  }
  if (matchesAny(scope, ['agent', 'agents', 'subagent', 'persona', 'personas', 'fleet', 'orchestrator', 'model'])) {
    return 'agents';
  }
  if (parsed.prefix === 'docs') return 'docs';
  if (parsed.prefix === 'test' || matchesAny(scope, ['test', 'tests', 'qa'])) return 'tests';
  if (parsed.prefix === 'fix') return 'fixes';
  if (parsed.prefix === 'feat') return 'new';
  if (parsed.prefix === 'chore' || parsed.prefix === 'refactor') return 'infrastructure';

  return 'other';
}

function matchesAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

function sentenceCase(value) {
  const text = String(value || '').trim();
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}

function formatBullet(commit) {
  const description = sentenceCase(commit.description || commit.subject);
  if (commit.scope) {
    return '- **' + commit.scope + '** — ' + description;
  }
  return '- ' + description;
}

function renderSection(params) {
  const groups = new Map(CATEGORIES.map((category) => [category.key, []]));
  for (const commit of params.commits) {
    groups.get(commit.category).push(commit);
  }

  const commitCount = params.commits.length;
  const lines = [
    '## [' + displayVersion(params.version) + '] — ' + params.date + ' — Conventional commit rollup',
    '',
    '### Headline',
    '',
    'Generated from ' +
      commitCount +
      ' commit' +
      (commitCount === 1 ? '' : 's') +
      ' since ' +
      (params.previousVersion ? '[' + params.previousVersion + ']' : 'the previous release') +
      ' using `' +
      params.rangeLabel +
      '`.',
    '',
  ];

  let wroteCategory = false;
  for (const category of CATEGORIES) {
    const commits = groups.get(category.key);
    if (!commits || commits.length === 0) continue;

    wroteCategory = true;
    lines.push('### ' + category.title);
    lines.push('');
    for (const commit of commits) {
      lines.push(formatBullet(commit));
    }
    lines.push('');
  }

  if (!wroteCategory) {
    lines.push('### 📝 Other');
    lines.push('');
    lines.push('- No commits found in the selected range.');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

function insertSection(changelog, section, version) {
  const versionPattern = escapeRegExp(displayVersion(version));
  const existing = new RegExp('^## \\[v?' + versionPattern + '\\][\\s\\S]*?(?=^## \\[|\\s*$)', 'm');
  if (existing.test(changelog)) {
    return changelog.replace(existing, section + '\n');
  }

  const firstEntry = changelog.search(/^## \[/m);
  if (firstEntry === -1) {
    return changelog.replace(/\s*$/, '\n\n' + section);
  }

  const preamble = changelog.slice(0, firstEntry).replace(/\s*$/, '\n\n');
  const rest = changelog.slice(firstEntry).replace(/^\s*/, '');
  return preamble + section + rest;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.checkVersion) {
    checkVersion(opts);
    return;
  }

  const changelog = readText(opts.changelogPath, 'CHANGELOG.md');
  const previousVersion = findPreviousVersion(changelog, opts.version);
  const version = opts.version || inferNextBetaVersion(previousVersion);
  if (!version) {
    fail('Could not infer next beta version. Pass --version <next>.');
  }
  const date = opts.date || todayIso();

  const gitLog = readGitLog(opts, previousVersion);
  const commits = parseGitLog(gitLog.raw).map(enrichCommit);
  const section = renderSection({
    version,
    date,
    previousVersion,
    rangeLabel: gitLog.rangeLabel,
    commits,
  });

  if (opts.insert && !opts.dryRun) {
    const next = insertSection(changelog, section, version);
    if (next !== changelog) {
      fs.writeFileSync(opts.changelogPath, next, 'utf8');
      process.stdout.write('Inserted [' + displayVersion(version) + '] into ' + opts.changelogPath + '\n');
    } else {
      process.stdout.write('CHANGELOG.md already up to date for [' + displayVersion(version) + ']\n');
    }
    return;
  }

  process.stdout.write(section);
}

main();
