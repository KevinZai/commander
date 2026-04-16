#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
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
];

async function main() {
  try {
    const licenseFile = join(process.env.HOME, '.claude', 'commander', 'license.json');
    let tier = 'free';
    try {
      const license = JSON.parse(await readFile(licenseFile, 'utf8'));
      if (license.key && license.expires && new Date(license.expires) > new Date()) {
        tier = license.tier || 'pro';
      }
    } catch {}

    // Read stdin first to avoid broken pipe on early exit
    let input = '';
    for await (const chunk of process.stdin) input += chunk;

    if (tier === 'free') {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

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
