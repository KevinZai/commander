#!/usr/bin/env node
// License-tier gate removed 2026-04-23 — CC Commander is free forever.
import { join } from 'node:path';

const SKILL_PATTERNS = [
  { skill: '/ccc:build', patterns: ['build', 'create app', 'new project', 'scaffold'], label: 'Build workflow' },
  { skill: '/ccc:standup', patterns: ['standup', 'daily', 'what did i do', 'morning'], label: 'Daily standup' },
  { skill: '/ccc:code-review', patterns: ['review', 'pr review', 'check changes', 'diff'], label: 'Code review' },
  { skill: '/ccc:deploy-check', patterns: ['deploy', 'ship', 'release', 'production'], label: 'Deploy check' },
  { skill: '/ccc:research', patterns: ['research', 'analyze', 'competitive', 'audit'], label: 'Research' },
  { skill: '/ccc:fleet', patterns: ['fleet', 'parallel', 'swarm', 'multi-agent'], label: 'Fleet management' },
  { skill: '/ccc:linear-board', patterns: ['linear', 'issues', 'tickets', 'backlog'], label: 'Linear board' },
  { skill: '/ccc:content', patterns: ['blog', 'post', 'content', 'social media', 'email'], label: 'Content creation' },
  { skill: '/ccc:night-mode', patterns: ['night', 'yolo', 'overnight', 'autonomous'], label: 'Night mode' },
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
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    for (const { skill, patterns, label } of SKILL_PATTERNS) {
      if (patterns.some(p => prompt.includes(p))) {
        console.log(JSON.stringify({
          continue: true,
          suppressOutput: false,
          status: `CCC suggests: ${skill} (${label})`,
        }));
        return;
      }
    }

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
