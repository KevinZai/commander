#!/usr/bin/env node
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const CCC_DIR = join(process.env.HOME, '.claude', 'commander');
const SESSIONS_DIR = join(CCC_DIR, 'sessions');
const KNOWLEDGE_DIR = join(CCC_DIR, 'knowledge');
const LICENSE_FILE = join(CCC_DIR, 'license.json');

async function main() {
  try {
    for (const dir of [CCC_DIR, SESSIONS_DIR, KNOWLEDGE_DIR]) {
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    }

    const sessions = await readdir(SESSIONS_DIR).catch(() => []);
    const sessionCount = sessions.filter(f => f.endsWith('.json')).length;

    const knowledge = await readdir(KNOWLEDGE_DIR).catch(() => []);
    const knowledgeCount = knowledge.length;

    let tier = 'free';
    try {
      const license = JSON.parse(await readFile(LICENSE_FILE, 'utf8'));
      if (license.key && license.expires && new Date(license.expires) > new Date()) {
        tier = license.tier || 'pro';
      }
    } catch {}

    const activeFile = join(SESSIONS_DIR, 'active-session.json');
    try {
      await writeFile(activeFile, JSON.stringify({
        startedAt: new Date().toISOString(),
        status: 'active',
        tier,
      }, null, 2));
    } catch {}

    const status = `CCC 3.0 | Sessions: ${sessionCount} | Knowledge: ${knowledgeCount} entries | Tier: ${tier}`;

    console.log(JSON.stringify({
      continue: true,
      suppressOutput: false,
      status,
    }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
