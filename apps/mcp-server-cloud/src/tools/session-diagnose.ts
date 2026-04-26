import { createRequire } from "node:module";
import path from "node:path";
import { getRepoRoot } from "./skill-source.js";

export type DiagnosticStatus = "ok" | "warn" | "fail";

export type DiagnosticFinding = {
  category: string;
  status: DiagnosticStatus;
  message: string;
  remediation?: string;
};

export type SessionDiagnoseArgs = {
  categories?: string[];
};

export type SessionDiagnoseResult = {
  findings: DiagnosticFinding[];
  summary: {
    total: number;
    ok: number;
    warn: number;
    fail: number;
  };
};

type DiagnosticsModule = {
  runDiagnostics: (root?: string) => unknown;
};

const require = createRequire(import.meta.url);
const DIAGNOSTICS_PATH = path.join(
  getRepoRoot(),
  "commander/cowork-plugin/skills/ccc-doctor/lib/diagnostics.js"
);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isDiagnosticModule(value: unknown): value is DiagnosticsModule {
  const record = asRecord(value);
  return typeof record?.runDiagnostics === "function";
}

function normalizeFinding(value: unknown): DiagnosticFinding | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.category !== "string") return null;
  if (record.status !== "ok" && record.status !== "warn" && record.status !== "fail") return null;
  if (typeof record.message !== "string") return null;
  const finding: DiagnosticFinding = {
    category: record.category,
    status: record.status,
    message: record.message,
  };
  if (typeof record.remediation === "string") finding.remediation = record.remediation;
  return finding;
}

function summarize(findings: DiagnosticFinding[]): SessionDiagnoseResult["summary"] {
  return findings.reduce(
    (summary, finding) => ({
      total: summary.total + 1,
      ok: summary.ok + (finding.status === "ok" ? 1 : 0),
      warn: summary.warn + (finding.status === "warn" ? 1 : 0),
      fail: summary.fail + (finding.status === "fail" ? 1 : 0),
    }),
    { total: 0, ok: 0, warn: 0, fail: 0 }
  );
}

function loadDiagnostics(): DiagnosticsModule {
  const loaded = require(DIAGNOSTICS_PATH) as unknown;
  if (!isDiagnosticModule(loaded)) {
    throw new Error("ccc-doctor diagnostics module does not export runDiagnostics");
  }
  return loaded;
}

export function sessionDiagnose(args: SessionDiagnoseArgs = {}): SessionDiagnoseResult {
  let findings: DiagnosticFinding[];

  try {
    const raw = loadDiagnostics().runDiagnostics(getRepoRoot());
    if (!Array.isArray(raw)) {
      throw new Error("runDiagnostics did not return an array");
    }
    findings = raw.map(normalizeFinding).filter((finding): finding is DiagnosticFinding => finding !== null);
  } catch (err) {
    findings = [
      {
        category: "diagnostics",
        status: "fail",
        message: "Unable to load /ccc-doctor diagnostics.",
        remediation: err instanceof Error ? err.message : "Verify diagnostics.js is present in the Commander plugin.",
      },
    ];
  }

  const requested = (args.categories ?? []).map((category) => category.trim()).filter(Boolean);
  if (requested.length > 0) {
    const available = new Set(findings.map((finding) => finding.category));
    const selected = findings.filter((finding) => requested.includes(finding.category));
    const unknown = requested
      .filter((category) => !available.has(category))
      .map<DiagnosticFinding>((category) => ({
        category,
        status: "warn",
        message: `Unknown diagnostic category '${category}'.`,
        remediation: `Use one of: ${[...available].sort((a, b) => a.localeCompare(b)).join(", ")}`,
      }));
    findings = [...selected, ...unknown];
  }

  return {
    findings,
    summary: summarize(findings),
  };
}
