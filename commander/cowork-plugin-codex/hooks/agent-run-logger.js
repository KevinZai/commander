#!/usr/bin/env node
/**
 * agent-run-logger.js
 * Hook: SubagentStop
 *
 * Appends a JSONL observability record for each completed specialist agent to
 * ~/.claude/commander/agent-runs.jsonl
 *
 * Record shape:
 *   { ts, agent, agentId, sessionId, durationMs, inputTokens, outputTokens,
 *     cacheReadTokens, status, tokensAvailable, internal }
 *
 * `internal` is true for Claude Code's own internal/background agents: no
 * agent name or type, and no SubagentStart record for the agent_id (CC-2120,
 * see lib/agent-runs.js). It is null when the start log is larger than the
 * scanned tail and the id was not in it (inconclusive). Readers skip true
 * rows (unless they hold the matching start) and keep null rows.
 *
 * The SubagentStop hook payload on stdin is the PRIMARY source for agent
 * name, session id, status, duration, and tokens — probed defensively
 * across common top-level and nested (subagent/agent/usage/tool_input)
 * field paths, since the exact shape varies by caller. Env vars
 * (CLAUDE_AGENT_NAME, CLAUDE_*_TOKENS, CLAUDE_DURATION_MS, …) are a
 * fallback for callers that only set env, and "unknown"/0/"completed"
 * are the last resort (mirrors mission-control-feed.js's stdin-read +
 * STDIN_MAX pattern).
 *
 * Rotation: if agent-runs.jsonl exceeds 10MB, renames it to
 *   agent-runs.YYYY-MM-DD.jsonl and starts a fresh file.
 *
 * Core free forever — no license check, no tier gating.
 */
import { track } from '../lib/telemetry.mjs';
import { appendFile, mkdir, stat, rename, open } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from '../lib/lane-state.js';
import { readTranscriptUsage } from './lib/transcript-usage.mjs';

const CCC_DIR = stateDir();
const LOG_FILE = join(CCC_DIR, 'agent-runs.jsonl');
const START_FILE = join(CCC_DIR, 'subagent-runs.jsonl');
// A subagent's SubagentStart lands shortly before its stop, so the newest
// records are enough; the cap keeps this hook fast on a long-lived file.
const START_TAIL_BYTES = 1024 * 1024;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const STDIN_MAX_BYTES = 256 * 1024;

