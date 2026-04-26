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

    // Sanitize untrusted fields once: strip CR/LF, length-cap.
    // Applies to both the persistent JSONL log AND the stdout status echo.
    const safeSource = String(data.source || 'unknown').replace(/[\r\n]/g, ' ').slice(0, 64);
    const safeMessage = String(data.message || '').replace(/[\r\n]/g, ' ').slice(0, 256);
    const safeType = String(data.type || 'notification').replace(/[\r\n]/g, ' ').slice(0, 32);

    const entry = {
      timestamp: new Date().toISOString(),
      type: safeType,
      source: safeSource,
      message: safeMessage,
    };

    await appendFile(join(FLEET_DIR, 'notifications.jsonl'), JSON.stringify(entry) + '\n');
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
