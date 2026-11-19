/**
 * pre-tool-use-worker.mjs — runs the PreToolUse dispatcher's handlers off the main thread.
 *
 * The dispatcher (pre-tool-use-dispatcher.js) keeps its event loop free and enforces each deadline with a
 * timer there; when a handler misses its deadline, even inside synchronous work, the dispatcher terminates
 * this worker and starts a fresh one for what is left. Messages in: { id, kind: 'run' | 'budgetConfigured'
 * | 'record', href?, input? } or { kind: 'flush' }. Messages out: { id, ok, value } or { id, ok: false,
 * message }. 'flush' sends any queued opted-in telemetry and lets the worker exit when that settles.
 */
import { parentPort } from 'node:worker_threads';

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

parentPort.on('message', async (msg) => {
  if (msg?.kind === 'flush') {
    try {
      const { flushBatch } = await import(new URL('../../lib/telemetry.mjs', import.meta.url).href);
      flushBatch();
    } catch {}
    parentPort.close(); // a pending telemetry send keeps the worker alive until it settles (bounded in telemetry.mjs)
    return;
  }
  try {
    const value = await perform(msg);
    parentPort.postMessage({ id: msg.id, ok: true, value: value === undefined ? null : JSON.parse(JSON.stringify(value)) });
  } catch (err) {
    parentPort.postMessage({ id: msg.id, ok: false, message: String(err?.message || err || 'error') });
  }
});
