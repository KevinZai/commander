#!/usr/bin/env node
/**
 * route-task.mjs — CCC pre-run skill evaluation for one worker task.
 *
 *   node "${CLAUDE_PLUGIN_ROOT}/lib/route-task.mjs" "<task text>"
 *   printf '%s' "<task text>" | node "${CLAUDE_PLUGIN_ROOT}/lib/route-task.mjs"
 *
 * Prints one JSON line: {skills: ["/ccc-x", ...], candidates: [{skill, score}],
 * prompt_block}. `skills` holds 0-2 skills a worker may load on its own (no
 * side-effect, hidden-only or agent routes), best first, from the same
 * registry and scorer the hooks use; `prompt_block` is that pick as a line
 * to put at the top of the worker's prompt. /ccc-fleet passes `skills` to
 * the ccc-fleet-run workflow as args.skills. Read-only and offline; the task
 * text is never written anywhere.
 */
import { loadRoutes, scoreTask, autoFollowable, detectHost } from '../hooks/lib/route-scorer.mjs';
import { isMainModule } from '../hooks/lib/code-mode.mjs';

export const PICK_FLOOR = 0.25;
export const PICK_MAX = 2;
const MAX_INPUT = 65536;

/** The pre-run pick for one task. */
export function pick(task, routes = loadRoutes(), host = detectHost()) {
  const name = (s) => (host === 'codex' ? `$${s.slice(1)}` : `commander:${s.slice(1)}`);
  const any = host === 'codex' ? '$ccc-* skill' : 'commander:ccc-* skill';
  const scored = scoreTask(String(task || '').slice(0, MAX_INPUT), routes).filter((c) => c.route.kind === 'skill');
  const skills = scored.filter((c) => c.score >= PICK_FLOOR && autoFollowable(c.route)).slice(0, PICK_MAX).map((c) => `/${c.route.id}`);
  const promptBlock = skills.length
    ? `CCC pre-run: before you start, load ${skills.map(name).join(', then ')} and follow it where it fits this task.`
    : `CCC pre-run: no CCC skill matched this task by keyword. Check your skill list for a ${any} that fits and load it; never run deploy, push, publish or tracker skills. If none fits, just start.`;
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

if (isMainModule(import.meta.url)) {
  const arg = process.argv.slice(2).filter((a) => a !== '--json').join(' ');
  const task = arg || (await readStdin());
  if (!task.trim()) {
    process.stderr.write('route-task: pass the task text as an argument or on stdin\n');
    process.exit(2);
  }
  process.stdout.write(`${JSON.stringify(pick(task))}\n`);
}
