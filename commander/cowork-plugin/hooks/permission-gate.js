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
  // (-C/-c <v>, a lone -p/-P/-h..., --x[=v]) may sit before `push`, so a commit message that mentions a force push is not denied.
  // Remote deletes deny too: :ref, --delete/-d, --mirror, --prune; a refspec may be quoted ("+main", +'main', ':main').
  // A bare `:` (matching branches, quoted or followed by a separator) is not a delete.
  // git takes any unambiguous prefix of a long option (--forc, --dele), so prefixes of those four deny too.
  /(?<![^\s;&|("'/])git(?:\s+(?:-[Cc]\s+\S+|-[a-zA-Z]|--(?:git-dir|work-tree|namespace)\s+\S+|--[a-z][a-z-]*(?:=\S+)?))*\s+push\b[^;&|\n]*\s["']?(?:--(?:fo(?:r(?:ce?)?)?|de(?:l(?:e(?:te?)?)?)?|mi(?:r(?:r(?:or?)?)?)?|pr(?:u(?:ne?)?)?)\b|-[a-zA-Z]*[fd][a-zA-Z]*\b|\+\S|:["']?[^\s"';&|)])/,
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

const NESTED_EXPANSION = /\$\{[^}]*(?:\$\{|\$\(|`)/;
const GIT_PUSH = /(?<![^\s;&|("'/])git(?:\s+(?:-[Cc]\s+\S+|-[a-zA-Z]|--(?:git-dir|work-tree|namespace)\s+\S+|--[a-z][a-z-]*(?:=\S+)?))*\s+push\b/;
const QUOTED_BRACE = { '{': '\uE000', ',': '\uE001', '}': '\uE002' };

function shellView(cmd, { glue = false, params = 'unset', subs = 'text' } = {}) {
  // glue: whitespace that the shell keeps inside one word (quoted or escaped) becomes `_`, so `-C "a b" push` keeps -C's value one word.
  // Quoted or escaped { , } are literal for bash, so they become private-use characters that expandBraces() leaves alone.
  const lit = (t) => { const kept = t.replace(/[{,}]/g, (b) => QUOTED_BRACE[b]); return glue ? kept.replace(/\s/g, '_') : kept; };
  let out = '';
  const bodies = [];   // each substitution's text on its own: bash runs it whatever text follows it
  const stack = [{ kind: 'top', parens: 0 }];   // top | sub ($(...)) | bt (`...`) | dq ("...") | param (${x:-word})
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i]; const next = cmd[i + 1]; const top = stack[stack.length - 1];
    const ifs = /^\$(?:\{IFS\}|IFS(?![A-Za-z0-9_]))/.exec(cmd.slice(i));
    if (ifs) { out += ' '; i += ifs[0].length - 1; continue; }
    // ${IFS<op>...} (${IFS%?}, ${IFS:-...}) is a separator in the view; what it holds is still checked on its own as a body
    if (/^\$\{IFS[^A-Za-z0-9_}]/.test(cmd.slice(i))) { out += ' '; stack.push({ kind: 'param', ifs: true, parens: 0, from: out.length }); i += 5; continue; }
    // ${x:-word} and friends expand to word or to nothing. params picks the outcome: unset (what an unset x gives: - and = give word,
    // + and ? nothing), word (always word) or empty (always nothing); isDangerousCommand checks all three
    const param = /^\$\{[A-Za-z_][A-Za-z0-9_]*:?([-=+?])/.exec(cmd.slice(i));
    if (param) {
      const keep = params === 'word' || (params === 'unset' && '-='.includes(param[1]));
      stack.push({ kind: 'param', keep, parens: 0, from: out.length }); i += param[0].length - 1; continue;
    }
    // a plain ${x} / ${#x} / ${!x} is an unknown value, and so are ${x%%pat}, ${x:0:1}, ${!x}...: what they hold is a pattern, not output
    const plain = /^\$\{[!#]?[A-Za-z_][A-Za-z0-9_]*\}/.exec(cmd.slice(i));
    if (plain) { out += subs === 'stub' ? '_' : ''; i += plain[0].length - 1; continue; }
    const pattern = /^\$\{[!#]?[A-Za-z_][A-Za-z0-9_]*/.exec(cmd.slice(i));
    if (pattern) { stack.push({ kind: 'param', unknown: true, parens: 0, from: out.length }); i += pattern[0].length - 1; continue; }
    if (top.kind === 'param' && c === '}') {
      const p = stack.pop();
      if (p.ifs) { bodies.push(out.slice(p.from)); out = out.slice(0, p.from) + ' '; }
      else if (p.unknown) {   // params word puts a ${x/pat/rep} replacement in place: ${x/a/ -f} can put -f on the command line
        const body = out.slice(p.from); bodies.push(body);
        const rep = params === 'word' ? (/^\/[/#%]?[^/]*\/([\s\S]*)$/.exec(body)?.[1] ?? body) : (subs === 'stub' ? '_' : '');
        out = out.slice(0, p.from) + rep;
      }
      else if (!p.keep) out = out.slice(0, p.from);
      continue;
    }
    // a substitution's output is unknown and may be empty ($(true):main is :main). subs picks a stand-in: text (its text between spaces),
    // empty (nothing: -$(true)f is -f) or stub (one word: -C "$(...)" push). Its body is always checked on its own. Fail closed: this
    // also denies "$(git rev-parse HEAD)":ref; the user runs it by hand
    if ((c === '$' && next === '(' && cmd[i + 2] !== '(') || (c === '`' && top.kind !== 'bt')) {
      if (subs === 'text') out += ' ';
      stack.push({ kind: c === '`' ? 'bt' : 'sub', parens: 0, from: out.length }); if (c === '$') i++; continue;
    }
    if (c === '`' || (top.kind === 'sub' && c === ')' && !top.parens)) {
      const body = out.slice(stack.pop().from); bodies.push(body);
      if (subs === 'text') out += ' '; else out = out.slice(0, out.length - body.length) + (subs === 'stub' ? '_' : '');
      continue;
    }
    if (top.kind === 'dq') {
      if (c === '"') { stack.pop(); continue; }
      if (c === '\\' && next !== undefined && '$`"\\\n'.includes(next)) { if (next !== '\n') out += lit(next); i++; continue; }
      out += lit(c); continue;
    }
    if (c === '\\') { if (next !== undefined && next !== '\n') out += lit(next); i++; continue; }
    if (c === "'") { const end = cmd.indexOf("'", i + 1); const stop = end === -1 ? cmd.length : end; out += lit(cmd.slice(i + 1, stop)); i = stop; continue; }
    if (c === '$' && next === "'") {
      let j = i + 2; while (j < cmd.length && cmd[j] !== "'") j += cmd[j] === '\\' ? 2 : 1;
      out += lit(ansiC(cmd.slice(i + 2, Math.min(j, cmd.length))).split('\0')[0]); i = j; continue;   // bash ends a $'...' word at a NUL
    }
    if (c === '"') { stack.push({ kind: 'dq', parens: 0 }); continue; }
    if (c === '$' && next === '"') continue;   // $"..." (locale quoting) is a double-quoted string
    if (top.kind === 'sub' && c === '(') top.parens++;
    if (top.kind === 'sub' && c === ')') top.parens--;
    out += c;
  }
  return [out, ...bodies];
}

// Brace expansion: pre{a,b}post is the words preabpost... (`{--force,}`, `-{f,}`, `{+,}main`); inner braces first, bounded.
function expandBraces(view) {
  if (!view.includes('{')) return view;
  for (let n = 0; n < 32 && view.length < 20000; n++) {
    const next = view.replace(/(?<![^\s{,])([^\s{}]*)\{([^{}\s]*,[^{}\s]*)\}(\S*)/, (m, pre, alts, post) => alts.split(',').map(a => pre + a + post).join(' '));
    if (next === view) break;
    view = next;
  }
  return view;
}

function isDangerousCommand(toolInput) {
  const cmd = toolInput?.command || toolInput?.cmd || '';
  if (typeof cmd !== 'string') return false;
  const joined = cmd.replace(/\\\r?\n/g, '');   // the shell drops a backslash-newline: `+\<newline>main` is `+main`
  if (DANGEROUS_PATTERNS.some(pat => pat.test(joined))) return true;   // raw first: nothing denied before shellView is allowed now
  let views;
  const modes = [];
  for (const glue of [false, true]) for (const params of ['unset', 'word', 'empty']) for (const subs of ['text', 'empty', 'stub']) modes.push({ glue, params, subs });
  try { views = modes.flatMap(m => shellView(joined, m)).map(v => expandBraces(v.replace(/\0/g, ''))); } catch { return false; }   // a view that cannot be built never overrides the raw check above
  if (views.some(view => DANGEROUS_PATTERNS.some(pat => pat.test(view)))) return true;
  // A nested expansion inside ${...} has mixed outcomes the views above do not enumerate (Codex r11: ${x:-${y} ${z-a}-f}), so a
  // command that runs git push next to one is denied outright: fail closed, the user runs it by hand
  return NESTED_EXPANSION.test(joined) && views.some(view => GIT_PUSH.test(view));
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
