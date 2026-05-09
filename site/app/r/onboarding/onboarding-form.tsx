"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WORD_LIMIT = 200;

function wordCount(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export function OnboardingForm({
  login,
  tier,
}: {
  login: string;
  tier: string;
}) {
  const router = useRouter();
  const [pitch, setPitch] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = wordCount(pitch);
  const overLimit = words > WORD_LIMIT;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (overLimit) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/creator/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_pitch: pitch,
          embedded_tweet_url: tweetUrl || null,
          embedded_youtube_url: youtubeUrl || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Signup failed");
      }

      const data = (await res.json()) as { slug: string; redirect?: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push((data.redirect ?? `/r/${data.slug}`) as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Pitch */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Your pitch{" "}
          <span className="text-zinc-500 font-normal">(markdown supported)</span>
        </label>
        <p className="text-zinc-500 text-xs mb-3">
          Why do you recommend CC Commander? This appears on your landing page.
        </p>
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="I built CC Commander to solve my own frustration with…"
          className="w-full px-4 py-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-vertical"
        />
        <div className="flex justify-between mt-1">
          <span className={`text-xs ${overLimit ? "text-red-400" : "text-zinc-600"}`}>
            {words}/{WORD_LIMIT} words
          </span>
          {overLimit && (
            <span className="text-xs text-red-400">Over word limit</span>
          )}
        </div>
      </div>

      {/* Embedded tweet URL */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Tweet / X post URL{" "}
          <span className="text-zinc-500 font-normal">(optional)</span>
        </label>
        <p className="text-zinc-500 text-xs mb-3">
          Paste a tweet about CC Commander to embed on your page.
        </p>
        <input
          type="url"
          value={tweetUrl}
          onChange={(e) => setTweetUrl(e.target.value)}
          placeholder="https://twitter.com/you/status/123..."
          className="w-full px-4 py-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* YouTube URL */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          YouTube video URL{" "}
          <span className="text-zinc-500 font-normal">(optional)</span>
        </label>
        <p className="text-zinc-500 text-xs mb-3">
          A video about CC Commander or your workflow. Takes priority over
          embedded tweet if both are set.
        </p>
        <input
          type="url"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-4 py-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* Tier note */}
      {tier === "influencer_pending" && (
        <div className="p-4 rounded-lg border border-orange-500/20 bg-orange-950/5 text-sm text-orange-300">
          Your follower count qualifies you for Influencer tier (50% lifetime
          commission). We&apos;ll review and upgrade your account within 48h.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg border border-red-500/20 bg-red-950/5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-4 items-center">
        <button
          type="submit"
          disabled={loading || overLimit || pitch.trim().length === 0}
          className="px-8 py-3 bg-white text-black rounded-lg font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating your page…" : "Create my page →"}
        </button>
        <p className="text-xs text-zinc-600">
          Your page goes live at cc-commander.com/r/{login || "you"}
        </p>
      </div>
    </form>
  );
}
