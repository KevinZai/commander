import { SERVER_VERSION } from "../lib/version.js";

export type CheckUpdateArgs = Record<string, never>;

export type CheckUpdateResult = {
  currentVersion: string;
  latestVersion: string;
  upToDate: boolean;
  checked: boolean;
  changelogUrl: string;
  releaseNotes: string;
};

const LATEST_MANIFEST_URL = "https://raw.githubusercontent.com/KevinZai/commander/main/package.json";
const FETCH_TIMEOUT_MS = 3000;

function compareSemver(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x));
  const pb = b.split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x));
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x < y ? -1 : 1;
    return String(x) < String(y) ? -1 : 1;
  }
  return 0;
}

// Reads the published version from the repository's main branch. A network
// failure never fails the tool: the result then says the check did not run.
export async function fetchLatestVersion(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(LATEST_MANIFEST_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const json = (await res.json()) as { version?: unknown };
    return typeof json.version === "string" && /^\d+\.\d+\.\d+/.test(json.version) ? json.version : null;
  } catch {
    return null;
  }
}

export async function checkUpdate(_args: CheckUpdateArgs, fetchImpl: typeof fetch = fetch): Promise<CheckUpdateResult> {
  const latest = await fetchLatestVersion(fetchImpl);
  const checked = latest !== null;
  const latestVersion = latest ?? SERVER_VERSION;
  return {
    currentVersion: SERVER_VERSION,
    latestVersion,
    upToDate: !checked || compareSemver(SERVER_VERSION, latestVersion) >= 0,
    checked,
    changelogUrl: "https://github.com/KevinZai/commander/blob/main/CHANGELOG.md",
    releaseNotes: checked
      ? `Latest published version is ${latestVersion}. Commander 8.0.0: Claude 5.5-era models, every prompt rewritten, 30-event hooks, HUD mod, plugin workflows and evals, /ccc-codex.`
      : "Could not reach the repository to compare versions; the hosted server is reporting its own version only.",
  };
}
