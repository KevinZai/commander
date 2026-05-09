import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import creatorsRaw from "@/lib/creators-mock.json";

export const runtime = "edge";

type Creator = {
  slug: string;
  display_name: string;
  avatar_url: string;
  follower_count: number;
  tier: string;
};

const creators = creatorsRaw as Creator[];

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Edge runtime: params is sync in Next 16 but typed as Promise — unwrap safely
  const resolvedParams = params as unknown as { slug: string };
  const creator = creators.find((c) => c.slug === resolvedParams.slug);

  const name = creator?.display_name ?? resolvedParams.slug;
  const avatarUrl = creator?.avatar_url ?? null;
  const followers = creator?.follower_count ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0F0F0F",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Creator row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            marginBottom: "40px",
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              width={120}
              height={120}
              style={{ borderRadius: "50%", border: "4px solid #FF6B47" }}
              alt={name}
            />
          ) : (
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #8B5CF6, #D946EF)",
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ color: "#FF6B47", fontSize: "28px", fontWeight: 700 }}>
              {name}&apos;s pick
            </span>
            {followers > 0 && (
              <span style={{ color: "#71717A", fontSize: "22px" }}>
                {followers.toLocaleString()} followers
              </span>
            )}
          </div>
        </div>

        {/* CCC branding */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "24px",
          }}
        >
          CC Commander
        </div>

        <div
          style={{
            display: "flex",
            gap: "32px",
            marginBottom: "40px",
          }}
        >
          {["62 skills", "22 agents", "9 hooks"].map((stat) => (
            <span
              key={stat}
              style={{
                color: "#A1A1AA",
                fontSize: "24px",
                padding: "8px 20px",
                border: "1px solid #27272A",
                borderRadius: "8px",
              }}
            >
              {stat}
            </span>
          ))}
        </div>

        <div style={{ color: "#52525B", fontSize: "22px" }}>
          cc-commander.com/r/{resolvedParams.slug}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
