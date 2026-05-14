import { track } from '../lib/telemetry.mjs';
#!/usr/bin/env node
/**
 * git-push-reminder.js
 * Hook: PreToolUse (Bash)
 * Adds a passive reminder before `git push` commands suggesting a final
 * review of staged changes. Non-blocking — warns only via stderr.
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
      track('hook_fired', { hook: 'PreToolUse', handler: 'git-push-reminder' });

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
    if (/\bgit\s+push\b/.test(cmd)) {
      console.error('[CCC] git push detected — review your diff with: git diff @{push}..HEAD');
      // Detect force-push to main/master (warn loud, do not block)
      if (/\bgit\s+push\b.*(--force|--force-with-lease|-f\b).*\b(main|master)\b/.test(cmd)) {
        console.error('[CCC] WARNING: force-push to main/master detected — confirm this is intentional');
      }
    }
  } catch {
    // fail open
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main();
