// ============================================================================
// OpenClaw Notify — Claude Code Bible (Kevin's Overlay)
// ============================================================================
// Stop hook: sends milestone notifications via OpenClaw gateway.
// Notifies Kevin's Telegram when a session completes significant work.
// ============================================================================

'use strict';

const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY || 'http://localhost:18789';
const COMMS_LOG_CHANNEL = process.env.COMMS_LOG_CHANNEL || '1480676421457416306';

async function notify(message) {
  try {
    await fetch(`${OPENCLAW_GATEWAY}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: COMMS_LOG_CHANNEL,
        message: `[Claude Code] ${message}`,
        source: 'claude-code-bible',
      }),
    });
  } catch (err) {
    // Gateway may not be running — fail silently
  }
}

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(data);
    const stopReason = input.stop_reason || 'unknown';
    await notify(`Session ended (${stopReason})`);
    console.log(data);
  } catch (e) {
    console.log(data);
  }
});
