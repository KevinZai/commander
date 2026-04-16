"use client";

import { useState } from "react";

type Tab = "desktop" | "cli";

const DESKTOP_CMDS = [
  "/plugin marketplace add KevinZai/commander",
  "/plugin install ccc",
];

const CLI_CMD =
  "curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  };

  return (
    <button
      onClick={copy}
      className="absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function InstallSection() {
  const [tab, setTab] = useState<Tab>("desktop");

  return (
    <section id="install" className="py-24 px-4 border-t border-zinc-900">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Install in 60 seconds.
          </h2>
          <p className="text-zinc-400">
            Works with Claude Code Desktop and Claude Code CLI.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-zinc-800 bg-zinc-950">
            <button
              onClick={() => setTab("desktop")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === "desktop"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Desktop Plugin
              <span className="ml-2 text-[10px] uppercase text-violet-400">
                Recommended
              </span>
            </button>
            <button
              onClick={() => setTab("cli")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === "cli"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              CLI (Legacy)
            </button>
          </div>
        </div>

        {/* Content */}
        {tab === "desktop" ? (
          <div className="space-y-3">
            {DESKTOP_CMDS.map((cmd, i) => (
              <div
                key={i}
                className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-5 font-mono text-sm"
              >
                <span className="text-zinc-600 select-none mr-2">$</span>
                <span className="text-zinc-100">{cmd}</span>
                <CopyButton text={cmd} />
              </div>
            ))}
            <p className="text-xs text-zinc-500 text-center pt-4">
              Then type{" "}
              <code className="text-violet-400 font-mono">/ccc</code> in any
              Claude Code session.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-5 font-mono text-sm overflow-x-auto">
              <span className="text-zinc-600 select-none mr-2">$</span>
              <span className="text-zinc-100 whitespace-nowrap">{CLI_CMD}</span>
              <CopyButton text={CLI_CMD} />
            </div>
            <p className="text-xs text-zinc-500 text-center pt-4">
              Installs the full CLI at{" "}
              <code className="text-zinc-400 font-mono">ccc</code>. Then type{" "}
              <code className="text-violet-400 font-mono">ccc</code> in your
              terminal.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
