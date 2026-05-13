"use client";

import { useEffect, useRef, useState } from "react";

type Tier = "pro" | "lifetime";

type State = "idle" | "submitting" | "success" | "error";

const TIER_COPY: Record<Tier, { title: string; sub: string; price: string }> = {
  pro: {
    title: "Pro waitlist",
    sub: "We'll only build Pro if 500+ devs sign up. Drop your email — no spam, just one note when it's ready.",
    price: "$19/mo or $190/yr (aspirational)",
  },
  lifetime: {
    title: "Lifetime founder waitlist",
    sub: "Pay once, own it forever — only if there's signal. First 100 lifetime spots will go to waitlist members first.",
    price: "$299 one-time (aspirational)",
  },
};

export function WaitlistModal({
  open,
  tier,
  onClose,
}: {
  open: boolean;
  tier: Tier;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setState("idle");
      setMessage("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "pricing-table",
          utm_campaign: `waitlist-${tier}`,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        deduped?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setState("success");
      setMessage(data.deduped ? "You're already on the list 👍" : "You're in. We'll only email you when it's real.");
    } catch (err) {
      setState("error");
      setMessage("Network error — try again?");
    }
  }

  const copy = TIER_COPY[tier];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-violet-500/40 bg-zinc-950 p-8 shadow-2xl shadow-violet-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="waitlist-title" className="text-xl font-bold text-white mb-1">
          {copy.title}
        </h3>
        <p className="text-xs text-violet-300/70 mb-4">{copy.price}</p>
        <p className="text-sm text-zinc-400 mb-6">{copy.sub}</p>

        {state === "success" ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200">
            ✓ {message}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 block text-xs text-zinc-400 hover:text-white"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              ref={inputRef}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === "submitting"}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={state === "submitting" || !email}
              className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === "submitting" ? "Sending…" : "Join waitlist"}
            </button>
            {state === "error" && message ? (
              <p className="text-xs text-rose-400">{message}</p>
            ) : null}
            <p className="text-xs text-zinc-500 pt-1">
              No spam. One email when we ship — that's it.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
