import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { DashboardEditForm } from "./dashboard-edit-form";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  description: "Manage your CC Commander creator landing page and track performance.",
};

// TODO: CC-665 D — fetch real stats from Supabase
async function getCreatorStats(login: string) {
  void login; // suppress unused warning — will be used with Supabase
  return {
    totalClicks: 0,
    clicksThisMonth: 0,
    totalConversions: 0,
    commissionsThisMonth: 0,
    commissionsLifetime: 0,
    pendingPayout: 0,
    slug: login.toLowerCase(),
  };
}

export default async function CreatorDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirect("/r/signup" as any);
  }

  const user = session.user as Record<string, unknown>;
  const login = String(user.login ?? "unknown");

  const stats = await getCreatorStats(login);

  return (
    <>
      <Nav />
      <main className="pt-24 max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-1">Creator Dashboard</h1>
            <p className="text-zinc-400 text-sm">
              Your page:{" "}
              <a
                href={`/r/${stats.slug}`}
                className="text-orange-400 hover:text-orange-300 transition-colors"
              >
                cc-commander.com/r/{stats.slug}
              </a>
            </p>
          </div>
          <a
            href={`/r/${stats.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm border border-zinc-700 rounded-lg text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            Preview →
          </a>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {[
            {
              label: "Clicks this month",
              value: stats.clicksThisMonth.toLocaleString(),
              sub: `${stats.totalClicks.toLocaleString()} lifetime`,
            },
            {
              label: "Conversions",
              value: stats.totalConversions.toLocaleString(),
              sub: "total",
            },
            {
              label: "Commission this month",
              value: `$${stats.commissionsThisMonth.toFixed(2)}`,
              sub: `$${stats.commissionsLifetime.toFixed(2)} lifetime`,
              highlight: true,
            },
            {
              label: "Pending payout",
              value: `$${stats.pendingPayout.toFixed(2)}`,
              sub: "auto-pays at $50",
            },
            {
              label: "Your tier",
              value: "Affiliate",
              sub: "30% · 12-month attribution",
            },
            {
              label: "Page status",
              value: "Live",
              sub: "visits tracked",
              positive: true,
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`p-5 rounded-xl border ${
                card.highlight
                  ? "border-orange-500/20 bg-orange-950/5"
                  : "border-zinc-800 bg-zinc-950/40"
              }`}
            >
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                {card.label}
              </p>
              <p
                className={`text-3xl font-bold mb-1 ${
                  card.highlight ? "text-orange-400" : card.positive ? "text-green-400" : "text-white"
                }`}
              >
                {card.value}
              </p>
              <p className="text-xs text-zinc-600">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Edit landing page */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6">Edit your landing page</h2>
          <DashboardEditForm slug={stats.slug} />
        </section>

        {/* Asset downloads */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Asset downloads</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Your custom OG image (1200×630 PNG)", href: `/api/og/r/${stats.slug}` },
              // TODO: CC-667 — add banner assets when uploaded
              { label: "CC Commander logo (SVG)", href: "/press/logos/ccc-logo-dark.svg" },
              { label: "Pre-written tweets", href: "/press#tweets" },
              { label: "Press kit (full)", href: "/press" },
            ].map((asset) => (
              <a
                key={asset.label}
                href={asset.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-950/40 transition-colors group"
              >
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                  {asset.label}
                </span>
                <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-xs">
                  ↓
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* LS dashboard placeholder */}
        <section>
          <h2 className="text-xl font-bold mb-4">Payout dashboard</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
            {/* TODO: CC-664 — embed LS affiliate dashboard iframe or link once account is active */}
            <p className="text-zinc-500 text-sm mb-3">
              Lemon Squeezy affiliate dashboard will appear here once the
              program activates.
            </p>
            <p className="text-zinc-600 text-xs">
              You&apos;ll see detailed payout history, tax forms, and bank
              settings here.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
