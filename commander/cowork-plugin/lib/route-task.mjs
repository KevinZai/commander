#!/usr/bin/env node
/**
 * route-task.mjs — CCC pre-run skill evaluation for one worker task.
 *
 *   node "${CLAUDE_PLUGIN_ROOT}/lib/route-task.mjs" --tasks-file slices.json
 *   node "${CLAUDE_PLUGIN_ROOT}/lib/route-task.mjs" < task.txt
 *
 * Task text is data: pass it in a file (a JSON array of strings, one per
 * slice) or on stdin, never interpolated into shell source.
 *
 * Prints one JSON line per task: {skills: ["/ccc-x", ...], candidates:
 * [{skill, score}], prompt_block}. `skills` holds 0-2 worker skills
 * (route-hints.json "worker": visible, no side effect, one thread), best
 * first, from the same registry and scorer the hooks use; `prompt_block` is
 * that pick as a line for the top of the worker's prompt. /ccc-fleet passes
 * `skills` to the ccc-fleet-run workflow as args.skills. Read-only and
 * offline; the task text is never written anywhere.
 */
import { readFileSync } from 'node:fs';
import { loadRoutes, scoreTask, workerEligible, detectHost } from '../hooks/lib/route-scorer.mjs';
import { isMainModule } from '../hooks/lib/code-mode.mjs';

export const PICK_FLOOR = 0.25;
export const PICK_MAX = 2;
const MAX_INPUT = 65536;
const IN_THREAD = 'Stay in this thread: do not start other agents or workflows, take the recommended option where the skill would ask a question, and never run deploy, push, publish or tracker steps.';

/** The pre-run pick for one task. */
export function pick(task, routes = loadRoutes(), host = detectHost()) {
  const name = (s) => (host === 'codex' ? `$${s.slice(1)}` : `commander:${s.slice(1)}`);
  const scored = scoreTask(String(task || '').slice(0, MAX_INPUT), routes).filter((c) => c.route.kind === 'skill');
  const skills = scored.filter((c) => c.score >= PICK_FLOOR && workerEligible(c.route)).slice(0, PICK_MAX).map((c) => `/${c.route.id}`);
  const promptBlock = skills.length
    ? `CCC pre-run: before you start, load ${skills.map(name).join(', then ')} and follow it where it fits this task. ${IN_THREAD}`
    : 'CCC pre-run: no CCC skill fits this task; work without one.';
  return {
    skills,
    candidates: scored.slice(0, 3).map((c) => ({ skill: `/${c.route.id}`, score: c.score })),
    prompt_block: promptBlock,
  };
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  let text = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    text += chunk;
    if (text.length > MAX_INPUT) break;
  }
  return text;
}

/** Tasks from argv: --tasks-file <JSON array of strings>, else stdin as one task. */
export function readTasks(argv, stdinText) {
  const i = argv.indexOf('--tasks-file');
  if (i >= 0) {
    if (!argv[i + 1]) throw new Error('--tasks-file needs a path');
    const raw = readFileSync(argv[i + 1], 'utf8');
    if (raw.length > MAX_INPUT * 16) throw new Error('tasks file too large');
    const tasks = JSON.parse(raw);
    if (!Array.isArray(tasks) || !tasks.every((t) => typeof t === 'string')) throw new Error('tasks file must be a JSON array of strings');
    return tasks;
  }
  return [String(stdinText || '')];
}

if (isMainModule(import.meta.url)) {
  const argv = process.argv.slice(2);
  try {
    const tasks = readTasks(argv, argv.includes('--tasks-file') ? '' : await readStdin());
    if (!tasks.length || tasks.some((t) => !t.trim())) throw new Error('every task needs text');
    const routes = loadRoutes();
    for (const t of tasks) process.stdout.write(`${JSON.stringify(pick(t, routes))}\n`);
  } catch (err) {
    process.stderr.write(`route-task: ${err.message}. Pass --tasks-file <JSON array of strings> or the task on stdin\n`);
    process.exit(2);
  }
}
