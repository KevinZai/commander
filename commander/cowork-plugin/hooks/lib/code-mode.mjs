/**
 * code-mode.mjs — helpers for Claude Code's Code Mode (experimental, CLI only).
 *
 * In Code Mode, Claude writes JavaScript that makes many tool calls in one step. Two things change for hooks:
 *  - When code can run in the background, UserPromptSubmit command/http/mcp_tool hooks also run on the code's
 *    output, with `source: "poll_event"` in their input. Those turns are not a user prompt: CCC hooks must not log
 *    them as prompts, inject context into them, or block them.
 *  - The code itself is a `REPL` tool call whose program is in `tool_input.code`.
 * Source: https://code.claude.com/docs/en/code-mode (read 2026-11-18).
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** True when a UserPromptSubmit payload is Code Mode output, not something the user typed. */
export function isCodeModePoll(payload) {
  return !!payload && typeof payload === 'object' && payload.source === 'poll_event';
}

/** The silent pass-through every UserPromptSubmit hook returns for a poll_event. */
export const POLL_PASS = Object.freeze({ continue: true, suppressOutput: true });

/** True for the tool call that runs Code Mode's JavaScript. */
export function isReplCall(toolName) {
  return toolName === 'REPL';
}

/** True when the module at `metaUrl` is the script node was started with (symlinks resolved). */
export function isMainModule(metaUrl) {
  try {
    if (!process.argv[1]) return false;
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}
