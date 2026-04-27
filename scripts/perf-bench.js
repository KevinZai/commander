#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const HOOKS_DIR = join(ROOT, 'commander', 'cowork-plugin', 'hooks');
const SKILLS_DIR = join(ROOT, 'commander', 'cowork-plugin', 'skills');
const MCP_CONFIG = join(ROOT, 'commander', 'cowork-plugin', '.mcp.json');
const HOOKS_CONFIG = join(HOOKS_DIR, 'hooks.json');
const REGISTRY_PATH = join(ROOT, 'commander', 'core', 'registry.yaml');

const DEFAULT_BENCHES = ['A', 'B', 'C', 'D', 'E', 'F'];
const HOOK_RUNS = 20;
const SESSION_START_RUNS = 20;
const SKILL_DISCOVERY_RUNS = 50;
const MCP_TIMEOUT_MS = 15000;
const COMMAND_TIMEOUT_MS = 120000;

function parseArgs(argv) {
  const opts = {
    benches: new Set(DEFAULT_BENCHES),
    out: null,
    baseline: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg.startsWith('--bench=')) {
      opts.benches = parseBenchList(arg.slice('--bench='.length));
      continue;
    }
    if (arg === '--bench') {
      opts.benches = parseBenchList(argv[++i] || '');
      continue;
    }
    if (arg.startsWith('--out=')) {
      opts.out = resolve(ROOT, arg.slice('--out='.length));
      continue;
    }
    if (arg === '--out') {
      opts.out = resolve(ROOT, argv[++i] || '');
      continue;
    }
    if (arg.startsWith('--baseline=')) {
      opts.baseline = resolve(ROOT, arg.slice('--baseline='.length));
      continue;
    }
    if (arg === '--baseline') {
      opts.baseline = resolve(ROOT, argv[++i] || '');
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return opts;
}

function parseBenchList(value) {
  const requested = value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const invalid = requested.filter((b) => !DEFAULT_BENCHES.includes(b));
  if (invalid.length > 0) {
    throw new Error(`Unknown bench id(s): ${invalid.join(', ')}`);
  }
  return new Set(requested);
}

function usage() {
  return [
    'Usage: node scripts/perf-bench.js [--bench=A,B,C] [--out=path.json] [--baseline=path.json]',
    '',
    'Benches:',
    '  A  Hook startup time',
    '  B  SessionStart hook chain total',
    '  C  Skill discovery latency',
    '  D  MCP server cold-start',
    '  E  Test suite duration',
    '  F  Bundle/check script time',
  ].join('\n');
}

function roundMs(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function stats(samples) {
  const clean = samples.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (clean.length === 0) {
    return { count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null };
  }
  const sum = clean.reduce((acc, n) => acc + n, 0);
  return {
    count: clean.length,
    min: roundMs(clean[0]),
    max: roundMs(clean[clean.length - 1]),
    mean: roundMs(sum / clean.length),
    p50: roundMs(percentile(clean, 50)),
    p95: roundMs(percentile(clean, 95)),
    p99: roundMs(percentile(clean, 99)),
  };
}

function emptyBench(id, name) {
  return {
    id,
    name,
    status: 'ok',
    stats: stats([]),
    notes: [],
  };
}

async function makeTempHome(prefix = 'ccc-perf-home-') {
  const home = await mkdtemp(join(tmpdir(), prefix));
  await mkdir(join(home, '.claude'), { recursive: true });
  return home;
}

async function cleanupTempHome(home) {
  if (!home || !home.startsWith(tmpdir())) return;
  await rm(home, { recursive: true, force: true }).catch(() => {});
}

function baseEnv(home, extra = {}) {
  return {
    ...process.env,
    HOME: home,
    CLAUDE_SESSION_ID: 'perf-bench',
    CI: '1',
    ...extra,
  };
}

function runProcess(command, args, opts = {}) {
  const started = performance.now();
  const timeoutMs = opts.timeoutMs || COMMAND_TIMEOUT_MS;

  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: opts.cwd || ROOT,
      env: opts.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 1000).unref();
    }, timeoutMs);
    timer.unref();

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({
        durationMs: roundMs(performance.now() - started),
        exitCode: null,
        signal: null,
        stdout,
        stderr,
        timedOut,
        error: err.message,
      });
    });

    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({
        durationMs: roundMs(performance.now() - started),
        exitCode: code,
        signal,
        stdout,
        stderr,
        timedOut,
        error: null,
      });
    });

    if (opts.input !== undefined) {
      child.stdin.end(opts.input);
    } else {
      child.stdin.end();
    }
  });
}

