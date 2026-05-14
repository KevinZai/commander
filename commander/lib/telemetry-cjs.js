// CJS shim around the ESM telemetry client.
// Fire-and-forget — never throws, never blocks the CLI.
// Set CCC_TELEMETRY_DEBUG=1 for launch diagnostics (logs failures to stderr).
const ESM_PATH = require('path').join(__dirname, '..', 'cowork-plugin', 'lib', 'telemetry.mjs');
const DEBUG = process.env.CCC_TELEMETRY_DEBUG === '1';
let cachedMod = null;
async function loadMod() {
  if (cachedMod) return cachedMod;
  try {
    cachedMod = await import('file://' + ESM_PATH);
  } catch (e) {
    if (DEBUG) console.warn('[ccc-telemetry] load failed:', e && e.message);
    cachedMod = { track: () => {}, flushBatch: () => {} };
  }
  return cachedMod;
}
function track(name, properties = {}) {
  loadMod().then(mod => {
    try {
      if (typeof mod.track === 'function') mod.track(name, properties);
    } catch (e) {
      if (DEBUG) console.warn('[ccc-telemetry] track failed:', e && e.message);
    }
  }).catch((e) => { if (DEBUG) console.warn('[ccc-telemetry] track promise failed:', e && e.message); });
}
function flushBatch() {
  loadMod().then(mod => {
    try {
      if (typeof mod.flushBatch === 'function') mod.flushBatch();
    } catch (e) {
      if (DEBUG) console.warn('[ccc-telemetry] flush failed:', e && e.message);
    }
  }).catch((e) => { if (DEBUG) console.warn('[ccc-telemetry] flush promise failed:', e && e.message); });
}
module.exports = { track, flushBatch };
