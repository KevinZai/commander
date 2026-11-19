/**
 * pre-tool-use-worker.mjs — runs the PreToolUse dispatcher's handlers in a child process.
 *
 * The dispatcher (pre-tool-use-dispatcher.js) forks this file with IPC only (no stdio) and keeps each
 * deadline with a timer of its own; when a handler misses its deadline, even inside synchronous or native
 * code, the dispatcher SIGKILLs this process and forks a fresh one for what is left. Messages in:
 * { id, kind: 'run' | 'budgetConfigured' | 'record', href?, input? } or { kind: 'flush' }. Messages out:
 * { id, ok, value } or { id, ok: false, message }. 'flush' sends any queued opted-in telemetry; the process
 * then exits once that settles (bounded by telemetry's send timeout).
 */
async function load(href, name) {
  const mod = await import(href);
  if (typeof mod[name] !== 'function') throw new Error(`${href.split('/').pop()} has no ${name}()`);
  return mod[name];
}

async function perform(msg) {
  if (msg.kind === 'run') return (await load(msg.href, 'run'))(msg.input);
  if (msg.kind === 'budgetConfigured') return (await load(new URL('./budget-config.mjs', import.meta.url).href, 'budgetConfigured'))();
  if (msg.kind === 'record') { await (await load(msg.href, 'recordAgentCall'))(msg.input); return null; }
  throw new Error(`unknown task ${msg.kind}`);
}

const reply = (m) => { try { if (process.connected) process.send(m); } catch {} };

process.on('message', async (msg) => {
  if (msg?.kind === 'flush') {
    try {
      const { flushBatch } = await import(new URL('../../lib/telemetry.mjs', import.meta.url).href);
      flushBatch();
    } catch {}
    return;
  }
  try {
    const value = await perform(msg);
    reply({ id: msg.id, ok: true, value: value === undefined ? null : JSON.parse(JSON.stringify(value)) });
  } catch (err) {
    reply({ id: msg.id, ok: false, message: String(err?.message || err || 'error') });
  }
});
// Once the dispatcher disconnects, nothing but a pending telemetry send keeps this process alive.
process.on('disconnect', () => {});
