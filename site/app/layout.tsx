import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CC Commander — Master Claude Code instantly",
    template: "%s · CC Commander",
  },
  description:
    "The guided AI PM for Claude Code. 60 plugin skills, 22 specialist agents, 9 lifecycle hooks, 2 bundled MCP + 16 opt-in connectors. One install, zero config.",
  metadataBase: new URL("https://cc-commander.com"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "CC Commander — Master Claude Code instantly",
    description:
      "60 plugin skills · 22 specialist agents · 9 lifecycle hooks · 2 bundled MCP + 16 opt-in. One install, zero config.",
    url: "https://cc-commander.com",
    siteName: "CC Commander",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CC Commander — Master Claude Code instantly",
    description:
      "60 plugin skills · 22 specialist agents · 9 lifecycle hooks · 2 bundled MCP + 16 opt-in.",
    site: "@commanderplugin",
    creator: "@commanderplugin",
    images: ["/og-image.png"],
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
