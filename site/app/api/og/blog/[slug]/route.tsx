import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = params as unknown as { slug: string };
  const url = new URL(req.url);
  const title = url.searchParams.get("title") ?? resolvedParams.slug.replace(/-/g, " ");
  const author = url.searchParams.get("author") ?? "Kevin Z";
  const readTime = url.searchParams.get("readTime") ?? "5 min read";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0F0F0F",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #8B5CF6, #D946EF)",
            }}
          />
          <span style={{ color: "#71717A", fontSize: "24px", fontWeight: 600 }}>
            CC Commander · Blog
          </span>
        </div>

        {/* Middle: title */}
        <div
          style={{
            fontSize: "60px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.15,
            maxWidth: "900px",
          }}
        >
          {title}
        </div>

        {/* Bottom: meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <span style={{ color: "#A1A1AA", fontSize: "24px" }}>{author}</span>
          <span style={{ color: "#27272A", fontSize: "24px" }}>·</span>
          <span style={{ color: "#71717A", fontSize: "24px" }}>{readTime}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
