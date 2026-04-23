import { SERVER_VERSION } from "../lib/version.js";

export type CheckUpdateArgs = Record<string, never>;

export function checkUpdate(_args: CheckUpdateArgs) {
  return {
    currentVersion: SERVER_VERSION,
    latestVersion: SERVER_VERSION,
    upToDate: true,
    changelogUrl: "https://cc-commander.com/changelog",
    releaseNotes: "Beta launch. 14 MCP tools, auth, rate limiting, feedback gate.",
  };
}