async function rotateLogs() {
  try {
    const info = await stat(LOG_FILE);
    if (info.size < MAX_BYTES) return;

    // Date alone collides when the log rotates twice in a day — rename would
    // silently overwrite the earlier archive. Same -HHMMSS + counter scheme as
    // mission-control-feed.js.
    const now = new Date();
    const datestamp =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0');
    const timestamp =
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    let rotatedPath = join(CCC_DIR, `agent-runs.${datestamp}-${timestamp}.jsonl`);
    let counter = 1;
    while (existsSync(rotatedPath)) {
      rotatedPath = join(
        CCC_DIR,
        `agent-runs.${datestamp}-${timestamp}-${counter}.jsonl`
      );
      counter += 1;
    }
    await rename(LOG_FILE, rotatedPath);
  } catch {
    // File doesn't exist yet or stat failed — that's fine
  }
}

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
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// 'found' | 'absent' | 'unknown' (the id is not in the tail but older records
// were not scanned, or the log could not be read).
async function startRecordState(agentId) {
  let handle;
  try {
    handle = await open(START_FILE, 'r');
    const { size } = await handle.stat();
    const length = Math.min(size, START_TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    for (const line of buffer.toString('utf8').split('\n')) {
      if (!line.includes(agentId)) continue;
      try {
        if (JSON.parse(line).agent_id === agentId) return 'found';
      } catch {
        // partial first line of the tail window, or a torn write
      }
    }
    return size > length ? 'unknown' : 'absent';
  } catch (error) {
    return error?.code === 'ENOENT' ? 'absent' : 'unknown'; // ENOENT: no start log yet
  } finally {
    await handle?.close();
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
  return null;
}

async function main() {
  const input = await readStdinJson();

  try {
    const sub =
      input.subagent && typeof input.subagent === 'object' ? input.subagent : {};
    const agentInfo =
      input.agent && typeof input.agent === 'object' ? input.agent : {};
    const usage =
      input.usage && typeof input.usage === 'object' ? input.usage : {};
    const ti =
      input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : {};

    const sessionId =
      firstString(input.session_id, input.sessionId, sub.session_id) ||
      process.env.CLAUDE_SESSION_ID ||
      'unknown';

    const agentName =
      firstString(
        input.agent_name,
        input.subagent_type,
        input.agent_type,
        agentInfo.name,
        agentInfo.type,
        sub.name,
        sub.agent_name,
        sub.type,
        ti.subagent_type,
        ti.agent_name
      ) ||
      process.env.CLAUDE_AGENT_NAME ||
      process.env.CLAUDE_SUBAGENT_NAME ||
      'unknown';

    // Mirrors subagent-start-tracker.js's agent_id so mission-control-snapshot.js's
    // joinAgents() can match start↔stop on a stable id instead of the
    // frequently-null/`unknown` agent name (see that file's header comment).
    const agentId =
      firstString(
        input.agent_id,
        input.agentId,
        sub.agent_id,
        agentInfo.id,
        agentInfo.agent_id
      ) || null;

    // SubagentStop delivers no usage/duration on the payload — probe it anyway,
    // then recover from the transcript it points to. Null (not 0) when neither
    // yields data, so consumers render an honest "—" rather than a fake zero.
    let inputTokens = firstFiniteNumber(
      input.input_tokens,
      input.inputTokens,
      usage.input_tokens,
      usage.prompt_tokens,
      sub.input_tokens
    );
    let outputTokens = firstFiniteNumber(
      input.output_tokens,
      input.outputTokens,
      usage.output_tokens,
      usage.completion_tokens,
      sub.output_tokens
    );
    let durationMs = firstFiniteNumber(
      input.duration_ms,
      input.durationMs,
      input.elapsed_ms,
      sub.duration_ms,
      usage.duration_ms
    );
    let cacheReadTokens = firstFiniteNumber(usage.cache_read_input_tokens);
    let tokensAvailable = inputTokens !== null || outputTokens !== null;

    if (!tokensAvailable) {
      // Prefer the subagent's OWN transcript. Per the hook docs, SubagentStop
      // carries `agent_transcript_path` (the subagent) alongside `transcript_path`
      // (which can be the parent session) — reading the parent would sum the whole
      // session's tokens for one subagent. Fall back to transcript_path for callers
      // that only set that.
      const transcriptPath = firstString(
        input.agent_transcript_path,
        input.agentTranscriptPath,
        input.transcript_path,
        input.transcriptPath,
        sub.agent_transcript_path,
        sub.transcript_path
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
      const envIn = firstFiniteNumber(
        process.env.CLAUDE_INPUT_TOKENS,
        process.env.CLAUDE_TOKENS_INPUT
      );
      const envOut = firstFiniteNumber(
        process.env.CLAUDE_OUTPUT_TOKENS,
        process.env.CLAUDE_TOKENS_OUTPUT
      );
      if (envIn !== null || envOut !== null) {
        inputTokens = envIn;
        outputTokens = envOut;
        tokensAvailable = true;
      }
    }
    if (durationMs === null) {
      durationMs = firstFiniteNumber(
        process.env.CLAUDE_DURATION_MS,
        process.env.CLAUDE_ELAPSED_MS
      );
    }

    const status =
      firstString(input.status, input.stop_reason, input.stopReason, sub.status) ||
      process.env.CLAUDE_STOP_REASON ||
      process.env.CLAUDE_SUBAGENT_STATUS ||
      'completed';

    let internal = false;
    if (agentName === 'unknown' && agentId !== null) {
      const start = await startRecordState(agentId);
      internal = start === 'found' ? false : start === 'absent' ? true : null;
    }

    const entry = {
      ts: new Date().toISOString(),
      agent: agentName,
      agentId,
      sessionId,
      durationMs,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      status,
      tokensAvailable,
      internal,
    };

    await mkdir(CCC_DIR, { recursive: true });
    await rotateLogs();
    await appendFile(LOG_FILE, JSON.stringify(entry) + '\n');

      track('hook_fired', { hook: 'SubagentStop', handler: 'agent-run-logger' });


    process.stdout.write(
      JSON.stringify({ continue: true, suppressOutput: true }) + '\n'
    );
  } catch {
    process.stdout.write(
      JSON.stringify({ continue: true, suppressOutput: true }) + '\n'
    );
  }
}

main();
