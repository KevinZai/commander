// CJS shim around the ESM telemetry client.
// Fire-and-forget — never throws, never blocks the CLI.
const ESM_PATH = require('path').join(__dirname, '..', 'cowork-plugin', 'lib', 'telemetry.mjs');
let cachedMod = null;
async function loadMod() {
  if (cachedMod) return cachedMod;
  try {
    cachedMod = await import('file://' + ESM_PATH);
  } catch {
    cachedMod = { track: () => {}, flushBatch: () => {} };
  }
  return cachedMod;
}
function track(name, properties = {}) {
  loadMod().then(mod => {
    try {
      if (typeof mod.track === 'function') mod.track(name, properties);
    } catch {}
  }).catch(() => {});
}
function flushBatch() {
  loadMod().then(mod => {
    try {
      if (typeof mod.flushBatch === 'function') mod.flushBatch();
    } catch {}
  }).catch(() => {});
}
module.exports = { track, flushBatch };
