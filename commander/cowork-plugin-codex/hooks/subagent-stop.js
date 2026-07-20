#!/usr/bin/env node
/**
 * subagent-stop.js
 * Hook: SubagentStop
 *
 * Tracks subagent cost aggregation per session to
 * ~/.claude/commander/analytics/subagent-costs.jsonl
 *
 * Agent name comes from `agent_type` (the field the SubagentStop payload
 * actually delivers, alongside `agent_id` and `transcript_path`). Token usage
 * and duration are NOT on the payload — they are recovered from the transcript
 * the payload points to (readTranscriptUsage). When neither the payload nor the
 * transcript yields tokens, the numbers stay null and `tokensAvailable:false`
 * marks the row honestly instead of writing a fabricated 0 (this is why
 * historical rows were unknown/0 — the data was never in the payload).
 *
 * Core free forever — no license check, no tier gating.
 */
import { track } from '../lib/telemetry.mjs';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readTranscriptUsage } from './lib/transcript-usage.mjs';

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

// Returns null (not 0) when no candidate is a finite number, so an absent
// token count stays distinguishable from a real zero.
function firstFiniteNullable(...candidates) {
  for (const value of candidates) {
    const num =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
          ? Number(value)
          : NaN;
    if (Number.isFinite(num)) return num;
  }
  return null;
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
        input.agent_type,
        input.agent_name,
        input.agentName,
        input.subagent_type,
        input.agent,
        process.env.CLAUDE_AGENT_NAME,
        process.env.CLAUDE_SUBAGENT_NAME
      ) || 'unknown';

    // Payload rarely carries tokens (SubagentStop schema omits usage). Probe it
    // anyway, then fall back to the transcript the payload points to.
    let inputTokens = firstFiniteNullable(
      input.input_tokens,
      input.inputTokens,
      usage.input_tokens,
      usage.inputTokens
    );
    let outputTokens = firstFiniteNullable(
      input.output_tokens,
      input.outputTokens,
      usage.output_tokens,
      usage.outputTokens
    );
    let durationMs = firstFiniteNullable(input.duration_ms, input.durationMs);
    let cacheReadTokens = firstFiniteNullable(usage.cache_read_input_tokens);
    let tokensAvailable = inputTokens !== null || outputTokens !== null;

    if (!tokensAvailable) {
      // Prefer the subagent's OWN transcript. SubagentStop carries
      // `agent_transcript_path` (the subagent) alongside `transcript_path` (which
      // can be the parent session) — reading the parent would sum the whole
      // session's tokens for one subagent. transcript_path is the fallback.
      const transcriptPath = firstString(
        input.agent_transcript_path,
        input.agentTranscriptPath,
        input.transcript_path,
        input.transcriptPath
      );
      const recovered = await readTranscriptUsage(transcriptPath);
      if (recovered.available) {
        inputTokens = recovered.inputTokens;
        outputTokens = recovered.outputTokens;
        cacheReadTokens = recovered.cacheReadTokens;
        if (durationMs === null) durationMs = recovered.durationMs;
        tokensAvailable = true;
      }
    }

    // Last-resort env fallback (CLAUDE_* token vars are not populated in
    // practice, but keep the legacy path for callers that do set them).
    if (!tokensAvailable) {
      const envIn = firstFiniteNullable(
        process.env.CLAUDE_INPUT_TOKENS,
        process.env.CLAUDE_TOKENS_INPUT
      );
      const envOut = firstFiniteNullable(
        process.env.CLAUDE_OUTPUT_TOKENS,
        process.env.CLAUDE_TOKENS_OUTPUT
      );
      if (envIn !== null || envOut !== null) {
        inputTokens = envIn;
        outputTokens = envOut;
        tokensAvailable = true;
      }
    }

    const entry = {
      timestamp: new Date().toISOString(),
      sessionId,
      agentName,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      durationMs,
      tokensAvailable,
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
