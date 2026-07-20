/**
 * transcript-usage.mjs
 *
 * The SubagentStop hook payload does NOT carry token usage or duration — this
 * is confirmed against three sources (empirical all-zero rows, the Claude Code
 * hook docs at code.claude.com/docs/en/hooks.md, and a schema probe): the only
 * agent fields on the payload are `agent_type` + `agent_id`. Token/duration
 * data lives in the subagent transcript that the payload DOES point to via
 * `transcript_path`.
 *
 * This reader parses that transcript (JSONL, one event per line) and recovers
 * real per-run usage. Each assistant event carries `message.usage` with the
 * standard Anthropic shape. We report:
 *   outputTokens = Σ usage.output_tokens                       (total generated)
 *   inputTokens  = Σ (usage.input_tokens + cache_creation)     (new input processed;
 *                                                                cache_read excluded so
 *                                                                re-reads aren't double-counted)
 *   durationMs   = last event ts − first event ts
 *
 * `available` is false (and the numbers stay null) when the path is missing,
 * the file is absent/too large, or no usage was seen — so callers render an
 * honest "— · telemetry unavailable" instead of a fabricated 0.
 *
 * Bounded + best-effort: caps file size, streams line-by-line, and never throws.
 */
import { createReadStream, statSync } from 'node:fs';
import { createInterface } from 'node:readline';

const MAX_TRANSCRIPT_BYTES = 25 * 1024 * 1024; // skip pathologically large transcripts

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function readTranscriptUsage(transcriptPath) {
  const result = {
    inputTokens: null,
    outputTokens: null,
    durationMs: null,
    available: false,
  };

  if (typeof transcriptPath !== 'string' || !transcriptPath.trim()) return result;

  let size;
  try {
    size = statSync(transcriptPath).size;
  } catch {
    return result; // file doesn't exist / not readable
  }
  if (!size || size > MAX_TRANSCRIPT_BYTES) return result;

  let inSum = 0;
  let outSum = 0;
  let firstTs = null;
  let lastTs = null;
  let sawUsage = false;

  try {
    const rl = createInterface({
      input: createReadStream(transcriptPath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        continue; // tolerate partial/garbled lines
      }
      if (!obj || typeof obj !== 'object') continue;

      const ts = obj.timestamp || obj.ts || obj.time;
      if (typeof ts === 'string') {
        if (!firstTs) firstTs = ts;
        lastTs = ts;
      }

      const usage =
        (obj.message && typeof obj.message === 'object' && obj.message.usage) ||
        obj.usage;
      if (usage && typeof usage === 'object') {
        const inp = num(usage.input_tokens) + num(usage.cache_creation_input_tokens);
        const out = num(usage.output_tokens);
        if (inp || out) {
          inSum += inp;
          outSum += out;
          sawUsage = true;
        }
      }
    }
  } catch {
    return result;
  }

  if (!sawUsage) return result;

  result.inputTokens = inSum;
  result.outputTokens = outSum;
  result.available = true;

  if (firstTs && lastTs) {
    const delta = Date.parse(lastTs) - Date.parse(firstTs);
    if (Number.isFinite(delta) && delta >= 0) result.durationMs = delta;
  }

  return result;
}
