#!/usr/bin/env node

/**
 * scripts/check-codex-models.js
 *
 * Smoke-tests every model in the Codex model registry
 * (commander/adapters/codex/models.js) against the local `codex` CLI
 * (OAuth — never set OPENAI_API_KEY before running this).
 *
 * For each registry entry, runs:
 *   codex exec -m <id> "reply OK"
 * and reports PASS / FAIL / TIMEOUT in a table.
 *
 * Exit code: 0 only if every GPT-5.6 family entry (Sol/Terra/Luna) passes.
 * Older families (5.5, 5.4, 5.4-mini) are warn-only — a failure there is
 * printed but never flips the exit code, since this repo's own routing no
 * longer targets them directly (they're fallback-chain entries only).
 *
 * Not wired into `npm test` — this hits the network / a real CLI process
 * and can rate-limit or hang. Run explicitly via `npm run check:codex-models`.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const MODELS_MODULE = path.join(ROOT_DIR, 'commander', 'adapters', 'codex', 'models.js');

const DEFAULT_TIMEOUT_MS = 60_000;
const PROBE_PROMPT = 'reply OK';

function parseArgs(argv) {
  const args = { timeoutMs: DEFAULT_TIMEOUT_MS, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--timeout-ms') {
      args.timeoutMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  return args;
}

function usage() {
  return [
    'Usage: check-codex-models.js [options]',
    '',
    'Smoke-tests every Codex model in the registry via `codex exec -m <id>`.',
    '',
    'Options:',
    `  --timeout-ms <n>   Per-model timeout in ms (default ${DEFAULT_TIMEOUT_MS})`,
    '  --json             Emit machine-readable JSON instead of a table',
    '  --help             Show this help',
    '',
    'Exit code 0 only if all gpt-5.6-* entries pass. Older families warn-only.',
  ].join('\n');
}

function probeModel(id, timeoutMs) {
  const start = Date.now();
  const result = spawnSync('codex', ['exec', '-m', id, PROBE_PROMPT], {
    timeout: timeoutMs,
    encoding: 'utf8',
    env: process.env, // never inject OPENAI_API_KEY — codex CLI is OAuth-only
  });
  const elapsedMs = Date.now() - start;

  if (result.error && result.error.code === 'ETIMEDOUT') {
    return { status: 'TIMEOUT', elapsedMs, note: `exceeded ${timeoutMs}ms` };
  }
  if (result.signal === 'SIGTERM' && elapsedMs >= timeoutMs) {
    return { status: 'TIMEOUT', elapsedMs, note: `exceeded ${timeoutMs}ms` };
  }
  if (result.error) {
    return { status: 'FAIL', elapsedMs, note: result.error.message };
  }
  if (result.status !== 0) {
    const stderrTail = (result.stderr || '').trim().split('\n').slice(-1)[0] || '';
    return { status: 'FAIL', elapsedMs, note: `exit ${result.status}: ${stderrTail}` };
  }
  return { status: 'PASS', elapsedMs, note: '' };
}

function formatTable(rows) {
  const headers = ['id', 'tier', 'family', 'status', 'ms', 'note'];
  const widths = headers.map((header) =>
    Math.max(header.length, ...rows.map((row) => String(row[header] ?? '').length))
  );
  const line = (values) =>
    values.map((value, index) => String(value).padEnd(widths[index])).join('  ');

  const out = [line(headers), line(widths.map((w) => '-'.repeat(w)))];
  for (const row of rows) {
    out.push(line(headers.map((header) => row[header])));
  }
  return out.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    process.stderr.write('check-codex-models: --timeout-ms must be a positive number\n');
    return 1;
  }

  const { CODEX_MODEL_REGISTRY } = await import(pathToFileURL(MODELS_MODULE).href);

  const rows = [];
  for (const entry of CODEX_MODEL_REGISTRY) {
    const probe = probeModel(entry.id, args.timeoutMs);
    rows.push({
      id: entry.id,
      tier: entry.tier,
      family: entry.family,
      status: probe.status,
      ms: probe.elapsedMs,
      note: probe.note,
    });
    if (!args.json) {
      process.stderr.write(`probed ${entry.id} -> ${probe.status} (${probe.elapsedMs}ms)\n`);
    }
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  } else {
    process.stdout.write(`\n${formatTable(rows)}\n\n`);
  }

  const gpt56Rows = rows.filter((row) => row.family === '5.6');
  const gpt56Failures = gpt56Rows.filter((row) => row.status !== 'PASS');
  const legacyFailures = rows.filter((row) => row.family !== '5.6' && row.status !== 'PASS');

  if (legacyFailures.length > 0) {
    process.stderr.write(
      `⚠ ${legacyFailures.length} legacy-family model(s) failed (warn-only): ` +
        `${legacyFailures.map((row) => row.id).join(', ')}\n`
    );
  }

  if (gpt56Failures.length > 0) {
    process.stderr.write(
      `✗ ${gpt56Failures.length}/${gpt56Rows.length} GPT-5.6 model(s) failed: ` +
        `${gpt56Failures.map((row) => row.id).join(', ')}\n`
    );
    return 1;
  }

  process.stderr.write(`✓ all ${gpt56Rows.length} GPT-5.6 models passed\n`);
  return 0;
}

process.exitCode = await main();
