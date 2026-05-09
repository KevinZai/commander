"use client";

import { useState } from "react";

const WORD_LIMIT = 200;

function wordCount(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export function DashboardEditForm({ slug }: { slug: string }) {
  const [pitch, setPitch] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = wordCount(pitch);
  const overLimit = words > WORD_LIMIT;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (overLimit) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      // TODO: CC-665 D — replace with PATCH /api/creator/update when Supabase is wired
      await new Promise((r) => setTimeout(r, 600)); // simulate save
      console.info(`TODO: CC-665 D — would PATCH creator slug=${slug}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Your pitch{" "}
          <span className="text-zinc-500 font-normal">(markdown supported)</span>
        </label>
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Why do you recommend CC Commander?"
          className="w-full px-4 py-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-vertical"
        />
        <span className={`text-xs ${overLimit ? "text-red-400" : "text-zinc-600"}`}>
          {words}/{WORD_LIMIT} words
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Tweet URL{" "}
            <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={tweetUrl}
            onChange={(e) => setTweetUrl(e.target.value)}
            placeholder="https://twitter.com/you/status/..."
            className="w-full px-4 py-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            YouTube URL{" "}
            <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-950/5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving || overLimit}
          className="px-6 py-2.5 bg-white text-black rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span className="text-sm text-green-400">Changes saved ✓</span>
        )}
      </div>
    </form>
  );
}
