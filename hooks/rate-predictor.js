// ============================================================================
// Kevin Z's CC Commander — Rate Predictor (PostToolUse)
// ============================================================================
// Tracks timestamps of tool calls. After 10+ calls, calculates the call rate
// (calls per minute). If rate > 5 calls/min sustained, warns about session
// pace and estimated time to limit.
//
// Timestamp log: /tmp/kz-rate-{sessionId}.jsonl
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
    const rateFile = path.join(os.tmpdir(), `kz-rate-${sessionId}.jsonl`);
    const now = Date.now();

    // Append current timestamp
    try {
      fs.appendFileSync(rateFile, JSON.stringify({ ts: now }) + '\n');
    } catch {
      // Can't write — skip rate tracking
      console.log(data);
      return;
    }

    // Read all timestamps
    let timestamps = [];
    try {
      const lines = fs.readFileSync(rateFile, 'utf8').trim().split('\n');
      timestamps = lines
        .map(line => {
          try { return JSON.parse(line).ts; } catch { return null; }
        })
        .filter(Boolean);
    } catch {
      // Can't read — skip
      console.log(data);
      return;
    }

    // Need at least 10 calls for meaningful rate
    if (timestamps.length >= 10) {
      const windowStart = timestamps[timestamps.length - 10];
      const windowEnd = timestamps[timestamps.length - 1];
      const windowMinutes = (windowEnd - windowStart) / 60000;

      if (windowMinutes > 0) {
        const rate = (10 / windowMinutes).toFixed(1);

        if (parseFloat(rate) > 5) {
          // Estimate remaining: assume ~100 tool calls per session
          const remaining = 100 - timestamps.length;
          const minutesLeft = Math.round(remaining / parseFloat(rate));
          process.stderr.write(
            `[rate-predictor] High activity: ${rate}/min — at this pace, session limit in ~${minutesLeft}min\n`
          );
        }
      }
    }

    console.log(data);
  } catch (e) {
    // Silent fail — never block tool execution
    console.log(data);
  }
});
