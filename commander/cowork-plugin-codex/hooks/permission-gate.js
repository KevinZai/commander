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
 * Output contract: ALWAYS exit 0. Rejections are delivered as a documented
 * PermissionRequest decision payload on stdout —
 *   { hookSpecificOutput: { hookEventName: 'PermissionRequest',
 *     decision: { behavior: 'deny', message } } }
 * (stdout on exit 1 is DISCARDED by the harness — the old exit-1 +
 * {continue:false} shape never actually blocked anything and produced false
 * `rejected-*` telemetry in permission-gate.jsonl.)
 *
 * Core free forever — no license check, no tier gating.
 */
import { track } from '../lib/telemetry.mjs';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stateDir } from '../lib/lane-state.js';

function denyDecision(message) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: { behavior: 'deny', message },
    },
  };
}

const CCC_DIR = stateDir();

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
  /git\s+push\s+--force/,   // kept as-is so nothing denied before CC-654 is allowed now
  // CC-654, any force push: --force[-with-lease], -f (alone or bundled, before or after the remote), a +refspec.
  // `git` starts a word (a path like /usr/bin/git or a quoted `sh -c "git ..."` counts) and only global options
  // (-C/-c <v>, --x[=v]) may sit before `push`, so a commit message that mentions a force push is not denied.
  // Remote deletes deny too: :ref, --delete/-d, --mirror, --prune; a refspec may be quoted ("+main", +'main', ':main').
  // A bare `:` (matching branches, quoted or followed by a separator) is not a delete.
  // git takes any unambiguous prefix of a long option (--forc, --dele), so prefixes of those four deny too.
  /(?<![^\s;&|("'/])git(?:\s+(?:-[Cc]\s+\S+|--(?:git-dir|work-tree|namespace)\s+\S+|--[a-z][a-z-]*(?:=\S+)?))*\s+push\b[^;&|\n]*\s["']?(?:--(?:fo(?:r(?:ce?)?)?|de(?:l(?:e(?:te?)?)?)?|mi(?:r(?:r(?:or?)?)?)?|pr(?:u(?:ne?)?)?)\b|-[a-zA-Z]*[fd][a-zA-Z]*\b|\+\S|:["']?[^\s"';&|)])/,
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

// CC-654: the shell removes quotes and escapes and runs substitutions before git sees its arguments, so `\+main`,
// --\force, -''f, $'\x2df', $(echo -f), `echo -f` and git${IFS}push all reach git as a force push. shellView() is a
// rough unquote pass: quotes and escapes go as the shell would drop them, $'...' escapes are decoded, $(...) and
// backticks become their text between spaces, and $IFS / ${IFS} become a space. Plain variables ($F) stay unknown.
const ANSI_C = { a: '\x07', b: '\b', e: '\x1b', E: '\x1b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' };

function ansiC(body) {
  return body.replace(/\\(x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{1,4}|U[0-9a-fA-F]{1,8}|[0-7]{1,3}|c.|.)/gs, (m, e) => {
    if (/^[xuU][0-9a-fA-F]/.test(e)) { const cp = parseInt(e.slice(1), 16); return cp <= 0x10ffff ? String.fromCodePoint(cp) : ''; }
    if (/^[0-7]/.test(e)) return String.fromCharCode(parseInt(e, 8) & 0xff);
    if (e[0] === 'c') return String.fromCharCode(e.charCodeAt(1) & 0x1f);
    return ANSI_C[e] ?? ('\\\'"?'.includes(e) ? e : `\\${e}`);   // bash keeps the backslash of an unknown escape ($'\x' is \x)
  });
}

function shellView(cmd) {
  let out = '';
  const stack = [{ kind: 'top', parens: 0 }];   // top | sub ($(...)) | bt (`...`) | dq ("...")
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i]; const next = cmd[i + 1]; const top = stack[stack.length - 1];
    const ifs = /^\$(?:\{IFS\}|IFS(?![A-Za-z0-9_]))/.exec(cmd.slice(i));
    if (ifs) { out += ' '; i += ifs[0].length - 1; continue; }
    if (c === '$' && next === '(' && cmd[i + 2] !== '(') { stack.push({ kind: 'sub', parens: 0 }); out += ' '; i++; continue; }
    if (c === '`') { if (top.kind === 'bt') stack.pop(); else stack.push({ kind: 'bt', parens: 0 }); out += ' '; continue; }
    if (top.kind === 'dq') {
      if (c === '"') { stack.pop(); continue; }
      if (c === '\\' && next !== undefined && '$`"\\\n'.includes(next)) { if (next !== '\n') out += next; i++; continue; }
      out += c; continue;
    }
    if (c === '\\') { if (next !== undefined && next !== '\n') out += next; i++; continue; }
    if (c === "'") { const end = cmd.indexOf("'", i + 1); const stop = end === -1 ? cmd.length : end; out += cmd.slice(i + 1, stop); i = stop; continue; }
    if (c === '$' && next === "'") {
      let j = i + 2; while (j < cmd.length && cmd[j] !== "'") j += cmd[j] === '\\' ? 2 : 1;
      out += ansiC(cmd.slice(i + 2, Math.min(j, cmd.length))); i = j; continue;
    }
    if (c === '"') { stack.push({ kind: 'dq', parens: 0 }); continue; }
    if (top.kind === 'sub' && c === '(') top.parens++;
    if (top.kind === 'sub' && c === ')') { if (top.parens) top.parens--; else { stack.pop(); out += ' '; continue; } }
    out += c;
  }
  return out;
}

function isDangerousCommand(toolInput) {
  const cmd = toolInput?.command || toolInput?.cmd || '';
  if (typeof cmd !== 'string') return false;
  const joined = cmd.replace(/\\\r?\n/g, '');   // the shell drops a backslash-newline: `+\<newline>main` is `+main`
  if (DANGEROUS_PATTERNS.some(pat => pat.test(joined))) return true;   // raw first: nothing denied before shellView is allowed now
  let view;
  try { view = shellView(joined); } catch { return false; }   // a view that cannot be built never overrides the raw check above
  return DANGEROUS_PATTERNS.some(pat => pat.test(view));
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
      track('hook_fired', { hook: 'PermissionRequest', handler: 'permission-gate' });

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

  // 2. Dangerous bash commands → always reject (exit 0 + deny decision;
  //    exit 1 would discard stdout and silently approve)
  if (toolName === 'Bash' && isDangerousCommand(toolInput)) {
    const cmd = toolInput?.command || toolInput?.cmd || '';
    await logDecision({
      timestamp: new Date().toISOString(),
      sessionId,
      decision: 'rejected-dangerous',
      toolName,
      commandSnippet: cmd.slice(0, 120),
    });
    process.stdout.write(JSON.stringify(denyDecision(
      `CCC PERMISSION GATE: Dangerous operation blocked — "${cmd.slice(0, 80)}" ` +
      `matched a destructive command pattern. ` +
      `Review the command and run manually if you are certain it is safe.`
    )) + '\n');
    return;
  }

  // 3. /ccc-review autofix writes → require explicit approval flag
  if (isAutofixWrite(toolName, context)) {
    const autofixApproved = process.env.CCC_AUTOFIX_APPROVED === '1';
    if (!autofixApproved) {
      await logDecision({
        timestamp: new Date().toISOString(),
        sessionId,
        decision: 'rejected-autofix',
        toolName,
        skill: context.skill || '/ccc-review',
        phase: context.phase || 'autofix',
      });
      process.stdout.write(JSON.stringify(denyDecision(
        `CCC PERMISSION GATE: /ccc-review autofix write blocked. ` +
        `Set CCC_AUTOFIX_APPROVED=1 to allow, or apply fixes manually.`
      )) + '\n');
      return;
    }
    // CCC_AUTOFIX_APPROVED=1 — the autofix write is allowed. Log a distinct
    // `approved-autofix` decision (not the generic 'approved' below) so
    // Safety's "auto-fixed" bucket (safety-snapshot.js's classifyDecision)
    // has a real signal to count instead of being permanently empty (v7.3.0,
    // W2+/codex 13).
    await logDecision({
      timestamp: new Date().toISOString(),
      sessionId,
      decision: 'approved-autofix',
      toolName,
      skill: context.skill || '/ccc-review',
      phase: context.phase || 'autofix',
    });
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    return;
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
