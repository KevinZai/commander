export type CheckUpdateArgs = Record<string, never>;

export function checkUpdate(_args: CheckUpdateArgs) {
  return {
    currentVersion: "4.0.0-beta.1",
    latestVersion: "4.0.0-beta.1",
    upToDate: true,
    changelogUrl: "https://cc-commander.com/changelog",
    releaseNotes: "Beta launch. 14 MCP tools, auth, rate limiting, feedback gate.",
  };
}