async function commandExists(command) {
  if (!command) return false;
  if (isAbsolute(command) || command.includes('/')) {
    try {
      await access(command, fsConstants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
  const check = spawnSync(command, ['--version'], { stdio: 'ignore', timeout: 3000 });
  if (check.error && check.error.code === 'ENOENT') return false;
  if (check.error) return false;
  return true;
}

function npxPackageName(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg || arg === '--') continue;
    if (arg === '-y' || arg === '--yes') continue;
    if (arg === '--package' || arg === '-p') {
      i++;
      continue;
    }
    if (arg.startsWith('-')) continue;
    return arg;
  }
  return null;
}

async function packageInstalled(packageName) {
  if (!packageName) return false;
  const packagePath = join(ROOT, 'node_modules', ...packageName.split('/'), 'package.json');
  if (existsSync(packagePath)) return true;

  const globalCheck = spawnSync('npm', ['list', '-g', packageName, '--depth=0', '--json'], {
    encoding: 'utf8',
    timeout: 5000,
  });
  if (globalCheck.error || globalCheck.status !== 0) return false;
  try {
    const parsed = JSON.parse(globalCheck.stdout || '{}');
    return Boolean(parsed.dependencies?.[packageName]);
  } catch {
    return false;
  }
}

async function listTopLevelHooks() {
  const entries = await readdir(HOOKS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => join(HOOKS_DIR, entry.name))
    .sort((a, b) => basename(a).localeCompare(basename(b)));
}

async function runHookFile(hookPath, home) {
  return runProcess(process.execPath, [hookPath], {
    cwd: ROOT,
    env: baseEnv(home),
    input: '',
    timeoutMs: 20000,
  });
}

async function benchA() {
  const bench = emptyBench('A', 'Hook startup time');
  const hooks = await listTopLevelHooks();
  const hookResults = [];

  for (const hookPath of hooks) {
    const samples = [];
    const failures = [];

    for (let i = 0; i < HOOK_RUNS; i++) {
      const home = await makeTempHome();
      try {
        const result = await runHookFile(hookPath, home);
        samples.push(result.durationMs);
        if (result.exitCode !== 0 || result.error || result.timedOut) {
          failures.push({
            run: i + 1,
            exitCode: result.exitCode,
            signal: result.signal,
            timedOut: result.timedOut,
            error: result.error,
            stderr: result.stderr.slice(0, 500),
          });
        }
      } finally {
        await cleanupTempHome(home);
      }
    }

    hookResults.push({
      hook: basename(hookPath),
      path: relative(ROOT, hookPath),
      runs: HOOK_RUNS,
      stats: stats(samples),
      failures,
    });
  }

  const p50Total = hookResults.reduce((acc, h) => acc + (h.stats.p50 || 0), 0);
  const p95Total = hookResults.reduce((acc, h) => acc + (h.stats.p95 || 0), 0);
  const p99Total = hookResults.reduce((acc, h) => acc + (h.stats.p99 || 0), 0);
  const allSamples = hookResults.flatMap((h) => [
    h.stats.p50,
    h.stats.p95,
    h.stats.p99,
  ].filter((n) => Number.isFinite(n)));

  bench.hooks = hookResults;
  bench.hookCount = hookResults.length;
  bench.runsPerHook = HOOK_RUNS;
  bench.totalIfAllFiredMs = {
    sumP50: roundMs(p50Total),
    sumP95: roundMs(p95Total),
    sumP99: roundMs(p99Total),
  };
  bench.topHooksByP99 = [...hookResults]
    .sort((a, b) => (b.stats.p99 || 0) - (a.stats.p99 || 0))
    .slice(0, 3)
    .map((h) => ({ hook: h.hook, p99: h.stats.p99, p95: h.stats.p95, p50: h.stats.p50 }));
  bench.stats = stats(allSamples);
  return bench;
}

function splitCommand(command) {
  const parts = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  if (current) parts.push(current);
  return parts;
}

async function getHookCommands(eventName) {
  const raw = await readFile(HOOKS_CONFIG, 'utf8');
  const parsed = JSON.parse(raw);
  const groups = parsed.hooks?.[eventName] || [];
  const commands = [];

  for (const group of groups) {
    for (const hook of group.hooks || []) {
      if (hook.type !== 'command' || !hook.command) continue;
      const command = hook.command.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, join(ROOT, 'commander', 'cowork-plugin'));
      const parts = splitCommand(command);
      if (parts.length === 0) continue;
      commands.push({
        command: parts[0] === 'node' ? process.execPath : parts[0],
        args: parts.slice(1),
        raw: hook.command,
        timeout: hook.timeout,
      });
    }
  }

  return commands;
}

