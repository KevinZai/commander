#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { track } from '../lib/telemetry.mjs';
import { emitUser } from './lib/emit.mjs';
import { isMainModule } from './lib/code-mode.mjs';
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

// git's global options that take the next word as their value (`git -C app push`, `git -c k=v push`).
const GIT_GLOBAL_TAKES_VALUE = new Set([
  '-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--super-prefix', '--attr-source', '--shallow-file',
]);
const LEGACY_PUSH = /\bgit\s+push\b/;

function expandHome(p) {
  return p.replace(/^~(?=\/|$)/, os.homedir());
}

/**
 * Where `push` sits in one simple command, and the directory git runs in: `git push`,
 * `/usr/bin/git push`, `env X=1 git push` and `git -C <dir> -c k=v push` all count.
 * Returns { at, dir } or null.
 */
function locatePush(tokens, dir) {
  for (let g = 0; g < tokens.length; g++) {
    if (path.basename(tokens[g]) !== 'git') continue;
    let gitDir = dir;
    let i = g + 1;
    while (i < tokens.length && tokens[i].startsWith('-')) {
      const t = tokens[i];
      if (t === '-C' && tokens[i + 1] !== undefined) gitDir = path.resolve(gitDir, expandHome(tokens[i + 1]));
      i += GIT_GLOBAL_TAKES_VALUE.has(t) ? 2 : 1;
    }
    if (tokens[i] === 'push') return { at: i, dir: gitDir };
  }
  return null;
}

/**
 * Every part of a compound command (`a && b; c | d`, subshells, `sh -c '<script>'`) is
 * checked on its own, so `cd 'app' && git push` (the form Code Mode hands PreToolUse,
 * code.claude.com/docs/en/code-mode#permission-checks) is seen like a bare `git push`.
 * Returns { push, target }: whether any part pushes, and the protected branch a force-push
 * would overwrite ('' when none). A segment that hides its push in one word (eval, xargs,
 * nested quoting) gets the substring checks. `cwd` is where the command starts; a
 * `cd <dir>` segment moves it.
 */
function analyzePush(cmd, cwd, resolveBranch, depth = 0) {
  let dir = cwd;
  let push = false;
  for (const tokens of shellSegments(cmd)) {
    if (tokens[0] === 'cd' && tokens[1]) {
      dir = path.resolve(dir, expandHome(tokens[1]));
      continue;
    }
    const c = tokens.indexOf('-c');
    if (depth < 2 && SHELLS.has(path.basename(tokens[0] || '')) && c > 0 && tokens[c + 1] !== undefined) {
      const inner = analyzePush(tokens[c + 1], dir, resolveBranch, depth + 1);
      if (inner.target) return inner;
      push = push || inner.push;
      continue;
    }
    const found = locatePush(tokens, dir);
    if (!found) {
      const joined = tokens.join(' ');
      if (LEGACY_PUSH.test(joined)) push = true;
      const legacy = joined.match(LEGACY_FORCE_MAIN);
      if (legacy) return { push: true, target: legacy[2] };
      continue;
    }
    push = true;
    const { at } = found;
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
    if (force && everyBranch) return { push, target: 'every branch (main/master included)' };
    // The first positional is the repository; it overrides --repo when both are given.
    const refspecs = positional.slice(1);
    // A leading `+` forces only its own refspec; flags force every destination. With no
    // refspec the current branch is pushed, unless --tags makes it a tag-only push.
    const forced = refspecs.length
      ? refspecs.filter((r) => force || r.startsWith('+')).map((r) => r.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, ''))
      : force && !tags ? ['HEAD'] : [];
    for (const dest of forced) {
      const branch = dest === 'HEAD' ? resolveBranch(found.dir) : dest;
      if (PROTECTED.test(branch)) return { push, target: branch };
    }
  }
  return { push, target: '' };
}

/** The protected branch a force-push in `cmd` would overwrite, or ''. */
export function forcePushTarget(cmd, cwd, resolveBranch) {
  return analyzePush(cmd, cwd, resolveBranch).target;
}

/** True when any part of `cmd` runs `git push`. */
export function hasGitPush(cmd, cwd = process.cwd()) {
  return analyzePush(cmd, cwd, () => '').push || LEGACY_PUSH.test(String(cmd));
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
    const { push, target } = analyzePush(cmd, input.cwd || process.cwd(), currentBranch);
    if (push || LEGACY_PUSH.test(cmd)) {
      console.error('[CCC] git push detected — review your diff with: git diff @{push}..HEAD');
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

if (isMainModule(import.meta.url)) main();
