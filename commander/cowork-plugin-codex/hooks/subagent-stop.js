#!/usr/bin/env node
/**
 * subagent-stop.js
 * Hook: SubagentStop
 *
 * Tracks subagent cost aggregation per session to
 * ~/.claude/commander/analytics/subagent-costs.jsonl
 *
 * Reads the hook STDIN payload first and only falls back to env vars: the
 * CLAUDE_* vars this used to rely on are not populated in practice, which is
 * why historical rows are almost all unknown/0.
 *
 * Core free forever — no license check, no tier gating.
 */
import { track } from '../lib/telemetry.mjs';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  '.claude',
  'commander'
);
const STDIN_MAX_BYTES = 256 * 1024;

async function readStdinJson() {
  try {
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of process.stdin) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > STDIN_MAX_BYTES) return {};
      chunks.push(buffer);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function firstString(...candidates) {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function firstFiniteNumber(...candidates) {
  for (const value of candidates) {
    const num =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
          ? Number(value)
          : NaN;
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

async function main() {
  try {
    const input = await readStdinJson();
    const usage =
      input.usage && typeof input.usage === 'object' && !Array.isArray(input.usage)
        ? input.usage
        : {};

    const sessionId =
      firstString(input.session_id, input.sessionId, process.env.CLAUDE_SESSION_ID) ||
      'unknown';
    const agentName =
      firstString(
        input.agent_name,
        input.agentName,
        input.subagent_type,
        input.agent,
        process.env.CLAUDE_AGENT_NAME,
        process.env.CLAUDE_SUBAGENT_NAME
      ) || 'unknown';
    const inputTokens = firstFiniteNumber(
      input.input_tokens,
      input.inputTokens,
      usage.input_tokens,
      usage.inputTokens,
      process.env.CLAUDE_INPUT_TOKENS,
      process.env.CLAUDE_TOKENS_INPUT
    );
    const outputTokens = firstFiniteNumber(
      input.output_tokens,
      input.outputTokens,
      usage.output_tokens,
      usage.outputTokens,
      process.env.CLAUDE_OUTPUT_TOKENS,
      process.env.CLAUDE_TOKENS_OUTPUT
    );

    const entry = {
      timestamp: new Date().toISOString(),
      sessionId,
      agentName,
      inputTokens,
      outputTokens,
    };
    track('hook_fired', { hook: 'SubagentStop', handler: 'subagent-stop' });
    const analyticsDir = join(CCC_DIR, 'analytics');
    await mkdir(analyticsDir, { recursive: true });
    await appendFile(
      join(analyticsDir, 'subagent-costs.jsonl'),
      JSON.stringify(entry) + '\n'
    );

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