async function runCommandChain(commands, home) {
  const started = performance.now();
  const steps = [];

  for (const command of commands) {
    const result = await runProcess(command.command, command.args, {
      cwd: ROOT,
      env: baseEnv(home),
      input: '',
      timeoutMs: command.timeout || 20000,
    });
    steps.push({
      raw: command.raw,
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      error: result.error,
      stderr: result.stderr.slice(0, 500),
    });
  }

  return {
    durationMs: roundMs(performance.now() - started),
    steps,
  };
}

async function benchB() {
  const bench = emptyBench('B', 'SessionStart hook chain total');
  const commands = await getHookCommands('SessionStart');
  const samples = [];
  const stepSamples = new Map();
  const failures = [];

  for (let i = 0; i < SESSION_START_RUNS; i++) {
    const home = await makeTempHome();
    try {
      const result = await runCommandChain(commands, home);
      samples.push(result.durationMs);
      for (const step of result.steps) {
        if (!stepSamples.has(step.raw)) stepSamples.set(step.raw, []);
        stepSamples.get(step.raw).push(step.durationMs);
        if (step.exitCode !== 0 || step.error || step.timedOut) {
          failures.push({ run: i + 1, ...step });
        }
      }
    } finally {
      await cleanupTempHome(home);
    }
  }

  bench.event = 'SessionStart';
  bench.handlerCount = commands.length;
  bench.runs = SESSION_START_RUNS;
  bench.commands = commands.map((c) => c.raw);
  bench.stats = stats(samples);
  bench.perHandler = [...stepSamples.entries()].map(([raw, values]) => ({
    command: raw,
    stats: stats(values),
  }));
  bench.failures = failures;
  if (commands.length !== 4) {
    bench.notes.push(`Active hooks.json has ${commands.length} SessionStart handlers; benchmark used the active chain.`);
  }
  return bench;
}

function walkSkillFiles(dir) {
  const out = [];
  const entries = readdirSyncSafe(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        out.push(...walkSkillFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      out.push(fullPath);
    }
  }
  return out;
}

function readdirSyncSafe(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith('---')) return {};
  const firstLineEnd = markdown.indexOf('\n');
  if (firstLineEnd === -1) return {};
  const closing = markdown.indexOf('\n---', firstLineEnd + 1);
  if (closing === -1) return {};
  const block = markdown.slice(firstLineEnd + 1, closing);
  const data = {};

  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const raw = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    data[key] = parseYamlScalar(raw);
  }

  return data;
}

function parseYamlScalar(value) {
  if (!value) return '';
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((part) => parseYamlScalar(part.trim()))
      .filter((part) => part !== '');
  }
  return value;
}

function discoverSkillsOnce() {
  const started = performance.now();
  const files = walkSkillFiles(SKILLS_DIR);
  const skills = files.map((file) => {
    const markdown = readFileSync(file, 'utf8');
    const frontmatter = parseFrontmatter(markdown);
    return {
      id: basename(dirname(file)),
      path: relative(ROOT, file),
      frontmatter,
    };
  });
  return {
    durationMs: roundMs(performance.now() - started),
    skillCount: skills.length,
    frontmatterCount: skills.filter((skill) => Object.keys(skill.frontmatter).length > 0).length,
  };
}

