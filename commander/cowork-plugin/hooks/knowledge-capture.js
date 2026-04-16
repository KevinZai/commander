#!/usr/bin/env node
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';

const KNOWLEDGE_DIR = join(process.env.HOME, '.claude', 'commander', 'knowledge');
const CAPTURES_FILE = join(KNOWLEDGE_DIR, 'auto-captures.jsonl');

const SKIP_PATTERNS = ['node_modules', '.git', '.next', 'dist', 'build', '.cache'];

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

    const toolName = data.tool_name || data.toolName || '';
    const toolInput = data.tool_input || data.input || {};

    if (!['Write', 'Edit'].includes(toolName)) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const filePath = toolInput.file_path || toolInput.filePath || 'unknown';

    if (SKIP_PATTERNS.some(p => filePath.includes(p))) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      tool: toolName,
      file: filePath,
      fileName: basename(filePath),
    };

    if (!existsSync(KNOWLEDGE_DIR)) await mkdir(KNOWLEDGE_DIR, { recursive: true });
    await appendFile(CAPTURES_FILE, JSON.stringify(entry) + '\n');

    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
