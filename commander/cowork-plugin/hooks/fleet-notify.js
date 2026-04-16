#!/usr/bin/env node
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const FLEET_DIR = join(process.env.HOME, '.claude', 'commander', 'fleet');

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

    if (tier === 'free') {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const data = JSON.parse(input);

    if (!existsSync(FLEET_DIR)) await mkdir(FLEET_DIR, { recursive: true });

    const entry = {
      timestamp: new Date().toISOString(),
      type: data.type || 'notification',
      source: data.source || 'unknown',
      message: data.message || '',
    };

    await appendFile(join(FLEET_DIR, 'notifications.jsonl'), JSON.stringify(entry) + '\n');

    console.log(JSON.stringify({
      continue: true,
      suppressOutput: false,
      status: `CCC Fleet: ${data.source || 'agent'} completed`,
    }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
