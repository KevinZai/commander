// ============================================================================
// Memory Archive — Claude Code Bible (Kevin's Overlay)
// ============================================================================
// Stop hook: archives session state to OpenClaw workspace memory.
// Saves a summary of work done to the dev workspace memory directory.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = process.env.MEMORY_DIR || '/Users/ai/clawd/workspaces/dev/memory';

function getDateString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const dateStr = getDateString();
    const memoryFile = path.join(MEMORY_DIR, `${dateStr}.md`);

    // Append session marker to daily memory file
    const timestamp = new Date().toISOString();
    const entry = `\n## [CLAUDE-CODE] ${timestamp}\n- Session ended\n- Stop reason: ${input.stop_reason || 'unknown'}\n`;

    try {
      fs.appendFileSync(memoryFile, entry);
    } catch (err) {
      // Memory dir may not exist — fail silently
    }

    console.log(data);
  } catch (e) {
    console.log(data);
  }
});
