#!/usr/bin/env node
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const FLEET_DIR = join(process.env.HOME, '.claude', 'commander', 'fleet');

async function main() {
  try {
    // Free forever — no license check. Hook always runs.
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const trimmed = input.trim();
    if (!trimmed) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    const data = JSON.parse(trimmed);

    if (!existsSync(FLEET_DIR)) await mkdir(FLEET_DIR, { recursive: true });

    const entry = {
      timestamp: new Date().toISOString(),
      type: data.type || 'notification',
      source: data.source || 'unknown',
      message: data.message || '',
    };

    await appendFile(join(FLEET_DIR, 'notifications.jsonl'), JSON.stringify(entry) + '\n');

    const safeSource = String(data.source || 'agent').replace(/[\r\n]/g, ' ').slice(0, 64);
    console.log(JSON.stringify({
      continue: true,
      suppressOutput: false,
      status: `CCC Fleet: ${safeSource} completed`,
    }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
