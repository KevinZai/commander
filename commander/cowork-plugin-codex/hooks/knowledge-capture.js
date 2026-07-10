#!/usr/bin/env node
// License-tier gate removed 2026-04-23 — CC Commander is core free forever.
//
// Two capture duties on PostToolUse:
//   1. Write/Edit → append to knowledge/auto-captures.jsonl (session learning)
//   2. Bash test/lint/audit commands → cache the outcome in
//      ~/.claude/commander/last-test-result.json so suggest-ticker.js has a
//      REAL testsStatus/lintStatus/securityAlerts signal without ever running
//      anything itself.
import { track } from '../lib/telemetry.mjs';
import { appendFile, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');
const CAPTURES_FILE = join(KNOWLEDGE_DIR, 'auto-captures.jsonl');
const TEST_CACHE_FILE = join(CCC_DIR, 'last-test-result.json');

const SKIP_PATTERNS = ['node_modules', '.git', '.next', 'dist', 'build', '.cache'];

// Command classifiers — first match wins.
const COMMAND_KINDS = [
  { kind: 'test', re: /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b|\bvitest\b|\bjest\b|\bpytest\b|\bnode\s+--test\b|\bcargo\s+test\b|\bgo\s+test\b|\bplaywright\s+test\b/ },
  { kind: 'lint', re: /\beslint\b|\b(?:npm|pnpm|yarn|bun)\s+run\s+lint\b|\bruff\s+check\b|\bflake8\b|\bgolangci-lint\b/ },
  { kind: 'audit', re: /\b(?:npm|pnpm|yarn)\s+audit\b/ },
];

function classifyCommand(command) {
  if (typeof command !== 'string' || !command) return null;
  for (const { kind, re } of COMMAND_KINDS) {
    if (re.test(command)) return kind;
  }
  return null;
}

/**
 * Derive pass/fail from whatever shape the harness gave us. Exit code wins;
 * text markers are the fallback. 'unknown' when neither signal exists.
 */
function deriveStatus(response) {
  if (response == null) return 'unknown';
  const exitCode =
    response.exit_code ?? response.exitCode ??
    (typeof response.code === 'number' ? response.code : undefined);
  if (typeof exitCode === 'number') return exitCode === 0 ? 'passing' : 'failing';

  const text = [
    typeof response === 'string' ? response : '',
    response.stdout, response.stderr, response.output,
  ].filter(s => typeof s === 'string').join('\n');
  if (!text) return 'unknown';
  if (/\bfail(?:ed|ing|ures?)?\b/i.test(text) && !/\b0\s+fail/i.test(text)) return 'failing';
  if (/\bpass(?:ed|ing)?\b|✓|\bok\b/i.test(text)) return 'passing';
  return 'unknown';
}

async function cacheToolOutcome(kind, status) {
  if (status === 'unknown') return;
  let cache = {};
  try { cache = JSON.parse(await readFile(TEST_CACHE_FILE, 'utf8')); } catch {}
  cache[kind] = { status, ts: new Date().toISOString() };
  await mkdir(CCC_DIR, { recursive: true });
  await writeFile(TEST_CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function main() {
  try {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const data = JSON.parse(input);

    const toolName = data.tool_name || data.toolName || '';
    const toolInput = data.tool_input || data.input || {};
    track('hook_fired', { hook: 'PostToolUse', handler: 'knowledge-capture' });

    // Duty 2: cache test/lint/audit outcomes for the ambient suggest engine
    if (toolName === 'Bash') {
      const kind = classifyCommand(toolInput.command || toolInput.cmd || '');
      if (kind) {
        const status = deriveStatus(data.tool_response ?? data.tool_result ?? data.tool_output);
        await cacheToolOutcome(kind, status);
      }
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    if (!['Write', 'Edit'].includes(toolName)) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const filePath = toolInput.file_path || toolInput.filePath || 'unknown';

    if (SKIP_PATTERNS.some(p => filePath.includes(p))) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      tool: toolName,
      file: filePath,
      fileName: basename(filePath)

    };
    if (!existsSync(KNOWLEDGE_DIR)) await mkdir(KNOWLEDGE_DIR, { recursive: true });
    await appendFile(CAPTURES_FILE, JSON.stringify(entry) + '\n');

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
