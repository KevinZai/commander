#!/usr/bin/env node
import { track } from '../lib/telemetry.mjs';
/**
 * pr-link-notify.js
 * Hook: PostToolUse (Bash)
 * After a `gh pr create` succeeds, surfaces the PR URL and a copy-paste
 * review command. Pure stderr notification, never blocks.
 * Adapted from ECC vendor (CommonJS → ESM).
 * Never crashes the session — fail open on any error.
 */

async function main() {
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
      track('hook_fired', { hook: 'PostToolUse', handler: 'pr-link-notify' });

    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  try {
    const toolName = input.tool_name || input.toolName || '';
    if (toolName !== 'Bash') {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const cmd = String(input.tool_input?.command || '');
    if (!/\bgh\s+pr\s+create\b/.test(cmd)) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Tool output may be at multiple paths depending on Cowork version
    const out = String(
      input.tool_output?.output ||
      input.tool_response?.output ||
      input.tool_response?.stdout ||
      ''
    );
    const match = out.match(/https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/);
    if (match) {
      const prUrl = match[0];
      const repo = prUrl.replace(/https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/\d+/, '$1');
      const prNum = prUrl.replace(/.+\/pull\/(\d+)/, '$1');
      console.error(`[CCC] PR created: ${prUrl}`);
      console.error(`[CCC] Review: gh pr view ${prNum} --repo ${repo} --web`);
    }
  } catch {
    // fail open
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main();
