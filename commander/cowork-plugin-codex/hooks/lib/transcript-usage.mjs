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
 * standard Anthropic shape. A streaming transcript writes MULTIPLE rows for the
 * same `message.id` (partial → final usage), so we key usage by message id and
 * keep the LAST row per id — summing every row would 2–3× over-count (the file
 * order's final row holds the message's complete usage). We report:
 *   outputTokens    = Σ over distinct messages of usage.output_tokens
 *   inputTokens     = Σ (usage.input_tokens + cache_creation)  — NEW input; cache_read
 *                     is excluded here so cross-turn re-reads don't inflate the count
 *   cacheReadTokens = Σ usage.cache_read_input_tokens          — priced into cost, not
 *                     folded into the token headline
 *   durationMs      = last event ts − first event ts
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

// Non-negative finite only — a negative/garbage usage value is neutralised to 0
// rather than recorded as a measured count.
function num(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

export async function readTranscriptUsage(transcriptPath) {
  const result = {
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
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

  // Key usage by message id; last row per id wins (streaming final state). Rows
  // with no id get a unique synthetic key so distinct messages never merge.
  const byId = new Map();
  let autoKey = 0;
  let firstTs = null;
  let lastTs = null;

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

      const message = obj.message && typeof obj.message === 'object' ? obj.message : null;
      const usage = (message && message.usage) || obj.usage;
      if (usage && typeof usage === 'object') {
        const inp = num(usage.input_tokens) + num(usage.cache_creation_input_tokens);
        const cacheRead = num(usage.cache_read_input_tokens);
        const out = num(usage.output_tokens);
        if (inp || out || cacheRead) {
          const id =
            (message && typeof message.id === 'string' && message.id) ||
            (typeof obj.requestId === 'string' && obj.requestId) ||
            (typeof obj.uuid === 'string' && obj.uuid) ||
            '__auto_' + autoKey++;
          byId.set(id, { inp, cacheRead, out });
        }
      }
    }
  } catch {
    return result;
  }

  if (byId.size === 0) return result;

  let inSum = 0;
  let cacheSum = 0;
  let outSum = 0;
  for (const u of byId.values()) {
    inSum += u.inp;
    cacheSum += u.cacheRead;
    outSum += u.out;
  }

  result.inputTokens = inSum;
  result.outputTokens = outSum;
  result.cacheReadTokens = cacheSum;
  result.available = true;

  if (firstTs && lastTs) {
    const delta = Date.parse(lastTs) - Date.parse(firstTs);
    if (Number.isFinite(delta) && delta >= 0) result.durationMs = delta;
  }

  return result;
}
