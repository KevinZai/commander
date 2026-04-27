#!/usr/bin/env node
/**
 * permission-gate.js
 * Hook: PermissionRequest (Codex Desktop only)
 *
 * Gates /ccc-review autofix writes and other destructive tool calls behind
 * explicit user approval in Codex Desktop's native approval dialog.
 *
 * Codex Desktop renders a richer native approval UI for PermissionRequest —
 * this hook returns structured JSON that drives that dialog.
 *
 * Behavior:
 *   - Read-only tool calls (Read, Glob, Grep, Bash reads) → auto-approve (exit 0)
 *   - /ccc-review autofix writes → reject unless CCC_AUTOFIX_APPROVED=1 env flag
 *   - Explicitly dangerous operations (rm -rf, git reset --hard) → reject always
 *   - Missing/malformed payload → fail open (approve) to avoid blocking sessions
 *
 * Payload shape (Codex PermissionRequest):
 * {
 *   "tool_name": "Bash",
 *   "tool_input": { "command": "rm -rf /tmp/foo" },
 *   "session_id": "...",
 *   "context": { "skill": "/ccc-review", "phase": "autofix" }
 * }
 *
 * Exit codes:
 *   0 → approved (continue: true)
 *   1 → rejected (continue: false, with rejection JSON on stdout)
 *
 * Free forever — no license check, no tier gating.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CCC_DIR = join(process.env.HOME || '/tmp', '.claude', 'commander');

// Tools that are always read-only — auto-approve
const READ_ONLY_TOOLS = new Set([
  'Read', 'Glob', 'Grep', 'LS', 'WebSearch', 'WebFetch',
  'TodoRead', 'NotebookRead',
]);

// Bash command patterns considered always-dangerous — always reject
const DANGEROUS_PATTERNS = [
  /rm\s+-[rRf]+\s/,
  /rm\s+--recursive/i,
  /git\s+reset\s+--hard/,
  /git\s+push\s+--force/,
  /git\s+clean\s+-[fdx]/,
  /chmod\s+-R\s+777/,
  /:\s*>\s*\/etc\//,       // truncate system files
  /dd\s+if=.*of=/,         // disk wipe
  /mkfs\./,
  /shred\s+/,
  />\s*\/dev\/sd[a-z]/,    // overwrite block device
];

// /ccc-review autofix write operations: Write, Edit, MultiEdit to source files
// These require explicit CCC_AUTOFIX_APPROVED=1 flag or context.phase !== 'autofix'
function isAutofixWrite(toolName, context) {
  const writingTools = new Set(['Write', 'Edit', 'MultiEdit']);
  if (!writingTools.has(toolName)) return false;
  const skill = context?.skill || '';
  const phase = context?.phase || '';
  return skill.includes('ccc-review') || phase === 'autofix';
}

function isDangerousCommand(toolInput) {
  const cmd = toolInput?.command || toolInput?.cmd || '';
  if (typeof cmd !== 'string') return false;
  return DANGEROUS_PATTERNS.some(pat => pat.test(cmd));
}

async function logDecision(entry) {
  try {
    const analyticsDir = join(CCC_DIR, 'analytics');
    await mkdir(analyticsDir, { recursive: true });
    await appendFile(
      join(analyticsDir, 'permission-gate.jsonl'),
      JSON.stringify(entry) + '\n'
    );
  } catch {
    // Logging failure must never block execution
  }
}

async function main() {
  // Read PermissionRequest payload from stdin
  let input = null;
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
    // Malformed or missing payload — fail open
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  // Missing payload — fail open
  if (!input || typeof input !== 'object') {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  const toolName = input.tool_name || input.toolName || '';
  const toolInput = input.tool_input || input.input || {};
  const context = input.context || {};
  const sessionId = input.session_id || input.sessionId || 'unknown';

  // 1. Read-only tools → always approve
  if (READ_ONLY_TOOLS.has(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
  }

  // 2. Dangerous bash commands → always reject
  if (toolName === 'Bash' && isDangerousCommand(toolInput)) {
    const cmd = toolInput?.command || toolInput?.cmd || '';
    const rejection = {
      continue: false,
      stopReason:
        `CCC PERMISSION GATE: Dangerous operation blocked — "${cmd.slice(0, 80)}" ` +
        `matched a destructive command pattern. ` +
        `Review the command and run manually if you are certain it is safe.`,
    };
    await logDecision({
      timestamp: new Date().toISOString(),
      sessionId,
      decision: 'rejected-dangerous',
      toolName,
      commandSnippet: cmd.slice(0, 120),
    });
    process.stdout.write(JSON.stringify(rejection) + '\n');
    process.exit(1);
  }

  // 3. /ccc-review autofix writes → require explicit approval flag
  if (isAutofixWrite(toolName, context)) {
    const autofixApproved = process.env.CCC_AUTOFIX_APPROVED === '1';
    if (!autofixApproved) {
      const rejection = {
        continue: false,
        stopReason:
          `CCC PERMISSION GATE: /ccc-review autofix write blocked. ` +
          `The review identified fixes to apply automatically. ` +
          `To allow, set CCC_AUTOFIX_APPROVED=1 in your environment and re-run. ` +
          `Or apply fixes manually from the review output.`,
      };
      await logDecision({
        timestamp: new Date().toISOString(),
        sessionId,
        decision: 'rejected-autofix',
        toolName,
        skill: context.skill || '/ccc-review',
        phase: context.phase || 'autofix',
      });
      process.stdout.write(JSON.stringify(rejection) + '\n');
      process.exit(1);
    }
  }

  // Default: approve
  await logDecision({
    timestamp: new Date().toISOString(),
    sessionId,
    decision: 'approved',
    toolName,
  });
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main().catch(() => {
  // Last-resort fail open — never crash the session
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
});