async function benchC() {
  const bench = emptyBench('C', 'Skill discovery latency');
  const samples = [];
  let skillCount = 0;
  let frontmatterCount = 0;

  for (let i = 0; i < SKILL_DISCOVERY_RUNS; i++) {
    const result = discoverSkillsOnce();
    samples.push(result.durationMs);
    skillCount = result.skillCount;
    frontmatterCount = result.frontmatterCount;
  }

  bench.runs = SKILL_DISCOVERY_RUNS;
  bench.skillCount = skillCount;
  bench.frontmatterCount = frontmatterCount;
  bench.stats = stats(samples);
  return bench;
}

async function loadMcpServers() {
  try {
    const parsed = JSON.parse(await readFile(MCP_CONFIG, 'utf8'));
    return Object.entries(parsed.mcpServers || {}).map(([name, config]) => ({
      name,
      command: config.command,
      args: config.args || [],
    }));
  } catch (err) {
    return [{ name: 'mcp-config', skipped: true, reason: err.message }];
  }
}

function mcpInitializePayload() {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'cc-commander-perf-bench',
        version: '0.0.0',
      },
    },
  }) + '\n';
}

async function measureMcpServer(server) {
  if (server.skipped) return server;
  const exists = await commandExists(server.command);
  if (!exists) {
    return {
      name: server.name,
      command: server.command,
      args: server.args,
      status: 'skipped',
      reason: `Command not installed: ${server.command}`,
    };
  }

  if (basename(server.command) === 'npx') {
    const packageName = npxPackageName(server.args || []);
    if (packageName && !(await packageInstalled(packageName))) {
      return {
        name: server.name,
        command: server.command,
        args: server.args,
        status: 'skipped',
        reason: `npx package not installed locally/globally: ${packageName}`,
      };
    }
  }

  const started = performance.now();
  return new Promise((resolvePromise) => {
    const child = spawn(server.command, server.args, {
      cwd: ROOT,
      env: { ...process.env, CI: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 1000).unref();
      resolvePromise(result);
    };

    const timer = setTimeout(() => {
      finish({
        name: server.name,
        command: server.command,
        args: server.args,
        status: 'skipped',
        reason: `No JSON-RPC initialize response within ${MCP_TIMEOUT_MS}ms`,
        durationMs: roundMs(performance.now() - started),
        stderr: stderr.slice(0, 800),
      });
    }, MCP_TIMEOUT_MS);
    timer.unref();

    child.on('error', (err) => {
      finish({
        name: server.name,
        command: server.command,
        args: server.args,
        status: err.code === 'ENOENT' ? 'skipped' : 'failed',
        reason: err.message,
        durationMs: roundMs(performance.now() - started),
        stderr: stderr.slice(0, 800),
      });
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.jsonrpc === '2.0' && parsed.id === 1) {
            finish({
              name: server.name,
              command: server.command,
              args: server.args,
              status: 'ok',
              durationMs: roundMs(performance.now() - started),
            });
            return;
          }
        } catch {
          // Ignore non-JSON startup noise.
        }
      }
    });

    child.on('close', (code, signal) => {
      if (settled) return;
      const missing = /not found|could not|ERR|EAI_AGAIN|ENOTFOUND|ECONN|404/i.test(stderr);
      finish({
        name: server.name,
        command: server.command,
        args: server.args,
        status: missing || code !== 0 ? 'skipped' : 'failed',
        reason: `Process exited before initialize response (code=${code}, signal=${signal || 'none'})`,
        durationMs: roundMs(performance.now() - started),
        stderr: stderr.slice(0, 800),
      });
    });

    child.stdin.end(mcpInitializePayload());
  });
}

async function benchD() {
  const bench = emptyBench('D', 'MCP server cold-start');
  const servers = await loadMcpServers();
  const results = [];

  for (const server of servers) {
    results.push(await measureMcpServer(server));
  }

  const measured = results.filter((result) => result.status === 'ok').map((result) => result.durationMs);
  bench.servers = results;
  bench.serverCount = results.length;
  bench.measuredCount = measured.length;
  bench.stats = stats(measured);
  if (measured.length === 0) {
    bench.status = 'skipped';
    bench.notes.push('No bundled MCP server produced a JSON-RPC initialize response in this environment.');
  }
  return bench;
}

