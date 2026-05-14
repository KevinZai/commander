// CJS shim around the ESM telemetry client.
// Fire-and-forget — never throws, never blocks the CLI.
const ESM_PATH = require('path').join(__dirname, '..', 'cowork-plugin', 'lib', 'telemetry.mjs');
let cachedTrack = null;
async function loadTrack() {
  if (cachedTrack) return cachedTrack;
  try {
    const mod = await import('file://' + ESM_PATH);
    cachedTrack = mod.track || (() => {});
  } catch {
    cachedTrack = () => {};
  }
  return cachedTrack;
}
function track(name, properties = {}) {
  loadTrack().then(fn => { try { fn(name, properties); } catch {} }).catch(() => {});
}
module.exports = { track };
