import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PricingTable } from "@/components/pricing-table";
import creatorsRaw from "@/lib/creators-mock.json";

// TODO: CC-665 D — replace with Supabase query when creators table exists
// import { createClient } from "@/lib/supabase-server";

type Creator = {
  id: string;
  slug: string;
  github_username: string;
  display_name: string;
  avatar_url: string;
  github_url: string;
  follower_count: number;
  tier: string;
  ls_referral_code: string;
  custom_pitch: string;
  embedded_tweet_url: string | null;
  embedded_youtube_url: string | null;
};

const creators = creatorsRaw as Creator[];

async function getCreator(slug: string): Promise<Creator | null> {
  // TODO: CC-665 D — replace with Supabase query when creators table exists
  // const supabase = createClient();
  // const { data } = await supabase.from("creators").select("*").eq("slug", slug).single();
  // return data ?? null;

  return creators.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const creator = await getCreator(slug);

  if (!creator) {
    return { title: "Creator not found" };
  }

  const title = `${creator.display_name}'s pick: CC Commander`;
  const description = creator.custom_pitch.slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og/r/${slug}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/r/${slug}`],
    },
  };
}

export default async function CreatorPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const creator = await getCreator(slug);

  if (!creator) {
    notFound();
  }

  // Server-side click tracking (fire-and-forget — don't block render)
  // TODO: CC-665 D — replace with direct Supabase insert when table exists
  // We can't call fetch() here in a server component without an absolute URL,
  // so the click is tracked client-side via CreatorClickTracker below.

  const affiliateParam = creator.ls_referral_code
    ? `?aff=${creator.ls_referral_code}`
    : "";

  return (
    <>
      <Nav />
      <main className="pt-24">
        {/* Client-side click tracker */}
        <CreatorClickTracker slug={slug} />

        {/* Hero strip */}
        <section className="py-16 px-4 border-b border-zinc-900 bg-gradient-to-b from-zinc-950 to-transparent">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-8">
              Recommended by
            </p>

            {/* Avatar */}
            <div className="relative inline-block mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={creator.avatar_url}
                alt={creator.display_name}
                width={128}
                height={128}
                className="w-32 h-32 rounded-full border-4 border-orange-500/50 mx-auto"
              />
              <TierBadgeOverlay tier={creator.tier} />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              <span className="text-orange-400">{creator.display_name}</span>
              &apos;s pick
            </h1>

            <div className="flex items-center justify-center gap-4 mb-6 text-sm text-zinc-500">
              <a
                href={creator.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <GitHubIcon className="w-4 h-4" />
                {creator.github_username}
              </a>
              {creator.follower_count > 0 && (
                <span>{creator.follower_count.toLocaleString()} followers</span>
              )}
            </div>
          </div>
        </section>

        {/* Creator pitch + embedded content */}
        <section className="py-16 px-4 border-b border-zinc-900">
          <div className="max-w-2xl mx-auto">
            <div className="prose prose-invert prose-sm max-w-none mb-10">
              <blockquote className="border-l-4 border-orange-500/40 pl-6 italic text-zinc-300 text-lg leading-relaxed not-italic">
                &ldquo;{creator.custom_pitch}&rdquo;
                <footer className="mt-3 text-sm text-zinc-500 not-italic">
                  — {creator.display_name}
                </footer>
              </blockquote>
            </div>

            {/* Embedded YouTube */}
            {creator.embedded_youtube_url && (
              <div className="mb-10 rounded-xl overflow-hidden border border-zinc-800 aspect-video">
                <iframe
                  src={youtubeEmbedUrl(creator.embedded_youtube_url)}
                  title={`${creator.display_name}'s CC Commander video`}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}

            {/* Embedded tweet — fallback to link if no YouTube */}
            {!creator.embedded_youtube_url && creator.embedded_tweet_url && (
              <div className="mb-10 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 text-sm">
                <p className="text-zinc-400 mb-3">From {creator.display_name} on X:</p>
                <a
                  href={creator.embedded_tweet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors break-all"
                >
                  {creator.embedded_tweet_url}
                </a>
                {/* TODO: CC-665 — add Twitter oEmbed server-side embed when auth allows */}
              </div>
            )}
          </div>
        </section>

        {/* CC Commander value prop */}
        <section className="py-16 px-4 border-b border-zinc-900">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500" />
              <span className="text-lg font-bold text-white">CC Commander</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
              The curated Claude Code plugin.
              <br />
              <span className="text-zinc-500">Made by devs, for devs.</span>
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto mb-10">
              62 skills. 22 specialist agents. 9 lifecycle hooks. 2 credential-free
              bundled MCP servers. One 10-second install.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {[
                { value: "62", label: "Plugin skills" },
                { value: "22", label: "Agents" },
                { value: "9", label: "Hooks" },
                { value: "Free", label: "Core tier" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 border border-zinc-900 rounded-lg bg-zinc-950/40 text-center"
                >
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-zinc-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing table with affiliate code baked in */}
        <div id={affiliateParam ? `ref-${creator.ls_referral_code}` : "pricing"}>
          {/* TODO: CC-664 — pass affiliateParam to PricingTable CTA hrefs when LS checkout is wired */}
          <PricingTable />
        </div>

        {/* "Recommended by" badge */}
        <section className="py-10 px-4 border-t border-zinc-900 bg-zinc-950/40">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-3 text-sm text-zinc-500">
            <span>Recommended by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={creator.avatar_url}
              alt={creator.display_name}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-white font-semibold">{creator.display_name}</span>
            <span>·</span>
            <a
              href="/affiliate"
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              Become a creator →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function youtubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v") ?? u.pathname.split("/").pop() ?? "";
    return `https://www.youtube.com/embed/${v}`;
  } catch {
    return url;
  }
}

function TierBadgeOverlay({ tier }: { tier: string }) {
  if (tier === "affiliate") return null;
  const label = tier === "influencer" || tier === "influencer_pending" ? "Influencer" : "Creator";
  const color =
    tier === "influencer" || tier === "influencer_pending"
      ? "bg-orange-500"
      : "bg-violet-500";
  return (
    <span
      className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-bold text-white rounded-full ${color} whitespace-nowrap`}
    >
      {label}
    </span>
  );
}

function GitHubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.52 11.52 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.295-1.23 3.295-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// Client component for server-side click tracking workaround
function CreatorClickTracker({ slug }: { slug: string }) {
  // This is rendered server-side; the actual fetch runs client-side on mount.
  // We inline a tiny script to avoid a full client component boundary.
  const script = `
    fetch('/api/creator/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: ${JSON.stringify(slug)} }),
    }).catch(() => {});
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