function parseNodeTestSummary(output) {
  const summary = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^#\s+(tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\s+(.+)$/);
    if (!match) continue;
    const value = Number(match[2]);
    summary[match[1]] = Number.isFinite(value) ? value : match[2];
  }
  return summary;
}

async function benchE() {
  const bench = emptyBench('E', 'Test suite duration');
  const result = await runProcess('npm', ['test'], {
    cwd: ROOT,
    env: { ...process.env, CI: '1' },
    timeoutMs: 180000,
  });
  const output = `${result.stdout}\n${result.stderr}`;

  bench.command = 'npm test';
  bench.exitCode = result.exitCode;
  bench.signal = result.signal;
  bench.timedOut = result.timedOut;
  bench.durationMs = result.durationMs;
  bench.stats = stats([result.durationMs]);
  bench.nodeTestSummary = parseNodeTestSummary(output);
  bench.perSuite = [];
  bench.notes.push('Per-suite timing is not emitted by the package npm test TAP output.');
  if (result.exitCode !== 0 || result.error || result.timedOut) {
    bench.status = 'failed';
    bench.error = result.error;
    bench.stderr = result.stderr.slice(0, 1200);
  }
  return bench;
}

async function preserveRegistryWhileRunning(command, args) {
  const hadRegistry = existsSync(REGISTRY_PATH);
  const before = hadRegistry ? await readFile(REGISTRY_PATH, 'utf8') : null;
  const result = await runProcess(command, args, {
    cwd: ROOT,
    env: { ...process.env, CI: '1' },
    timeoutMs: 120000,
  });
  if (hadRegistry) {
    const after = await readFile(REGISTRY_PATH, 'utf8').catch(() => null);
    if (after !== before) {
      await writeFile(REGISTRY_PATH, before);
      result.restoredFiles = [relative(ROOT, REGISTRY_PATH)];
    }
  }
  return result;
}

async function benchF() {
  const bench = emptyBench('F', 'Bundle/check script time');
  const commands = [
    {
      label: 'build-from-registry',
      command: process.execPath,
      args: [join(ROOT, 'scripts', 'build-from-registry.js')],
      preserveRegistry: true,
    },
    {
      label: 'audit-counts --check',
      command: process.execPath,
      args: [join(ROOT, 'scripts', 'audit-counts.js'), '--check'],
      preserveRegistry: false,
    },
  ];

  const results = [];
  for (const command of commands) {
    const result = command.preserveRegistry
      ? await preserveRegistryWhileRunning(command.command, command.args)
      : await runProcess(command.command, command.args, {
          cwd: ROOT,
          env: { ...process.env, CI: '1' },
          timeoutMs: 120000,
        });
    results.push({
      label: command.label,
      command: [basename(command.command), ...command.args.map((arg) => relative(ROOT, arg).startsWith('..') ? arg : relative(ROOT, arg))].join(' '),
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      error: result.error,
      restoredFiles: result.restoredFiles || [],
      stdout: result.stdout.slice(0, 800),
      stderr: result.stderr.slice(0, 800),
    });
  }

  bench.commands = results;
  bench.durationMs = roundMs(results.reduce((acc, result) => acc + (result.durationMs || 0), 0));
  bench.stats = stats([bench.durationMs]);
  if (results.some((result) => result.exitCode !== 0 || result.error || result.timedOut)) {
    bench.status = 'failed';
  }
  return bench;
}

async function runSelectedBenches(selected) {
  const benches = {};
  const runners = {
    A: benchA,
    B: benchB,
    C: benchC,
    D: benchD,
    E: benchE,
    F: benchF,
  };

  for (const id of DEFAULT_BENCHES) {
    if (!selected.has(id)) continue;
    const started = performance.now();
    try {
      benches[id] = await runners[id]();
    } catch (err) {
      benches[id] = {
        id,
        name: `Bench ${id}`,
        status: 'failed',
        stats: stats([]),
        error: err.stack || err.message,
      };
    }
    benches[id].benchDurationMs = roundMs(performance.now() - started);
  }

  return benches;
}

