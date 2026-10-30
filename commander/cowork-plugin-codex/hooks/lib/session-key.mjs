/**
 * session-key.mjs — one place that derives the per-session state key.
 *
 * Claude Code (and Codex) deliver `session_id` on STDIN as a common input
 * field; no CLAUDE_SESSION_ID env var is set for hook processes
 * (code.claude.com/docs/en/hooks#common-input-fields). Keying on the env var
 * alone collapsed every session onto 'default', so parallel sessions shared
 * one tool-call counter and one context-guard state. Env stays only as a
 * last-resort fallback, matching the stdin-primary loggers.
 */

/** Read and JSON-parse the hook payload; {} on empty or malformed input. */
export async function readStdinJson() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Filesystem-safe session key: stdin session_id, then env, then 'default'. */
export function sessionKey(input = {}) {
  const raw = (input && (input.session_id || input.sessionId)) || process.env.CLAUDE_SESSION_ID || 'default';
  return String(raw).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default';
}
