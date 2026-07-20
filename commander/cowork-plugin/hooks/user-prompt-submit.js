#!/usr/bin/env node
// License-tier gate removed 2026-04-23 — CC Commander is core free forever.
// SECURITY: NEVER log raw prompt content. Prompts may contain user secrets,
// API keys pasted by accident, or other sensitive material. Log promptLength,
// timestamp, and routing decision only. If you're tempted to add `body: prompt`
// to a log line, STOP and use `bodyLength: prompt.length` instead.
// See docs/security-sweep-2026-04-24.md (R3-2 lessons).
/**
 * user-prompt-submit.js
 * Hook: UserPromptSubmit
 * Logs prompt metadata for session analytics.
 *
 * The UserPromptSubmit hook delivers `{ session_id, prompt, ... }` on STDIN —
 * that is the PRIMARY source. The old CLAUDE_USER_PROMPT / CLAUDE_SESSION_ID
 * env vars are NOT populated by the harness in practice, which is why every
 * historical row recorded promptLength:0 and sessionId:"unknown" (same
 * stdin-vs-env bug class fixed for the sibling loggers). Env stays only as a
 * last-resort fallback. The raw prompt is measured, never stored.
 */
import { track } from '../lib/telemetry.mjs';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.claude', 'commander');
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
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
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

async function main() {
  try {
    const input = await readStdinJson();

    // Prompt is read only to MEASURE it — never written to disk (see SECURITY above).
    const prompt =
      firstString(
        input.prompt,
        input.user_input,
        input.user_prompt,
        process.env.CLAUDE_USER_PROMPT
      ) || '';
    const sessionId =
      firstString(input.session_id, input.sessionId, process.env.CLAUDE_SESSION_ID) || 'unknown';

    const metadata = {
      timestamp: new Date().toISOString(),
      sessionId,
      promptLength: prompt.length,
      hasCode: /```/.test(prompt),
      hasUrl: /https?:\/\//.test(prompt),
    };
    track('hook_fired', { hook: 'UserPromptSubmit', handler: 'user-prompt-submit' });
    const { appendFile, mkdir } = await import('node:fs/promises');
    const analyticsDir = join(CCC_DIR, 'analytics');
    await mkdir(analyticsDir, { recursive: true });
    await appendFile(
      join(analyticsDir, 'prompt-metadata.jsonl'),
      JSON.stringify(metadata) + '\n'
    );

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