async function compareAgainstBaseline(path, current) {
  if (!path) return null;
  const raw = await readFile(path, 'utf8');
  const baseline = JSON.parse(raw);
  const comparisons = [];

  for (const id of DEFAULT_BENCHES) {
    const oldBench = baseline.benches?.[id];
    const newBench = current.benches?.[id];
    if (!oldBench || !newBench) continue;
    const oldP95 = oldBench.stats?.p95;
    const newP95 = newBench.stats?.p95;
    if (!Number.isFinite(oldP95) || !Number.isFinite(newP95)) continue;
    const deltaMs = roundMs(newP95 - oldP95);
    const deltaPct = oldP95 === 0 ? null : roundMs((deltaMs / oldP95) * 100);
    comparisons.push({
      bench: id,
      metric: 'p95',
      baselineMs: oldP95,
      currentMs: newP95,
      deltaMs,
      deltaPct,
    });
  }

  return {
    path,
    baselineTimestamp: baseline.timestamp,
    comparisons,
  };
}

function renderTable(result) {
  const lines = [];
  lines.push('CC Commander Perf Bench');
  lines.push(`Timestamp: ${result.timestamp}`);
  lines.push('');
  lines.push('| Bench | Status | p50 ms | p95 ms | p99 ms | Notes |');
  lines.push('| --- | ---: | ---: | ---: | ---: | --- |');

  for (const id of DEFAULT_BENCHES) {
    const bench = result.benches[id];
    if (!bench) continue;
    const notes = [];
    if (bench.id === 'A') notes.push(`${bench.hookCount} hooks, ${bench.runsPerHook} runs each`);
    if (bench.id === 'B') notes.push(`${bench.handlerCount} handlers, ${bench.runs} runs`);
    if (bench.id === 'C') notes.push(`${bench.skillCount} skills, ${bench.runs} runs`);
    if (bench.id === 'D') notes.push(`${bench.measuredCount}/${bench.serverCount} measured`);
    if (bench.id === 'E') notes.push(bench.command || 'npm test');
    if (bench.id === 'F') notes.push(`${bench.commands?.length || 0} commands`);
    if (bench.notes?.length) notes.push(...bench.notes);
    lines.push(
      `| ${bench.id} ${bench.name} | ${bench.status} | ${bench.stats?.p50 ?? ''} | ${bench.stats?.p95 ?? ''} | ${bench.stats?.p99 ?? ''} | ${notes.join('; ')} |`
    );
  }

  const topHooks = result.benches.A?.topHooksByP99 || [];
  if (topHooks.length) {
    lines.push('');
    lines.push('Top hooks by p99:');
    for (const hook of topHooks) {
      lines.push(`  ${hook.hook}: p99 ${hook.p99}ms (p95 ${hook.p95}ms, p50 ${hook.p50}ms)`);
    }
  }

  if (result.comparison?.comparisons?.length) {
    lines.push('');
    lines.push('Baseline comparison:');
    for (const item of result.comparison.comparisons) {
      const pct = item.deltaPct === null ? 'n/a' : `${item.deltaPct}%`;
      lines.push(`  Bench ${item.bench} ${item.metric}: ${item.currentMs}ms (${item.deltaMs}ms, ${pct})`);
    }
  }

  return lines.join('\n') + '\n';
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(usage() + '\n');
    return;
  }

  const started = performance.now();
  const result = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    root: ROOT,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    selectedBenches: [...opts.benches],
    benches: await runSelectedBenches(opts.benches),
  };
  result.totalDurationMs = roundMs(performance.now() - started);
  result.comparison = await compareAgainstBaseline(opts.baseline, result);

  const json = JSON.stringify(result, null, 2) + '\n';
  if (opts.out) {
    await mkdir(dirname(opts.out), { recursive: true });
    await writeFile(opts.out, json);
  }
  process.stderr.write(renderTable(result));
  process.stdout.write(json);
}

main().catch((err) => {
  process.stderr.write(`perf-bench failed: ${err.stack || err.message}\n`);
  process.exitCode = 1;
});
