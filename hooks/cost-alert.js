// ============================================================================
// Kevin Z's CC Commander — Cost Alert (PostToolUse)
// ============================================================================
// Tracks cumulative tool calls as a rough cost proxy.
// At 30 calls: warns ~$0.50 estimated.
// At 60 calls: warns ~$2.00 estimated — consider wrapping up.
//
// Counter file: /tmp/kz-cost-{sessionId}
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    JSON.parse(data); // Validate input

    const sessionId = process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || 'default';
    const counterFile = path.join(os.tmpdir(), `kz-cost-${sessionId}`);

    let count = 0;
    try {
      count = parseInt(fs.readFileSync(counterFile, 'utf8').trim(), 10) || 0;
    } catch {
      // File doesn't exist yet
    }
    count++;

    try {
      fs.writeFileSync(counterFile, String(count));
    } catch {
      // Can't write counter — not critical
    }

    if (count === 30) {
      process.stderr.write('[cost-alert] ~$0.50 estimated — consider checkpointing.\n');
    } else if (count === 60) {
      process.stderr.write('[cost-alert] ~$2.00 estimated — heavy session, consider wrapping up or switching to Sonnet.\n');
    }

    console.log(data);
  } catch (e) {
    // Silent fail — never block tool execution
    console.log(data);
  }
});
