import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CCC — Claude Code Commander · The curated AI-guided Claude plugin",
    template: "%s · CCC",
  },
  description:
    "We found every great Claude plugin and made them talk to each other. 15 skills, 5 agents, 8 pre-wired MCPs. AI-guided. Free tier.",
  metadataBase: new URL("https://cc-commander.com"),
  openGraph: {
    title: "CCC — Claude Code Commander",
    description:
      "The curated, AI-guided Claude Code plugin. 15 skills, 5 agents, 8 pre-wired MCP integrations.",
    url: "https://cc-commander.com",
    siteName: "CCC",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CCC — Claude Code Commander",
    description:
      "The curated, AI-guided Claude Code plugin. 15 skills, 5 agents, 8 pre-wired MCP integrations.",
    creator: "@kzic",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
