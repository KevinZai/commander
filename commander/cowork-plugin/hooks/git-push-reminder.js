#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
/**
 * git-push-reminder.js
 * Hook: PreToolUse (Bash)
 * Adds a passive reminder before `git push` commands suggesting a final
 * review of staged changes (stderr). A force-push that lands on main/master —
 * named in the command, or the current branch when no refspec is given —
 * gets a user-visible systemMessage. Never blocks.
 * Adapted from ECC vendor (CommonJS → ESM).
 * Never crashes the session — fail open on any error.
 */

const PROTECTED = /^(main|master)$/;
// --force-if-includes alone is a no-op without --force-with-lease, so it is not listed.
const FORCE_FLAG = /^(--force|--force-with-lease(=.*)?|-[a-zA-Z]*f[a-zA-Z]*)$/;
// Options whose value is the next token (so it is not read as remote/refspec).
const TAKES_VALUE = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);
const SHELLS = new Set(['sh', 'bash', 'zsh']);
// The pre-parser check, kept for segments whose push sits inside one word (eval, xargs, nested quoting).
const LEGACY_FORCE_MAIN = /\bgit\s+push\b.*(--force|--force-with-lease|-f\b).*\b(main|master)\b/;

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd, encoding: 'utf8', timeout: 1000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Split a shell command into simple commands (at ; && || | & ( ) and newlines),
 * each a list of words with quotes and backslashes resolved. Redirections
 * (`>log`, `2>&1`, `&>log`, `<in`) and their operands are dropped.
 */
function shellSegments(cmd) {
  const s = String(cmd);
  const segments = [];
  let words = [];
  let word = '';
  let inWord = false;
  let dropNext = false;
  const endWord = () => {
    if (inWord) {
      if (dropNext) dropNext = false;
      else words.push(word);
    }
    word = '';
    inWord = false;
  };
  const endSegment = () => {
    endWord();
    if (words.length) segments.push(words);
    words = [];
    dropNext = false;
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'") {
      const j = s.indexOf("'", i + 1);
      word += s.slice(i + 1, j < 0 ? s.length : j);
      inWord = true;
      i = j < 0 ? s.length : j;
    } else if (c === '"') {
      let j = i + 1;
      for (; j < s.length && s[j] !== '"'; j++) {
        if (s[j] === '\\' && j + 1 < s.length) j++;
        word += s[j];
      }
      inWord = true;
      i = j;
    } else if (c === '\\' && i + 1 < s.length) {
      word += s[++i];
      inWord = true;
    } else if (c === '>' || c === '<' || (c === '&' && s[i + 1] === '>')) {
      if (/^\d+$/.test(word)) { word = ''; inWord = false; } // fd prefix: 2>
      endWord();
      if (c === '&') i++;
      while (s[i + 1] === '>' || s[i + 1] === '<') i++;
      if (s[i + 1] === '&') {
        i++;
        while (/[\d-]/.test(s[i + 1] || '')) i++; // >&1, >&-: no operand
      } else {
        dropNext = true;
      }
    } else if (c === ';' || c === '\n' || c === '|' || c === '&' || c === '(' || c === ')') {
      endSegment();
      if ((c === '|' || c === '&') && s[i + 1] === c) i++;
    } else if (/\s/.test(c)) {
      endWord();
    } else {
      word += c;
      inWord = true;
    }
  }
  endSegment();
  return segments;
}

/**
 * The protected branch a force-push in `cmd` would overwrite, or ''. Reads `git push`
 * directly and inside `sh|bash|zsh -c '<script>'`; a segment that hides its push in one
 * word (eval, xargs, nested quoting) gets the substring check. `cwd` is where the command
 * starts; a `cd <dir>` segment moves it.
 */
function forcePushTarget(cmd, cwd, resolveBranch, depth = 0) {
  let dir = cwd;
  for (const tokens of shellSegments(cmd)) {
    if (tokens[0] === 'cd' && tokens[1]) {
      dir = path.resolve(dir, tokens[1].replace(/^~(?=\/|$)/, os.homedir()));
      continue;
    }
    const c = tokens.indexOf('-c');
    if (depth < 2 && SHELLS.has(path.basename(tokens[0] || '')) && c > 0 && tokens[c + 1] !== undefined) {
      const inner = forcePushTarget(tokens[c + 1], dir, resolveBranch, depth + 1);
      if (inner) return inner;
      continue;
    }
    const at = tokens.findIndex((t, i) => t === 'push' && path.basename(tokens[i - 1] || '') === 'git');
    if (at < 0) {
      const legacy = tokens.join(' ').match(LEGACY_FORCE_MAIN);
      if (legacy) return legacy[2];
      continue;
    }
    let force = false;
    let tags = false;
    let everyBranch = false;
    const positional = [];
    for (let i = at + 1; i < tokens.length; i++) {
      const t = tokens[i];
      if (TAKES_VALUE.has(t)) { i++; continue; }
      if (t === '--tags') tags = true;
      if (t === '--all' || t === '--branches' || t === '--mirror') everyBranch = true;
      if (t.startsWith('-')) { if (FORCE_FLAG.test(t)) force = true; continue; }
      positional.push(t);
    }
    if (force && everyBranch) return 'every branch (main/master included)';
    // The first positional is the repository; it overrides --repo when both are given.
    const refspecs = positional.slice(1);
    // A leading `+` forces only its own refspec; flags force every destination. With no
    // refspec the current branch is pushed, unless --tags makes it a tag-only push.
    const forced = refspecs.length
      ? refspecs.filter((r) => force || r.startsWith('+')).map((r) => r.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, ''))
      : force && !tags ? ['HEAD'] : [];
    for (const dest of forced) {
      const branch = dest === 'HEAD' ? resolveBranch(dir) : dest;
      if (PROTECTED.test(branch)) return branch;
    }
  }
  return '';
}

async function main() {
  track('hook_fired', { hook: 'PreToolUse', handler: 'git-push-reminder' });
  let input = {};
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw) input = JSON.parse(raw);
  } catch {
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
      const target = forcePushTarget(cmd, input.cwd || process.cwd(), currentBranch);
      if (target) {
        process.stdout.write(JSON.stringify(emitUser(
          `[CCC] WARNING: force-push to ${target} detected — confirm this is intentional`
        )) + '\n');
        return;
      }
    }
  } catch {
    // fail open
  }

  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}

main();
