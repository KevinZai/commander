/**
 * context-estimate.mjs — derive context usage % from the transcript JSONL.
 *
 * Claude Code does not export a context-percent env var, but every hook
 * payload carries `transcript_path`. The transcript's assistant entries embed
 * `message.usage` (input_tokens + cache_read/creation) — the last one is the
 * actual context footprint of the most recent turn.
 *
 * Strategy: read the tail of the transcript (last 256KB), walk backwards for
 * the newest assistant entry carrying usage, and divide by the context window
 * (CCC_CONTEXT_WINDOW env override, default 200 000 tokens).
 *
 * Returns a number 0–100, or 0 when no signal is available. Never throws.
 */
import fs from 'node:fs';

const TAIL_BYTES = 256 * 1024;
const DEFAULT_WINDOW = 200_000;

export function estimateContextPct(transcriptPath, env = process.env) {
  try {
    // Explicit env vars win when the harness ever provides them.
    const envPct = parseFloat(env.CLAUDE_CONTEXT_USED_PCT || env.CLAUDE_CONTEXT_PERCENT || '0');
    if (!isNaN(envPct) && envPct > 0) return Math.min(100, envPct);

    if (!transcriptPath || !fs.existsSync(transcriptPath)) return 0;

    const stat = fs.statSync(transcriptPath);
    const start = Math.max(0, stat.size - TAIL_BYTES);
    const fd = fs.openSync(transcriptPath, 'r');
    let raw;
    try {
      const buf = Buffer.alloc(stat.size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      raw = buf.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }

    const lines = raw.split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      let entry;
      try { entry = JSON.parse(lines[i]); } catch { continue; }
      const usage = entry?.message?.usage || entry?.usage;
      if (!usage || typeof usage !== 'object') continue;
      const used =
        (usage.input_tokens || 0) +
        (usage.cache_read_input_tokens || 0) +
        (usage.cache_creation_input_tokens || 0);
      if (used <= 0) continue;
      const windowSize = parseInt(env.CCC_CONTEXT_WINDOW || '', 10) || DEFAULT_WINDOW;
      return Math.min(100, (used / windowSize) * 100);
    }
    return 0;
  } catch {
    return 0;
  }
}
