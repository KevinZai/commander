// Preloaded by the npm test scripts (`node --test --import`). Hooks and readers
// write to the lane named by CCC_CONFIG_DIR / CLAUDE_CONFIG_DIR, so a suite run
// from inside a lane session would otherwise write that lane's real config dir.
// Tests that need a lane set these explicitly in the child env.
delete process.env.CCC_CONFIG_DIR;
delete process.env.CLAUDE_CONFIG_DIR;
// Fleet's per-lane usage file (CC-2122) is read from here; tests set their own.
delete process.env.CCC_LANE_USAGE_FILE;
// Network switches (CC-2111) from the developer's shell would change hook
// behavior under test; tests that need one set it in the child env.
delete process.env.CCC_OFFLINE;
delete process.env.CCC_TELEMETRY;
delete process.env.CCC_CI_TICKER;
// A suite run from a plugin hook or Claude Code session would inherit the host's plugin data dir and the
// user's saved plugin options (8.2); tests that need them set them in the child env.
delete process.env.CLAUDE_PLUGIN_DATA;
delete process.env.PLUGIN_DATA;
for (const key of Object.keys(process.env)) {
  if (key.startsWith('CLAUDE_PLUGIN_OPTION_')) delete process.env[key];
}
