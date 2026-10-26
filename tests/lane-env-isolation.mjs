// Preloaded by the npm test scripts (`node --test --import`). Hooks and readers
// write to the lane named by CCC_CONFIG_DIR / CLAUDE_CONFIG_DIR, so a suite run
// from inside a lane session would otherwise write that lane's real config dir.
// Tests that need a lane set these explicitly in the child env.
delete process.env.CCC_CONFIG_DIR;
delete process.env.CLAUDE_CONFIG_DIR;
// Network switches (CC-2111) from the developer's shell would change hook
// behavior under test; tests that need one set it in the child env.
delete process.env.CCC_OFFLINE;
delete process.env.CCC_TELEMETRY;
delete process.env.CCC_CI_TICKER;
