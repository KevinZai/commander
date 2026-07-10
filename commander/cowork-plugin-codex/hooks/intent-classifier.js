#!/usr/bin/env node
// License-tier gate removed 2026-04-23 — CC Commander is core free forever.
import { track } from '../lib/telemetry.mjs';
import { emitUser, emitSilent } from './lib/emit.mjs';
import { join } from 'node:path';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

// Deep-reasoning signals for Fable escalation nudge
const FABLE_SIGNALS = [
  'architecture', 'redesign', 'migration', 'threat model', 'system design',
  'refactor entire', 'plan the', 'roadmap',
];
const FABLE_PLANNING_VERBS = ['design', 'architect', 'plan', 'migrate', 'refactor', 'model'];

function checkFableNudge(prompt) {
  try {
    const lower = prompt.toLowerCase();
    const sigCount = FABLE_SIGNALS.filter(s => lower.includes(s)).length;
    const isLongWithVerbs = lower.length > 800 &&
      FABLE_PLANNING_VERBS.some(v => lower.includes(v));
    if (sigCount < 2 && !isLongWithVerbs) return null;

    // Check marker file (once per day keyed by date)
    const today = new Date().toISOString().slice(0, 10);
    const markerDir = join(homedir(), '.claude', 'commander');
    const markerFile = join(markerDir, `fable-nudge-${today}`);
    if (existsSync(markerFile)) return null;

    // Write marker before returning so concurrent calls don't double-fire
    try { mkdirSync(markerDir, { recursive: true }); } catch (_) {}
    try { writeFileSync(markerFile, '', { flag: 'wx' }); } catch (_) { return null; }

    return '🧠 Deep-reasoning session detected — consider /model claude-fable-5[1m] (Fable deep mode). CCC routes subagents cost-efficiently either way.';
  } catch (_) {
    return null; // fail-safe: never break the hook
  }
}

const SKILL_PATTERNS = [
  { skill: '/ccc-build', patterns: ['build', 'create app', 'new project', 'scaffold'], label: 'Build workflow' },
  { skill: '/ccc-standup', patterns: ['standup', 'daily', 'what did i do', 'morning'], label: 'Daily standup' },
  { skill: '/ccc-code-review', patterns: ['review', 'pr review', 'check changes', 'diff'], label: 'Code review' },
  { skill: '/ccc-deploy-check', patterns: ['deploy', 'ship', 'release', 'production'], label: 'Deploy check' },
  { skill: '/ccc-research', patterns: ['research', 'analyze', 'competitive', 'audit'], label: 'Research' },
  { skill: '/ccc-fleet', patterns: ['fleet', 'parallel', 'swarm', 'multi-agent'], label: 'Fleet management' },
  { skill: '/ccc-linear-board', patterns: ['linear', 'issues', 'tickets', 'backlog'], label: 'Linear board' },
  { skill: '/ccc-content', patterns: ['blog', 'post', 'content', 'social media', 'email'], label: 'Content creation' },
  { skill: '/ccc-night-mode', patterns: ['night', 'yolo', 'overnight', 'autonomous'], label: 'Night mode' },
  { skill: '/ccc-changelog', patterns: ['what changed', 'what is new', "what's new", 'changelog', 'release notes'], label: 'Changelog' },
  { skill: '/ccc-doctor', patterns: ['diagnose', 'doctor', 'health check', 'plugin status', 'plugin health', 'is my plugin ok'], label: 'Plugin doctor' },
  { skill: '/ccc-upgrade', patterns: ['update vendors', 'submodule update', 'upgrade vendors', 'weekly vendor sync'], label: 'Vendor upgrade' },
  { skill: '/ccc-memory', patterns: ['remember this', 'save to memory', 'what do we know', 'memory lookup', 'remember what'], label: 'Memory' },
  { skill: '/ccc-tasks', patterns: ['my tasks', 'todo list', "what's on my list", 'task tracker'], label: 'Tasks' },
  { skill: '/ccc-recall', patterns: ['what did we do last time', 'did i solve', 'prior session', 'recall from session'], label: 'Recall' },
];

async function main() {
  try {
    // Read stdin first to avoid broken pipe on early exit
    let input = '';
    for await (const chunk of process.stdin) input += chunk;

    const data = JSON.parse(input);
    const prompt = (data.prompt || data.message || '').toLowerCase();

    if (!prompt) {
      console.log(JSON.stringify(emitSilent()));
      return;
    }

    const fableNudge = checkFableNudge(prompt);

    for (const { skill, patterns, label } of SKILL_PATTERNS) {
      if (patterns.some(p => prompt.includes(p))) {
        const message = fableNudge
          ? `CCC suggests: ${skill} (${label}) · ${fableNudge}`
          : `CCC suggests: ${skill} (${label})`;
        console.log(JSON.stringify(emitUser(message)));
        return;
      }
    }

    if (fableNudge) {
      console.log(JSON.stringify(emitUser(fableNudge)));
      return;
    }

    console.log(JSON.stringify(emitSilent()));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }

  track('hook_fired', { hook: 'UserPromptSubmit', handler: 'intent-classifier' });
}

main();
